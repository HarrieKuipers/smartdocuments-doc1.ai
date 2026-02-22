# DOC1.AI — Advanced Analytics System

## Instructie voor Claude Code

> **Context**: doc1.ai is een Next.js applicatie (App Router) met MongoDB/Mongoose, gehost op DigitalOcean. De app transformeert PDF-documenten naar interactieve webpagina's met AI-samenvattingen en chat. Dit document beschrijft de uitbreiding van het analytics-systeem van een simpel overzicht naar een volledig document intelligence platform.

---

## 1. HUIDIGE SITUATIE

Het analytics-dashboard toont nu alleen:
- Totaal Views (alle documenten)
- Gemiddelde Leestijd
- Totaal Downloads
- AI Interacties
- Top Documenten lijst (naam + views)

**Wat ontbreekt**: per-document analytics, tijdreeksen, grafieken, gebruikersgedrag, AI-interactiedetails, engagement metrics, en actionable insights.

---

## 2. DATABASE: NIEUWE MONGOOSE MODELS

### 2.1 DocumentEvent Model

Dit is het hart van het analytics-systeem. Elk event dat plaatsvindt op een document wordt gelogd.

```javascript
// models/DocumentEvent.js
import mongoose from 'mongoose';

const documentEventSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  // Sessie-tracking voor anonieme bezoekers
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      // Bekijken
      'page_view',           // Document geopend
      'section_view',        // Specifieke sectie bekeken
      'scroll_depth',        // Scroll percentage bereikt (25%, 50%, 75%, 100%)
      
      // Engagement
      'time_on_page',        // Heartbeat elke 30 seconden actieve leestijd
      'term_click',          // Klik op een begrip/term
      'link_click',          // Klik op een link in het document
      'toc_click',           // Klik op inhoudsopgave item
      'summary_expand',      // Samenvatting uitgeklapt
      'summary_collapse',    // Samenvatting ingeklapt
      
      // AI Interactie
      'chat_message',        // Vraag gesteld aan AI chat
      'chat_response',       // AI antwoord ontvangen
      'chat_feedback',       // Thumbs up/down op AI antwoord
      'chat_copy',           // Antwoord gekopieerd
      
      // Download & Delen
      'pdf_download',        // PDF gedownload
      'share_link_created',  // Deellink aangemaakt
      'share_link_clicked',  // Deellink geopend door ontvanger
      'print',               // Document geprint
      
      // Zoeken
      'search_query',        // Zoekopdracht in document
      'search_result_click', // Klik op zoekresultaat
      
      // Navigatie
      'language_switch',     // Taalwissel (NL/EN)
      'reading_mode_toggle', // Leesmodus gewisseld
    ],
    index: true,
  },
  // Flexibele metadata per event type
  metadata: {
    // Voor section_view
    sectionId: String,
    sectionTitle: String,
    
    // Voor scroll_depth
    scrollPercentage: Number,
    
    // Voor time_on_page (heartbeat)
    activeSeconds: Number,
    totalSeconds: Number,
    
    // Voor term_click
    term: String,
    termDefinition: String,
    
    // Voor chat_message
    question: String,
    questionCategory: String, // auto-geclassificeerd door AI
    
    // Voor chat_response
    responseLength: Number,
    responseTime: Number, // ms
    sourceSections: [String], // welke secties als bron gebruikt
    
    // Voor chat_feedback
    feedbackType: { type: String, enum: ['positive', 'negative'] },
    feedbackComment: String,
    
    // Voor search_query
    searchQuery: String,
    resultsCount: Number,
    
    // Voor link_click / toc_click
    targetUrl: String,
    targetSection: String,
    
    // Apparaat & context
    device: { type: String, enum: ['desktop', 'tablet', 'mobile'] },
    browser: String,
    os: String,
    referrer: String,
    country: String,
    city: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
  // TTL index: events ouder dan 2 jaar automatisch verwijderen
  // (configureerbaar per plan)
});

// Compound indexes voor veelgebruikte queries
documentEventSchema.index({ documentId: 1, eventType: 1, timestamp: -1 });
documentEventSchema.index({ documentId: 1, timestamp: -1 });
documentEventSchema.index({ documentId: 1, sessionId: 1, timestamp: -1 });
documentEventSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.models.DocumentEvent || mongoose.model('DocumentEvent', documentEventSchema);
```

### 2.2 DocumentAnalyticsSummary Model

Pre-geaggregeerde dagelijkse statistieken per document (voor snelle dashboard-loads).

