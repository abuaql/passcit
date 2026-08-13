import { NextResponse } from "next/server";
import { z } from "zod";
import { rotateTokenPair } from "@/lib/native-auth/session";
import { enforceRateLimit, AUTH_RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const bodySchema = z.object({ refreshToken: z.string().min(1) });

// Rotation, not re-issue: rotateTokenPair() atomically revokes the
// presented refresh token and creates its successor, so a captured
// refresh token cannot be replayed after its first legitimate use. Every
// rejection reason (not found, revoked, expired, account no longer
// active) collapses into the same generic response.
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "native-auth-refresh", AUTH_RATE_LIMITS.nativeRefresh);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Refresh token invalid or expired." }, { status: 401 });
  }

  try {
    const tokens = await rotateTokenPair(parsed.data.refreshToken);
    if (!tokens) {
      return NextResponse.json({ error: "Refresh token invalid or expired." }, { status: 401 });
    }
    return NextResponse.json(tokens);
  } catch (error) {
    logger.error("api.native.auth.refresh", "Refresh token rotation failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
