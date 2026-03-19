import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import DocumentModel from "@/models/Document";

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "read:analytics");
    checkRateLimit(ctx.apiKeyId);

    await connectDB();

    const [stats] = await DocumentModel.aggregate([
      { $match: { organizationId: ctx.organizationId } },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          readyDocuments: {
            $sum: { $cond: [{ $eq: ["$status", "ready"] }, 1, 0] },
          },
          totalViews: { $sum: "$analytics.totalViews" },
          totalUniqueViews: { $sum: "$analytics.uniqueViews" },
          totalDownloads: { $sum: "$analytics.totalDownloads" },
          totalChatInteractions: { $sum: "$analytics.chatInteractions" },
          avgReadTime: { $avg: "$analytics.averageReadTime" },
        },
      },
    ]);

    return NextResponse.json({
      data: stats || {
        totalDocuments: 0,
        readyDocuments: 0,
        totalViews: 0,
        totalUniqueViews: 0,
        totalDownloads: 0,
        totalChatInteractions: 0,
        avgReadTime: 0,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("API v1 analytics overview error:", error);
    return NextResponse.json(
      { error: "Kon analytics niet ophalen." },
      { status: 500 }
    );
  }
}
