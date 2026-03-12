import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import ChatMessage from "@/models/ChatMessage";
import ChatQuestion from "@/models/ChatQuestion";
import anthropic, { MODELS } from "@/lib/ai/client";
import { getLangStrings, type DocumentLanguage } from "@/lib/ai/language";
import { nanoid } from "nanoid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Bericht is verplicht." },
        { status: 400 }
      );
    }

    // Get document for context
    const doc = await DocumentModel.findById(id)
      .select("title chatMode language content.originalText content.summary.original")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    // Block AI chat requests for terms-only documents (no free questions allowed)
    if (doc.chatMode === "terms-only") {
      return NextResponse.json(
        { error: "Dit document heeft alleen voorgedefinieerde begrippen." },
        { status: 403 }
      );
    }

    // Build context - use summary + first chunk of original text
    const docContext =
      doc.content?.originalText?.slice(0, 50000) ||
      doc.content?.summary?.original ||
      "";

    const conversationHistory = (history || []).map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    const lang: DocumentLanguage = (doc.language as DocumentLanguage) || "nl";
    const L = getLangStrings(lang);

    const chatStartTime = Date.now();
    const response = await anthropic.messages.create({
      model: MODELS.chat,
      max_tokens: 1024,
      system: `${L.chatSystemPrompt(doc.title)}

${lang === "nl" ? "Documentinhoud" : "Document content"}:
${docContext}`,
      messages: [
        ...conversationHistory,
        { role: "user", content: message },
      ],
    });

    const assistantResponse =
      response.content[0].type === "text" ? response.content[0].text : "";

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

    const res = NextResponse.json({
      data: { response: assistantResponse },
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
