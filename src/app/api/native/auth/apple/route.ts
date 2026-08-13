import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAppleIdentityToken } from "@/lib/native-auth/apple";
import { resolveOAuthAccount } from "@/lib/native-auth/oauth-account";
import { issueTokenPair } from "@/lib/native-auth/session";
import { enforceRateLimit, AUTH_RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  identityToken: z.string().min(1),
  // Accepted but never used/persisted in this phase — Apple's
  // authorization code is only meaningful if this backend later needs to
  // call Apple's own token endpoint (e.g. for server-side revocation),
  // which is out of scope here.
  authorizationCode: z.string().optional(),
  name: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    })
    .optional(),
});

/** Apple sends the user's name to the client only on the very first authorization — the client must relay it here since Apple's identity token itself never carries it. */
function buildDisplayName(name?: { firstName?: string; lastName?: string }): string | null {
  if (!name) return null;
  const parts = [name.firstName, name.lastName].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0
  );
  return parts.length > 0 ? parts.join(" ") : null;
}

// The real signature verification (verifyAppleIdentityToken) always talks
// to Apple's live JWKS, which tests must never depend on. Splitting the
// route into this injectable-dependency handler plus a thin POST wrapper
// below lets tests exercise the route's own logic — body validation,
// account resolution wiring, response shaping, status codes — with a
// fake verifier, while production always uses the real one.
export async function handleAppleAuth(
  req: Request,
  deps: { verifyIdentityToken?: typeof verifyAppleIdentityToken } = {}
): Promise<Response> {
  const verifyIdentityToken = deps.verifyIdentityToken ?? verifyAppleIdentityToken;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Apple credential." }, { status: 401 });
  }

  try {
    const claims = await verifyIdentityToken(parsed.data.identityToken);
    if (!claims) {
      return NextResponse.json({ error: "Invalid Apple credential." }, { status: 401 });
    }

    const resolution = await resolveOAuthAccount({
      provider: "apple",
      providerAccountId: claims.sub,
      email: claims.email,
      emailVerified: claims.emailVerified,
      name: buildDisplayName(parsed.data.name),
    });

    if (resolution.status === "error") {
      return NextResponse.json({ error: "Invalid Apple credential." }, { status: 401 });
    }

    const tokens = await issueTokenPair({ id: resolution.user.id, role: resolution.user.role });
    return NextResponse.json(
      { ...tokens, user: resolution.user, isNewUser: resolution.isNewUser },
      { status: 200 }
    );
  } catch (error) {
    logger.error("api.native.auth.apple", "Native Apple sign-in failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "native-auth-apple", AUTH_RATE_LIMITS.nativeApple);
  if (limited) return limited;

  return handleAppleAuth(req);
}