```javascript
// models/DocumentAnalyticsSummary.js
import mongoose from 'mongoose';

const dailyStatsSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  date: {
    type: Date, // altijd middernacht UTC
    required: true,
  },
  // Basis metrics
  views: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  prints: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  
  // Engagement
  avgReadTimeSeconds: { type: Number, default: 0 },
  medianReadTimeSeconds: { type: Number, default: 0 },
  bounceRate: { type: Number, default: 0 }, // % bezoekers die <10 sec blijven
  avgScrollDepth: { type: Number, default: 0 }, // gemiddeld scroll %
  completionRate: { type: Number, default: 0 }, // % dat 100% scroll bereikt
  
  // AI Chat
  chatSessions: { type: Number, default: 0 },
  chatMessages: { type: Number, default: 0 },
  chatPositiveFeedback: { type: Number, default: 0 },
  chatNegativeFeedback: { type: Number, default: 0 },
  avgResponseTime: { type: Number, default: 0 },
  
  // Term engagement
  termClicks: { type: Number, default: 0 },
  topTerms: [{
    term: String,
    clicks: Number,
  }],
  
  // Zoeken
  searchQueries: { type: Number, default: 0 },
  topSearchQueries: [{
    query: String,
    count: Number,
    avgResultsCount: Number,
  }],
  
  // Secties
  topSections: [{
    sectionId: String,
    sectionTitle: String,
    views: Number,
    avgTimeSeconds: Number,
  }],
  
  // Apparaten
  deviceBreakdown: {
    desktop: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
  },
  
  // Referrers
  topReferrers: [{
    referrer: String,
    count: Number,
  }],
  
  // Geografie
  topCountries: [{
    country: String,
    count: Number,
  }],
}, {
  timestamps: true,
});

dailyStatsSchema.index({ documentId: 1, date: -1 }, { unique: true });
dailyStatsSchema.index({ date: -1 });

export default mongoose.models.DocumentAnalyticsSummary || mongoose.model('DocumentAnalyticsSummary', dailyStatsSchema);
```

### 2.3 ChatQuestion Model

Aparte collection voor AI-chatvragen — voor analyse en verbetering.

```javascript
// models/ChatQuestion.js
import mongoose from 'mongoose';

const chatQuestionSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  sessionId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String },
  
  // AI classificatie van de vraag
  category: {
    type: String,
    enum: [
      'definition',      // "Wat betekent...?"
      'explanation',      // "Leg uit hoe..."
      'comparison',       // "Wat is het verschil tussen...?"
      'procedure',        // "Hoe moet ik...?"
      'factual',          // "Hoeveel / wanneer / waar...?"
      'opinion',          // "Wat vindt u van...?"
      'application',      // "Hoe pas ik dit toe op...?"
      'clarification',    // "Wat bedoelt u met...?"
      'summary',          // "Kun je samenvatten...?"
      'other',
    ],
  },
  
  // Welke secties zijn gebruikt als bron
  sourceSections: [{
    sectionId: String,
    sectionTitle: String,
    relevanceScore: Number,
  }],
  
  // Welke termen/begrippen worden genoemd
  mentionedTerms: [String],
  
  // Feedback
  feedback: {
    type: { type: String, enum: ['positive', 'negative', null] },
    comment: String,
    timestamp: Date,
  },
  
  // Performance
  responseTimeMs: Number,
  tokensUsed: Number,
  model: String,
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

chatQuestionSchema.index({ documentId: 1, timestamp: -1 });
chatQuestionSchema.index({ documentId: 1, category: 1 });
chatQuestionSchema.index({ question: 'text' }); // text search index

export default mongoose.models.ChatQuestion || mongoose.model('ChatQuestion', chatQuestionSchema);
```

---

## 3. EVENT TRACKING — CLIENT-SIDE

### 3.1 Analytics Tracker Hook

Maak een React hook die automatisch events tracked op de document-viewer pagina.

