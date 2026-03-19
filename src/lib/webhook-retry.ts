import crypto from "crypto";
import { connectDB } from "@/lib/db";
import Webhook from "@/models/Webhook";
import WebhookDelivery from "@/models/WebhookDelivery";

const RETRY_DELAYS_SECONDS = [60, 300, 1800, 7200, 86400];

export async function processWebhookRetries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  await connectDB();

  const pendingRetries = await WebhookDelivery.find({
    status: "failed",
    nextRetryAt: { $lte: new Date() },
    $expr: { $lt: ["$attempts", "$maxAttempts"] },
  }).limit(50);

  let succeeded = 0;
  let failed = 0;

  for (const delivery of pendingRetries) {
    const webhook = await Webhook.findById(delivery.webhookId).lean();
    if (!webhook || !webhook.isActive) {
      await WebhookDelivery.updateOne(
        { _id: delivery._id },
        { status: "failed", error: "Webhook niet meer actief", nextRetryAt: null }
      );
      failed++;
      continue;
    }

    const body = JSON.stringify(delivery.payload);
    const timestamp =
      (delivery.payload as Record<string, unknown>)?.timestamp as string ||
      new Date().toISOString();
    const dataBody = JSON.stringify(
      (delivery.payload as Record<string, unknown>)?.data || {}
    );
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(`${timestamp}.${dataBody}`)
      .digest("hex");

    const attempt = delivery.attempts + 1;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Id": webhook._id.toString(),
          "X-Webhook-Event": delivery.event,
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Timestamp": timestamp,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const duration = Date.now() - start;
      const responseBody = await response.text().catch(() => "");

      if (response.ok) {
        await WebhookDelivery.updateOne(
          { _id: delivery._id },
          {
            status: "success",
            httpStatus: response.status,
            responseBody: responseBody.slice(0, 1024),
            duration,
            attempts: attempt,
            nextRetryAt: null,
          }
        );
        succeeded++;
      } else {
        const nextDelay = RETRY_DELAYS_SECONDS[attempt - 1] || 86400;
        const nextRetryAt =
          attempt >= delivery.maxAttempts
            ? null
            : new Date(Date.now() + nextDelay * 1000);

        await WebhookDelivery.updateOne(
          { _id: delivery._id },
          {
            status: "failed",
            httpStatus: response.status,
            responseBody: responseBody.slice(0, 1024),
            error: `HTTP ${response.status}`,
            duration,
            attempts: attempt,
            nextRetryAt,
          }
        );
        failed++;
      }
    } catch (err) {
      const duration = Date.now() - start;
      const errorMessage =
        err instanceof Error ? err.message : "Onbekende fout";
      const nextDelay = RETRY_DELAYS_SECONDS[attempt - 1] || 86400;
      const nextRetryAt =
        attempt >= delivery.maxAttempts
          ? null
          : new Date(Date.now() + nextDelay * 1000);

      await WebhookDelivery.updateOne(
        { _id: delivery._id },
        {
          status: "failed",
          error: errorMessage,
          duration,
          attempts: attempt,
          nextRetryAt,
        }
      );
      failed++;
    }
  }

  return { processed: pendingRetries.length, succeeded, failed };
}
