import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import DocumentModel from "@/models/Document";
import CollectionChatMessage from "@/models/CollectionChatMessage";
import anthropic, { MODELS } from "@/lib/ai/client";
import {
  buildCollectionContext,
  parseDocumentReferences,
} from "@/lib/ai/collection-chat-context";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Bericht is verplicht." },
        { status: 400 }
      );
    }

    // Find collection
    const collection = await Collection.findOne({ slug }).lean();
    if (!collection) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    // Check password if needed
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

    // Get all published documents in collection
    const docs = await DocumentModel.find({
      collectionId: collection._id,
      status: "ready",
    })
      .select(
        "title shortId content.summary.original content.keyPoints content.terms"
      )
      .lean();

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "Geen documenten in deze collectie." },
        { status: 404 }
      );
    }

    // Build multi-document context
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

    const context = buildCollectionContext(docContexts);

    const conversationHistory = (history || []).slice(-10).map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    const systemPrompt = `Je bent een behulpzame AI-assistent die vragen beantwoordt over de collectie "${collection.name}".
Deze collectie bevat ${docs.length} documenten. Beantwoord vragen op basis van de inhoud van alle documenten.

BELANGRIJK: Noem altijd de naam van de partij of organisatie (vetgedrukt) wanneer je hun standpunt beschrijft, bijvoorbeeld: **PvdA** wil meer sociale huur.
Gebruik NIET het formaat [Document: "..."] — noem gewoon de partij- of documentnaam inline in de tekst.
Als het antwoord niet in de documenten staat, zeg dat dan eerlijk.
Antwoord altijd in het Nederlands. Wees beknopt maar informatief.

Opmaakregels:
- Gebruik markdown voor structuur: **vetgedrukt** voor kopjes en partijnamen, opsommingstekens (- of •) voor lijsten.
- Zet altijd een witregel tussen alinea's en voor/na een lijst.
- Begin elk standpunt met de partijnaam vetgedrukt.

Documentinhoud:
${context}`;

    const chatStartTime = Date.now();
    const response = await anthropic.messages.create({
      model: MODELS.chat,
      max_tokens: 1536,
      system: systemPrompt,
      messages: [...conversationHistory, { role: "user", content: message }],
    });

    const assistantResponse =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse source document references
    const sourceDocuments = parseDocumentReferences(
      assistantResponse,
      docs.map((d) => ({ title: d.title, shortId: d.shortId }))
    );

    // Store chat history
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
