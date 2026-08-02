import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

export async function PATCH(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
    });
    return NextResponse.json({ name: user.name });
  } catch (error) {
    logger.error("api.user.profile", "Could not update profile", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
