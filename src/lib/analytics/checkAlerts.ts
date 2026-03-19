import mongoose from "mongoose";
import DocumentEvent from "@/models/DocumentEvent";
import AnalyticsNotification from "@/models/AnalyticsNotification";
import DocumentModel from "@/models/Document";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";

const MILESTONES = [100, 500, 1000, 5000, 10000];
const SPIKE_MULTIPLIER = 3; // 3x normal volume = spike

/**
 * Check for milestone and spike alerts for all documents.
 * Called during daily aggregation cron job.
 */
export async function checkAlerts() {
  const documents = await DocumentModel.find({
    status: "ready",
  })
    .select("_id title organizationId uploadedBy analytics.totalViews")
    .lean();

  for (const doc of documents) {
    const docId = doc._id;
    const userId = doc.uploadedBy;
    const orgId = doc.organizationId;
    if (!userId || !orgId) continue;

    // --- Milestone check ---
    const totalViews = doc.analytics?.totalViews || 0;
    for (const milestone of MILESTONES) {
      if (totalViews >= milestone) {
        // Check if we already sent this milestone notification
        const existing = await AnalyticsNotification.findOne({
          documentId: docId,
          type: "milestone",
          "metadata.threshold": milestone,
        }).lean();

        if (!existing) {
          await AnalyticsNotification.create({
            userId,
            organizationId: orgId,
            documentId: docId,
            type: "milestone",
            title: `${milestone} views bereikt!`,
            message: `"${doc.title}" heeft de ${milestone.toLocaleString("nl-NL")} views milestone bereikt.`,
            metadata: {
              documentTitle: doc.title,
              metric: "views",
              currentValue: totalViews,
              threshold: milestone,
            },
          });

          // Dispatch webhook
          dispatchWebhookEvent(orgId.toString(), "analytics.milestone", {
            documentId: docId.toString(),
            title: doc.title,
            milestone,
            currentViews: totalViews,
          }).catch(() => {});
        }
      }
    }

    // --- Activity spike check ---
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [yesterdayCount, weeklyAvg] = await Promise.all([
      DocumentEvent.countDocuments({
        documentId: docId,
        eventType: "page_view",
        timestamp: { $gte: yesterday },
      }),
      DocumentEvent.aggregate([
        {
          $match: {
            documentId: docId,
            eventType: "page_view",
            timestamp: { $gte: weekAgo, $lt: yesterday },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$timestamp",
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            avgDaily: { $avg: "$count" },
          },
        },
      ]),
    ]);

    const avgDaily = weeklyAvg[0]?.avgDaily || 0;
    if (avgDaily > 0 && yesterdayCount >= avgDaily * SPIKE_MULTIPLIER) {
      // Only create one spike notification per day
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const existingSpike = await AnalyticsNotification.findOne({
        documentId: docId,
        type: "activity_spike",
        createdAt: { $gte: todayStart },
      }).lean();

      if (!existingSpike) {
        await AnalyticsNotification.create({
          userId,
          organizationId: orgId,
          documentId: docId,
          type: "activity_spike",
          title: "Ongewone activiteitspiek",
          message: `"${doc.title}" had gisteren ${yesterdayCount} views — ${Math.round(yesterdayCount / avgDaily)}x meer dan gemiddeld.`,
          metadata: {
            documentTitle: doc.title,
            metric: "views",
            currentValue: yesterdayCount,
            threshold: Math.round(avgDaily),
          },
        });
      }
    }

    // --- Negative feedback check ---
    const recentNegative = await DocumentEvent.findOne({
      documentId: docId,
      eventType: "chat_feedback",
      "metadata.feedbackType": "negative",
      timestamp: { $gte: yesterday },
    }).lean();

    if (recentNegative) {
      const existingFeedback = await AnalyticsNotification.findOne({
        documentId: docId,
        type: "negative_feedback",
        createdAt: { $gte: yesterday },
      }).lean();

      if (!existingFeedback) {
        await AnalyticsNotification.create({
          userId,
          organizationId: orgId,
          documentId: docId,
          type: "negative_feedback",
          title: "Negatieve chat feedback",
          message: `Een bezoeker van "${doc.title}" heeft negatieve feedback gegeven op een AI-antwoord.`,
          metadata: {
            documentTitle: doc.title,
            metric: "chat_feedback",
          },
        });
      }
    }
  }
}
