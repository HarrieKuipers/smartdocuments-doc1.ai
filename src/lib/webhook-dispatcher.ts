import crypto from "crypto";
import { connectDB } from "@/lib/db";
import Webhook from "@/models/Webhook";
import WebhookDelivery from "@/models/WebhookDelivery";
import Integration from "@/models/Integration";
import type { WebhookEvent } from "@/models/Webhook";

function signPayload(secret: string, timestamp: string, body: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

async function deliverWebhook(
  webhookId: string,
  organizationId: string,
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const webhookPayload = { event, timestamp, data: payload };
  const body = JSON.stringify(webhookPayload);
  const signature = signPayload(secret, timestamp, body);

  const delivery = await WebhookDelivery.create({
    webhookId,
    organizationId,
    event,
    payload: webhookPayload,
    status: "pending",
    attempts: 1,
    maxAttempts: 5,
  });

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Id": webhookId,
        "X-Webhook-Event": event,
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
        }
      );
    } else {
      const retryDelays = [60, 300, 1800, 7200, 86400];
      const nextRetryAt = new Date(
        Date.now() + retryDelays[0] * 1000
      );

      await WebhookDelivery.updateOne(
        { _id: delivery._id },
        {
          status: "failed",
          httpStatus: response.status,
          responseBody: responseBody.slice(0, 1024),
          error: `HTTP ${response.status}`,
          duration,
          nextRetryAt,
        }
      );
    }
  } catch (err) {
    const duration = Date.now() - start;
    const errorMessage =
      err instanceof Error ? err.message : "Onbekende fout";
    const nextRetryAt = new Date(Date.now() + 60 * 1000);

    await WebhookDelivery.updateOne(
      { _id: delivery._id },
      {
        status: "failed",
        error: errorMessage,
        duration,
        nextRetryAt,
      }
    );
  }
}

export async function dispatchWebhookEvent(
  organizationId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  await connectDB();

  const [webhooks, integrations] = await Promise.all([
    Webhook.find({
      organizationId,
      isActive: true,
      events: event,
    }).lean(),
    Integration.find({
      organizationId,
      isActive: true,
      events: event,
    }).lean(),
  ]);

  const promises: Promise<void>[] = [];

  // Dispatch to webhooks
  for (const webhook of webhooks) {
    promises.push(
      deliverWebhook(
        webhook._id.toString(),
        organizationId,
        webhook.url,
        webhook.secret,
        event,
        payload
      )
    );
  }

  // Dispatch to integrations (lazy-loaded to avoid circular deps)
  for (const integration of integrations) {
    promises.push(dispatchToIntegration(integration, event, payload));
  }

  await Promise.allSettled(promises);
}

async function dispatchToIntegration(
  integration: {
    type: string;
    config: {
      slackWebhookUrl?: string;
      teamsWebhookUrl?: string;
      notionApiKey?: string;
      notionParentPageId?: string;
    };
  },
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  switch (integration.type) {
    case "slack": {
      if (integration.config.slackWebhookUrl) {
        const { sendSlackNotification } = await import(
          "@/lib/integrations/slack"
        );
        await sendSlackNotification(
          integration.config.slackWebhookUrl,
          event,
          payload
        );
      }
      break;
    }
    case "teams": {
      if (integration.config.teamsWebhookUrl) {
        const { sendTeamsNotification } = await import(
          "@/lib/integrations/teams"
        );
        await sendTeamsNotification(
          integration.config.teamsWebhookUrl,
          event,
          payload
        );
      }
      break;
    }
    case "notion": {
      if (
        integration.config.notionApiKey &&
        integration.config.notionParentPageId
      ) {
        const { exportToNotion } = await import(
          "@/lib/integrations/notion"
        );
        await exportToNotion(
          integration.config.notionApiKey,
          integration.config.notionParentPageId,
          payload
        );
      }
      break;
    }
  }
}
