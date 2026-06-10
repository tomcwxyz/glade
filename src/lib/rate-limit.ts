import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Fail open when Upstash isn't configured (local dev, preview without creds):
// rate limiting is a hardening layer, not an auth gate.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Public REST API: per API key/space.
const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "60 s"),
      prefix: "rl:api",
      analytics: false,
    })
  : null;

// Live-meeting polling: higher ceiling (2s polling ≈ 30/min/participant).
const pollLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, "60 s"),
      prefix: "rl:poll",
      analytics: false,
    })
  : null;

type LimitResult = { success: boolean; limit: number; remaining: number; reset: number };
const PASS: LimitResult = { success: true, limit: 0, remaining: 0, reset: 0 };

export async function limitApi(identifier: string): Promise<LimitResult> {
  if (!apiLimiter) return PASS;
  return apiLimiter.limit(identifier);
}

export async function limitPoll(identifier: string): Promise<LimitResult> {
  if (!pollLimiter) return PASS;
  return pollLimiter.limit(identifier);
}

/** Standard 429 response with rate-limit headers. */
export function rateLimitedResponse(result: LimitResult): NextResponse {
  const retryAfter = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Rate limit exceeded. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "Cache-Control": "no-store",
      },
    }
  );
}
