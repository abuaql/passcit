import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { STUDY_LANGUAGES } from "@/lib/ai/languages";
import { logger } from "@/lib/logger";
import type { StudyLanguage } from "@/generated/prisma/client";

const LANGUAGE_CODES = STUDY_LANGUAGES.map((l) => l.code) as [StudyLanguage, ...StudyLanguage[]];

const bodySchema = z.object({
  questionId: z.string().min(1),
  action: z.enum(["EXPLANATION", "TRANSLATION", "MEMORY_TIP", "LISTEN"]),
  language: z.enum(LANGUAGE_CODES),
});

/**
 * Records a study interaction, for analytics only.
 *
 * Deliberately its own endpoint rather than a side effect of the generation
 * route: analytics must stay independent of caching, and Listen never touches
 * generation at all. It always answers 204 — even when the write fails —
 * because a client must never retry, surface, or be slowed by an analytics
 * problem. Failures are logged server-side where they can actually be seen.
 */
export async function POST(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    // Still 204: a malformed analytics ping is not the study session's problem.
    return new NextResponse(null, { status: 204 });
  }

  try {
    await prisma.studyActionEvent.create({
      data: {
        userId: session.user.id,
        questionId: parsed.data.questionId,
        action: parsed.data.action,
        language: parsed.data.language,
      },
    });
  } catch (error) {
    logger.error("api.studyEvents", "Could not record a study action event", error);
  }

  return new NextResponse(null, { status: 204 });
}