```javascript
// hooks/useDocumentAnalytics.js

import { useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useDocumentAnalytics(documentId) {
  const sessionId = useRef(getOrCreateSessionId());
  const startTime = useRef(Date.now());
  const activeTime = useRef(0);
  const lastHeartbeat = useRef(Date.now());
  const maxScrollDepth = useRef(0);
  const isActive = useRef(true);
  const eventQueue = useRef([]);
  const flushTimer = useRef(null);

  // Batch events en stuur elke 5 seconden
  const queueEvent = useCallback((eventType, metadata = {}) => {
    eventQueue.current.push({
      documentId,
      sessionId: sessionId.current,
      eventType,
      metadata: {
        ...metadata,
        device: getDeviceType(),
        browser: getBrowserName(),
        os: getOSName(),
        referrer: document.referrer || 'direct',
      },
      timestamp: new Date().toISOString(),
    });

    // Flush als queue > 10 events
    if (eventQueue.current.length >= 10) {
      flushEvents();
    }
  }, [documentId]);

  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return;
    
    const events = [...eventQueue.current];
    eventQueue.current = [];

    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        // Gebruik keepalive voor page unload
        keepalive: true,
      });
    } catch (err) {
      // Events terug in queue bij fout
      eventQueue.current = [...events, ...eventQueue.current];
    }
  }, []);

  useEffect(() => {
    // Initial page view
    queueEvent('page_view');

    // Heartbeat elke 30 seconden
    const heartbeatInterval = setInterval(() => {
      if (isActive.current) {
        const now = Date.now();
        activeTime.current += (now - lastHeartbeat.current) / 1000;
        lastHeartbeat.current = now;
        
        queueEvent('time_on_page', {
          activeSeconds: Math.round(activeTime.current),
          totalSeconds: Math.round((now - startTime.current) / 1000),
        });
      }
    }, 30000);

    // Scroll tracking
    const handleScroll = throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      
      // Log bij 25% milestones
      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && maxScrollDepth.current < milestone) {
          maxScrollDepth.current = milestone;
          queueEvent('scroll_depth', { scrollPercentage: milestone });
        }
      }
    }, 500);

    // Visibility tracking (actieve vs inactieve tijd)
    const handleVisibility = () => {
      if (document.hidden) {
        isActive.current = false;
      } else {
        isActive.current = true;
        lastHeartbeat.current = Date.now();
      }
    };

    // Flush bij page unload
    const handleUnload = () => {
      queueEvent('time_on_page', {
        activeSeconds: Math.round(activeTime.current),
        totalSeconds: Math.round((Date.now() - startTime.current) / 1000),
      });
      flushEvents();
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    // Periodieke flush
    flushTimer.current = setInterval(flushEvents, 5000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(flushTimer.current);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      flushEvents();
    };
  }, [documentId, queueEvent, flushEvents]);

  // Exporteer tracking functies voor handmatige events
  return {
    trackTermClick: (term, definition) => queueEvent('term_click', { term, termDefinition: definition }),
    trackSectionView: (sectionId, sectionTitle) => queueEvent('section_view', { sectionId, sectionTitle }),
    trackTocClick: (sectionId, sectionTitle) => queueEvent('toc_click', { targetSection: sectionTitle }),
    trackLinkClick: (url) => queueEvent('link_click', { targetUrl: url }),
    trackSearch: (query, resultsCount) => queueEvent('search_query', { searchQuery: query, resultsCount }),
    trackChatMessage: (question) => queueEvent('chat_message', { question }),
    trackChatFeedback: (feedbackType, comment) => queueEvent('chat_feedback', { feedbackType, feedbackComment: comment }),
    trackDownload: () => queueEvent('pdf_download'),
    trackShare: () => queueEvent('share_link_created'),
    trackPrint: () => queueEvent('print'),
    trackLanguageSwitch: () => queueEvent('language_switch'),
    trackSummaryExpand: () => queueEvent('summary_expand'),
    trackSummaryCollapse: () => queueEvent('summary_collapse'),
    trackReadingModeToggle: () => queueEvent('reading_mode_toggle'),
  };
}

function getOrCreateSessionId() {
  let sessionId = sessionStorage.getItem('doc1_session');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('doc1_session', sessionId);
  }
  return sessionId;
}
```

---

## 4. API ROUTES

### 4.1 Event Ingest

```javascript
// app/api/analytics/events/route.js
// POST — Ontvang batch van events
// Valideer, verrijk met IP-geolocatie, sla op in MongoDB
// Gebruik bulk insert voor performance
// Rate limit: max 100 events per request, max 10 requests per minuut per sessie
```

### 4.2 Document Analytics API

```javascript
// app/api/analytics/documents/[documentId]/route.js
// GET — Haal analytics op voor specifiek document
// Query params:
//   period: '7d' | '30d' | '90d' | '12m' | 'all' | 'custom'
//   startDate: ISO date (voor custom)
//   endDate: ISO date (voor custom)
//   granularity: 'hour' | 'day' | 'week' | 'month'
//
// Response bevat:
//   - overview: totalen voor de periode
//   - timeseries: array met data per granularity-eenheid
//   - topSections, topTerms, topQuestions, etc.
```

### 4.3 Aggregatie API's

