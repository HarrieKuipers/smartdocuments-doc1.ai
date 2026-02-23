import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentAnalyticsSummary from "@/models/DocumentAnalyticsSummary";
import ChatQuestion from "@/models/ChatQuestion";
import { getDateRange } from "@/lib/analytics/helpers";
import { generateInsights } from "@/lib/analytics/generateInsights";
import { clusterQuestions } from "@/lib/analytics/clusterQuestions";
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

    // Fetch summaries and top questions in parallel
    const [summaries, topQuestions, allQuestions] = await Promise.all([
      DocumentAnalyticsSummary.find({
        documentId: doc._id,
        date: { $gte: start, $lte: end },
      })
        .sort({ date: 1 })
        .lean(),

      ChatQuestion.aggregate([
        {
          $match: {
            documentId: doc._id,
            timestamp: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: "$question", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        { $project: { question: "$_id", count: 1 } },
      ]),

      ChatQuestion.find({
        documentId: doc._id,
        timestamp: { $gte: start, $lte: end },
      })
        .select("question")
        .lean(),
    ]);

    // Generate insights and clusters in parallel
    const [insights, clusters] = await Promise.all([
      generateInsights(
        summaries as any[],
        doc.title,
        topQuestions as any[]
      ),
      allQuestions.length >= 2
        ? clusterQuestions(
            allQuestions.map((q) => ({ question: q.question }))
          )
        : [],
    ]);

    return NextResponse.json({
      insights,
      clusters,
    });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
