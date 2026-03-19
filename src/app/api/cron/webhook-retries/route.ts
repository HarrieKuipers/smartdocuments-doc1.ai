import { NextRequest, NextResponse } from "next/server";
import { processWebhookRetries } from "@/lib/webhook-retry";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ANALYTICS_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processWebhookRetries();
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Webhook retry cron error:", error);
    return NextResponse.json(
      { error: "Webhook retries mislukt." },
      { status: 500 }
    );
  }
}
