# Smart Collections — Claude Code Instructie

## Wat is dit?

Collections is een feature voor Doc1.ai waarmee gebruikers hun Smart Documents bundelen en publiceren als een doorzoekbare collectie-pagina. Denk aan een gemeente die 80 beleidsdocumenten bundelt in één publieke portal, of een waterschap dat alle verordeningen groepeert per thema.

**Kernprincipe:** Een collectie is een curated view bovenop bestaande Smart Documents. Documenten worden niet gekopieerd — een collectie is een referentielijst met eigen metadata, categorieën en visuele instellingen.

---

## Bestaande context

Doc1.ai is een Next.js app met MongoDB (Mongoose), NextAuth, en DigitalOcean Spaces voor file storage. Er bestaan al:

- `Document` model — het Smart Document (verwerkt PDF met AI-samenvatting, chat, etc.)
- `Organization` model — de organisatie/klant
- `User` model — gekoppeld aan organisatie via NextAuth

> **BELANGRIJK:** Zoek eerst in de codebase naar de bestaande modellen en hun exacte veldnamen voordat je begint. Gebruik `grep -r "mongoose.model\|new Schema" src/` om alle modellen te vinden.

---

## Data Model

### Collection Schema

Maak `src/models/Collection.js`:

```
Collection {
  organizationId    → ref Organization (required)
  name              → String, max 120, required
  slug              → String, unique, auto-generated van name
  description       → String, max 500
  
  // Visueel
  coverImage        → { url, thumbnailUrl, blurHash }
  theme             → { primaryColor, secondaryColor }  // hex strings
  layout            → enum: 'grid' | 'list'             // default 'grid'
  logo              → { url }                            // override org logo
  
  // Toegang
  access            → {
    type: enum 'public' | 'password' | 'private'        // default 'private'
    passwordHash: String                                  // bcrypt, alleen bij type 'password'
  }
  
  // Documenten
  documents         → [{
    documentId: ref Document
    order: Number
    categoryId: String                                    // optioneel, ref naar categories array
    featured: Boolean                                     // default false
  }]
  
  // Categorieën (vrij in te stellen door eigenaar)
  categories        → [{ 
    _id: auto
    name: String
    slug: String
    order: Number 
  }]
  
  // SEO
  seoTitle          → String                              // override voor <title>
  seoDescription    → String                              // override voor meta description
  
  // Status
  status            → enum: 'draft' | 'published'        // default 'draft'
  
  timestamps: true                                        // createdAt, updatedAt
}
```

**Indexes:**
- `{ slug: 1 }` unique
- `{ organizationId: 1, status: 1 }`
- `{ 'documents.documentId': 1 }`

**Slug generatie:** Gebruik `slugify(name)` + check uniqueness. Bij conflict append `-2`, `-3` etc.

---

## API Routes

Maak alle routes onder `src/app/api/collections/`. Gebruik de bestaande auth-middleware patronen uit de codebase.

### Authenticated (eigenaar)

| Route | Method | Functie |
|---|---|---|
| `/api/collections` | GET | Lijst eigen collecties (filter op org) |
| `/api/collections` | POST | Nieuwe collectie aanmaken |
| `/api/collections/[id]` | GET | Collectie detail + documenten |
| `/api/collections/[id]` | PUT | Collectie bijwerken |
| `/api/collections/[id]` | DELETE | Collectie verwijderen |
| `/api/collections/[id]/documents` | PUT | Documenten toevoegen/verwijderen/herordenen |
| `/api/collections/[id]/publish` | POST | Status → published, genereer slug |

### Publiek

| Route | Method | Functie |
|---|---|---|
| `/api/collections/public/[slug]` | GET | Publieke collectie data |
| `/api/collections/public/[slug]/verify` | POST | Wachtwoord check, return session token |

**Publieke GET response:** Stuur NOOIT `access.passwordHash` mee. Bij `access.type === 'password'` en geen geldig session token → return alleen `{ name, requiresPassword: true }`.

