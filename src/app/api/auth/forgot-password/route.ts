import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendPasswordResetEmail } from "@/lib/mail";
import { enforceRateLimit, AUTH_RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "auth-forgot-password", AUTH_RATE_LIMITS.forgotPassword);
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond the same way whether or not the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt },
      });

      const resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    }

    return NextResponse.json({
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (error) {
    logger.error("api.auth.forgotPassword", "Forgot-password request failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
