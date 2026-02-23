# INSTRUCTION: Schrijfwijzer Rewrite Feature — doc1.ai
**Feature naam:** Smart Document Rewrite  
**Platform:** doc1.ai  
**Scope:** Nieuwe output-modus voor Smart Documents — herschrijf werkinstructies op basis van Schrijfwijzer-regels, met klantreview en statusbeheer  
**Datum:** Februari 2026

---

## 1. Context en achtergrond

doc1.ai transformeert PDF-documenten naar interactieve web-ervaringen. We hebben nu ~150 Smart Documents voor overheidsinstellingen zoals de Nederlandse Arbeidsinspectie.

### Nieuwe behoefte
Organisaties als de Nederlandse Arbeidsinspectie hebben een eigen **Schrijfwijzer** (stijlgids voor taalniveau B1). Ze willen hun bestaande werkinstructies herschrijven op basis van die regels — niet alleen weergeven, maar ook **taalkundig verbeteren** — en het resultaat ter review aanbieden aan interne klanten.

### De output
Een volledig herschreven document als **webview**, waarbij:
- De structuur van het origineel behouden blijft
- De inhoud is herschreven conform geselecteerde Schrijfwijzer-regels
- Het document gedeeld kan worden voor klantreview
- De klant feedback kan geven en een status kan toekennen
- De gebruiker aanpassingen kan doen via een page editor

---

## 2. Hergebruik vanuit bestaande projecten

**Controleer altijd eerst deze bronnen voordat je iets nieuws bouwt:**

### `leene-redactieflow`
**Gebruik hieruit:**
- `lib/pipeline.ts` → chunk-strategie, AI-orkestratie
- `lib/schrijfwijzer.ts` → Schrijfwijzer naar prompt-formaat conversie
- `lib/compliance.ts` → Deterministische compliance check
- `lib/safety-check.ts` → Vangnet voor AI-output (7 grammaticapatronen)
- `lib/ai-client.ts` → LLM API calls met retry/fallback
- `lib/chunker.ts` → Dynamische chunking op basis van tokens
- `components/editor/` → Basiseditor-componenten
- `types/schrijfwijzer.ts` → Schrijfwijzer schema types