**Session token voor wachtwoord-collecties:** Genereer een signed JWT (7 dagen geldig) na succesvolle verificatie. Sla op in httpOnly cookie `collection_access_{slug}`.

---

## Pagina's

### Dashboard pagina's (authenticated)

**`/dashboard/collections`** — Overzicht eigen collecties
- Grid van collectie-cards met naam, aantal documenten, status badge (draft/published), laatst gewijzigd
- "Nieuwe collectie" button

**`/dashboard/collections/new`** — Aanmaken
- Stap-voor-stap formulier OF één pagina met secties:
  1. Naam + beschrijving
  2. Toegangsinstellingen (public/password/private)
  3. Optioneel: cover uploaden, kleuren instellen
  4. Documenten selecteren (zie hieronder)
- Na opslaan → redirect naar edit pagina

**`/dashboard/collections/[id]/edit`** — Bewerken
- Zelfde velden als aanmaken, plus:
- **Document selector:** Linkerpaneel = eigen Smart Documents (zoekbaar, filterbaar). Rechterpaneel = documenten in collectie (drag & drop volgorde). Verplaats met knoppen of drag.
- Categorieën beheren (toevoegen/hernoemen/verwijderen)
- Per document: categorie toewijzen, featured toggle
- Preview button → opent publieke pagina in nieuw tab

### Publieke collectie-pagina

**`/c/[slug]`** — De publieke pagina. Dit is het visitekaartje.

#### Layout structuur:

```
┌─────────────────────────────────────┐
│  Header                             │
│  Logo · Organisatienaam             │
│                                     │
│  ██ Collectie Titel ██              │
│  Beschrijving                       │
│  12 documenten · Laatst bijgewerkt  │
├─────────────────────────────────────┤  ← sticky
│  🔍 Zoeken...  │ Cat │ Cat │ Sort ▾│
├─────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ Doc  │ │ Doc  │ │ Doc  │        │
│  │ Card │ │ Card │ │ Card │        │
│  └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │      │ │      │ │      │        │
│  └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────┤
│  Powered by Doc1.ai                │
└─────────────────────────────────────┘
```

#### Header
- Organisatielogo (uit organization of collection override)
- Collectienaam als `<h1>`
- Beschrijving
- Meta: "{n} documenten · Laatst bijgewerkt {datum}"
- Cover image als achtergrond van header (optioneel, met overlay gradient)

#### Zoek & Filter balk (sticky bij scrollen)
- **Zoekbalk:** Client-side filtering op document titel + beschrijving + tags. Gebruik `useMemo` met debounce (300ms). Geen server call nodig tot 200+ documenten.
- **Categorie-pills:** Horizontaal scrollbaar. "Alle" + categorieën uit de collectie. Active state = filled.
- **Sorteren:** Dropdown — "Standaard" (order veld), "A → Z", "Nieuwste eerst"
- **View toggle:** Grid / List iconen (sla voorkeur op in localStorage)

#### Document Cards (grid view)
Elk document toont:
- **Cover:** Eerste pagina van PDF als thumbnail (gebruik bestaande thumbnail URL uit Document model). Fallback = gekleurde gradient met documenttype icon.
- **Titel:** Max 2 regels, `line-clamp-2`
- **Samenvatting:** 1-2 zinnen, uit bestaande AI-samenvatting van het Smart Document. `line-clamp-2`
- **Tags/badges:** Categorie-label, aantal pagina's
- **Datum:** Publicatiedatum
- **"Nieuw" badge:** Als document < 7 dagen geleden aan collectie is toegevoegd

Klik op card → opent het Smart Document in een nieuw tab (`/documents/[doc-slug]`)

#### Document Rows (list view)
Compactere weergave: thumbnail links (klein), titel + samenvatting + meta rechts in één rij.

#### Performance bij 150+ documenten
- **Initieel:** Laad alle documenten in één GET call (metadata is klein, ~1KB per doc). Render alleen zichtbare items.
- **Virtualisatie:** Gebruik NIET standaard — pas toe als performance een probleem wordt. De zoek/filter is client-side, dus alle data moet toch in memory zijn.
- **Images:** Gebruik `loading="lazy"` op alle cover thumbnails. Serveer thumbnails als 300px breed (niet de full PDF page render).
- **Sticky filter balk:** `position: sticky; top: 0; z-index: 20;` met `backdrop-blur` en subtiele shadow.

