import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Configured only when the Upstash env is present. Without it (local dev, CI,
// tests) rate limiting is disabled and requests pass through — fail open, so a
// missing store never breaks the app.
const limiter =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(20, "10 s"),
        prefix: "dbd:rl",
        analytics: false,
      })
    : null;

export function rateLimitEnabled(): boolean {
  return limiter !== null;
}

interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimitResponse(
  result: LimitResult,
  now: number
): NextResponse | null {
  if (result.success) return null;
  const retryAfter = Math.max(0, Math.ceil((result.reset - now) / 1000));
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

export async function enforceRateLimit(
  identifier: string
): Promise<NextResponse | null> {
  if (!limiter) return null;
  const result = await limiter.limit(identifier);
  return rateLimitResponse(result, Date.now());
}
