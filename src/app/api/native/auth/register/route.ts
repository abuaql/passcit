import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { issueTokenPair } from "@/lib/native-auth/session";
import { enforceRateLimit, AUTH_RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Native counterpart to POST /api/auth/register — same validation,
// password hashing (bcrypt cost 12), and StudyStreak creation, but
// returns a bearer token pair (and the full user shape) instead of just
// {id, email}, so the app can go straight into an authenticated session
// without a separate login round trip after signing up.
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "native-auth-register", AUTH_RATE_LIMITS.nativeRegister);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    await prisma.studyStreak.create({ data: { userId: user.id } });

    const tokens = await issueTokenPair({ id: user.id, role: user.role });
    return NextResponse.json(
      {
        ...tokens,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("api.native.auth.register", "Native registration failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
