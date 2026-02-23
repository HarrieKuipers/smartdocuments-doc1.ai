import Anthropic from "@anthropic-ai/sdk";

export interface QuestionCluster {
  label: string;
  questions: string[];
  count: number;
  representativeQuestion: string;
}

export async function clusterQuestions(
  questions: { question: string; count?: number }[]
): Promise<QuestionCluster[]> {
  if (questions.length < 2) return [];

  const client = new Anthropic();

  const questionList = questions
    .slice(0, 100) // Limit to 100 questions for cost/performance
    .map((q, i) => `${i + 1}. "${q.question}"${q.count && q.count > 1 ? ` (${q.count}x)` : ""}`)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Groepeer de volgende vragen die over hetzelfde onderwerp gaan. Combineer vergelijkbare vragen tot clusters.

VRAGEN:
${questionList}

Geef je antwoord als JSON array van objecten met:
- label: kort label voor de groep (max 40 tekens, in het Nederlands)
- questionIndices: array van vraagnummers die bij deze groep horen
- representativeIndex: het nummer van de meest representatieve vraag

Groepeer alleen vragen die duidelijk over hetzelfde onderwerp gaan (cosine similarity > 0.85 equivalent).
Vragen die nergens bij passen, groepeer je als losse clusters van 1.
Antwoord alleen met de JSON array, zonder markdown.`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const clusters: {
      label: string;
      questionIndices: number[];
      representativeIndex: number;
    }[] = JSON.parse(text);

    return clusters
      .filter((c) => c.questionIndices.length > 1) // Only return actual clusters
      .map((c) => ({
        label: c.label,
        questions: c.questionIndices.map(
          (idx) => questions[idx - 1]?.question || ""
        ),
        count: c.questionIndices.reduce(
          (sum, idx) => sum + (questions[idx - 1]?.count || 1),
          0
        ),
        representativeQuestion:
          questions[c.representativeIndex - 1]?.question || "",
      }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}
