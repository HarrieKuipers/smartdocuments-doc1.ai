export type DocumentLanguage = "nl" | "en";

/**
 * Language-specific strings for AI prompts and reader UI.
 */
const LANG = {
  nl: {
    // AI prompt instructions
    outputLanguage: "Alle output in het Nederlands",
    outputLanguageFull: "Alle output in het Nederlands, op taalniveau B1 (korte zinnen, dagelijkse woorden).",
    respondInLanguage: "Antwoord altijd in het Nederlands.",
    simpleLanguage: "Gebruik begrijpelijke taal (B1 niveau)",

    // analyze-content
    analyzePrompt: `Je bent een expert document-analist. Analyseer de volgende tekst en genereer:
1. Een uitgebreide samenvatting (managementniveau)
2. De belangrijkste hoofdpunten (5-10 punten) met per punt een korte uitleg van 2-3 zinnen die meer context en achtergrond geeft
3. Belangrijke bevindingen (4-6 stuks)`,
    findingsInstruction: `BELANGRIJK voor de bevindingen (findings):
- De "category" moet een korte, actiegerichte label zijn op taalniveau B1 — geen academische of abstracte termen.
- Gebruik vragen of duidelijke actietaal die de lezer direct begrijpt.
- Voorbeelden van GOEDE categorieën:
  • "De regels op een rij" (in plaats van "Juridisch")
  • "Hoe pak je dit aan?" (in plaats van "Proces" of "Onderzoeksmethodiek")
  • "Harde eisen en deadlines" (in plaats van "Handhaving" of "Procedurele vereisten")
  • "Uitzonderingen & let op" (in plaats van "Bijzondere situaties")
  • "Wat als het misgaat?" (in plaats van "Risico's" of "Handhavingsrisico's")
  • "Wat levert het op?" (in plaats van "Financieel" of "Impact")
  • "Wat gaat er veranderen?" (in plaats van "Vooruitzicht" of "Strategie")
- Kies categorieën die passen bij het specifieke document. Gebruik bovenstaande als inspiratie, niet als vaste lijst.
- De "title" moet ook in duidelijk, begrijpelijk Nederlands zijn (B1-niveau).
- De "content" is een korte beschrijving van de bevinding in eenvoudige taal.`,
    perspectiveInternal: (docType: string, audience: string) =>
      `\nBELANGRIJK: Dit is een intern document (type: ${docType}) bedoeld voor ${audience}. Schrijf de samenvatting en hoofdpunten vanuit het perspectief van de medewerker/lezer die dit document moet gebruiken. Spreek de lezer direct aan (je/jij). Behoud het instructieve karakter. Vermijd het uitleggen van de organisatie zelf alsof de lezer een buitenstaander is. Focus op actiegerichte stappen en heldere interne procedures.`,
    jsonExample: `{
  "summary": "uitgebreide samenvatting van het document...",
  "keyPoints": [
    {"text": "hoofdpunt tekst", "explanation": "korte uitleg van 2-3 zinnen met meer context en achtergrond over dit hoofdpunt", "linkedTerms": ["term1", "term2"]}
  ],
  "findings": [
    {"category": "De regels op een rij", "title": "korte, duidelijke titel", "content": "beschrijving in eenvoudige taal"}
  ]
}`,

    // generate-summary
    summaryPrompt: "Herschrijf de volgende samenvatting op drie verschillende taalniveaus.",
    summaryLevels: `Taalniveaus:
- B1: Eenvoudig Nederlands. Korte zinnen, dagelijkse woorden, geen vakjargon. Geschikt voor mensen met basiskennis van het Nederlands.
- B2: Gemiddeld niveau. Duidelijke zinnen, beperkt vakjargon met uitleg, geschikt voor het algemene publiek.
- C1: Geavanceerd/academisch niveau. Complexere zinsstructuren, vakjargon toegestaan, geschikt voor professionals.`,
    summaryPerspectiveInternal: (audience: string) =>
      `\nBELANGRIJK: Dit is een intern document bedoeld voor ${audience}. Herschrijf naar een helder en overzichtelijk format speciaal voor ${audience}. Behoud het instructieve karakter. Spreek de lezer direct aan (je/jij) en vertel wat zij moeten doen. Vermijd het uitleggen van de organisatie zelf alsof de lezer een buitenstaander is. Focus op actiegerichte stappen en heldere interne procedures.`,

    // extract-terms
    termsPrompt: "Identificeer de belangrijkste vakbegrippen en termen in de volgende tekst. Geef voor elk begrip een uitgebreide, duidelijke definitie van 2-4 zinnen die het begrip volledig uitlegt in de context van dit document. De definitie moet begrijpelijk zijn voor iemand zonder vakkennis en moet uitleggen waarom het begrip relevant is in dit document. Tel ook hoe vaak de term voorkomt.",

    // extract-metadata
    metadataPrompt: "Analyseer de volgende tekst en extraheer metadata.",
    metadataDisplayTitle: "een korte, communicatieve titel die de kern van het document duidelijk maakt voor de lezer (max 15 woorden, B1 niveau, geen jargon)",

    // generate-display-title
    displayTitlePrompt: "Je bent een communicatie-expert. Gegeven de originele documenttitel en een samenvatting, genereer een communicatieve, toegankelijke titel die de kern van het document direct duidelijk maakt voor de lezer.",
    displayTitleRules: `Regels:
- De titel moet kort zijn (max 10-15 woorden)
- Gebruik begrijpelijke taal (B1 niveau)
- Maak het concreet: wat leert de lezer of waar gaat het document over?
- Geen afkortingen of jargon tenzij zeer bekend
- Geen aanhalingstekens om de titel`,

    // analyze-audience
    audiencePrompt: `Analyseer het volgende brondocument en bepaal de primaire doelgroep en het documenttype.

Let op specifieke zinsneden zoals:
- "voor intern gebruik", "werkinstructie", "handleiding", "protocol", "werkwijze", "dienstverband"
- "interne medewerkers", "inspecteurs", "behandelaars", "adviseurs"
- Instructieve of procedurele taal gericht op medewerkers

Bepaal of het document gericht is op een EXTERN publiek (burgers, klanten, het algemene publiek) of een INTERN publiek (medewerkers, inspecteurs, behandelaars).`,
    audienceJsonExample: `{
  "documentType": "kort type, bijv. 'Interne werkinstructie', 'Beleidsdocument', 'Jaarverslag', 'Publieksfolder'",
  "audience": "beschrijving van de doelgroep, bijv. 'Interne medewerkers / inspecteurs', 'Burgers en bedrijven', 'Algemeen publiek'",
  "isExternal": true of false
}`,

    // chat
    chatSystemPrompt: (title: string) =>
      `Je bent een behulpzame AI-assistent die vragen beantwoordt over het document "${title}".
Beantwoord vragen uitsluitend op basis van de inhoud van het document.
Als het antwoord niet in het document staat, zeg dat dan eerlijk.
Antwoord altijd in het Nederlands. Wees beknopt maar informatief.`,

    // Reader UI labels
    reader: {
      summary: "Samenvatting",
      keyPoints: "Hoofdpunten",
      findings: "Belangrijke Bevindingen",
      languageLevel: "Taalniveau",
      author: "Auteur",
      date: "Datum",
      version: "Versie",
      pages: "pagina's",
      downloadPdf: "Download PDF",
      original: "Origineel",
      loadingExplanation: "Uitleg laden...",
      loadingContext: "Meer context laden...",
      couldNotLoad: "Kon geen uitleg ophalen. Probeer het later opnieuw.",
      levelBadge: (level: string) => `${level} Taalniveau`,
      passwordTitle: "Beveiligd Document",
      passwordDescription: "Dit document is beschermd met een wachtwoord.",
      passwordPlaceholder: "Voer wachtwoord in",
      passwordInvalid: "Ongeldig wachtwoord. Probeer het opnieuw.",
      passwordOpen: "Openen",
      infoBoxText: "Voor volledige details en uitvoeringsplannen, zie het oorspronkelijke document.",
      for: "Voor",
      notFound: "Document niet gevonden.",
    },
  },
  en: {
    outputLanguage: "All output in English",
    outputLanguageFull: "All output in English, at a B1 reading level (short sentences, everyday words).",
    respondInLanguage: "Always respond in English.",
    simpleLanguage: "Use clear, accessible language (B1 level)",

    analyzePrompt: `You are an expert document analyst. Analyze the following text and generate:
1. A comprehensive summary (management level)
2. The most important key points (5-10 points) with a brief explanation of 2-3 sentences per point providing more context and background
3. Important findings (4-6 items)`,
    findingsInstruction: `IMPORTANT for findings:
- The "category" should be a short, action-oriented label at B1 reading level — no academic or abstract terms.
- Use questions or clear action language that the reader immediately understands.
- Examples of GOOD categories:
  • "The rules at a glance" (instead of "Legal framework")
  • "How to get started" (instead of "Process" or "Research methodology")
  • "Hard requirements and deadlines" (instead of "Enforcement" or "Procedural requirements")
  • "Exceptions & watch out" (instead of "Special circumstances")
  • "What if things go wrong?" (instead of "Risks" or "Enforcement risks")
  • "What are the benefits?" (instead of "Financial" or "Impact")
  • "What will change?" (instead of "Outlook" or "Strategy")
- Choose categories that fit the specific document. Use the above as inspiration, not a fixed list.
- The "title" should also be in clear, understandable English (B1 level).
- The "content" is a short description of the finding in simple language.`,
    perspectiveInternal: (docType: string, audience: string) =>
      `\nIMPORTANT: This is an internal document (type: ${docType}) intended for ${audience}. Write the summary and key points from the perspective of the employee/reader who needs to use this document. Address the reader directly (you). Maintain the instructional character. Avoid explaining the organization itself as if the reader is an outsider. Focus on action-oriented steps and clear internal procedures.`,
    jsonExample: `{
  "summary": "comprehensive summary of the document...",
  "keyPoints": [
    {"text": "key point text", "explanation": "brief explanation of 2-3 sentences with more context and background about this key point", "linkedTerms": ["term1", "term2"]}
  ],
  "findings": [
    {"category": "The rules at a glance", "title": "short, clear title", "content": "description in simple language"}
  ]
}`,

    summaryPrompt: "Rewrite the following summary at three different reading levels.",
    summaryLevels: `Reading levels:
- B1: Simple English. Short sentences, everyday words, no jargon. Suitable for people with basic English knowledge.
- B2: Intermediate level. Clear sentences, limited jargon with explanations, suitable for the general public.
- C1: Advanced/academic level. More complex sentence structures, jargon allowed, suitable for professionals.`,
    summaryPerspectiveInternal: (audience: string) =>
      `\nIMPORTANT: This is an internal document intended for ${audience}. Rewrite in a clear and structured format specifically for ${audience}. Maintain the instructional character. Address the reader directly (you) and tell them what they need to do. Avoid explaining the organization itself as if the reader is an outsider. Focus on action-oriented steps and clear internal procedures.`,

    termsPrompt: "Identify the most important technical terms and concepts in the following text. Provide for each term a comprehensive, clear definition of 2-4 sentences that fully explains the term in the context of this document. The definition should be understandable for someone without specialist knowledge and should explain why the term is relevant in this document. Also count how often the term appears.",

    metadataPrompt: "Analyze the following text and extract metadata.",
    metadataDisplayTitle: "a short, communicative title that clearly conveys the essence of the document to the reader (max 15 words, B1 level, no jargon)",

    displayTitlePrompt: "You are a communications expert. Given the original document title and a summary, generate a communicative, accessible title that immediately makes the essence of the document clear to the reader.",
    displayTitleRules: `Rules:
- The title should be short (max 10-15 words)
- Use clear, accessible language (B1 level)
- Make it concrete: what will the reader learn or what is the document about?
- No abbreviations or jargon unless very well-known
- No quotation marks around the title`,

    audiencePrompt: `Analyze the following source document and determine the primary audience and document type.

Pay attention to specific phrases such as:
- "for internal use", "work instruction", "manual", "protocol", "procedure", "employment"
- "internal employees", "inspectors", "case workers", "advisors"
- Instructive or procedural language aimed at employees

Determine whether the document is aimed at an EXTERNAL audience (citizens, customers, the general public) or an INTERNAL audience (employees, inspectors, case workers).`,
    audienceJsonExample: `{
  "documentType": "short type, e.g. 'Internal work instruction', 'Policy document', 'Annual report', 'Public brochure'",
  "audience": "description of target audience, e.g. 'Internal employees / inspectors', 'Citizens and businesses', 'General public'",
  "isExternal": true or false
}`,

    chatSystemPrompt: (title: string) =>
      `You are a helpful AI assistant that answers questions about the document "${title}".
Answer questions exclusively based on the content of the document.
If the answer is not in the document, say so honestly.
Always respond in English. Be concise but informative.`,

    reader: {
      summary: "Summary",
      keyPoints: "Key Points",
      findings: "Important Findings",
      languageLevel: "Language Level",
      author: "Author",
      date: "Date",
      version: "Version",
      pages: "pages",
      downloadPdf: "Download PDF",
      original: "Original",
      loadingExplanation: "Loading explanation...",
      loadingContext: "Loading more context...",
      couldNotLoad: "Could not load explanation. Please try again later.",
      levelBadge: (level: string) => `${level} Level`,
      passwordTitle: "Protected Document",
      passwordDescription: "This document is protected with a password.",
      passwordPlaceholder: "Enter password",
      passwordInvalid: "Invalid password. Please try again.",
      passwordOpen: "Open",
      infoBoxText: "For full details and implementation plans, see the original document.",
      for: "For",
      notFound: "Document not found.",
    },
  },
} as const;

export type LangStrings = (typeof LANG)["nl"];

export function getLangStrings(lang: DocumentLanguage = "nl"): LangStrings {
  return (LANG[lang] || LANG.nl) as LangStrings;
}