```javascript
// app/api/analytics/documents/[documentId]/questions/route.js
// GET — Alle chatvragen voor dit document
// Met filtering op category, datum, feedback
// Paginatie support

// app/api/analytics/documents/[documentId]/terms/route.js
// GET — Term engagement data

// app/api/analytics/documents/[documentId]/sections/route.js
// GET — Sectie-level analytics

// app/api/analytics/documents/[documentId]/visitors/route.js
// GET — Bezoekersdata (apparaten, locaties, referrers)

// app/api/analytics/documents/[documentId]/heatmap/route.js
// GET — Scroll heatmap data (welke secties meest gelezen)

// app/api/analytics/documents/[documentId]/export/route.js
// GET — Exporteer analytics als CSV of PDF rapport
```

### 4.4 Dashboard Overview API

```javascript
// app/api/analytics/overview/route.js
// GET — Geaggregeerde stats voor alle documenten van de user
// Inclusief trends (vergelijking met vorige periode)
```

---

## 5. CRON JOB: DAGELIJKSE AGGREGATIE

```javascript
// app/api/cron/aggregate-analytics/route.js
// Draait dagelijks (via DigitalOcean cron of Vercel cron)
//
// 1. Aggregeer alle events van gisteren per document
// 2. Bereken unieke bezoekers (op basis van sessionId)
// 3. Bereken gemiddelde/mediaan leestijd
// 4. Bereken bounce rate
// 5. Classificeer ongelabelde chatvragen met AI
// 6. Sla op in DocumentAnalyticsSummary
// 7. Optioneel: stuur weekly digest e-mail naar document owners
```

---

## 6. FRONTEND: ANALYTICS DASHBOARD

### 6.1 Pagina Structuur

```
/dashboard/analytics                    → Overzicht alle documenten
/dashboard/analytics/[documentId]       → Detail per document
/dashboard/analytics/[documentId]/chat  → AI chat analyse
```

### 6.2 Overzichtspagina (alle documenten)

