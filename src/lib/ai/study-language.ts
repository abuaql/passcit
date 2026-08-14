import { prisma } from "@/lib/prisma";
import { DEFAULT_STUDY_LANGUAGE } from "@/lib/ai/languages";
import type { StudyLanguage } from "@/generated/prisma/client";

/**
 * The user's saved study language.
 *
 * Server-only, and kept out of languages.ts on purpose: that module is
 * imported by client components, and pulling Prisma into it would drag the
 * database client into the browser bundle.
 */
export async function getUserStudyLanguage(userId: string | undefined): Promise<StudyLanguage> {
  if (!userId) return DEFAULT_STUDY_LANGUAGE;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { studyLanguage: true },
  });
  return user?.studyLanguage ?? DEFAULT_STUDY_LANGUAGE;
}
