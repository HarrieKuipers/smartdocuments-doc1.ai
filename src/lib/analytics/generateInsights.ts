import Anthropic from "@anthropic-ai/sdk";
import { IDocumentAnalyticsSummary } from "@/models/DocumentAnalyticsSummary";

export interface Insight {
  type: "suggestion" | "trend" | "anomaly" | "achievement";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actionable: boolean;
  suggestedAction: string | null;
}

export async function generateInsights(
  summaries: IDocumentAnalyticsSummary[],
  documentTitle: string,
  topQuestions?: { question: string; count: number }[]
): Promise<Insight[]> {
  if (summaries.length === 0) return [];

  // Calculate aggregated stats for the prompt
  const totalViews = summaries.reduce((s, d) => s + d.views, 0);
  const totalUniqueVisitors = summaries.reduce(
    (s, d) => s + d.uniqueVisitors,
    0
  );
  const avgReadTime =
    summaries.reduce((s, d) => s + d.avgReadTimeSeconds, 0) /
    summaries.length;
  const avgBounceRate =
    summaries.reduce((s, d) => s + d.bounceRate, 0) / summaries.length;
  const totalChatMessages = summaries.reduce(
    (s, d) => s + d.chatMessages,
    0
  );
  const avgScrollDepth =
    summaries.reduce((s, d) => s + d.avgScrollDepth, 0) / summaries.length;
  const avgCompletionRate =
    summaries.reduce((s, d) => s + d.completionRate, 0) / summaries.length;

  // Split into halves for trend detection
  const halfIdx = Math.floor(summaries.length / 2);
  const firstHalf = summaries.slice(0, halfIdx);
  const secondHalf = summaries.slice(halfIdx);
  const firstViews = firstHalf.reduce((s, d) => s + d.views, 0);
  const secondViews = secondHalf.reduce((s, d) => s + d.views, 0);

  // Device breakdown
  const devices = summaries.reduce(
    (acc, d) => ({
      desktop: acc.desktop + d.deviceBreakdown.desktop,
      mobile: acc.mobile + d.deviceBreakdown.mobile,
      tablet: acc.tablet + d.deviceBreakdown.tablet,
    }),
    { desktop: 0, mobile: 0, tablet: 0 }
  );

  // Top terms
  const termMap = new Map<string, number>();
  for (const s of summaries) {
    for (const t of s.topTerms || []) {
      termMap.set(t.term, (termMap.get(t.term) || 0) + t.clicks);
    }
  }
  const topTerms = Array.from(termMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term, clicks]) => ({ term, clicks }));

  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Je bent een analytics-assistent voor doc1.ai. Analyseer de volgende data van document "${documentTitle}" over de afgelopen ${summaries.length} dagen en genereer maximaal 5 korte, actionable inzichten in het Nederlands.

DATA:
- Totaal views: ${totalViews}
- Unieke bezoekers: ${totalUniqueVisitors}
- Gem. leestijd: ${Math.round(avgReadTime)}s
- Gem. bounce rate: ${Math.round(avgBounceRate)}%
- Gem. scroll diepte: ${Math.round(avgScrollDepth)}%
- Completie rate: ${Math.round(avgCompletionRate)}%
- Chat vragen: ${totalChatMessages}
- Views trend: eerste helft ${firstViews}, tweede helft ${secondViews}
- Apparaten: desktop ${devices.desktop}, mobile ${devices.mobile}, tablet ${devices.tablet}
- Top geklikte begrippen: ${topTerms.map((t) => `${t.term} (${t.clicks}x)`).join(", ") || "geen"}
- Top gestelde vragen: ${topQuestions?.map((q) => `"${q.question}" (${q.count}x)`).join(", ") || "geen"}

Geef je antwoord als JSON array van objecten met deze velden:
- type: "suggestion" | "trend" | "anomaly" | "achievement"
- priority: "high" | "medium" | "low"
- title: korte titel (max 60 tekens)
- description: beschrijving (max 200 tekens)
- actionable: boolean
- suggestedAction: string of null

Antwoord alleen met de JSON array, zonder markdown.`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const insights: Insight[] = JSON.parse(text);
    return insights.slice(0, 5);
  } catch {
    return [];
  }
}
