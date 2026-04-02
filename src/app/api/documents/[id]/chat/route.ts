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
import {
  BROAD_QUERY_PATTERN,
  CONTENT_TYPE_LABELS,
  SCORE_THRESHOLD,
  validateChatMessage,
} from "@/lib/ai/rag-utils";
import { buildPageImageMap } from "@/lib/page-images";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const { message: rawMessage, history, isExplanation } = await req.json();

    const message = validateChatMessage(rawMessage);
    if (!message) {
      return NextResponse.json(
        { error: "Bericht is verplicht (max 2000 tekens)." },
        { status: 400 }
      );
    }

    const doc = await DocumentModel.findById(id)
      .select("title shortId chatMode language targetCEFRLevel organizationId vectorized content.summary.original content.keyPoints pageCount pageLabelOffset")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    if (doc.chatMode === "terms-only" && !isExplanation) {
      return NextResponse.json(
        { error: "Dit document heeft alleen voorgedefinieerde begrippen." },
        { status: 403 }
      );
    }

    const lang: DocumentLanguage = (doc.language as DocumentLanguage) || "nl";
    const L = getLangStrings(lang);
    const targetLevel = doc.targetCEFRLevel as "B1" | "B2" | "C1" | "C2" | undefined;

    let docContext: string;
    const pageImageMap = doc.pageCount
      ? buildPageImageMap(doc._id.toString(), doc.pageCount, doc.pageLabelOffset || 0)
      : new Map<number, string>();

    let sources: { page: number | null; section: string; score: number; quote?: string; contentType?: string; documentTitle?: string; documentShortId?: string; pageImageUrl?: string }[] = [];
    let useRAGPrompt = false;
    let ragChunks: Awaited<ReturnType<typeof searchChunks>> = [];

    const conversationHistory = (history || []).slice(-10).map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    if (doc.vectorized) {
      try {
        // Parallelize query rewrite and initial search for latency optimization
        // The rewritten query gets a second search only if it differs significantly
        const [searchQuery, initialResults] = await Promise.all([
          rewriteQuery(message, conversationHistory, lang),
          searchChunks(id, message, 20),
        ]);

        // If the rewritten query differs, do a second search and merge results
        let retrieved = initialResults;
        if (searchQuery !== message) {
          const rewrittenResults = await searchChunks(id, searchQuery, 20);
          // Merge: deduplicate by chunk ID, keep highest score
          const merged = new Map<string, (typeof initialResults)[0]>();
          for (const chunk of [...initialResults, ...rewrittenResults]) {
            const key = `${chunk.page}|${chunk.sectionHeading}|${chunk.text.slice(0, 50)}`;
            const existing = merged.get(key);
            if (!existing || chunk.score > existing.score) {
              merged.set(key, chunk);
            }
          }
          retrieved = Array.from(merged.values()).sort((a, b) => b.score - a.score);
        }

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

        docContext = ordered
          .map((c) => {
            const parts = [
              c.page ? `Pagina ${c.page}` : null,
              c.sectionHeading || null,
              c.contentType && c.contentType !== "text"
                ? CONTENT_TYPE_LABELS[c.contentType] || c.contentType
                : null,
            ].filter(Boolean);
            const label = parts.join(" - ");
            return label
              ? `[Bron: ${label}]\n${c.text}`
              : c.text;
          })
          .join("\n\n---\n\n");

        if (BROAD_QUERY_PATTERN.test(message) && doc.content?.summary?.original) {
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

    if (useRAGPrompt && ragChunks.length > 0) {
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

    await DocumentModel.findByIdAndUpdate(id, {
      $inc: { "analytics.chatInteractions": 1 },
    });

    ChatQuestion.create({
      documentId: id,
      sessionId,
      question: message,
      answer: assistantResponse,
      responseTimeMs: Date.now() - chatStartTime,
      tokensUsed: response.usage?.output_tokens,
      aiModel: MODELS.chat,
    }).catch(() => {});

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

    if (!req.cookies.get("chat_session")) {
      res.cookies.set("chat_session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
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
