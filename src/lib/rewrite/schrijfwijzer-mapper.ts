/**
 * Maps schrijfwijzer rules to AI prompt instructions.
 * Converts selected rules into a structured prompt for the rewrite pipeline.
 */

import type { SchrijfwijzerRule } from "@/types/schrijfwijzer";

/**
 * Build the AI rewrite prompt from selected schrijfwijzer rules.
 */
export function buildRewritePrompt(
  rules: SchrijfwijzerRule[],
  selectedRuleNumbers: number[]
): string {
  const selectedRules = rules.filter((r) =>
    selectedRuleNumbers.includes(r.number)
  );

  if (selectedRules.length === 0) {
    return "";
  }

  const ruleInstructions = selectedRules
    .map((rule) => {
      let instruction = `- Regel ${rule.number}: ${rule.title}. ${rule.description}`;
      if (rule.exampleBefore && rule.exampleAfter) {
        instruction += `\n  Voorbeeld fout: "${rule.exampleBefore}"`;
        instruction += `\n  Voorbeeld goed: "${rule.exampleAfter}"`;
      }
      return instruction;
    })
    .join("\n");

  return `Je bent een professionele redacteur. Je herschrijft een Nederlandse werkinstructie op taalniveau B1.

Je past de volgende schrijfwijzer-regels toe:
${ruleInstructions}

Bewaar altijd:
- Alle kopjes en de documentstructuur (H1, H2, H3, H4)
- Artikelnummers en wetsverwijzingen (bijv. "artikel 18b, lid 2 WML")
- Eigennamen, organisatienamen, datums
- Opsommingen en lijsten (pas alleen de tekst aan)
- Nummering en volgorde van secties

Verwijder nooit informatie. Voeg geen nieuwe informatie toe.
Wijzig NOOIT wettelijke verwijzingen, artikelnummers of wetnamen.

Herschrijf de volgende sectie:
---
{CHUNK}
---

Geef alleen de herschreven tekst terug in dezelfde structuur als de input. Geen uitleg, geen commentaar.`;
}

/**
 * Build a section-specific rewrite prompt (for re-rewriting a single section).
 */
export function buildSectionRewritePrompt(
  rules: SchrijfwijzerRule[],
  selectedRuleNumbers: number[],
  sectionTitle: string
): string {
  const basePrompt = buildRewritePrompt(rules, selectedRuleNumbers);
  return basePrompt.replace(
    "Herschrijf de volgende sectie:",
    `Herschrijf de volgende sectie "${sectionTitle}":`
  );
}