```
┌─────────────────────────────────────────────────────────────────┐
│ Analytics                                                        │
│ Inzicht in het gebruik van je documenten                        │
│                                                                  │
│ [Periode selector: 7d | 30d | 90d | 12m | Custom]              │
│                                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ Views    │ │ Unieke   │ │ Gem.     │ │ AI Chat  │            │
│ │   1,247  │ │ Bezoekers│ │ Leestijd │ │ Vragen   │            │
│ │ ▲ +12%   │ │   834    │ │ 4m 32s   │ │   156    │            │
│ │ vs vorig │ │ ▲ +8%    │ │ ▲ +23%   │ │ ▲ +45%   │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │           📈 Views & Bezoekers Over Tijd                     │ │
│ │  [Lijn/Area chart met views + unique visitors per dag]       │ │
│ │  Dual axis: bars voor views, lijn voor unique visitors       │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 📊 Top Documenten           │ │ 📱 Apparaten               │ │
│ │                              │ │                             │ │
│ │ 1. Arbeidsovereenkomst  48  │ │ [Donut chart]              │ │
│ │ 2. Privacybeleid        23  │ │ Desktop  67%               │ │
│ │ 3. Jaarverslag          18  │ │ Mobile   28%               │ │
│ │ 4. Reglement            12  │ │ Tablet    5%               │ │
│ └──────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 📋 Document Tabel                                           │ │
│ │ ┌─────────────┬───────┬────────┬──────────┬────────┬──────┐ │ │
│ │ │ Document    │ Views │ Uniek  │ Leestijd │ Downl. │ Chat │ │ │
│ │ ├─────────────┼───────┼────────┼──────────┼────────┼──────┤ │ │
│ │ │ Arbeidsov.  │  148  │   92   │  5m 12s  │   23   │  34  │ │ │
│ │ │ Privacy     │   87  │   65   │  3m 45s  │   12   │  18  │ │ │
│ │ │ Jaarversl.  │   56  │   41   │  7m 23s  │    8   │  22  │ │ │
│ │ └─────────────┴───────┴────────┴──────────┴────────┴──────┘ │ │
│ │ [Sorteerbaar op elke kolom] [Klik voor detail]              │ │
│ └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Document Detail Pagina

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Terug naar overzicht                                          │
│                                                                  │
│ 📄 Arbeidsovereenkomst Espire AI Agency                        │
│ Geüpload: 15 feb 2026 · Laatst bekeken: 2 uur geleden          │
│                                                                  │
│ [Periode: 7d | 30d | 90d | 12m]                                │
│                                                                  │
│ ═══════════════════════════════════════════════════════════════  │
│ TAB: Overzicht | Secties | AI Chat | Begrippen | Bezoekers     │
│ ═══════════════════════════════════════════════════════════════  │
│                                                                  │
│ ── TAB: OVERZICHT ──────────────────────────────────────────── │
│                                                                  │
│ KPI Cards (met trend vs vorige periode):                        │
│ Views · Unieke bezoekers · Gem. leestijd · Scroll completion    │
│ Downloads · Shares · Bounce rate · AI vragen                    │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 📈 Engagement Over Tijd                                      │ │
│ │ [Area chart: views, leestijd, chat interacties]              │ │
│ │ Toggle: Views | Leestijd | Downloads | Chat                  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 📊 Scroll Heatmap           │ │ 🕐 Leestijd Distributie    │ │
│ │                              │ │                             │ │
│ │ [Verticale heatmap van het  │ │ [Histogram: verdeling van   │ │
│ │  document met kleurintensit.│ │  leestijden in buckets]     │ │
│ │  per sectie]                │ │ <30s | 1-3m | 3-5m | 5-10m │ │
│ │                              │ │ | 10m+                     │ │
│ │ Sectie 1  ████████████ 95%  │ │                             │ │
│ │ Sectie 2  █████████░░░ 78%  │ │                             │ │
│ │ Sectie 3  ██████░░░░░░ 52%  │ │                             │ │
│ │ Sectie 4  ████░░░░░░░░ 34%  │ │                             │ │
│ │ Sectie 5  ██░░░░░░░░░░ 15%  │ │                             │ │
│ └──────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
│ ── TAB: SECTIES ────────────────────────────────────────────── │
│                                                                  │
│ Per sectie van het document:                                    │
│ - Aantal keer bekeken                                           │
│ - Gemiddelde tijd besteed                                       │
│ - Meest geklikte begrippen in die sectie                        │
│ - Meest gestelde vragen over die sectie                         │
│ - Drop-off rate (% dat hier stopt met lezen)                    │
│                                                                  │
│ ── TAB: AI CHAT ────────────────────────────────────────────── │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 💬 Chat Analytics                                            │ │
│ │                                                               │ │
│ │ Totaal vragen: 34 · Gem. per sessie: 2.4                     │ │
│ │ Tevredenheid: 87% positief                                    │ │
│ │                                                               │ │
│ │ ┌─────────────────────────────┐                               │ │
│ │ │ Vraagcategorieën            │                               │ │
│ │ │ [Donut chart]               │                               │ │
│ │ │ Definitie      35%          │                               │ │
│ │ │ Uitleg         25%          │                               │ │
│ │ │ Procedure      20%          │                               │ │
│ │ │ Vergelijking   12%          │                               │ │
│ │ │ Overig          8%          │                               │ │
│ │ └─────────────────────────────┘                               │ │
│ │                                                               │ │
│ │ 📋 Gestelde Vragen                                           │ │
│ │ ┌────────────────────────────────────┬──────────┬──────────┐ │ │
│ │ │ Vraag                              │ Categorie│ Feedback │ │ │
│ │ ├────────────────────────────────────┼──────────┼──────────┤ │ │
│ │ │ Wat is de opzegtermijn?            │ Procedure│ 👍       │ │ │
│ │ │ Hoeveel vakantiedagen heb ik?      │ Feitelijk│ 👍       │ │ │
│ │ │ Wat betekent concurrentiebeding?   │ Definitie│ 👎       │ │ │
│ │ │ ...                                │          │          │ │ │
│ │ └────────────────────────────────────┴──────────┴──────────┘ │ │
│ │                                                               │ │
│ │ 🔥 Meest gestelde vragen (gegroepeerd)                       │ │
│ │ 1. "Opzegtermijn" varianten — 8x gesteld                     │ │
│ │ 2. "Vakantiedagen" varianten — 5x gesteld                    │ │
│ │ 3. "Proeftijd" varianten — 4x gesteld                        │ │
│ │                                                               │ │
│ │ 💡 AI Insight: "Veel vragen gaan over de opzegtermijn.       │ │
│ │    Overweeg deze sectie prominenter te maken in de            │ │
│ │    samenvatting."                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ── TAB: BEGRIPPEN ──────────────────────────────────────────── │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🔤 Term Engagement                                           │ │
│ │                                                               │ │
│ │ [Bubble chart of word cloud: grootte = aantal kliks]          │ │
│ │                                                               │ │
│ │ ┌────────────────────────┬────────┬──────────┬─────────────┐ │ │
│ │ │ Begrip                 │ Kliks  │ Trend    │ Meest in    │ │ │
│ │ ├────────────────────────┼────────┼──────────┼─────────────┤ │ │
│ │ │ Concurrentiebeding     │   23   │ ▲ +15%   │ Sectie 4    │ │ │
│ │ │ Proeftijd              │   18   │ ▼ -5%    │ Sectie 2    │ │ │
│ │ │ Opzegtermijn           │   15   │ ▲ +30%   │ Sectie 6    │ │ │
│ │ │ Vakantietoeslag        │   12   │ — 0%     │ Sectie 3    │ │ │
│ │ │ CAO                    │    9   │ ▲ +50%   │ Sectie 1    │ │ │
│ │ └────────────────────────┴────────┴──────────┴─────────────┘ │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ── TAB: BEZOEKERS ──────────────────────────────────────────── │
│                                                                  │
│ ┌──────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 📱 Apparaten                │ │ 🌍 Locaties                │ │
│ │ [Donut chart]               │ │ [Horizontale bar chart]     │ │
│ │                              │ │ Nederland       78%         │ │
│ │ Desktop  67%                │ │ België          12%         │ │
│ │ Mobile   28%                │ │ Duitsland        5%         │ │
│ │ Tablet    5%                │ │ Overig           5%         │ │
│ └──────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 🔗 Referrers               │ │ 🕐 Piekuren                │ │
│ │ [Bar chart]                 │ │ [Heatmap: dag x uur]       │ │
│ │ Direct         45%          │ │                             │ │
│ │ E-mail link    30%          │ │ Ma ████░░░░████░░░░░░      │ │
│ │ WhatsApp       15%          │ │ Di ██░░░░░░████████░░      │ │
│ │ LinkedIn        7%          │ │ Wo ████████████░░░░░░      │ │
│ │ Overig          3%          │ │ ...                        │ │
│ └──────────────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. GRAFIEKEN — TECHNISCHE IMPLEMENTATIE

Gebruik **Recharts** (al beschikbaar in het project of installeer via `npm install recharts`).

### 7.1 Chart Componenten te bouwen

```
components/analytics/
├── charts/
│   ├── TimeSeriesChart.jsx       // Herbruikbaar lijn/area chart met periode selector
│   ├── DonutChart.jsx            // Voor apparaten, categorieën, etc.
│   ├── HorizontalBarChart.jsx    // Voor top documenten, referrers, locaties
│   ├── ScrollHeatmap.jsx         // Verticale heatmap voor sectie engagement
│   ├── HeatmapGrid.jsx          // Dag x uur activiteit heatmap
│   ├── HistogramChart.jsx        // Leestijd distributie
│   ├── BubbleCloud.jsx           // Term engagement visualisatie
│   └── TrendIndicator.jsx        // ▲ +12% component
├── cards/
│   ├── KPICard.jsx               // Metric card met trend
│   ├── DocumentRow.jsx           // Rij in document tabel
│   └── QuestionRow.jsx           // Rij in vragen tabel
├── filters/
│   ├── PeriodSelector.jsx        // 7d | 30d | 90d | 12m | Custom
│   ├── DateRangePicker.jsx       // Custom datum bereik
│   └── GranularityToggle.jsx     // Uur | Dag | Week | Maand
├── tables/
│   ├── DocumentsTable.jsx        // Sorteerbare document tabel
│   ├── QuestionsTable.jsx        // Chat vragen tabel met filters
│   └── TermsTable.jsx            // Begrippen tabel
├── insights/
│   └── AIInsightCard.jsx         // AI-gegenereerde suggesties
├── export/
│   ├── ExportButton.jsx          // CSV / PDF export
│   └── AnalyticsPDFReport.jsx    // Genereer PDF rapport van analytics
└── pages/
    ├── AnalyticsOverview.jsx     // Hoofdpagina
    └── DocumentAnalytics.jsx     // Detail pagina met tabs
