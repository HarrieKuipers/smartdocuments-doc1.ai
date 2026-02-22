import type { SchrijfwijzerRule } from "@/types/schrijfwijzer";

/**
 * NLA (Nederlandse Arbeidsinspectie) Schrijfwijzer — 21 rules for B1 writing.
 * Used as default seed for NLA organization.
 */
export const NLA_SCHRIJFWIJZER_RULES: SchrijfwijzerRule[] = [
  // === VOORBEREIDING (1-4) — niet van toepassing op rewrite ===
  {
    number: 1,
    category: "voorbereiding",
    title: "Bepaal het doel van de tekst",
    description:
      "Bepaal vooraf wat het doel is: informeren, instrueren, overtuigen of activeren.",
    mcpTools: [],
    weight: 1,
  },
  {
    number: 2,
    category: "voorbereiding",
    title: "Ken je lezer",
    description:
      "Schrijf voor je doelgroep. Houd rekening met hun kennisniveau en wat ze willen weten.",
    mcpTools: [],
    weight: 1,
  },
  {
    number: 3,
    category: "voorbereiding",
    title: "Bepaal de kernboodschap",
    description:
      "Formuleer de kernboodschap in één zin. Alles in de tekst moet deze boodschap ondersteunen.",
    mcpTools: [],
    weight: 1,
  },
  {
    number: 4,
    category: "voorbereiding",
    title: "Maak een structuurplan",
    description:
      "Bedenk van tevoren welke informatie je geeft en in welke volgorde.",
    mcpTools: [],
    weight: 1,
  },

  // === STRUCTUUR (5-8) ===
  {
    number: 5,
    category: "structuur",
    title: "Gebruik informatieve kopjes",
    description:
      "Gebruik kopjes die de inhoud van de alinea samenvatten. De lezer moet aan het kopje kunnen zien wat er in de alinea staat.",
    mcpTools: [],
    exampleBefore: "Achtergrond",
    exampleAfter: "Waarom controleren we bedrijven?",
    weight: 2,
  },
  {
    number: 6,
    category: "structuur",
    title: "Schrijf een goede inleiding",
    description:
      "Begin met de belangrijkste informatie. Vertel de lezer direct wat hij of zij moet weten of doen.",
    mcpTools: [],
    weight: 2,
  },
  {
    number: 7,
    category: "structuur",
    title: "Eén onderwerp per alinea",
    description:
      "Behandel één onderwerp per alinea. Begin elke alinea met de kernzin.",
    mcpTools: [],
    weight: 1,
  },
  {
    number: 8,
    category: "structuur",
    title: "Gebruik opsommingen",
    description:
      "Gebruik opsommingen voor lijsten van drie of meer items. Dit maakt de tekst overzichtelijker.",
    mcpTools: [],
    weight: 1,
  },

  // === ZINNEN (9-12) ===
  {
    number: 9,
    category: "zinnen",
    title: "Schrijf korte zinnen",
    description:
      "Schrijf zinnen van gemiddeld 10-12 woorden. Zet één boodschap per zin. Vermijd zinnen langer dan 20 woorden.",
    mcpTools: ["check_zinslengte"],
    exampleBefore:
      "De inspecteur stelt vast dat de werkgever niet voldoet aan de verplichting om een risico-inventarisatie en -evaluatie op te stellen, zoals bedoeld in artikel 5 van de Arbowet.",
    exampleAfter:
      "De inspecteur stelt vast dat de werkgever geen RI&E heeft. Dit is verplicht volgens artikel 5 van de Arbowet.",
    weight: 3,
  },
  {
    number: 10,
    category: "zinnen",
    title: "Schrijf actieve zinnen",
    description:
      "Benoem wie wat doet. Vervang passieve constructies door actieve. Gebruik alleen passief als de handelende persoon onbekend of onbelangrijk is.",
    mcpTools: ["check_passief_taalgebruik"],
    exampleBefore: "Er wordt door de inspecteur een controle uitgevoerd.",
    exampleAfter: "De inspecteur voert een controle uit.",
    weight: 3,
  },
  {
    number: 11,
    category: "zinnen",
    title: "Vermijd tangconstructies",
    description:
      "Plaats woorden die bij elkaar horen dicht bij elkaar. Voorkom dat er te veel woorden staan tussen het onderwerp en het werkwoord, of tussen delen van het werkwoord.",
    mcpTools: ["check_tangconstructies"],
    exampleBefore:
      "De werkgever moet de bij de arbeid betrokken werknemers beschermen.",
    exampleAfter:
      "De werkgever moet zijn werknemers beschermen bij de arbeid.",
    weight: 2,
  },
  {
    number: 12,
    category: "zinnen",
    title: "Gebruik geen dubbele ontkenningen",
    description:
      "Herformuleer dubbele ontkenningen positief. Ze maken de tekst moeilijker te begrijpen.",
    mcpTools: ["check_dubbele_ontkenning"],
    exampleBefore: "Het is niet onmogelijk dat de boete wordt verlaagd.",
    exampleAfter: "De boete kan worden verlaagd.",
    weight: 2,
  },

  // === WOORDEN (13-21) ===
  {
    number: 13,
    category: "woorden",
    title: "Gebruik concrete woorden",
    description:
      "Vermijd abstracte woorden. Gebruik concrete, beeldende woorden die de lezer direct begrijpt.",
    mcpTools: [],
    exampleBefore: "Het betreft een adequate voorziening.",
    exampleAfter: "Het gaat om een goede beschermingsmiddel.",
    weight: 2,
  },
  {
    number: 14,
    category: "woorden",
    title: "Vermijd nominalisaties",
    description:
      "Gebruik werkwoorden in plaats van zelfstandige naamwoorden die van werkwoorden zijn afgeleid. Dit maakt de tekst levendiger.",
    mcpTools: ["check_nominalisaties"],
    exampleBefore: "Na beoordeling van de situatie vindt overleg plaats.",
    exampleAfter: "Nadat we de situatie beoordelen, overleggen we.",
    weight: 2,
  },
  {
    number: 15,
    category: "woorden",
    title: "Gebruik alledaagse woorden",
    description:
      "Vervang moeilijke woorden door eenvoudige alternatieven die iedereen kent.",
    mcpTools: ["check_moeilijke_woorden"],
    exampleBefore: "U dient de geconstateerde tekortkomingen te verhelpen.",
    exampleAfter: "U moet de problemen oplossen die wij hebben gevonden.",
    weight: 3,
  },
  {
    number: 16,
    category: "woorden",
    title: "Vermijd vaktaal",
    description:
      "Gebruik geen vaktaal zonder uitleg. Als je een vakterm moet gebruiken, leg hem dan uit bij het eerste gebruik.",
    mcpTools: ["check_jargon"],
    exampleBefore: "De RI&E moet worden getoetst door een kerndeskundige.",
    exampleAfter:
      "De risico-inventarisatie (RI&E) moet worden gecontroleerd door een gecertificeerde deskundige.",
    weight: 3,
  },
  {
    number: 17,
    category: "woorden",
    title: "Vermijd formele woorden",
    description:
      "Vervang formele woorden door alledaagse alternatieven: conform → volgens, dienen → moeten, teneinde → om, middels → met, betreffende → over.",
    mcpTools: ["check_formele_woorden"],
    exampleBefore: "Conform het besluit dient u de situatie te herstellen.",
    exampleAfter: "Volgens het besluit moet u de situatie herstellen.",
    weight: 2,
  },
  {
    number: 18,
    category: "woorden",
    title: "Gebruik positieve formuleringen",
    description:
      "Formuleer positief in plaats van negatief. Vertel wat iemand wél moet doen.",
    mcpTools: [],
    exampleBefore: "Vergeet niet uw legitimatie mee te nemen.",
    exampleAfter: "Neem uw legitimatie mee.",
    weight: 1,
  },
  {
    number: 19,
    category: "woorden",
    title: "Gebruik signaalwoorden",
    description:
      "Gebruik signaalwoorden om het verband tussen zinnen duidelijk te maken: daarom, want, maar, bijvoorbeeld, ook.",
    mcpTools: [],
    weight: 1,
  },
  {
    number: 20,
    category: "woorden",
    title: "Spreek de lezer aan",
    description:
      "Spreek de lezer direct aan met 'u' of 'je'. Dit maakt de tekst persoonlijker en duidelijker.",
    mcpTools: [],
    exampleBefore: "Men dient de formulieren in te vullen.",
    exampleAfter: "Vul de formulieren in.",
    weight: 1,
  },
  {
    number: 21,
    category: "woorden",
    title: "Gebruik correcte spelling en grammatica",
    description:
      "Controleer de tekst op spelling- en grammaticafouten. Gebruik de officiële spelling volgens het Groene Boekje.",
    mcpTools: [],
    weight: 1,
  },
];

export const NLA_SCHRIJFWIJZER_NAME = "Schrijfwijzer NLA 2022";
export const NLA_SCHRIJFWIJZER_DESCRIPTION =
  "Schrijfwijzer van de Nederlandse Arbeidsinspectie voor taalniveau B1. 21 regels verdeeld over 4 categorieën: voorbereiding, structuur, zinnen en woorden.";
