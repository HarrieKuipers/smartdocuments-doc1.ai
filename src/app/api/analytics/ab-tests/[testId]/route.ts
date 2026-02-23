import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import ABTest from "@/models/ABTest";
import DocumentEvent from "@/models/DocumentEvent";

// GET — Get A/B test results
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { testId } = await params;

    const test = await ABTest.findOne({
      _id: testId,
      organizationId: session.user.organizationId,
    })
      .populate("documentA", "title shortId")
      .populate("documentB", "title shortId")
      .lean();

    if (!test) {
      return NextResponse.json(
        { error: "A/B test niet gevonden" },
        { status: 404 }
      );
    }

    const dateFilter = {
      $gte: test.startDate,
      ...(test.endDate ? { $lte: test.endDate } : {}),
    };

    // Get stats for both variants
    const [statsA, statsB] = await Promise.all(
      [test.documentA, test.documentB].map(async (docRef) => {
        const docId = typeof docRef === "object" && "_id" in docRef ? docRef._id : docRef;
        const [stats] = await DocumentEvent.aggregate([
          {
            $match: {
              documentId: docId,
              timestamp: dateFilter,
            },
          },
          {
            $group: {
              _id: null,
              views: {
                $sum: {
                  $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0],
                },
              },
              uniqueSessions: {
                $addToSet: {
                  $cond: [
                    { $eq: ["$eventType", "page_view"] },
                    "$sessionId",
                    "$$REMOVE",
                  ],
                },
              },
              chatMessages: {
                $sum: {
                  $cond: [{ $eq: ["$eventType", "chat_message"] }, 1, 0],
                },
              },
              readTimes: {
                $push: {
                  $cond: [
                    { $eq: ["$eventType", "time_on_page"] },
                    "$metadata.activeSeconds",
                    "$$REMOVE",
                  ],
                },
              },
              scrollDepths: {
                $push: {
                  $cond: [
                    { $eq: ["$eventType", "scroll_depth"] },
                    "$metadata.scrollPercentage",
                    "$$REMOVE",
                  ],
                },
              },
            },
          },
          {
            $project: {
              views: 1,
              uniqueVisitors: { $size: "$uniqueSessions" },
              chatMessages: 1,
              avgReadTime: { $avg: "$readTimes" },
              avgScrollDepth: { $avg: "$scrollDepths" },
              completionRate: {
                $multiply: [
                  {
                    $divide: [
                      {
                        $size: {
                          $filter: {
                            input: "$scrollDepths",
                            as: "s",
                            cond: { $gte: ["$$s", 100] },
                          },
                        },
                      },
                      { $max: [{ $size: "$scrollDepths" }, 1] },
                    ],
                  },
                  100,
                ],
              },
            },
          },
        ]);

        return stats || {
          views: 0,
          uniqueVisitors: 0,
          chatMessages: 0,
          avgReadTime: 0,
          avgScrollDepth: 0,
          completionRate: 0,
        };
      })
    );

    // Determine which variant is performing better for the goal metric
    const goalMap: Record<string, string> = {
      views: "views",
      readTime: "avgReadTime",
      scrollDepth: "avgScrollDepth",
      completionRate: "completionRate",
      chatEngagement: "chatMessages",
    };
    const goalKey = goalMap[test.goalMetric] || "completionRate";
    const aVal = statsA[goalKey] || 0;
    const bVal = statsB[goalKey] || 0;
    const leading = aVal > bVal ? "A" : bVal > aVal ? "B" : null;
    const improvement =
      aVal > 0 && bVal > 0
        ? Math.round(((Math.max(aVal, bVal) - Math.min(aVal, bVal)) / Math.min(aVal, bVal)) * 100)
        : 0;

    return NextResponse.json({
      test,
      results: {
        variantA: statsA,
        variantB: statsB,
        leading,
        improvement,
        goalMetric: test.goalMetric,
      },
    });
  } catch (error) {
    console.error("AB test results error:", error);
    return NextResponse.json(
      { error: "Failed to fetch A/B test results" },
      { status: 500 }
    );
  }
}

// PATCH — Update A/B test (pause, complete, set winner)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { testId } = await params;

    const body = await req.json();
    const { status, winner } = body;

    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (winner) update.winner = winner;
    if (status === "completed") update.endDate = new Date();

    const test = await ABTest.findOneAndUpdate(
      { _id: testId, organizationId: session.user.organizationId },
      { $set: update },
      { new: true }
    ).lean();

    if (!test) {
      return NextResponse.json(
        { error: "A/B test niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error("Update AB test error:", error);
    return NextResponse.json(
      { error: "Failed to update A/B test" },
      { status: 500 }
    );
  }
}
