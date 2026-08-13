/**
 * Dependency-free, in-memory, fixed-window rate limiter for public
 * authentication endpoints.
 *
 * DEPLOYMENT SCOPE — READ BEFORE CHANGING THE DEPLOYMENT MODEL:
 * this project's documented target (see README.md — Hostinger) is a
 * single Node process, not a serverless/multi-instance environment, and
 * no shared cache (Redis/Upstash/etc.) exists anywhere in this repo
 * (confirmed by inspection) — installing one wasn't justified by that
 * reality. This limiter's protection is therefore REAL but
 * PROCESS-LOCAL: each running instance keeps its own counters. If this
 * app is ever deployed across multiple instances or as serverless
 * functions, this module's ceiling effectively multiplies by instance
 * count and stops being a reliable global limit. Whoever changes the
 * deployment model needs to swap the `store` below for a shared one —
 * every call site goes through `checkRateLimit`/`enforceRateLimit`, so
 * that swap touches only this file.
 *
 * Single configuration point: AUTH_RATE_LIMITS below. Route files never
 * hardcode a window/max — they reference a named entry here.
 */

import { NextResponse } from "next/server";

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Conservative, intentionally generous defaults — tune here, nowhere else. */
export const AUTH_RATE_LIMITS = {
  nativeLogin: { windowMs: 15 * 60 * 1000, max: 10 },
  nativeRegister: { windowMs: 60 * 60 * 1000, max: 5 },
  nativeRefresh: { windowMs: 15 * 60 * 1000, max: 30 },
  nativeApple: { windowMs: 15 * 60 * 1000, max: 10 },
  nativeGoogle: { windowMs: 15 * 60 * 1000, max: 10 },
  forgotPassword: { windowMs: 60 * 60 * 1000, max: 5 },
} as const satisfies Record<string, RateLimitConfig>;

interface WindowState {
  count: number;
  windowStart: number;
}

const store = new Map<string, WindowState>();

/**
 * Best-effort client IP extraction. Deliberately NOT trusted as a
 * cryptographic identity — `x-forwarded-for`'s leftmost entry is
 * client-suppliable unless a confirmed trusted reverse proxy overwrites
 * it, which this deployment does not document. This is the best signal
 * available in a standard Next.js Route Handler (no `req.ip` — that was
 * a Vercel Edge-specific extension this app doesn't rely on), combined
 * with the endpoint name so limits are independent per action.
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/** Pure, injectable `now` for deterministic window/reset tests. */
export function checkRateLimit(key: string, config: RateLimitConfig, now: number = Date.now()): RateLimitResult {
  const existing = store.get(key);

  if (!existing || now - existing.windowStart >= config.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: config.max - 1, retryAfterSeconds: 0 };
  }

  if (existing.count < config.max) {
    existing.count += 1;
    return { allowed: true, remaining: config.max - existing.count, retryAfterSeconds: 0 };
  }

  const retryAfterMs = config.windowMs - (now - existing.windowStart);
  return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}

/**
 * Route-level convenience: returns a ready-to-return 429 Response if the
 * request should be rejected, or null if it may proceed. A single
 * generic message and status regardless of endpoint or reason — never
 * reveals whether the underlying account/identifier exists, since the
 * decision is made purely from (endpoint, IP), before any account lookup
 * ever happens.
 */
export function enforceRateLimit(req: Request, endpoint: string, config: RateLimitConfig): NextResponse | null {
  const key = `${endpoint}:${getClientIp(req)}`;
  const result = checkRateLimit(key, config);
  if (result.allowed) return null;

  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}

/** Test-only — never called from production code. */
export function __resetRateLimitStoreForTests(): void {
  store.clear();
}
