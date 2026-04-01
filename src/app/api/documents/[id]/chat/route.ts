import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import ChatMessage from "@/models/ChatMessage";
import ChatQuestion from "@/models/ChatQuestion";
import anthropic, { MODELS } from "@/lib/ai/client";
import { getLangStrings, type DocumentLanguage } from "@/lib/ai/language";
import { nanoid } from "nanoid";
import { searchChunks } from "@/lib/pinecone";
import { rerankChunks } from "@/lib/ai/rerank";
import { orderChunksForLLM } from "@/lib/ai/chunk-ordering";
import { buildRAGSystemPrompt } from "@/lib/ai/prompts";
import { verifyCitations } from "@/lib/ai/verify-citations";
import { rewriteQuery } from "@/lib/ai/rewrite-query";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";

const SCORE_THRESHOLD = 0.3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const { message, history, isExplanation } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Bericht is verplicht." },
        { status: 400 }
      );
    }

    // Get document — first without originalText, only load it if not vectorized
    const doc = await DocumentModel.findById(id)
      .select("title shortId chatMode language targetCEFRLevel organizationId vectorized content.summary.original content.keyPoints pageImages")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    // Block AI chat requests for terms-only documents (no free questions allowed)
    // Allow internal explanation requests (keypoint/finding expand) regardless of chatMode
    if (doc.chatMode === "terms-only" && !isExplanation) {
      return NextResponse.json(
        { error: "Dit document heeft alleen voorgedefinieerde begrippen." },
        { status: 403 }
      );
    }

    const lang: DocumentLanguage = (doc.language as DocumentLanguage) || "nl";
    const L = getLangStrings(lang);
    const targetLevel = doc.targetCEFRLevel as "B1" | "B2" | "C1" | "C2" | undefined;

    // Build context using RAG (Pinecone semantic search) or fallback to original text
    let docContext: string;
    // Build page image lookup map
    const pageImageMap = new Map<number, string>();
    if (doc.pageImages) {
      for (const pi of doc.pageImages as { pageNumber: number; url: string }[]) {
        pageImageMap.set(pi.pageNumber, pi.url);
      }
    }

    let sources: { page: number | null; section: string; score: number; quote?: string; contentType?: string; documentTitle?: string; documentShortId?: string; pageImageUrl?: string }[] = [];
    let useRAGPrompt = false;
    let ragChunks: Awaited<ReturnType<typeof searchChunks>> = [];

    // Rewrite query for better semantic search (resolves history context + expands terms)
    const conversationHistory = (history || []).slice(-10).map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );
    const searchQuery = await rewriteQuery(message, conversationHistory, lang);

    if (doc.vectorized) {
      try {
        // Retrieve top 20, rerank to top 8, filter by score, apply LitM ordering
        const retrieved = await searchChunks(id, searchQuery, 20);
        const reranked = await rerankChunks(message, retrieved, 8);
        const filtered = reranked.filter((c) => c.score > SCORE_THRESHOLD);

        if (filtered.length === 0) {
          return NextResponse.json({
            data: {
              response: L.noRelevantContent,
              sources: [],
            },
          });
        }

        const ordered = orderChunksForLLM(filtered);

        // Build context with source annotations (mark visual content)
        const contentTypeLabels: Record<string, string> = {
          table: "📊 Tabel",
          chart: "📈 Grafiek",
          diagram: "🔀 Diagram",
          "image-with-text": "🖼️ Afbeelding",
        };
        docContext = ordered
          .map((c) => {
            const parts = [
              c.page ? `Pagina ${c.page}` : null,
              c.sectionHeading || null,
              c.contentType && c.contentType !== "text"
                ? contentTypeLabels[c.contentType] || c.contentType
                : null,
            ].filter(Boolean);
            const label = parts.join(" - ");
            return label
              ? `[Bron: ${label}]\n${c.text}`
              : c.text;
          })
          .join("\n\n---\n\n");

        // For broad questions (summaries, overviews), prepend the document summary
        // so the LLM has high-level context alongside the specific fragments
        const broadQueryPattern = /samenvat|hoofdpunt|overzicht|overview|summary|main point|key point|samengevat|kernpunt|belangrijk/i;
        if (broadQueryPattern.test(message) && doc.content?.summary?.original) {
          const keyPointsText = (doc.content?.keyPoints as { text: string }[] | undefined)
            ?.map((kp) => `- ${kp.text}`)
            .join("\n") || "";
          const summaryBlock = [
            `[Bron: Samenvatting van het hele document]\n${doc.content.summary.original}`,
            keyPointsText ? `[Bron: Kernpunten]\n${keyPointsText}` : "",
          ].filter(Boolean).join("\n\n---\n\n");
          docContext = `${summaryBlock}\n\n---\n\n${docContext}`;
        }

        useRAGPrompt = true;
        ragChunks = filtered;
      } catch (err) {
        console.error("Pinecone search failed, falling back to text:", err);
        const fullDoc = await DocumentModel.findById(id)
          .select("content.originalText")
          .lean();
        docContext =
          fullDoc?.content?.originalText?.slice(0, 50000) ||
          doc.content?.summary?.original ||
          "";
      }
    } else {
      const fullDoc = await DocumentModel.findById(id)
        .select("content.originalText")
        .lean();
      docContext =
        fullDoc?.content?.originalText?.slice(0, 50000) ||
        doc.content?.summary?.original ||
        "";
    }

    // Build system prompt
    const systemPrompt = useRAGPrompt
      ? `${buildRAGSystemPrompt({
          documentTitle: doc.title,
          language: lang,
          targetLevel,
        })}

${lang === "nl" ? "Documentfragmenten" : "Document fragments"}:
${docContext}`
      : `${L.chatSystemPrompt(doc.title)}${
          targetLevel
            ? lang === "nl"
              ? `\n\nBELANGRIJK: Schrijf je antwoord op CEFR taalniveau ${targetLevel}.`
              : `\n\nIMPORTANT: Write your response at CEFR level ${targetLevel}.`
            : ""
        }

${lang === "nl" ? "Documentinhoud" : "Document content"}:
${docContext}`;

    const chatStartTime = Date.now();
    const response = await anthropic.messages.create({
      model: MODELS.chat,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: "user", content: message },
      ],
    });

    const assistantResponse =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Post-generation citation verification
    if (useRAGPrompt && ragChunks.length > 0) {
      // Pinecone now returns pageImageUrl directly (150 DPI for visual pages, 72 DPI for text)
      // Fall back to Document.pageImages only if not in Pinecone (old indexes)
      const chunksWithMeta = ragChunks.map((c) => ({
        ...c,
        pageImageUrl: c.pageImageUrl || (c.page ? pageImageMap.get(c.page) : undefined),
      }));
      const { verifiedSources } = verifyCitations(assistantResponse, chunksWithMeta);
      sources = verifiedSources.map((s) => ({
        ...s,
        documentTitle: doc.title,
        documentShortId: doc.shortId,
        pageImageUrl: s.pageImageUrl || (s.page ? pageImageMap.get(s.page) : undefined),
      }));
    }

    // Store chat message
    const sessionId =
      req.cookies.get("chat_session")?.value || nanoid();

    await ChatMessage.findOneAndUpdate(
      { documentId: id, sessionId },
      {
        $push: {
          messages: [
            { role: "user", content: message, timestamp: new Date() },
            {
              role: "assistant",
              content: assistantResponse,
              timestamp: new Date(),
            },
          ],
        },
      },
      { upsert: true }
    );

    // Increment chat interactions
    await DocumentModel.findByIdAndUpdate(id, {
      $inc: { "analytics.chatInteractions": 1 },
    });

    // Log question for analytics
    ChatQuestion.create({
      documentId: id,
      sessionId,
      question: message,
      answer: assistantResponse,
      responseTimeMs: Date.now() - chatStartTime,
      tokensUsed: response.usage?.output_tokens,
      aiModel: MODELS.chat,
    }).catch(() => {}); // fire-and-forget

    // Dispatch webhook for chat message
    if (doc.organizationId) {
      dispatchWebhookEvent(
        doc.organizationId.toString(),
        "chat.message",
        {
          documentId: id,
          title: doc.title,
          question: message,
          sessionId,
        }
      ).catch(() => {});
    }

    const res = NextResponse.json({
      data: {
        response: assistantResponse,
        sources: sources.length > 0 ? sources : undefined,
      },
    });

    // Set session cookie if new
    if (!req.cookies.get("chat_session")) {
      res.cookies.set("chat_session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return res;
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verwerken van je vraag." },
      { status: 500 }
    );
  }
}
