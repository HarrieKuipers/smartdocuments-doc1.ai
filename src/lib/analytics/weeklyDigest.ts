import { Resend } from "resend";
import { subDays } from "date-fns";
import DocumentAnalyticsSummary from "@/models/DocumentAnalyticsSummary";
import DocumentModel from "@/models/Document";
import User from "@/models/User";
import { calculateTrend, formatDuration } from "@/lib/analytics/helpers";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "noreply@doc1.ai";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.doc1.ai";

interface DocumentDigest {
  title: string;
  documentId: string;
  views: number;
  viewsTrend: number;
  chatMessages: number;
  downloads: number;
  avgReadTime: number;
  topQuestion?: string;
}

export async function sendWeeklyDigests() {
  const now = new Date();
  const weekStart = subDays(now, 7);
  const prevWeekStart = subDays(now, 14);

  // Get all users with digest enabled
  const users = await User.find({ weeklyDigestEnabled: { $ne: false } })
    .select("_id name email organizationId")
    .lean();

  for (const user of users) {
    if (!user.email || !user.organizationId) continue;

    // Get documents for this user's organization
    const documents = await DocumentModel.find({
      organizationId: user.organizationId,
      status: "ready",
    })
      .select("_id title")
      .lean();

    if (documents.length === 0) continue;

    const docIds = documents.map((d) => d._id);

    // Get this week and previous week summaries
    const [thisWeek, prevWeek] = await Promise.all([
      DocumentAnalyticsSummary.find({
        documentId: { $in: docIds },
        date: { $gte: weekStart, $lte: now },
      }).lean(),
      DocumentAnalyticsSummary.find({
        documentId: { $in: docIds },
        date: { $gte: prevWeekStart, $lt: weekStart },
      }).lean(),
    ]);

    if (thisWeek.length === 0) continue;

    // Aggregate per document
    const docDigests: DocumentDigest[] = [];
    for (const doc of documents) {
      const docId = doc._id.toString();
      const current = thisWeek.filter(
        (s) => s.documentId.toString() === docId
      );
      const previous = prevWeek.filter(
        (s) => s.documentId.toString() === docId
      );

      const views = current.reduce((s, d) => s + d.views, 0);
      const prevViews = previous.reduce((s, d) => s + d.views, 0);
      const chatMessages = current.reduce((s, d) => s + d.chatMessages, 0);
      const downloads = current.reduce((s, d) => s + d.downloads, 0);
      const avgReadTime =
        current.length > 0
          ? current.reduce((s, d) => s + d.avgReadTimeSeconds, 0) /
            current.length
          : 0;

      // Get top question
      const topQ = current
        .flatMap((d) => d.topSearchQueries || [])
        .sort((a, b) => b.count - a.count)[0];

      if (views > 0 || chatMessages > 0) {
        docDigests.push({
          title: doc.title,
          documentId: docId,
          views,
          viewsTrend: calculateTrend(views, prevViews),
          chatMessages,
          downloads,
          avgReadTime,
          topQuestion: topQ?.query,
        });
      }
    }

    if (docDigests.length === 0) continue;

    // Total stats
    const totalViews = docDigests.reduce((s, d) => s + d.views, 0);
    const totalChat = docDigests.reduce((s, d) => s + d.chatMessages, 0);
    const totalDownloads = docDigests.reduce((s, d) => s + d.downloads, 0);

    // Build email
    const dateStr = `${weekStart.toLocaleDateString("nl-NL")} - ${now.toLocaleDateString("nl-NL")}`;
    const documentRows = docDigests
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map(
        (d) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
            <strong style="color: #111; font-size: 14px;">${d.title}</strong>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">
            <span style="font-size: 14px; font-weight: 600;">${d.views}</span>
            <span style="font-size: 11px; color: ${d.viewsTrend >= 0 ? "#10B981" : "#EF4444"};">
              ${d.viewsTrend >= 0 ? "+" : ""}${d.viewsTrend}%
            </span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px;">
            ${d.chatMessages}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px;">
            ${formatDuration(d.avgReadTime)}
          </td>
        </tr>`
      )
      .join("");

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #0062EB; margin: 0;">doc1.ai</h1>
        </div>
        <h2 style="font-size: 18px; font-weight: 600; color: #111; margin-bottom: 8px;">
          Wekelijks Rapport
        </h2>
        <p style="font-size: 14px; color: #666; margin-bottom: 24px;">${dateStr}</p>

        <div style="display: flex; gap: 16px; margin-bottom: 32px;">
          <div style="flex: 1; background: #F8FAFC; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="font-size: 24px; font-weight: 700; color: #111; margin: 0;">${totalViews}</p>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0;">Views</p>
          </div>
          <div style="flex: 1; background: #F8FAFC; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="font-size: 24px; font-weight: 700; color: #111; margin: 0;">${totalChat}</p>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0;">AI Vragen</p>
          </div>
          <div style="flex: 1; background: #F8FAFC; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="font-size: 24px; font-weight: 700; color: #111; margin: 0;">${totalDownloads}</p>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0;">Downloads</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #F8FAFC;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666; font-weight: 600;">Document</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #666; font-weight: 600;">Views</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #666; font-weight: 600;">Chat</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #666; font-weight: 600;">Leestijd</th>
            </tr>
          </thead>
          <tbody>
            ${documentRows}
          </tbody>
        </table>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${APP_URL}/dashboard/analytics" style="display: inline-block; padding: 12px 32px; background-color: #0062EB; color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
            Bekijk volledige analytics
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          &copy; ${new Date().getFullYear()} doc1.ai – Slimme documenten, gebouwd door Espire AI Agency
        </p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: `doc1.ai <${FROM}>`,
        to: user.email,
        subject: `Wekelijks doc1.ai Rapport — ${dateStr}`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send digest to ${user.email}:`, err);
    }
  }
}
