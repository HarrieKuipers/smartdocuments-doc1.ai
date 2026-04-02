import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import DocumentModel from "@/models/Document";
import CollectionChatMessage from "@/models/CollectionChatMessage";
import anthropic, { MODELS } from "@/lib/ai/client";
import {
  buildCollectionContext,
  buildRAGCollectionContext,
  buildFallbackContext,
  parseDocumentReferences,
} from "@/lib/ai/collection-chat-context";
import { searchMultipleDocuments } from "@/lib/pinecone";
import { rerankChunks } from "@/lib/ai/rerank";
import { orderChunksForLLM } from "@/lib/ai/chunk-ordering";
import { buildRAGSystemPrompt } from "@/lib/ai/prompts";
import { verifyCitations } from "@/lib/ai/verify-citations";
import { rewriteQuery } from "@/lib/ai/rewrite-query";
import { getLangStrings } from "@/lib/ai/language";
import {
  BROAD_QUERY_PATTERN,
  SCORE_THRESHOLD,
  validateChatMessage,
} from "@/lib/ai/rag-utils";
import { buildPageImageMap } from "@/lib/page-images";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const { message: rawMessage, history } = await req.json();

    const message = validateChatMessage(rawMessage);
    if (!message) {
      return NextResponse.json(
        { error: "Bericht is verplicht (max 2000 tekens)." },
        { status: 400 }
      );
    }

    const collection = await Collection.findOne({ slug }).lean();
    if (!collection) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    if (collection.access?.type === "password") {
      const password = req.headers.get("x-collection-password");
      if (!password) {
        return NextResponse.json(
          { error: "Wachtwoord vereist.", requiresPassword: true },
          { status: 401 }
        );
      }
      const isValid = await bcrypt.compare(
        password,
        collection.access.password || ""
      );
      if (!isValid) {
        return NextResponse.json(
          { error: "Onjuist wachtwoord." },
          { status: 401 }
        );
      }
    }

    const docs = await DocumentModel.find({
      collectionId: collection._id,
      status: "ready",
    })
      .select(
        "title shortId vectorized language targetCEFRLevel content.summary.original content.keyPoints content.terms pageCount pageLabelOffset"
      )
      .lean();

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "Geen documenten in deze collectie." },
        { status: 404 }
      );
    }

    const lang = (docs[0]?.language as "nl" | "en") || "nl";
    const L = getLangStrings(lang);
    const targetLevel = docs.find((d) => d.targetCEFRLevel)?.targetCEFRLevel as "B1" | "B2" | "C1" | "C2" | undefined;

    const vectorizedDocs = docs.filter((d) => d.vectorized);
    const nonVectorizedDocs = docs.filter((d) => !d.vectorized);

    const docTitleMap = new Map<string, string>();
    const docShortIdMap = new Map<string, string>();
    const docPageImageMap = new Map<string, Map<number, string>>();
    for (const doc of docs) {
      const docId = doc._id.toString();
      docTitleMap.set(docId, doc.title);
      docShortIdMap.set(docId, doc.shortId);
      if (doc.pageCount && doc.pageCount > 0) {
        docPageImageMap.set(docId, buildPageImageMap(docId, doc.pageCount, doc.pageLabelOffset || 0));
      }
    }

    let context: string;
    let useRAGPrompt = false;
    let ragChunks: Awaited<ReturnType<typeof searchMultipleDocuments>> = [];

    const conversationHistory = (history || []).slice(-10).map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    if (vectorizedDocs.length > 0) {
      try {
        const vectorizedIds = vectorizedDocs.map((d) => d._id.toString());

        // Parallelize query rewrite and initial search
        const [searchQuery, initialResults] = await Promise.all([
          rewriteQuery(message, conversationHistory, lang),
          searchMultipleDocuments(vectorizedIds, message, 5, 20),
        ]);

        // Merge with rewritten query results if different
        let retrieved = initialResults;
        if (searchQuery !== message) {
          const rewrittenResults = await searchMultipleDocuments(
            vectorizedIds,
            searchQuery,
            5,
            20
          );
          const merged = new Map<string, (typeof initialResults)[0]>();
          for (const chunk of [...initialResults, ...rewrittenResults]) {
            const key = `${chunk.documentId}|${chunk.page}|${chunk.text.slice(0, 50)}`;
            const existing = merged.get(key);
            if (!existing || chunk.score > existing.score) {
              merged.set(key, chunk);
            }
          }
          retrieved = Array.from(merged.values()).sort((a, b) => b.score - a.score);
        }

        const reranked = await rerankChunks(message, retrieved, 8);
        const filtered = reranked.filter((c) => c.score > SCORE_THRESHOLD);

        if (filtered.length === 0 && nonVectorizedDocs.length === 0) {
          return NextResponse.json({
            data: {
              response: L.noRelevantContentCollection,
              sourceDocuments: [],
            },
          });
        }

        if (filtered.length > 0) {
          const ordered = orderChunksForLLM(filtered);
          context = buildRAGCollectionContext(ordered, docTitleMap);
          ragChunks = filtered;
          useRAGPrompt = true;

          if (BROAD_QUERY_PATTERN.test(message)) {
            const summaryLines = docs
              .filter((d) => d.content?.summary?.original)
              .map((d) => `[${d.title}]\n${d.content!.summary!.original}`)
              .join("\n\n");
            if (summaryLines) {
              context = `--- ${lang === "nl" ? "Samenvattingen" : "Summaries"} ---\n${summaryLines}\n\n--- ${lang === "nl" ? "Fragmenten" : "Fragments"} ---\n${context}`;
            }
          }
        } else {
          context = "";
        }

        if (nonVectorizedDocs.length > 0) {
          const fallback = buildFallbackContext(
            nonVectorizedDocs.map((d) => ({
              title: d.title,
              shortId: d.shortId,
              summary: d.content?.summary?.original || "",
            }))
          );
          context += `\n\n--- ${lang === "nl" ? "Samenvattingen (niet-geïndexeerde documenten)" : "Summaries (non-indexed documents)"} ---${fallback}`;
        }
      } catch (err) {
        console.error("Cross-document RAG failed, falling back to summaries:", err);
        const docContexts = docs.map((doc) => ({
          title: doc.title,
          shortId: doc.shortId,
          summary: doc.content?.summary?.original || "",
          keyPoints: (doc.content?.keyPoints || []).map(
            (kp: { text: string }) => kp.text
          ),
          terms: (doc.content?.terms || []).map(
            (t: { term: string }) => t.term
          ),
        }));
        context = buildCollectionContext(docContexts);
      }
    } else {
      const docContexts = docs.map((doc) => ({
        title: doc.title,
        shortId: doc.shortId,
        summary: doc.content?.summary?.original || "",
        keyPoints: (doc.content?.keyPoints || []).map(
          (kp: { text: string }) => kp.text
        ),
        terms: (doc.content?.terms || []).map(
          (t: { term: string }) => t.term
        ),
      }));
      context = buildCollectionContext(docContexts);
    }

    // Use language-aware system prompt (fixes hardcoded Dutch for non-RAG path)
    const docTitles = docs.map((d) => d.title);
    const systemPrompt = useRAGPrompt
      ? `${buildRAGSystemPrompt({
          documentTitle: docTitles,
          language: lang,
          targetLevel,
          isCollection: true,
        })}

${lang === "nl" ? "Documentfragmenten" : "Document fragments"}:
${context}`
      : `${L.chatSystemPrompt(collection.name)}
${lang === "nl"
  ? `Deze collectie bevat ${docs.length} documenten. Beantwoord vragen op basis van de inhoud van alle documenten.