**Pas op voor:** De "Karsten Sanders" persona in AI-prompts — verwijder die. Passief taalgebruik wordt op te veel plekken gecontroleerd (zie architectuurnota's in de chat). Gebruik alleen de MCP-detectie NIET de AI-detectie van passief.

### `MCP-SaaS-redactietool`
**Gebruik hieruit:**
- MCP tools: `check_passief_taalgebruik`, `check_zinslengte`, `check_jargon`, `check_dubbele_ontkenning`, `check_tangconstructies`, `check_moeilijke_woorden`, `analyseer_leesniveau`
- `mcp-client.ts` → MCP server communicatie
- Tool-selectie logica per schrijfwijzer-regel (zie level-configs)

**Mapping schrijfwijzer-regels → MCP tools:**
```typescript
const SCHRIJFWIJZER_TOOL_MAP: Record<number, string[]> = {
  9:  ["check_zinslengte"],           // Korte zinnen
  10: ["check_passief_taalgebruik"],  // Actieve zinnen
  11: ["check_tangconstructies"],     // Geen tangconstructies
  12: ["check_dubbele_ontkenning"],   // Geen dubbele ontkenningen
  13: [],                             // Concrete woorden → AI only
  14: ["check_nominalisaties"],       // Geen nominalisaties
  15: ["check_moeilijke_woorden"],    // Alledaagse woorden
  16: ["check_jargon"],               // Geen vaktaal
  17: ["check_formele_woorden"],      // Geen formele woorden
};
```

### `leene-redactiecompas-odmh`
**Gebruik hieruit:**
- Level-based UI component voor schrijfwijzer-selectie
- Score-balk component voor B1-compliance
- Vereenvoudigde editor-componenten voor mobiel

### `leene-ai-speechschrijver-new`
**Gebruik hieruit:**
- Toon-instellingen UI patroon (informeel ↔ formeel)
- "Bewaar voorkeursinstellingen" pattern
- Weergave van voor/na vergelijking

---

## 3. Functionele vereisten

### 3.1 Schrijfwijzer-selectie (gebruikerskant)

De gebruiker selecteert welke Schrijfwijzer-regels toegepast moeten worden op het document. Dit zijn de 21 regels uit de Schrijfwijzer van de Nederlandse Arbeidsinspectie (of een andere klant-specifieke schrijfwijzer).

**UI:** Checkboxes per regel, gegroepeerd in de 4 categorieën:
- Voorbereiding (regels 1–4) — niet van toepassing op rewrite
- Structuur (regels 5–8)
- Zinnen (regels 9–12)
- Woorden (regels 13–21)

**Defaults:** Regels 9, 10, 11, 12, 14, 15, 16, 17 zijn standaard aangevinkt (de meest impactvolle voor B1).

**Presets:** 
- "Lichte correctie" → regels 9, 10, 12, 15, 17
- "Volledig B1" → alle regels 9–21
- "Structuur & zinnen" → regels 5–12

**Opmerking:** Organisaties hebben eigen schrijfwijzers (niet alleen NLA). Het systeem moet schrijfwijzers per organisatie kunnen beheren. Gebruik de bestaande Schrijfwijzer schema types uit RedactieFlow.

### 3.2 AI Rewrite Pipeline

**Gebruik de pipeline-architectuur uit `leene-redactieflow` als basis.**

```
Origineel document (HTML/Markdown structuur)
        ↓
1. Structuur-extractie (bewaar headings, lijsten, metadata)
        ↓
2. Chunking (dynamisch, ~600 tokens per chunk, 150 tokens overlap)
        ↓
3. MCP checks (parallel, per geselecteerde regel)
        ↓
4. AI herschrijving per chunk (prompt gebouwd vanuit schrijfwijzer-regels)
        ↓
5. Deterministisch vangnet (safety-check.ts)
        ↓
6. Samenvoegen & structuur herstel
        ↓
7. B1-compliance score berekenen
        ↓
Herschreven document (HTML)
```

**Kritieke pipeline-regels:**
- Bewaar ALTIJD de documentstructuur (headings H1–H4, nummering, lijsten)
- Wijzig NOOIT de wettelijke verwijzingen (artikelnummers, wetnamen)
- Wijzig NOOIT eigennamen, organisatienamen, datums
- De AI herschrijft inhoud, verwijdert geen informatie
- Elke wijziging heeft een `diff` (oud → nieuw) voor de editor

**AI-prompt principe (geen persona, strakke instructie):**
```
Je herschrijft een werkinstructie van de Nederlandse Arbeidsinspectie.
Regels die je toepast: [geselecteerde schrijfwijzer-regels met uitleg]
Bewaar: documentstructuur, wettelijke verwijzingen, feitelijke informatie
Herschrijf: zinnen en woordkeuze conform de regels
Geef terug: herschreven tekst in dezelfde structuur als de input
```

### 3.3 Webview Output

De herschreven versie wordt weergegeven als een **interactieve webview** — zelfde formaat als bestaande Smart Documents in doc1.ai, maar uitgebreid met:

**Structuur webview:**
```
┌─────────────────────────────────────────────────┐
│  [Logo organisatie]  Documenttitel              │
│  Status-badge: [Concept / Ter review / Akkoord] │
├─────────────────────────────────────────────────┤
│  B1-score: ████████░░ 82%  |  [Origineel tonen] │
├────────────┬────────────────────────────────────┤
│  Inhouds-  │  Document content                  │
│  opgave    │  (herschreven tekst)               │
│  (sticky)  │                                    │
│            │  Gewijzigde passages zijn          │
│            │  [zichtbaar gemarkeerd]            │
│            │  of clean (toggle)                 │
│            │                                    │
│            │  💬 [Feedback toevoegen]           │
│            │     (per alinea of sectie)         │
└────────────┴────────────────────────────────────┘
```

**Toggle "Toon wijzigingen":** Markeert herschreven passages met een subtiele gele achtergrond + tooltip met originele tekst. Default: uitgeschakeld (clean view).

**"Vergelijk origineel":** Split-screen weergave naast elkaar. Optioneel.

### 3.4 Delen met klant (review flow)

**Geïnspireerd door Nova1's review-flow (zie `leene-ai-speechschrijver-new` en Nova1 status flow).**

De gebruiker kan een **shareable review-link** aanmaken:
- Unieke URL per document + versie: `/review/[token]`
- Geen login vereist voor de klant
- Link is optioneel beveiligd met een pincode
- Vervalt na X dagen (instelbaar, default 30 dagen)

**Review-link aanmaken:**
```
[Deel voor review] knop
  → Modal: 
    - Naam ontvanger (optioneel)
    - E-mailadres (voor notificatie bij feedback)
    - Pincode instellen (aan/uit)
    - Vervaldatum
    - [Link kopiëren] [E-mail sturen]
```

### 3.5 Klant review-interface

De klant opent de URL en ziet een **lichte review-interface** (geen doc1.ai branding nodig, wel klantlogo):

**Klant kan:**
1. **Document lezen** — volledige webview, zelfde als interne weergave
2. **Feedback geven per sectie** — klik op een sectie → sidebar of inline comment
3. **Algemene feedback geven** — tekstveld onderaan of in sidebar
4. **Status toekennen:**
   - ✅ **Akkoord** — document is goedgekeurd voor gebruik
   - 🔄 **Akkoord met aanpassingen** — goedgekeurd, maar met opmerkingen
   - ❌ **Niet akkoord** — niet goedgekeurd, revisie nodig

**Feedback-model per sectie:**
```typescript
interface SectionFeedback {
  id: string;
  sectionId: string;         // Verwijzing naar sectie in document
  sectionTitle: string;      // Weergavenaam
  comment: string;           // Tekst van de feedback
  type: 'general' | 'language' | 'content' | 'structure';
  createdAt: Date;
  author: string;            // Naam van reviewer (vrij invulveld)
}

interface ReviewSession {
  id: string;
  documentId: string;
  documentVersion: string;
  token: string;             // Unieke URL-token
  reviewerName?: string;
  reviewerEmail?: string;
  status: 'pending' | 'in_progress' | 'approved' | 'approved_with_changes' | 'rejected';
  feedback: SectionFeedback[];
  submittedAt?: Date;
  expiresAt: Date;
}
```

**Submit:** Na het geven van feedback klikt de klant op "Verstuur feedback". De gebruiker (doc1.ai kant) krijgt een notificatie.

### 3.6 Page editor (gebruikerskant)

Na ontvangen van klantfeedback kan de gebruiker aanpassingen doen via een **page editor** in doc1.ai.

**Geïnspireerd op de editor-componenten uit `leene-redactieflow`.**

**Editor-modus:** Sidebar met feedbackpunten links, document rechts. Gebruiker kan:
- Per feedbackpunt: de bijbehorende sectie in het document direct bewerken (rich text)
- Feedbackpunt markeren als "Verwerkt" of "Afgewezen"
- Vrij typen/aanpassen in het document (WYSIWYG, geen markdown-editing voor eindgebruiker)
- "Opnieuw herschrijven" op een specifieke sectie (AI-rewrite opnieuw uitvoeren voor die sectie met dezelfde of andere regels)

**Editor-layout:**
```
┌──────────────────┬──────────────────────────────┐
│  💬 Feedback     │  ✏️ Editor                   │
│  ─────────────── │  ──────────────────────────── │
│  [Sectie 2.1]    │  [Geselecteerde sectie is     │
│  "De zin is te   │   highlighted en editable]    │
│   lang..."       │                               │
│  [Verwerkt ✓]   │  Toolbar: B I U | H1 H2 H3   │
│  [Afwijzen ✗]   │           | Lijst | Link       │
│                  │                               │
│  [Sectie 3.3]    │  [Opnieuw herschrijven →]    │
│  "Vaktaal        │                               │
│   vermijden"     │                               │
│  [ ] Verwerkt   │                               │
└──────────────────┴──────────────────────────────┘
```

**Versiebeheer:** Elke opgeslagen versie maakt een nieuwe versie aan (v1, v2, v3...). De gebruiker kan naar een eerdere versie terugkeren. De klant kan ook een eerdere versie ter review krijgen.

---

## 4. Status-machine

Elk herschreven document heeft een status die de workflow bewaakt:

```
[draft] → [processing] → [rewritten] → [shared_for_review] → [in_review]
                                                                    ↓
                                         [approved] ←──────── [feedback_received]
                                         [approved_with_changes] ←┘
                                         [needs_revision] ←────────┘
                                              ↓
                                         [editing] → [shared_for_review] (nieuwe ronde)
```

**Status definities:**
```typescript
type DocumentStatus = 
  | 'draft'                  // Instellingen gekozen, nog niet verwerkt
  | 'processing'             // AI-pipeline draait
  | 'rewritten'              // Klaar, nog niet gedeeld
  | 'shared_for_review'      // Review-link aangemaakt, klant nog niet actief
  | 'in_review'              // Klant heeft document geopend
  | 'feedback_received'      // Klant heeft feedback ingediend
  | 'approved'               // Klant heeft akkoord gegeven
  | 'approved_with_changes'  // Akkoord + opmerkingen
  | 'needs_revision'         // Niet akkoord, revisie nodig
  | 'editing'                // Gebruiker verwerkt feedback
  | 'published';             // Definitief gepubliceerd als Smart Document
```

**Status-weergave:** Badge in het dashboard en bovenaan het document. Kleurcodering: grijs (draft), blauw (processing/shared), oranje (in_review/feedback), groen (approved), rood (needs_revision).

---

## 5. Databasemodel

Voeg toe aan het bestaande doc1.ai MongoDB schema:

```typescript
// Nieuwe collectie: document_rewrites
interface DocumentRewrite {
  _id: ObjectId;
  documentId: ObjectId;          // Verwijzing naar origineel Smart Document
  organizationId: ObjectId;      // Organisatie (voor schrijfwijzer-koppeling)
  
  // Schrijfwijzer configuratie
  schrijfwijzerId: ObjectId;     // Welke schrijfwijzer gebruikt
  selectedRules: number[];       // Bijv. [9, 10, 11, 12, 15, 16, 17]
  preset?: string;               // Naam van preset als gebruikt
  
  // Versies
  versions: RewriteVersion[];    // Array van versies
  activeVersionNumber: number;   // Huidige actieve versie
  
  // Status
  status: DocumentStatus;
  statusHistory: StatusChange[]; // Audit trail van statuswijzigingen
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;           // User ID
}

interface RewriteVersion {
  versionNumber: number;         // 1, 2, 3...
  content: string;               // HTML van herschreven document
  originalContent: string;       // HTML van origineel (voor diff)
  diffs: ContentDiff[];          // Per sectie: origineel vs herschreven
  b1Score: number;               // 0-100
  rulesApplied: number[];        // Welke regels daadwerkelijk wijzigingen gaven
  createdAt: Date;
}

interface ContentDiff {
  sectionId: string;
  sectionTitle: string;
  original: string;
  rewritten: string;
  changesCount: number;
}

interface StatusChange {
  from: DocumentStatus;
  to: DocumentStatus;
  changedAt: Date;
  changedBy: 'user' | 'client' | 'system';
  userId?: ObjectId;
  note?: string;
}

// Nieuwe collectie: review_sessions
interface ReviewSession {
  _id: ObjectId;
  rewriteId: ObjectId;
  documentId: ObjectId;
  versionNumber: number;
  
  token: string;                 // Unieke URL-token (UUID v4)
  pin?: string;                  // Bcrypt hash van pincode
  
  reviewerName?: string;
  reviewerEmail?: string;
  
  status: 'pending' | 'in_progress' | 'approved' | 'approved_with_changes' | 'rejected';
  feedback: SectionFeedback[];
  generalFeedback?: string;
  
  openedAt?: Date;
  submittedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

// Nieuwe collectie: schrijfwijzers
interface Schrijfwijzer {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;                  // Bijv. "Schrijfwijzer NLA 2022"
  description?: string;
  
  rules: SchrijfwijzerRule[];
  
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SchrijfwijzerRule {
  number: number;               // 1-21 (of uitgebreid voor eigen regels)
  category: 'voorbereiding' | 'structuur' | 'zinnen' | 'woorden';
  title: string;                // "Schrijf korte zinnen"
  description: string;         // Uitleg voor AI-prompt
  mcpTools: string[];          // Gekoppelde MCP tools
  exampleBefore?: string;      // Voorbeeld: fout
  exampleAfter?: string;       // Voorbeeld: goed
  weight: number;              // Impact op B1-score (1-3)
}
```

---

## 6. API Routes

Voeg toe aan de bestaande doc1.ai API:

```
POST   /api/rewrites                          # Start nieuwe rewrite
GET    /api/rewrites/:id                      # Haal rewrite op
GET    /api/rewrites/:id/status               # Poll pipeline status
PUT    /api/rewrites/:id/content              # Sla editor-wijzigingen op
POST   /api/rewrites/:id/publish              # Publiceer als Smart Document

POST   /api/rewrites/:id/review-sessions      # Maak review-link aan
GET    /api/rewrites/:id/review-sessions      # Lijst van review-sessies
DELETE /api/rewrites/:id/review-sessions/:sid # Verwijder review-link

GET    /api/review/:token                     # Klant: laad review (public)
POST   /api/review/:token/feedback            # Klant: stuur feedback (public)
POST   /api/review/:token/status              # Klant: stel status in (public)

GET    /api/schrijfwijzers                    # Lijst schrijfwijzers organisatie
POST   /api/schrijfwijzers                    # Maak schrijfwijzer aan
PUT    /api/schrijfwijzers/:id               # Update schrijfwijzer
```

---

## 7. Frontend Routes (Next.js)

```
/documents/[id]/rewrite                # Start rewrite-flow (regel-selectie)
/documents/[id]/rewrite/[rewriteId]    # Rewrite resultaat + editor
/documents/[id]/rewrite/[rewriteId]/share  # Review-link beheer
/review/[token]                        # Klant review-pagina (public)
/settings/schrijfwijzers               # Beheer schrijfwijzers organisatie
```

---

## 8. Component-structuur

```
src/
├── components/
│   ├── rewrite/
│   │   ├── RuleSelector.tsx          # Schrijfwijzer-regel keuze UI
│   │   ├── RewriteProgress.tsx       # Pipeline voortgang (realtime)
│   │   ├── RewriteWebview.tsx        # Herschreven document weergave
│   │   ├── DiffToggle.tsx            # Toggle wijzigingen tonen/verbergen
│   │   ├── B1ScoreBadge.tsx          # Score weergave (hergebruik RedactieCompas)
│   │   ├── VersionSelector.tsx       # Versie-dropdown
│   │   └── PageEditor.tsx            # Editor met feedback-sidebar
│   │
│   ├── review/
│   │   ├── ShareModal.tsx            # Review-link aanmaken modal
│   │   ├── ReviewSessionList.tsx     # Overzicht gedeelde links + status
│   │   ├── ClientReviewPage.tsx      # Klant-facing review interface
│   │   ├── FeedbackSidebar.tsx       # Feedback per sectie
│   │   ├── StatusSelector.tsx        # Akkoord/niet akkoord knoppen
│   │   └── FeedbackList.tsx          # Overzicht feedback in editor
│   │
│   └── shared/
│       ├── StatusBadge.tsx           # Hergebruik in hele app
│       └── SectionHighlight.tsx      # Highlight sectie in document
│
├── lib/
│   ├── rewrite-pipeline.ts           # AI pipeline (gebaseerd op RedactieFlow)
│   ├── schrijfwijzer-mapper.ts       # Regels → AI-prompt conversie
│   ├── mcp-client.ts                 # Hergebruik uit bestaande projecten
│   ├── diff-engine.ts                # Bereken diffs per sectie
│   └── b1-scorer.ts                  # B1-score berekening
│
└── types/
    ├── rewrite.ts                    # DocumentRewrite, RewriteVersion types
    ├── review.ts                     # ReviewSession, SectionFeedback types
    └── schrijfwijzer.ts              # SchrijfwijzerRule types
```

---

## 9. Implementatie-volgorde

### Fase 1 — Core pipeline (week 1-2)
1. Database-schema aanmaken (document_rewrites, review_sessions, schrijfwijzers)
2. Seed NLA Schrijfwijzer (21 regels) als default schrijfwijzer
3. API routes: POST /rewrites, GET /rewrites/:id/status
4. Rewrite-pipeline implementeren (hergebruik `leene-redactieflow` chunker + safety-check)
5. RuleSelector.tsx component
6. RewriteProgress.tsx (realtime polling of WebSocket)

### Fase 2 — Webview & editor (week 3-4)
7. RewriteWebview.tsx (herschreven document weergave)
8. DiffToggle.tsx + diff-engine.ts
9. VersionSelector.tsx + versiebeheer
10. PageEditor.tsx (basis WYSIWYG op basis van Tiptap of Slate.js)
11. B1ScoreBadge.tsx (hergebruik RedactieCompas component)

### Fase 3 — Review flow (week 5-6)
12. ShareModal.tsx + POST /review-sessions
13. ClientReviewPage.tsx (public route /review/[token])
14. FeedbackSidebar.tsx (per sectie feedback)
15. StatusSelector.tsx (akkoord/niet akkoord)
16. POST /review/:token/feedback + /status endpoints
17. E-mail notificaties bij ontvangen feedback

### Fase 4 — Dashboard & afwerking (week 7)
18. FeedbackList.tsx in editor (verwerk feedback workflow)
19. StatusBadge.tsx door hele app
20. ReviewSessionList.tsx
21. Schrijfwijzer-beheer (/settings/schrijfwijzers)
22. Preset-configuratie (Lichte correctie / Volledig B1 / Structuur & zinnen)

---

## 10. Technische beslissingen

### Rich text editor
**Gebruik Tiptap** (gebaseerd op ProseMirror). Redenen:
- Headless, makkelijk te stylen
- Goede Nederlandse taalondersteuning
- Werkt goed met bestaande HTML-structuur van Smart Documents
- Collaborative editing mogelijk in de toekomst

### Real-time pipeline status
Gebruik **Server-Sent Events (SSE)** voor pipeline-voortgang. Geen WebSocket overhead nodig voor eenrichtingsverkeer. Pattern al aanwezig in doc1.ai voor de chat-assistant.

### Schrijfwijzer-opslag
Schrijfwijzers zijn per organisatie opgeslagen in MongoDB. Seed de NLA-schrijfwijzer bij onboarding van de NLA-organisatie. Andere organisaties kunnen hun eigen schrijfwijzer uploaden (JSON of UI-invulformulier).

### Diff-weergave
Gebruik `diff-match-patch` library voor tekstvergelijking. Weergave op alineaniveau (niet op woordniveau — te rommelig voor eindgebruikers).

### Review token
UUID v4 als token. Sla op in MongoDB met `expiresAt` index voor automatisch verlopen. Pincode als bcrypt hash.

---

## 11. Aandachtspunten

1. **Structuurbehoud is heilig.** De AI mag NOOIT een heading verwijderen, nummering wijzigen of de volgorde van secties aanpassen. Bouw een structuur-validatie stap in de pipeline.

2. **Wettelijke verwijzingen.** Artikelnummers (bijv. "artikel 18b, lid 2") en wetnamen (bijv. "WML") mogen NOOIT gewijzigd worden. Detecteer en exempt deze patroon in de chunker.

3. **Schrijfwijzer-regels zijn per klant.** Het systeem is niet hardcoded op NLA-regels. De Schrijfwijzer is een flexibel data-model. NLA is de eerste klant, maar ontwerp generiek.

4. **De klant review-pagina is public** (geen login). Zorg voor rate limiting op de feedback endpoints. Bescherm tegen spam met eenvoudige honeypot of rate limit per token.

5. **Performance.** 150 documenten × gemiddeld 5 A4 = ~750 pagina's. De pipeline verwerkt één document per keer. Gebruik een job queue (bijv. Bull/BullMQ) voor de verwerking. Toon een realtime voortgangsindicator.

6. **Mobiel.** De klant review-pagina moet goed werken op mobiel. De PageEditor hoeft niet mobiel-geoptimaliseerd te zijn (interne gebruikers werken op desktop).

---

## 12. Voorbeeld schrijfwijzer-prompt (voor AI in de pipeline)

```
Je bent een professionele redacteur. Je herschrijft een Nederlandse werkinstructie 
voor de Nederlandse Arbeidsinspectie op taalniveau B1.

Je past de volgende schrijfwijzer-regels toe:
- Regel 9: Schrijf korte zinnen (gemiddeld 10-12 woorden). Zet één boodschap per zin.
- Regel 10: Schrijf actieve zinnen. Benoem wie wat doet. Vervang passieve constructies.
- Regel 12: Gebruik geen dubbele ontkenningen. Herformuleer positief.
- Regel 15: Gebruik alledaagse woorden. Vervang formele woorden door dagelijkse alternatieven.
- Regel 16: Gebruik geen vaktaal zonder uitleg. Als je een vakterm moet gebruiken, leg hem uit.
- Regel 17: Gebruik geen formele woorden (conform → volgens, dienen → moeten, etc.)

Bewaar altijd:
- Alle kopjes en de documentstructuur
- Artikelnummers en wetsverwijzingen (bijv. "artikel 18b, lid 2 WML")
- Eigennamen, organisatienamen
- Opsommingen en lijsten (pas alleen de tekst aan)

Verwijder nooit informatie. Voeg geen nieuwe informatie toe.

Herschrijf de volgende sectie:
---
{chunk_tekst}
---

Geef alleen de herschreven tekst terug. Geen uitleg.
```

---

*Gegenereerd op basis van: Schrijfwijzer Nederlandse Arbeidsinspectie (Bijlage C), Werkinstructie WML artikel 18b (Bijlage D), en bestaande projectarchitectuur uit leene-redactieflow, MCP-SaaS-redactietool, leene-redactiecompas-odmh en leene-ai-speechschrijver-new.*
