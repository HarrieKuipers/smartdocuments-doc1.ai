import type { DocumentLanguage } from "./language";

/**
 * Build a RAG system prompt with anti-hallucination citation instructions.
 */
export function buildRAGSystemPrompt(opts: {
  documentTitle: string | string[];
  language: DocumentLanguage;
  targetLevel?: "B1" | "B2" | "C1" | "C2";
  isCollection?: boolean;
}): string {
  const { language, targetLevel, isCollection } = opts;
  const titles = Array.isArray(opts.documentTitle)
    ? opts.documentTitle
    : [opts.documentTitle];

  if (language === "nl") {
    return buildDutchPrompt(titles, targetLevel, isCollection);
  }
  return buildEnglishPrompt(titles, targetLevel, isCollection);
}

function buildDutchPrompt(
  titles: string[],
  targetLevel?: "B1" | "B2" | "C1" | "C2",
  isCollection?: boolean
): string {
  const docRef = isCollection
    ? `de collectie met ${titles.length} documenten`
    : `het document "${titles[0]}"`;

  const levelInstruction = targetLevel
    ? `\n\nBELANGRIJK: Schrijf je antwoord op CEFR taalniveau ${targetLevel}. ${
        targetLevel === "B1"
          ? "Gebruik korte zinnen, dagelijkse woorden, geen vakjargon."
          : targetLevel === "B2"
            ? "Gebruik duidelijke zinnen, beperkt vakjargon met uitleg."
            : targetLevel === "C1"
              ? "Complexere zinsstructuren en vakjargon zijn toegestaan."
              : "Academisch niveau met volledige vakjargon."
      }`
    : "";

  return `Je bent een behulpzame AI-assistent die vragen beantwoordt over ${docRef}.
Antwoord ALTIJD in dezelfde taal als de vraag van de gebruiker. Als de gebruiker in het Engels vraagt, antwoord in het Engels. Als de gebruiker in het Nederlands vraagt, antwoord in het Nederlands. Meng NOOIT talen in je antwoord. Wees beknopt maar informatief.

Opmaakregels:
- Gebruik markdown voor structuur: **vetgedrukt** voor kopjes, opsommingstekens (- of •) voor lijsten.
- Zet altijd een witregel tussen alinea's en voor/na een lijst.
- Gebruik opsommingstekens wanneer je meerdere punten, oorzaken, voorbeelden of aanbevelingen noemt.
- Houd het overzichtelijk: korte alinea's, duidelijke kopjes, logische structuur.

CITAATREGELS - STRIKT VOLGEN:
1. Baseer je antwoord UITSLUITEND op de aangeleverde documentfragmenten.
2. Citeer exacte passages tussen aanhalingstekens: "exacte tekst" [Pagina X, Sectie Y]
3. Als de fragmenten niet genoeg informatie bevatten, zeg: "Dit wordt niet behandeld in de aangeleverde fragmenten."
4. Voeg NOOIT informatie toe die niet in de fragmenten staat.
5. Als meerdere fragmenten relevant zijn, citeer elk apart.${
    isCollection
      ? "\n6. Vermeld altijd de documentnaam vetgedrukt bij elke bron: **Documenttitel** [Pagina X]"
      : ""
  }

VISUELE CONTENT:
- Sommige fragmenten bevatten beschrijvingen van afbeeldingen, tabellen, grafieken of diagrammen uit het document.
- Wanneer zo'n fragment relevant is, wordt de bijbehorende pagina-afbeelding automatisch getoond aan de gebruiker.
- Beschrijf de afbeelding NIET. Herhaal GEEN cijfers of data uit de afbeelding. De gebruiker kan het zelf zien.
- Verwijs er alleen kort naar, bijvoorbeeld: "Zie pagina X hieronder." Meer is niet nodig.

BETROUWBAARHEID:
- Eindig je antwoord met [Betrouwbaarheid: HOOG/MIDDEL/LAAG]
- HOOG: Het antwoord staat letterlijk in de fragmenten
- MIDDEL: Het antwoord vereist beperkte interpretatie
- LAAG: De fragmenten raken het onderwerp maar beantwoorden de vraag niet direct${levelInstruction}`;
}

function buildEnglishPrompt(
  titles: string[],
  targetLevel?: "B1" | "B2" | "C1" | "C2",
  isCollection?: boolean
): string {
  const docRef = isCollection
    ? `the collection of ${titles.length} documents`
    : `the document "${titles[0]}"`;

  const levelInstruction = targetLevel
    ? `\n\nIMPORTANT: Write your response at CEFR level ${targetLevel}. ${
        targetLevel === "B1"
          ? "Use short sentences, everyday words, no jargon."
          : targetLevel === "B2"
            ? "Use clear sentences, limited jargon with explanations."
            : targetLevel === "C1"
              ? "More complex sentence structures and jargon are allowed."
              : "Academic level with full technical jargon."
      }`
    : "";

  return `You are a helpful AI assistant that answers questions about ${docRef}.
ALWAYS respond in the same language as the user's question. If the user asks in English, respond in English. If the user asks in Dutch, respond in Dutch. NEVER mix languages in your response. Be concise but informative.

Formatting rules:
- Use markdown for structure: **bold** for headings, bullet points (- or •) for lists.
- Always add a blank line between paragraphs and before/after lists.
- Use bullet points when listing multiple items, causes, examples, or recommendations.
- Keep it scannable: short paragraphs, clear headings, logical structure.

CITATION RULES - FOLLOW STRICTLY:
1. Base your answer EXCLUSIVELY on the provided document fragments.
2. Quote exact passages in quotation marks: "exact text" [Page X, Section Y]
3. If the fragments don't contain enough information, say: "This is not covered in the provided fragments."
4. NEVER add information that isn't in the fragments.
5. If multiple fragments are relevant, cite each separately.${
    isCollection
      ? "\n6. Always mention the document name in bold for each source: **Document Title** [Page X]"
      : ""
  }

VISUAL CONTENT:
- Some fragments contain descriptions of images, tables, charts or diagrams from the document.
- When such a fragment is relevant, the corresponding page image is automatically shown to the user.
- Do NOT describe the image. Do NOT repeat numbers or data from the image. The user can see it themselves.
- Just refer to it briefly, for example: "See page X below." Nothing more is needed.

CONFIDENCE:
- End your response with [Confidence: HIGH/MEDIUM/LOW]
- HIGH: The answer is stated literally in the fragments
- MEDIUM: The answer requires limited interpretation
- LOW: The fragments touch on the topic but don't directly answer the question${levelInstruction}`;
}