BELANGRIJK: Noem altijd de titel of naam van het brondocument (vetgedrukt) wanneer je informatie eruit citeert, zodat de lezer weet waar het vandaan komt. Bijvoorbeeld: Volgens **Titel van het document** is...
Als het antwoord niet in de documenten staat, zeg dat dan eerlijk.`
  : `This collection contains ${docs.length} documents. Answer questions based on the content of all documents.

IMPORTANT: Always mention the title of the source document (in bold) when citing information from it, so the reader knows where it comes from. For example: According to **Document Title**...
If the answer is not in the documents, say so honestly.`}

${lang === "nl" ? "Documentinhoud" : "Document content"}:
${context}`;

    const chatStartTime = Date.now();
    const response = await anthropic.messages.create({
      model: MODELS.chat,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [...conversationHistory, { role: "user", content: message }],
    });

    const assistantResponse =
      response.content[0].type === "text" ? response.content[0].text : "";

    let sourceDocuments: { documentId?: string; shortId: string; title: string }[];
    let sources: { page: number | null; section: string; score: number; quote?: string; documentTitle?: string; documentShortId?: string; contentType?: string; pageImageUrl?: string }[] = [];

    if (useRAGPrompt && ragChunks.length > 0) {
      const chunksWithMeta = ragChunks.map((c) => ({
        ...c,
        documentTitle: docTitleMap.get(c.documentId),
        documentShortId: docShortIdMap.get(c.documentId),
        pageImageUrl: c.pageImageUrl || (c.page ? docPageImageMap.get(c.documentId)?.get(c.page) : undefined),
      }));
      const { verifiedSources } = verifyCitations(
        assistantResponse,
        chunksWithMeta
      );
      sources = verifiedSources.map((s) => ({
        ...s,
        pageImageUrl: s.pageImageUrl || (() => {
          if (!s.page || !s.documentShortId) return undefined;
          for (const [docId, shortId] of docShortIdMap.entries()) {
            if (shortId === s.documentShortId) {
              return docPageImageMap.get(docId)?.get(s.page);
            }
          }
          return undefined;
        })(),
      }));

      const docRefs = new Map<string, { shortId: string; title: string }>();
      for (const s of verifiedSources) {
        if (s.documentShortId && !docRefs.has(s.documentShortId)) {
          docRefs.set(s.documentShortId, {
            shortId: s.documentShortId,
            title: s.documentTitle || "",
          });
        }
      }
      sourceDocuments = Array.from(docRefs.values());
    } else {
      sourceDocuments = parseDocumentReferences(
        assistantResponse,
        docs.map((d) => ({ title: d.title, shortId: d.shortId }))
      );
    }

    const sessionId = req.cookies.get("chat_session")?.value || nanoid();

    await CollectionChatMessage.findOneAndUpdate(
      { collectionId: collection._id, sessionId },
      {
        $push: {
          messages: [
            { role: "user", content: message, timestamp: new Date() },
            {
              role: "assistant",
              content: assistantResponse,
              sourceDocuments,
              timestamp: new Date(),
            },
          ],
        },
      },
      { upsert: true }
    );

    const res = NextResponse.json({
      data: {
        response: assistantResponse,
        sourceDocuments,
        sources: sources.length > 0 ? sources : undefined,
        responseTimeMs: Date.now() - chatStartTime,
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
    console.error("Collection chat error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verwerken van je vraag." },
      { status: 500 }
    );
  }
}
