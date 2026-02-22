/**
 * Safety check (vangnet) for AI rewrite output.
 * Ensures critical elements are preserved and no information is lost.
 * Adapted from leene-redactieflow safety-check patterns.
 */

export interface SafetyCheckResult {
  passed: boolean;
  issues: string[];
  correctedText?: string;
}

// Patterns that must NEVER be changed
const LEGAL_REFERENCE_PATTERN =
  /artikel\s+\d+[a-z]?(?:\s*,\s*lid\s+\d+)?(?:\s+\w+)?/gi;
const LAW_NAME_PATTERN =
  /\b(?:WML|Arbowet|BW|WvSr|Wet\s+\w+|Besluit\s+\w+|Regeling\s+\w+)\b/g;
const DATE_PATTERN = /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g;

/**
 * Run safety checks on rewritten text against the original.
 */
export function runSafetyCheck(
  original: string,
  rewritten: string
): SafetyCheckResult {
  const issues: string[] = [];
  let correctedText = rewritten;

  // 1. Check legal references are preserved
  const originalRefs = extractMatches(original, LEGAL_REFERENCE_PATTERN);
  const rewrittenRefs = extractMatches(correctedText, LEGAL_REFERENCE_PATTERN);

  for (const ref of originalRefs) {
    if (!rewrittenRefs.includes(ref)) {
      issues.push(`Wettelijke verwijzing ontbreekt: "${ref}"`);
    }
  }

  // 2. Check law names are preserved
  const originalLaws = extractMatches(original, LAW_NAME_PATTERN);
  const rewrittenLaws = extractMatches(correctedText, LAW_NAME_PATTERN);

  for (const law of originalLaws) {
    if (!rewrittenLaws.includes(law)) {
      issues.push(`Wetnaam ontbreekt: "${law}"`);
    }
  }

  // 3. Check dates are preserved
  const originalDates = extractMatches(original, DATE_PATTERN);
  const rewrittenDates = extractMatches(correctedText, DATE_PATTERN);

  for (const date of originalDates) {
    if (!rewrittenDates.includes(date)) {
      issues.push(`Datum ontbreekt: "${date}"`);
    }
  }

  // 4. Check headings are preserved (for structured text)
  const originalHeadings = extractHeadings(original);
  const rewrittenHeadings = extractHeadings(correctedText);

  for (const heading of originalHeadings) {
    const normalized = heading.toLowerCase().trim();
    const found = rewrittenHeadings.some(
      (h) => h.toLowerCase().trim() === normalized
    );
    if (!found) {
      issues.push(`Kopje ontbreekt of gewijzigd: "${heading}"`);
    }
  }

  // 5. Check text is not significantly shorter (potential information loss)
  const originalWordCount = original.split(/\s+/).filter(Boolean).length;
  const rewrittenWordCount = correctedText.split(/\s+/).filter(Boolean).length;
  const reduction = 1 - rewrittenWordCount / originalWordCount;

  if (reduction > 0.3) {
    issues.push(
      `Tekst is ${Math.round(reduction * 100)}% korter — mogelijke informatie verloren`
    );
  }

  return {
    passed: issues.length === 0,
    issues,
    correctedText: issues.length > 0 ? correctedText : undefined,
  };
}

function extractMatches(text: string, pattern: RegExp): string[] {
  const matches: string[] = [];
  let match;
  const regex = new RegExp(pattern.source, pattern.flags);
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

function extractHeadings(text: string): string[] {
  const headings: string[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const match = line.match(/^#{1,4}\s+(.+)$/);
    if (match) {
      headings.push(match[1]);
    }
  }
  return headings;
}
