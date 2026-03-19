import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "read:analytics");
    checkRateLimit(ctx.apiKeyId);

    const { documentId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    await connectDB();

    const doc = await DocumentModel.findOne({
      _id: documentId,
      organizationId: ctx.organizationId,
    })
      .select("title analytics")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    // Get event breakdown for the period
    const timeFilter: Record<string, unknown> = {
      documentId,
    };
    if (from || to) {
      timeFilter.timestamp = {};
      if (from) (timeFilter.timestamp as Record<string, Date>).$gte = new Date(from);
      if (to) (timeFilter.timestamp as Record<string, Date>).$lte = new Date(to);
    }

    const eventBreakdown = await DocumentEvent.aggregate([
      { $match: timeFilter },
      {
        $group: {
          _id: "$eventType",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return NextResponse.json({
      data: {
        title: doc.title,
        analytics: doc.analytics,
        eventBreakdown: eventBreakdown.map((e) => ({
          eventType: e._id,
          count: e.count,
        })),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 document analytics error:", error);
    return NextResponse.json(
      { error: "Kon analytics niet ophalen." },
      { status: 500 }
    );
  }
}
