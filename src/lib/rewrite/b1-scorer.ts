/**
 * B1-compliance score calculation.
 * Estimates how well the text conforms to B1 language level.
 */

interface B1Metrics {
  averageSentenceLength: number;
  passiveCount: number;
  longSentenceCount: number;
  totalSentences: number;
  totalWords: number;
}

/**
 * Calculate a B1 compliance score (0-100) for a given text.
 */
export function calculateB1Score(text: string): number {
  const metrics = analyzeText(text);

  if (metrics.totalSentences === 0) return 100;

  let score = 100;

  // Sentence length penalty (target: 10-12 words average)
  if (metrics.averageSentenceLength > 15) {
    score -= Math.min(30, (metrics.averageSentenceLength - 15) * 3);
  } else if (metrics.averageSentenceLength > 12) {
    score -= (metrics.averageSentenceLength - 12) * 2;
  }

  // Long sentence penalty
  const longSentenceRatio =
    metrics.longSentenceCount / metrics.totalSentences;
  if (longSentenceRatio > 0.1) {
    score -= Math.min(20, longSentenceRatio * 40);
  }

  // Passive voice penalty
  const passiveRatio = metrics.passiveCount / metrics.totalSentences;
  if (passiveRatio > 0.1) {
    score -= Math.min(20, passiveRatio * 30);
  }

  return Math.max(0, Math.round(score));
}

function analyzeText(text: string): B1Metrics {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const totalSentences = sentences.length;
  if (totalSentences === 0) {
    return {
      averageSentenceLength: 0,
      passiveCount: 0,
      longSentenceCount: 0,
      totalSentences: 0,
      totalWords: 0,
    };
  }

  let totalWords = 0;
  let longSentenceCount = 0;
  let passiveCount = 0;

  // Common Dutch passive patterns
  const passivePatterns = [
    /\bwordt?\b.*\b\w+d\b/i,
    /\bwerden?\b.*\b\w+d\b/i,
    /\bis\b.*\b\w+d\b/i,
    /\bzijn\b.*\b\w+d\b/i,
    /\bworden?\b/i,
  ];

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    totalWords += words.length;

    if (words.length > 20) {
      longSentenceCount++;
    }

    for (const pattern of passivePatterns) {
      if (pattern.test(sentence)) {
        passiveCount++;
        break;
      }
    }
  }

  return {
    averageSentenceLength: totalWords / totalSentences,
    passiveCount,
    longSentenceCount,
    totalSentences,
    totalWords,
  };
}
