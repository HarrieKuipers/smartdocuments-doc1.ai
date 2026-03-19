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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const eventType = searchParams.get("eventType");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    await connectDB();

    // Verify document belongs to org
    const doc = await DocumentModel.findOne({
      _id: documentId,
      organizationId: ctx.organizationId,
    })
      .select("_id")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    const filter: Record<string, unknown> = { documentId };
    if (eventType) filter.eventType = eventType;
    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, Date>).$gte = new Date(from);
      if (to) (filter.timestamp as Record<string, Date>).$lte = new Date(to);
    }

    const [events, total] = await Promise.all([
      DocumentEvent.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DocumentEvent.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 document events error:", error);
    return NextResponse.json(
      { error: "Kon events niet ophalen." },
      { status: 500 }
    );
  }
}
