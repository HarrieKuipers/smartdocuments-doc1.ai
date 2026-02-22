# Instructie: Doc1.ai Document Bewerken - Layout Verbetering

## Doel
Refactor de Document Bewerken pagina naar een tab-gebaseerde layout zodat:
- De "Begrippen & Definities" sectie volledige breedte kan gebruiken
- Alle drie de panels (Intelligentie, Samenvatting, Begrippen & Definities) even veel aandacht krijgen
- De UI overzichtelijker en intuïtiever wordt

## Huidige Situatie
```
[Intelligentie Panel] [Samenvatting Panel] [Begrippen & Definities Panel - TE SMAL]
```

## Gewenste Layout

### Option A: Tab Navigatie (Aanbevolen)
```
┌─────────────────────────────────────────────────────┐
│ Document Bewerken                                   │
├─────────────────────────────────────────────────────┤
│ [Intelligentie] [Samenvatting] [Begrippen & Defs] │ ← Tab buttons
├─────────────────────────────────────────────────────┤
│                                                     │
│         (Active Tab Content - Full Width)          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Option B: Toggle Preview
```
┌────────────────────────────────┐
│ [Intelligentie] [Samenvatting] │ ← Twee kolommen
│ [Preview Toggle]               │
├────────────────────────────────┤
│ Col1        │ Col2             │
│             │ [Begrippen ▼]    │ ← Expandable/Full Width Option
```

## Implementatie Details

### 1. Tab Component Structuur
```tsx
// Tabs: "Intelligentie", "Samenvatting", "Begrippen & Definities"
const [activeTab, setActiveTab] = useState('samenvatting');

const tabs = [
  { id: 'intelligentie', label: 'Intelligentie', icon: '🧠' },
  { id: 'samenvatting', label: 'Samenvatting', icon: '📝' },
  { id: 'definities', label: 'Begrippen & Definities', icon: '📚' }
];
```

### 2. Tab Navigation Bar
- Plaats tabbar onder "Document Bewerken" heading
- Active tab: Blauw accentkleur (consistent met huidge design)
- Inactive tabs: Grijs, hover effect
- Icons optioneel toevoegen voor beter herkenning

### 3. Content Containers
Elk tab bevat:
- **Intelligentie Tab**: Titel, Beschrijving, Auteur(s), Tags, Toegang, Sjabloon
- **Samenvatting Tab**: Samenvattingstekst editor + Hoofdpunten checklist
- **Begrippen & Definities Tab**: Definities lijst in volle breedte

### 4. Responsive Behavior
- Desktop (>1200px): Tabs boven, volledige breedte content
- Tablet (768px-1199px): Tabs kunnen horizontal scrollen als nodig
- Mobile (<768px): Stack layout

## Specifieke UI Wijzigingen

### Header Sectie
```
Dashboard > [← button] Document Bewerken
[✓ Opgeslagen] [👁 Voorbeeld] [Publiceren]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Intelligentie] [Samenvatting] [Begrippen & Definities]  ← TAB NAV
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Content Area
- Remove 3-kolom layout
- Single column (full available width) voor active tab
- Max-width: 1200px voor readability waar nodig
- Padding aanpassen zodat content goed ademruimte heeft

### Begrippen & Definities in Full Width
```
Begrippen & Definities
[+ Nieuw]

┌──────────────────────────────────────────┐
│ arbeidsovereenk       │ 8 | [x]          │
│ Juridisch contract... │   |              │
├──────────────────────────────────────────┤
│ bepaalde tijd         │ 5 | [x]          │
│ Arbeidscontract met.. │   |              │
├──────────────────────────────────────────┤
│ dienstverband        │ 7 | [x]          │
│ De arbeidsrelatie... │   |              │
└──────────────────────────────────────────┘
```

## Implementatie Stappen

1. **State Management**
   - Voeg `activeTab` state toe
   - Implementeer tab switching logic

2. **Navigation Component**
   - Create reusable TabNavigationBar component
   - Styling: Consistent met doc1.ai design

3. **Content Reorganisatie**
   - Wrap elk panel in conditional rendering
   - Alleen active tab renderen (performance)

4. **Styling Aanpassingen**
   - Remove grid 3-column layout
   - Implementeer full-width layout
   - Margin/padding optimalisatie

5. **Animations (Optional)**
   - Fade-in effect bij tab switch
   - Smooth transitions

## Code References

### Tailwind Classes voor Layout
```
Layout: grid-cols-1 (i.p.v. grid-cols-3)
Width: w-full
Max-width: max-w-4xl (voor Intelligentie/Samenvatting)
           max-w-5xl (voor Begrippen tab)
Padding: px-6 lg:px-8
```

### Tab Button Styling
- Base: `px-4 py-2 font-medium text-sm border-b-2`
- Inactive: `border-transparent text-gray-600 hover:text-gray-900`
- Active: `border-blue-600 text-blue-600`

## Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Testing Checklist
- [ ] Alle tabs switchable
- [ ] Content volledig zichtbaar per tab
- [ ] No hydration mismatches
- [ ] Responsive op alle breakpoints
- [ ] Keyboard navigation (Tab-toets)
- [ ] State persistent tijdens sessie

## Vragen/Clarificaties
- Moet de tab-keuze worden opgeslagen (localStorage)?
- Wil je keyboard shortcuts (bv. Ctrl+1, Ctrl+2, Ctrl+3)?
- Moet de Voorbeeldknop werken met alle tabs?
