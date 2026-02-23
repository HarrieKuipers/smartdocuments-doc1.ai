import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";
import ChatQuestion from "@/models/ChatQuestion";
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

    const period = (req.nextUrl.searchParams.get("period") ||
      "30d") as Period;
    const { start, end } = getDateRange(period);

    // Fetch section views, total sessions, and section-related questions
    const [sections, totalSessionsResult, sectionQuestions, sectionTerms] =
      await Promise.all([
        // Section view stats
        DocumentEvent.aggregate([
          {
            $match: {
              documentId: doc._id,
              eventType: "section_view",
              timestamp: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: {
                sectionId: "$metadata.sectionId",
                sectionTitle: "$metadata.sectionTitle",
              },
              views: { $sum: 1 },
              uniqueSessions: { $addToSet: "$sessionId" },
            },
          },
          {
            $project: {
              sectionId: "$_id.sectionId",
              sectionTitle: "$_id.sectionTitle",
              views: 1,
              uniqueVisitors: { $size: "$uniqueSessions" },
            },
          },
          { $sort: { views: -1 } },
        ]),

        // Total unique sessions (page_views) for drop-off calculation
        DocumentEvent.aggregate([
          {
            $match: {
              documentId: doc._id,
              eventType: "page_view",
              timestamp: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              sessions: { $addToSet: "$sessionId" },
            },
          },
          {
            $project: {
              totalSessions: { $size: "$sessions" },
            },
          },
        ]),

        // Questions that reference specific sections
        ChatQuestion.aggregate([
          {
            $match: {
              documentId: doc._id,
              timestamp: { $gte: start, $lte: end },
              "sourceSections.sectionId": { $exists: true },
            },
          },
          { $unwind: "$sourceSections" },
          {
            $group: {
              _id: "$sourceSections.sectionId",
              sectionTitle: { $first: "$sourceSections.sectionTitle" },
              questions: { $push: "$question" },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),

        // Top terms clicked per section
        DocumentEvent.aggregate([
          {
            $match: {
              documentId: doc._id,
              eventType: "term_click",
              timestamp: { $gte: start, $lte: end },
              "metadata.sectionId": { $exists: true },
            },
          },
          {
            $group: {
              _id: {
                sectionId: "$metadata.sectionId",
                term: "$metadata.term",
              },
              clicks: { $sum: 1 },
            },
          },
          { $sort: { clicks: -1 } },
          {
            $group: {
              _id: "$_id.sectionId",
              topTerms: {
                $push: { term: "$_id.term", clicks: "$clicks" },
              },
            },
          },
          {
            $project: {
              sectionId: "$_id",
              topTerms: { $slice: ["$topTerms", 5] },
            },
          },
        ]),
      ]);

    const totalSessions = totalSessionsResult[0]?.totalSessions || 0;

    // Build section question and term maps
    const questionMap = new Map<string, { questions: string[]; count: number }>();
    for (const sq of sectionQuestions) {
      questionMap.set(sq._id, {
        questions: sq.questions.slice(0, 5),
        count: sq.count,
      });
    }

    const termMap = new Map<
      string,
      { term: string; clicks: number }[]
    >();
    for (const st of sectionTerms) {
      termMap.set(st.sectionId, st.topTerms);
    }

    // Calculate drop-off rates
    const enrichedSections = sections.map(
      (section: any, index: number) => {
        const dropOffRate =
          totalSessions > 0
            ? Math.round(
                ((totalSessions - section.uniqueVisitors) / totalSessions) *
                  100
              )
            : 0;

        // Retention relative to previous section
        const prevSection = index > 0 ? sections[index - 1] : null;
        const retentionFromPrevious = prevSection
          ? Math.round(
              (section.uniqueVisitors /
                Math.max(prevSection.uniqueVisitors, 1)) *
                100
            )
          : 100;

        return {
          sectionId: section.sectionId,
          sectionTitle: section.sectionTitle,
          views: section.views,
          uniqueVisitors: section.uniqueVisitors,
          dropOffRate,
          retentionFromPrevious,
          topQuestions: questionMap.get(section.sectionId)?.questions || [],
          questionCount: questionMap.get(section.sectionId)?.count || 0,
          topTerms: termMap.get(section.sectionId) || [],
        };
      }
    );

    return NextResponse.json({
      sections: enrichedSections,
      totalSessions,
    });
  } catch (error) {
    console.error("Sections analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch section analytics" },
      { status: 500 }
    );
  }
}
