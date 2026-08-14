import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { STUDY_LANGUAGES } from "@/lib/ai/languages";
import { logger } from "@/lib/logger";
import type { StudyLanguage } from "@/generated/prisma/client";

// Derived from the single language list so a new language never needs a
// second edit here. The assertion is only about tuple shape (z.enum needs a
// non-empty tuple), not about the values themselves.
const LANGUAGE_CODES = STUDY_LANGUAGES.map((l) => l.code) as [StudyLanguage, ...StudyLanguage[]];

const bodySchema = z.object({ language: z.enum(LANGUAGE_CODES) });

/** Persists the study-language preference to the account so it follows the user across devices. */
export async function PATCH(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { studyLanguage: parsed.data.language },
    });
    return NextResponse.json({ language: parsed.data.language });
  } catch (error) {
    logger.error("api.studyLanguage", "Could not save the study language", error);
    return NextResponse.json({ error: "Could not save your language." }, { status: 500 });
  }
}
