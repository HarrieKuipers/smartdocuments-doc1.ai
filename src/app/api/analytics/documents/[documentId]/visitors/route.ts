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
      return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
    }

    const period = (req.nextUrl.searchParams.get("period") || "30d") as Period;
    const { start, end } = getDateRange(period);

    // Device breakdown
    const devices = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
          "metadata.device": { $exists: true },
        },
      },
      { $group: { _id: "$metadata.device", count: { $sum: 1 } } },
    ]);

    // Browser breakdown
    const browsers = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
          "metadata.browser": { $exists: true, $ne: "" },
        },
      },
      { $group: { _id: "$metadata.browser", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // OS breakdown
    const operatingSystems = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
          "metadata.os": { $exists: true, $ne: "" },
        },
      },
      { $group: { _id: "$metadata.os", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Referrers
    const referrers = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
          "metadata.referrer": { $exists: true },
        },
      },
      { $group: { _id: "$metadata.referrer", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Countries
    const countries = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
          "metadata.country": { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$metadata.country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Peak hours heatmap (day of week x hour)
    const peakHours = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "page_view",
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: "$timestamp" },
            hour: { $hour: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          dayOfWeek: "$_id.dayOfWeek",
          hour: "$_id.hour",
          count: 1,
        },
      },
    ]);

    const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
    for (const d of devices) {
      if (d._id in deviceBreakdown) {
        deviceBreakdown[d._id as keyof typeof deviceBreakdown] = d.count;
      }
    }

    return NextResponse.json({
      deviceBreakdown,
      browsers: browsers.map((b) => ({ browser: b._id, count: b.count })),
      operatingSystems: operatingSystems.map((o) => ({
        os: o._id,
        count: o.count,
      })),
      referrers: referrers.map((r) => ({
        referrer: r._id,
        count: r.count,
      })),
      countries: countries.map((c) => ({
        country: c._id,
        count: c.count,
      })),
      peakHours: peakHours.map((p) => ({
        dayOfWeek: p.dayOfWeek,
        hour: p.hour,
        count: p.count,
      })),
    });
  } catch (error) {
    console.error("Visitors analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visitor analytics" },
      { status: 500 }
    );
  }
}
