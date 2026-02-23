import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { sendWeeklyDigests } from "@/lib/analytics/weeklyDigest";
import { checkAlerts } from "@/lib/analytics/checkAlerts";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ANALYTICS_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Run alerts and digests
    await Promise.all([checkAlerts(), sendWeeklyDigests()]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Weekly digest cron error:", error);
    return NextResponse.json(
      { error: "Failed to run weekly digest" },
      { status: 500 }
    );
  }
}