#### Wachtwoord-pagina
Als `access.type === 'password'` en geen geldig cookie:
- Toon minimale pagina: collectienaam, "Deze collectie is beveiligd", wachtwoord-input, submit button
- Na verificatie → refresh pagina, cookie is gezet, content toont

#### SEO
- `<title>`: seoTitle || name
- `<meta description>`: seoDescription || description
- OG tags voor social sharing (og:title, og:description, og:image = coverImage)
- Bij `access.type !== 'public'` → `<meta name="robots" content="noindex">`

---

## Wachtwoord-beveiliging

```
Aanmaken/bijwerken:
  plaintext password → bcrypt.hash(password, 12) → sla op in access.passwordHash

Verificatie (/verify endpoint):
  POST { password } → bcrypt.compare(password, collection.access.passwordHash)
  → success: set httpOnly cookie met signed JWT { collectionId, slug, exp: 7d }
  → fail: return 401

Publieke pagina middleware:
  Als access.type === 'password':
    Check cookie → verify JWT → geldig? toon content : toon wachtwoord-pagina
```

---

## Belangrijk: wat NIET bouwen

- **Geen analytics dashboard** — komt later
- **Geen collection chat assistant** — komt later  
- **Geen auto-categorisatie AI** — komt later
- **Geen smart cover generatie** — gebruik bestaande PDF thumbnails
- **Geen SSO/domein-toegang** — komt later
- **Geen custom domains** — komt later
- **Geen bulk PDF upload** — gebruiker voegt bestaande Smart Documents toe

Focus op de kern: aanmaken, documenten selecteren, publiceren, mooie publieke pagina met zoek/filter.

---

## UI/UX Richtlijnen

- Gebruik de bestaande UI-componenten en styling van het Doc1.ai dashboard
- Publieke pagina: clean, modern, professioneel. Geen overbodige elementen.
- Responsive: mobile-first. Grid = 1 kolom mobile, 2 kolom tablet, 3 kolom desktop.
- Kleurthema van collectie toepassen op de header gradient en categorie-pills
- Animaties: subtiel. `transition-all duration-200` op cards. Geen page transitions.
- Dark mode: niet nodig voor publieke pagina (volg dashboard pattern voor dashboard pagina's)

---

## Volgorde van bouwen

1. **Collection model + basis API routes** (CRUD)
2. **Dashboard: collectie-overzicht pagina** (`/dashboard/collections`)
3. **Dashboard: aanmaken/bewerken pagina** met document selector
4. **Publieke collectie-pagina** (`/c/[slug]`) met grid view
5. **Zoek & filter functionaliteit** op publieke pagina
6. **List view toggle** op publieke pagina
7. **Wachtwoord-beveiliging** flow
8. **SEO meta tags** en OG images
9. **Testen:** maak een collectie met 20+ documenten, test zoeken/filteren/responsive

---

## Checklist voor oplevering

- [ ] Collection CRUD werkt (aanmaken, bewerken, verwijderen)
- [ ] Documenten toevoegen/verwijderen/herordenen werkt
- [ ] Categorieën aanmaken en toewijzen werkt
- [ ] Publieke pagina rendert correct met grid en list view
- [ ] Zoeken filtert op titel + beschrijving
- [ ] Categorie-filter werkt
- [ ] Sorteren werkt (standaard, A-Z, nieuwste)
- [ ] Wachtwoord-beveiliging werkt end-to-end
- [ ] Responsive: werkt op mobile, tablet, desktop
- [ ] SEO: correcte meta tags, OG image, noindex voor niet-publieke collecties
- [ ] Slug is uniek en URL-safe
- [ ] Geen passwordHash lekken in publieke API responses
- [ ] Cover thumbnails laden lazy
- [ ] Sticky filter balk werkt bij scrollen
