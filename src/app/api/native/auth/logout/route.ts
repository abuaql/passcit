import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { revokeRefreshTokenForUser } from "@/lib/native-auth/refresh-token";
import { logger } from "@/lib/logger";

const bodySchema = z.object({ refreshToken: z.string().min(1) });

// Requires the access token that's about to be discarded, so only the
// session's own owner can revoke it. revokeRefreshTokenForUser() scopes
// its update to (tokenHash, userId, revokedAt: null) in one statement,
// which makes this both idempotent (a second call matches nothing and
// no-ops) and ownership-safe (a token belonging to a different user also
// matches nothing) — the response is identical either way, so a caller
// can never use this to probe whether a token exists for someone else.
export async function POST(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await revokeRefreshTokenForUser(parsed.data.refreshToken, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("api.native.auth.logout", "Logout failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
