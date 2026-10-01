import { NextRequest } from 'next/server';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so long-running processes do not grow forever. */
function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * Fixed-window in-memory rate limiter.
 *
 * Suitable for a single Node.js instance. A multi-instance deployment should
 * move this state to Redis/Postgres, but the call sites stay identical.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > 5000) {
    prune(now);
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(limit - existing.count, 0);

  if (existing.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
    };
  }

  return { allowed: true, limit, remaining, retryAfterSeconds: 0 };
}

/**
 * Build a stable throttle key for a request. Prefers the forwarded client IP
 * and falls back to a scope-only key when no address is available.
 */
export function clientKey(request: NextRequest, scope: string, discriminator?: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}:${discriminator ? discriminator.toLowerCase() : ''}`;
}

/** Test helper: clears all counters. */
export function resetRateLimits(): void {
  buckets.clear();
}
