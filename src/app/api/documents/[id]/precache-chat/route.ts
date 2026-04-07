import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import anthropic, { MODELS } from "@/lib/ai/client";
import { searchChunks } from "@/lib/pinecone";
import { rerankChunks } from "@/lib/ai/rerank";
import { orderChunksForLLM } from "@/lib/ai/chunk-ordering";
import { buildRAGSystemPrompt } from "@/lib/ai/prompts";
import { verifyCitations } from "@/lib/ai/verify-citations";
import { SCORE_THRESHOLD } from "@/lib/ai/rag-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    const questions = doc.chatSuggestions || [];
    if (questions.length === 0) {
      return NextResponse.json({ data: { cached: 0 } });
    }

    const lang = (doc.language as "nl" | "en") || "nl";
    const targetLevel = doc.targetCEFRLevel as "B1" | "B2" | "C1" | "C2" | undefined;

    // Build context: use RAG for vectorized docs, fallback to full text
    let docContext: string;
    let useRAGPrompt = false;
    let ragChunks: Awaited<ReturnType<typeof searchChunks>> = [];

    if (doc.vectorized) {
      try {
        // Use first question as representative query for context retrieval
        const retrieved = await searchChunks(id, questions[0], 20);
        const reranked = await rerankChunks(questions[0], retrieved, 12);
        const filtered = reranked.filter((c) => c.score > SCORE_THRESHOLD);

        if (filtered.length > 0) {
          const ordered = orderChunksForLLM(filtered);
          docContext = ordered
            .map((c) => {
              const parts = [
                c.page ? `Pagina ${c.page}` : null,
                c.sectionHeading || null,
              ].filter(Boolean);
              const label = parts.join(" - ");
              return label ? `[Bron: ${label}]\n${c.text}` : c.text;
            })
            .join("\n\n---\n\n");

          // Also include summary for broader context
          if (doc.content?.summary?.original) {
            docContext = `[Bron: Samenvatting van het hele document]\n${doc.content.summary.original}\n\n---\n\n${docContext}`;
          }

          useRAGPrompt = true;
          ragChunks = filtered;
        } else {
          docContext =
            doc.content?.originalText?.slice(0, 50000) ||
            doc.content?.summary?.original ||
            "";
        }
      } catch (err) {
        console.error("Pinecone search failed, falling back to text:", err);
        docContext =
          doc.content?.originalText?.slice(0, 50000) ||
          doc.content?.summary?.original ||
          "";
      }
    } else {
      docContext =
        doc.content?.originalText?.slice(0, 50000) ||
        doc.content?.summary?.original ||
        "";
    }

    const systemPrompt = useRAGPrompt
      ? `${buildRAGSystemPrompt({
          documentTitle: doc.title,
          language: lang,
          targetLevel,
        })}

${lang === "nl" ? "Documentfragmenten" : "Document fragments"}:
${docContext}`
      : `Je bent een behulpzame AI-assistent die vragen beantwoordt over het document "${doc.title}".
Beantwoord vragen op basis van de inhoud van het document.
Als het antwoord niet in het document staat, zeg dat dan eerlijk.
Antwoord altijd in het ${lang === "nl" ? "Nederlands" : "Engels"}. Wees beknopt maar informatief.

Opmaakregels:
- Gebruik markdown voor structuur: **vetgedrukt** voor kopjes, opsommingstekens (- of •) voor lijsten.
- Zet altijd een witregel tussen alinea's en voor/na een lijst.${
          targetLevel
            ? `\n\nBELANGRIJK: Schrijf je antwoord op CEFR taalniveau ${targetLevel}.`
            : ""
        }

${lang === "nl" ? "Documentinhoud" : "Document content"}:
${docContext}`;

    // Generate answers for all suggestions in parallel
    const results = await Promise.all(
      questions.map(async (question) => {
        try {
          const response = await anthropic.messages.create({
            model: MODELS.chat,
            max_tokens: 1536,
            system: systemPrompt,
            messages: [{ role: "user", content: question }],
          });

          const answer =
            response.content[0].type === "text"
              ? response.content[0].text
              : "";

          // Extract source documents from citations if RAG was used
          let sourceDocuments: { shortId: string; title: string }[] = [];
          if (useRAGPrompt && ragChunks.length > 0) {
            const { verifiedSources } = verifyCitations(answer, ragChunks);
            if (verifiedSources.length > 0) {
              sourceDocuments = [{ shortId: doc.shortId, title: doc.title }];
            }
          }

          return {
            question,
            answer,
            sourceDocuments,
            generatedAt: new Date(),
          };
        } catch (err) {
          console.error(`Failed to precache answer for: ${question}`, err);
          return null;
        }
      })
    );

    const cache = results.filter(Boolean);

    await DocumentModel.updateOne(
      { _id: id },
      { $set: { chatSuggestionsCache: cache } }
    );

    return NextResponse.json({ data: { cached: cache.length } });
  } catch (error) {
    console.error("Precache chat error:", error);
    return NextResponse.json(
      { error: "Kon antwoorden niet genereren." },
      { status: 500 }
    );
  }
}
