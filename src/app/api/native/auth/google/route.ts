import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyGoogleIdToken } from "@/lib/native-auth/google";
import { resolveOAuthAccount } from "@/lib/native-auth/oauth-account";
import { issueTokenPair } from "@/lib/native-auth/session";
import { enforceRateLimit, AUTH_RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const bodySchema = z.object({ idToken: z.string().min(1) });

// See apple/route.ts for why this is split into an injectable-dependency
// handler plus a thin POST wrapper — the real verifier always talks to
// Google's live JWKS, which tests must never depend on.
export async function handleGoogleAuth(
  req: Request,
  deps: { verifyIdToken?: typeof verifyGoogleIdToken } = {}
): Promise<Response> {
  const verifyIdToken = deps.verifyIdToken ?? verifyGoogleIdToken;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Google credential." }, { status: 401 });
  }

  try {
    const claims = await verifyIdToken(parsed.data.idToken);
    if (!claims) {
      return NextResponse.json({ error: "Invalid Google credential." }, { status: 401 });
    }

    const resolution = await resolveOAuthAccount({
      provider: "google",
      providerAccountId: claims.sub,
      email: claims.email,
      emailVerified: claims.emailVerified,
    });

    if (resolution.status === "error") {
      return NextResponse.json({ error: "Invalid Google credential." }, { status: 401 });
    }

    const tokens = await issueTokenPair({ id: resolution.user.id, role: resolution.user.role });
    return NextResponse.json(
      { ...tokens, user: resolution.user, isNewUser: resolution.isNewUser },
      { status: 200 }
    );
  } catch (error) {
    logger.error("api.native.auth.google", "Native Google sign-in failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "native-auth-google", AUTH_RATE_LIMITS.nativeGoogle);
  if (limited) return limited;

  return handleGoogleAuth(req);
}
