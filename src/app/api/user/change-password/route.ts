import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "This account signed up with Google and has no password to change." },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ message: "Password updated." });
  } catch (error) {
    logger.error("api.user.changePassword", "Could not change password", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
