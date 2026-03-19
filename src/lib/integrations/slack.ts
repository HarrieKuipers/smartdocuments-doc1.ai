interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: { type: string; text: string }[];
}

function formatMessage(
  event: string,
  payload: Record<string, unknown>
): { text: string; blocks: SlackBlock[] } {
  const title = (payload.title as string) || "Onbekend document";

  switch (event) {
    case "document.processed":
      return {
        text: `✅ Document verwerkt: "${title}"`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "📄 Document verwerkt", emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Document:*\n${title}` },
              { type: "mrkdwn", text: `*Status:*\n✅ Gereed` },
            ],
          },
        ],
      };

    case "document.error":
      return {
        text: `❌ Verwerking mislukt: "${title}"`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "⚠️ Verwerking mislukt", emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Document:*\n${title}` },
              {
                type: "mrkdwn",
                text: `*Fout:*\n${(payload.error as string) || "Onbekende fout"}`,
              },
            ],
          },
        ],
      };

    case "chat.message":
      return {
        text: `💬 Nieuwe vraag op "${title}"`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "💬 Nieuwe chat vraag", emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Document:*\n${title}` },
              {
                type: "mrkdwn",
                text: `*Vraag:*\n${(payload.question as string) || "—"}`,
              },
            ],
          },
        ],
      };

    case "analytics.milestone":
      return {
        text: `🎉 "${title}" heeft ${payload.milestone} views bereikt!`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🎉 Milestone bereikt!", emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Document:*\n${title}` },
              {
                type: "mrkdwn",
                text: `*Views:*\n${payload.currentViews || payload.milestone}`,
              },
            ],
          },
        ],
      };

    case "test":
      return {
        text: "🔔 Test melding van doc1.ai",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "✅ *doc1.ai Slack integratie werkt!*\nDit is een test melding.",
            },
          },
        ],
      };

    default:
      return {
        text: `doc1.ai event: ${event}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Event:* ${event}\n*Document:* ${title}`,
            },
          },
        ],
      };
  }
}

export async function sendSlackNotification(
  webhookUrl: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const message = formatMessage(event, payload);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status}`);
  }
}
