import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import ChatQuestion from "@/models/ChatQuestion";
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
    const category = req.nextUrl.searchParams.get("category") || undefined;
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const { start, end } = getDateRange(period);

    // Get questions from ChatQuestion model
    const filter: Record<string, unknown> = {
      documentId: doc._id,
      timestamp: { $gte: start, $lte: end },
    };
    if (category) filter.category = category;

    const [questions, total] = await Promise.all([
      ChatQuestion.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ChatQuestion.countDocuments(filter),
    ]);

    // Category breakdown
    const categories = await ChatQuestion.aggregate([
      { $match: { documentId: doc._id, timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Feedback stats
    const feedbackStats = await ChatQuestion.aggregate([
      { $match: { documentId: doc._id, timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          positive: {
            $sum: {
              $cond: [{ $eq: ["$feedback.type", "positive"] }, 1, 0],
            },
          },
          negative: {
            $sum: {
              $cond: [{ $eq: ["$feedback.type", "negative"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Chat message count from events
    const chatStats = await DocumentEvent.aggregate([
      {
        $match: {
          documentId: doc._id,
          eventType: "chat_message",
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          totalMessages: 1,
          totalSessions: { $size: "$uniqueSessions" },
          avgPerSession: {
            $divide: [
              "$totalMessages",
              { $max: [{ $size: "$uniqueSessions" }, 1] },
            ],
          },
        },
      },
    ]);

    return NextResponse.json({
      questions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      categories: categories.map((c) => ({
        category: c._id || "other",
        count: c.count,
      })),
      feedback: feedbackStats[0] || { total: 0, positive: 0, negative: 0 },
      chatStats: chatStats[0] || {
        totalMessages: 0,
        totalSessions: 0,
        avgPerSession: 0,
      },
    });
  } catch (error) {
    console.error("Questions analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