```

### 7.2 Kleurenpalet voor charts

```javascript
const CHART_COLORS = {
  primary: '#2563EB',      // Blauw — hoofdlijn
  secondary: '#7C3AED',    // Paars — tweede metric
  success: '#10B981',      // Groen — positieve trend
  warning: '#F59E0B',      // Oranje — waarschuwing
  danger: '#EF4444',       // Rood — negatieve trend
  neutral: '#6B7280',      // Grijs — inactief
  
  // Voor multi-serie charts
  series: ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'],
  
  // Voor heatmap
  heatmap: ['#EFF6FF', '#BFDBFE', '#60A5FA', '#2563EB', '#1D4ED8'],
  
  // Apparaten
  devices: {
    desktop: '#2563EB',
    mobile: '#7C3AED',
    tablet: '#10B981',
  },
};
```

---

## 8. AI-POWERED INSIGHTS

### 8.1 Automatische Inzichten Generatie

Na de dagelijkse aggregatie, genereer AI-inzichten per document:

```javascript
// lib/analytics/generateInsights.js
//
// Input: DocumentAnalyticsSummary van de laatste 30 dagen + ChatQuestions
//
// Output: Array van insight objects:
// {
//   type: 'suggestion' | 'trend' | 'anomaly' | 'achievement',
//   priority: 'high' | 'medium' | 'low',
//   title: string,
//   description: string,
//   actionable: boolean,
//   suggestedAction: string | null,
// }
//
// Voorbeelden van inzichten die gegenereerd worden:
//
// 📈 TRENDS
// - "Views zijn deze week 45% gestegen vergeleken met vorige week"
// - "De gemiddelde leestijd is gedaald van 5 naar 3 minuten"
// - "Steeds meer bezoekers gebruiken mobile (van 20% naar 35%)"
//
// 💡 SUGGESTIES
// - "Sectie 4 'Concurrentiebeding' wordt amper gelezen maar veel over gevraagd.
//    Overweeg de samenvatting aan te passen."
// - "87% van de vragen gaat over 3 onderwerpen. Overweeg een FAQ sectie toe te voegen."
// - "Veel bezoekers stoppen met lezen bij sectie 3. De content is mogelijk te lang."
// - "Het begrip 'opzegtermijn' wordt 4x vaker aangeklikt dan gemiddeld.
//    De uitleg kan mogelijk verbeterd worden."
//
// ⚠️ ANOMALIEËN
// - "Ongebruikelijk hoge activiteit op zaterdag — is het document gedeeld?"
// - "De bounce rate is plotseling gestegen naar 60%"
//
// 🏆 PRESTATIES
// - "Dit document heeft de 1000 views milestone bereikt!"
// - "De AI chat tevredenheid is gestegen naar 92%"
```

### 8.2 Chat Vraag Clustering

```javascript
// lib/analytics/clusterQuestions.js
//
// Groepeer vergelijkbare vragen met embeddings:
// 1. Genereer embeddings voor alle vragen van afgelopen 30 dagen
// 2. Cluster met cosine similarity (drempel: 0.85)
// 3. Genereer een samenvattende label per cluster
// 4. Toon als "Meest gestelde vragen (gegroepeerd)" in de UI
//
// Dit helpt document owners begrijpen welke informatie onduidelijk is
// of ontbreekt in hun document.
```

---

## 9. EXPORT FUNCTIONALITEIT

### 9.1 CSV Export

Exporteer analytics data als CSV met kolommen per metric. Beschikbaar per document of voor alle documenten.

### 9.2 PDF Rapport

Genereer een professioneel analytics rapport als PDF met:
- Executive summary
- KPI overzicht met trends
- Charts als afbeeldingen (render server-side met chart library)
- Top vragen en inzichten
- Aanbevelingen
- doc1.ai branding

Handig voor: klanten die rapporten aan hun management willen sturen over hoe hun documenten worden gebruikt.

---

## 10. REAL-TIME ANALYTICS (FASE 2)

### 10.1 Live Dashboard

Voor premium gebruikers: real-time view van wie er nu op het document zit.

```
┌─────────────────────────────────────────┐
│ 🟢 NU LIVE: 3 bezoekers                │
│                                          │
│ Bezoeker 1 · Desktop · Amsterdam        │
│   Leest: Sectie 3 — Verlof en vakantie  │
│   Tijd: 2m 45s                           │
│                                          │
│ Bezoeker 2 · Mobile · Rotterdam         │
│   Leest: AI Chat actief                  │
│   Tijd: 1m 12s                           │
│                                          │
│ Bezoeker 3 · Desktop · Eindhoven        │
│   Leest: Samenvatting                    │
│   Tijd: 0m 30s                           │
└─────────────────────────────────────────┘
```

### 10.2 Implementatie

Gebruik Server-Sent Events (SSE) of WebSocket voor live updates. Houdt een in-memory cache bij van actieve sessies (Redis of in-process Map).

---

## 11. NOTIFICATIES & ALERTS

### 11.1 Document Owner Alerts

Stuur notificaties (in-app + optioneel e-mail) bij:
- Document bereikt milestone (100, 500, 1000 views)
- Ongewone activiteitspiek (>3x normaal volume)
- Eerste negatieve chat feedback
- Wekelijkse digest met top-level stats

### 11.2 Weekly Digest E-mail

```
Onderwerp: 📊 Wekelijks doc1.ai Rapport — 17-23 feb 2026

