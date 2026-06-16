type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Enkel in-memory rate limiter (per serverless-instans). */
export function rateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (existing.count >= config.max) {
    return false;
  }

  existing.count += 1;
  return true;
}

export function rateLimitHeaders(config: RateLimitConfig): Record<string, string> {
  return {
    'Retry-After': String(Math.ceil(config.windowMs / 1000)),
    'X-RateLimit-Limit': String(config.max),
  };
}
