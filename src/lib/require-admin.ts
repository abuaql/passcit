import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Call at the top of any API route that just needs "someone is logged
 * in" — no role check. Was previously 16 separate copies of this same
 * 4-line check scattered across API routes (with a small, accidental
 * wording inconsistency: 14 said "Not authenticated.", 2 said
 * "Unauthorized").
 *
 * Returns the session on success, or a Response to return immediately
 * (so callers can `const guard = await requireUser(); if (guard instanceof Response) return guard;`).
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return session;
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