Hallo [naam],

Hier is je wekelijkse samenvatting:

📄 Arbeidsovereenkomst Espire AI
   Views: 148 (▲ +12%)
   AI Vragen: 34 (▲ +45%)
   Meest gestelde vraag: "Wat is de opzegtermijn?"

📄 Privacybeleid
   Views: 87 (▼ -3%)
   Downloads: 12
   💡 Tip: Sectie 2 heeft een hoge drop-off rate

[Bekijk volledige analytics →]
```

---

## 12. PRIVACY & GDPR

### 12.1 Principes
- **Geen persoonlijke data**: Alleen sessionId (random UUID), geen cookies van derden
- **IP anonimisatie**: Sla alleen land/stad op, nooit het volledige IP-adres
- **Data retention**: Events worden automatisch verwijderd na configureerbare periode (standaard 2 jaar, via TTL index)
- **Opt-out**: Cookie banner met optie om analytics uit te schakelen
- **Geen tracking over documenten heen**: Sessions zijn per document, niet cross-document

### 12.2 Cookie Banner

Minimale cookie banner die alleen verschijnt als analytics actief is. Respecteer Do Not Track header.

---

## 13. IMPLEMENTATIE VOLGORDE

### Fase 1 — Foundation (Week 1-2)
1. ✅ DocumentEvent model + indexes
2. ✅ Event ingest API route (POST /api/analytics/events)
3. ✅ useDocumentAnalytics hook — basis events (page_view, scroll, time)
4. ✅ Integreer hook in document viewer pagina
5. ✅ Basis aggregatie API per document

### Fase 2 — Dashboard (Week 3-4)
1. ✅ PeriodSelector + KPICard componenten
2. ✅ TimeSeriesChart voor views over tijd
3. ✅ Analytics overzichtspagina (alle documenten)
4. ✅ Document detail pagina — tab Overzicht
5. ✅ DocumentsTable met sorteerbare kolommen

### Fase 3 — Deep Analytics (Week 5-6)
1. ✅ Term click tracking + Begrippen tab
2. ✅ Chat question logging + AI Chat tab
3. ✅ ScrollHeatmap component + Secties tab
4. ✅ Bezoekers tab (apparaten, locaties, referrers)
5. ✅ Cron job voor dagelijkse aggregatie

### Fase 4 — Intelligence (Week 7-8)
1. ✅ AI Insights generatie
2. ✅ Chat vraag clustering
3. ✅ Anomalie detectie
4. ✅ Piekuren heatmap
5. ✅ CSV + PDF export

### Fase 5 — Premium Features (Week 9-10)
1. ✅ Real-time live dashboard
2. ✅ Notificaties & alerts
3. ✅ Weekly digest e-mails
4. ✅ Vergelijk documenten onderling
5. ✅ A/B test support (twee versies van een document vergelijken)

---

## 14. TECHNISCHE DETAILS

### Dependencies toe te voegen
```bash
npm install recharts date-fns uuid ua-parser-js
```

### Environment Variables
```env
# Analytics
ANALYTICS_RETENTION_DAYS=730
ANALYTICS_BATCH_SIZE=100
ANALYTICS_FLUSH_INTERVAL=5000
ANALYTICS_CRON_SECRET=xxx

