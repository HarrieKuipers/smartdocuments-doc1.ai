import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";
import { getDateRange } from "@/lib/analytics/helpers";
import type { Period } from "@/lib/analytics/constants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { documentId } = await params;

    const doc = await DocumentModel.findOne({
      _id: documentId,
      organizationId: session.user.organizationId,
    }).lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden" },
        { status: 404 }
      );
    }

    const period = (req.nextUrl.searchParams.get("period") || "30d") as Period;
    const { start, end } = getDateRange(period);

    // Get the maximum active seconds per session (last heartbeat)
    const sessionReadTimes = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "time_on_page",
          timestamp: { $gte: start, $lte: end },
          "metadata.activeSeconds": { $exists: true },
        },
      },
      {
        $group: {
          _id: "$sessionId",
          maxActiveSeconds: { $max: "$metadata.activeSeconds" },
        },
      },
    ]);

    // Define buckets
    const buckets = [
      { label: "< 30s", min: 0, max: 30 },
      { label: "30s - 1m", min: 30, max: 60 },
      { label: "1 - 3m", min: 60, max: 180 },
      { label: "3 - 5m", min: 180, max: 300 },
      { label: "5 - 10m", min: 300, max: 600 },
      { label: "10m+", min: 600, max: Infinity },
    ];

    const distribution = buckets.map((bucket) => ({
      label: bucket.label,
      count: sessionReadTimes.filter(
        (s: { maxActiveSeconds: number }) =>
          s.maxActiveSeconds >= bucket.min && s.maxActiveSeconds < bucket.max
      ).length,
    }));

    return NextResponse.json({
      distribution,
      totalSessions: sessionReadTimes.length,
      avgReadTimeSeconds:
        sessionReadTimes.length > 0
          ? Math.round(
              sessionReadTimes.reduce(
                (s: number, d: { maxActiveSeconds: number }) =>
                  s + d.maxActiveSeconds,
                0
              ) / sessionReadTimes.length
            )
          : 0,
      medianReadTimeSeconds:
        sessionReadTimes.length > 0
          ? (() => {
              const sorted = sessionReadTimes
                .map((s: { maxActiveSeconds: number }) => s.maxActiveSeconds)
                .sort((a: number, b: number) => a - b);
              const mid = Math.floor(sorted.length / 2);
              return Math.round(
                sorted.length % 2
                  ? sorted[mid]
                  : (sorted[mid - 1] + sorted[mid]) / 2
              );
            })()
          : 0,
    });
  } catch (error) {
    console.error("Read time distribution error:", error);
    return NextResponse.json(
      { error: "Failed to fetch read time distribution" },
      { status: 500 }
    );
  }
}
