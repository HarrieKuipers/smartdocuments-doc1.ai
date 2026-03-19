import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import DocumentModel from "@/models/Document";
import anthropic, { MODELS } from "@/lib/ai/client";
import bcrypt from "bcryptjs";

interface ComparisonTheme {
  theme: string;
  positions: { documentTitle: string; shortId: string; position: string }[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const { documentIds } = await req.json();

    if (!Array.isArray(documentIds) || documentIds.length < 2) {
      return NextResponse.json(
        { error: "Selecteer minimaal 2 documenten om te vergelijken." },
        { status: 400 }
      );
    }

    if (documentIds.length > 6) {
      return NextResponse.json(
        { error: "Maximaal 6 documenten tegelijk vergelijken." },
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

    // Fetch selected documents with content
    const docs = await DocumentModel.find({
      shortId: { $in: documentIds },
      collectionId: collection._id,
      status: "ready",
    })
      .select(
        "title shortId content.summary.original content.keyPoints content.findings content.terms"
      )
      .lean();

    if (docs.length < 2) {
      return NextResponse.json(
        { error: "Onvoldoende documenten gevonden." },
        { status: 404 }
      );
    }

    // Build document context for comparison
    const docContext = docs
      .map((doc) => {
        const parts = [
          `--- Document: "${doc.title}" [ID: ${doc.shortId}] ---`,
          `Samenvatting: ${doc.content?.summary?.original || "Geen samenvatting"}`,
        ];

        const keyPoints = doc.content?.keyPoints || [];
        if (keyPoints.length > 0) {
          parts.push(
            `Hoofdpunten:\n${keyPoints.map((kp: { text: string }) => `- ${kp.text}`).join("\n")}`
          );
        }

        const findings = doc.content?.findings || [];
        if (findings.length > 0) {
          parts.push(
            `Bevindingen:\n${findings.map((f: { category: string; title: string; content: string }) => `- [${f.category}] ${f.title}: ${f.content}`).join("\n")}`
          );
        }

        const terms = doc.content?.terms || [];
        if (terms.length > 0) {
          parts.push(
            `Begrippen: ${terms.map((t: { term: string }) => t.term).join(", ")}`
          );
        }

        return parts.join("\n");
      })
      .join("\n\n");

    const docTitles = docs.map((d) => `"${d.title}" [${d.shortId}]`).join(", ");

    const systemPrompt = `Je bent een expert in het vergelijken van documenten. Vergelijk de volgende ${docs.length} documenten en identificeer de belangrijkste thema's waarover ze schrijven.

Voor elk thema, geef een beknopte samenvatting van het standpunt/de inhoud van elk document over dat thema. Als een document niets zegt over een bepaald thema, geef dan aan: "Niet behandeld".

Documenten: ${docTitles}

BELANGRIJK: Antwoord UITSLUITEND in het volgende JSON-formaat, zonder extra tekst:
{
  "themes": [
    {
      "theme": "Naam van het thema",
      "positions": [
        {
          "documentTitle": "Titel van het document",
          "shortId": "shortId",
          "position": "Beknopte samenvatting van standpunt (1-3 zinnen)"
        }
      ]
    }
  ]
}

Richtlijnen:
- Identificeer 4-8 relevante thema's op basis van de documenten
- Zorg dat elk document in elke thema-sectie voorkomt
- Houd posities beknopt: maximaal 3 zinnen per standpunt
- Gebruik duidelijke, beschrijvende themanamen
- Sorteer thema's op relevantie (belangrijkste eerst)
- Antwoord in het Nederlands

Documentinhoud:
${docContext}`;

    const response = await anthropic.messages.create({
      model: MODELS.processing,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Vergelijk deze ${docs.length} documenten en geef een thematische vergelijking in JSON-formaat.`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    let comparison: { themes: ComparisonTheme[] };
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      comparison = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse comparison response:", responseText);
      return NextResponse.json(
        { error: "Kon vergelijking niet genereren. Probeer het opnieuw." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        documents: docs.map((d) => ({ title: d.title, shortId: d.shortId })),
        themes: comparison.themes,
      },
    });
  } catch (error) {
    console.error("Collection compare error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het vergelijken." },
      { status: 500 }
    );
  }
}