# Optioneel: GeoIP service
GEOIP_API_KEY=xxx
```

### Performance Overwegingen
- **Batch inserts**: Events worden client-side gebundeld en in batches verstuurd
- **Pre-aggregatie**: Dagelijkse summaries voorkomen zware queries op de events collection
- **Compound indexes**: Geoptimaliseerd voor de meest voorkomende query patterns
- **TTL index**: Automatische cleanup van oude events
- **Caching**: Aggregatie resultaten cachen met korte TTL (5 min) voor dashboard loads
- **Lazy loading**: Tabs laden data pas als ze actief worden

---

## 15. SUBSCRIPTION TIERS

Overweeg analytics features te koppelen aan pricing:

| Feature                        | Free  | Pro    | Enterprise |
|--------------------------------|-------|--------|------------|
| Basis stats (views, downloads) | ✅    | ✅     | ✅         |
| Periode selector               | 7d    | 90d    | Onbeperkt  |
| Grafieken                      | 1     | Alle   | Alle       |
| AI Chat analytics              | ❌    | ✅     | ✅         |
| Term engagement                | ❌    | ✅     | ✅         |
| Scroll heatmap                 | ❌    | ✅     | ✅         |
| AI Insights                    | ❌    | ❌     | ✅         |
| Real-time dashboard            | ❌    | ❌     | ✅         |
| PDF rapport export             | ❌    | ✅     | ✅         |
| Weekly digest e-mail           | ❌    | ✅     | ✅         |
| Data retention                 | 30d   | 1 jaar | 2 jaar     |
| API toegang                    | ❌    | ❌     | ✅         |
