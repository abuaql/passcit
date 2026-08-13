import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { verifyCredentials } from "@/lib/native-auth/credentials";
import { issueTokenPair } from "@/lib/native-auth/session";
import { enforceRateLimit, AUTH_RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Native counterpart to the web Credentials provider's authorize() in
// src/auth.ts — same verification rules (via verifyCredentials), but
// returns a bearer token pair for Keychain storage instead of setting a
// cookie session. Every failure mode (bad email, no such account,
// disabled account, wrong password, malformed request) returns the same
// generic response, so nothing here can be used to probe which accounts
// exist.
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "native-auth-login", AUTH_RATE_LIMITS.nativeLogin);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  try {
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const tokens = await issueTokenPair(user);
    return NextResponse.json({ ...tokens, user }, { status: 200 });
  } catch (error) {
    logger.error("api.native.auth.login", "Native login failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
