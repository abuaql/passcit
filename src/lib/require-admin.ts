import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { resolveBearerUser } from "@/lib/native-auth/bearer";

/**
 * The identity shape every API route actually relies on (`session.user.id`,
 * and `session.user.role` via requireAdmin()) — a subset of Auth.js's own
 * `Session`, kept separate so this file's bearer-token fallback path
 * (which has no cookie session, no `expires`, etc.) can return the same
 * shape without needing to fabricate an entire fake `Session`.
 */
export interface RequireUserSession {
  user: {
    id: string;
    role: "USER" | "ADMIN";
  };
}

/**
 * Call at the top of any API route that just needs "someone is logged
 * in" — no role check. Was previously 16 separate copies of this same
 * 4-line check scattered across API routes (with a small, accidental
 * wording inconsistency: 14 said "Not authenticated.", 2 said
 * "Unauthorized").
 *
 * Resolves identity two ways, in order:
 *  1. The existing Auth.js cookie/JWT session (web) — unchanged from
 *     before this function grew a second path.
 *  2. A native `Authorization: Bearer <access-token>` header (iOS) — only
 *     consulted when there is no cookie session. This is the single
 *     place bearer tokens are ever checked; individual routes never see
 *     the difference between the two credential types.
 *
 * Returns the session on success, or a Response to return immediately
 * (so callers can `const guard = await requireUser(); if (guard instanceof Response) return guard;`).
 */
export async function requireUser(): Promise<RequireUserSession | Response> {
  const session = await auth();
  if (session?.user?.id) {
    return session;
  }

  const headersList = await headers();
  const bearerUser = await resolveBearerUser(headersList.get("authorization"));
  if (bearerUser) {
    return { user: bearerUser };
  }

  return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
}

/**
 * Call at the top of every admin API route. proxy.ts already blocks
 * non-admins from /admin/* pages, but API routes get their own check too
 * — the same defense-in-depth principle used throughout this app,
 * since proxy-only protection has known bypass classes in Next.js.
 *
 * Builds on requireUser() rather than repeating the same session check,
 * then adds the role check on top.
 *
 * Returns the session on success, or a Response to return immediately
 * (so callers can `const guard = await requireAdmin(); if (guard instanceof Response) return guard;`).
 */
export async function requireAdmin() {
  const guard = await requireUser();
  if (guard instanceof Response) return guard;
  if (guard.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return guard;
}
