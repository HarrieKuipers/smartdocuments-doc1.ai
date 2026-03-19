import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Webhook from "@/models/Webhook";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const webhook = await Webhook.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    }).lean();

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook niet gevonden." },
        { status: 404 }
      );
    }

    const timestamp = new Date().toISOString();
    const testPayload = {
      event: "test",
      timestamp,
      data: {
        message: "Dit is een test webhook van doc1.ai",
        webhookId: webhook._id.toString(),
      },
    };

    const body = JSON.stringify(testPayload);
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(`${timestamp}.${JSON.stringify(testPayload.data)}`)
      .digest("hex");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Id": webhook._id.toString(),
          "X-Webhook-Event": "test",
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Timestamp": timestamp,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const responseBody = await response.text().catch(() => "");

      return NextResponse.json({
        data: {
          success: response.ok,
          httpStatus: response.status,
          responseBody: responseBody.slice(0, 512),
        },
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      return NextResponse.json({
        data: {
          success: false,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Verbinding mislukt",
        },
      });
    }
  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json(
      { error: "Kon test webhook niet versturen." },
      { status: 500 }
    );
  }
}
