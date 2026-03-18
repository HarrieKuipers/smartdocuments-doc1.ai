import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import DocumentModel from "@/models/Document";
import anthropic, { MODELS } from "@/lib/ai/client";
import {
  buildCollectionContext,
  parseDocumentReferences,
} from "@/lib/ai/collection-chat-context";

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

    const collection = await Collection.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    const questions = collection.chatSuggestions || [];
    if (questions.length === 0) {
      return NextResponse.json({ data: { cached: 0 } });
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
      return NextResponse.json({ data: { cached: 0 } });
    }

    // Build context once
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

          const sourceDocuments = parseDocumentReferences(
            answer,
            docs.map((d) => ({ title: d.title, shortId: d.shortId }))
          );

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

    await Collection.updateOne(
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
