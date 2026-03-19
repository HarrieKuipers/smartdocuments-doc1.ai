function formatAdaptiveCard(
  event: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const title = (payload.title as string) || "Onbekend document";

  let headerText: string;
  let bodyText: string;
  let color: string;

  switch (event) {
    case "document.processed":
      headerText = "📄 Document verwerkt";
      bodyText = `"${title}" is succesvol verwerkt en klaar voor gebruik.`;
      color = "good";
      break;

    case "document.error":
      headerText = "⚠️ Verwerking mislukt";
      bodyText = `"${title}" kon niet worden verwerkt: ${(payload.error as string) || "Onbekende fout"}`;
      color = "attention";
      break;

    case "chat.message":
      headerText = "💬 Nieuwe chat vraag";
      bodyText = `Nieuwe vraag op "${title}": ${(payload.question as string) || "—"}`;
      color = "default";
      break;

    case "analytics.milestone":
      headerText = "🎉 Milestone bereikt!";
      bodyText = `"${title}" heeft ${payload.milestone || payload.currentViews} views bereikt!`;
      color = "good";
      break;

    case "test":
      headerText = "🔔 Test melding";
      bodyText = "doc1.ai Teams integratie werkt!";
      color = "good";
      break;

    default:
      headerText = `doc1.ai: ${event}`;
      bodyText = `Event voor "${title}"`;
      color = "default";
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            {
              type: "TextBlock",
              text: headerText,
              weight: "Bolder",
              size: "Medium",
              color,
            },
            {
              type: "TextBlock",
              text: bodyText,
              wrap: true,
            },
            {
              type: "TextBlock",
              text: `via doc1.ai`,
              size: "Small",
              isSubtle: true,
            },
          ],
        },
      },
    ],
  };
}

export async function sendTeamsNotification(
  webhookUrl: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const card = formatAdaptiveCard(event, payload);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });

  if (!response.ok) {
    throw new Error(`Teams webhook failed: ${response.status}`);
  }
}
