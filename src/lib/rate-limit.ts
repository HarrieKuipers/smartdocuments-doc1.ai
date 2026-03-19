import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  apiKeyId: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): { remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(apiKeyId);

  if (!entry || entry.resetAt <= now) {
    store.set(apiKeyId, { count: 1, resetAt: now + windowMs });
    return { remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > limit) {
    throw NextResponse.json(
      { error: "Rate limit overschreden. Probeer het later opnieuw." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(entry.resetAt / 1000).toString(),
          "Retry-After": Math.ceil(
            (entry.resetAt - now) / 1000
          ).toString(),
        },
      }
    );
  }

  return { remaining: limit - entry.count, resetAt: entry.resetAt };
}
