import { prisma } from "@/lib/prisma";
import type { QuestionCategory, TestVersion } from "@/generated/prisma/client";

export interface QuestionFilters {
  testVersionId: string;
  category?: QuestionCategory;
  search?: string;
  tagSlug?: string;
  favoritesOnly?: boolean;
  special6520Only?: boolean;
  userId?: string;
}

// Shape returned by list/browse queries — enough to render a QuestionCard
// without a second round trip, but not the full answer/explanation payload.
export function questionListSelect(userId?: string) {
  return {
    id: true,
    number: true,
    category: true,
    subcategory: true,
    question: true,
    isSpecial65_20: true,
    isDynamicAnswer: true,
    variesByLocation: true,
    answers: {
      select: { text: true },
      orderBy: { sortOrder: "asc" as const },
      take: 1,
    },
    tags: {
      select: { tag: { select: { id: true, name: true, slug: true } } },
    },
    progress: userId
      ? {
          where: { userId },
          select: { isFavorite: true, status: true },
          take: 1,
        }
      : false,
  };
}

export async function getDefaultTestVersion(): Promise<TestVersion> {
  const version = await prisma.testVersion.findFirst({ where: { isDefault: true } });
  if (!version) {
    throw new Error(
      "No default TestVersion found — run `npm run db:seed` to load the civics test data."
    );
  }
  return version;
}

// Every version-scoped page/route calls this once, then passes
// testVersion.id down to whichever helpers below it needs. Falls back to
// the default version if the user hasn't picked one yet, or if their
// pick somehow points at a version that's since been deactivated.
export async function getActiveTestVersion(userId?: string): Promise<TestVersion> {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeTestVersionId: true },
    });
    if (user?.activeTestVersionId) {
      const version = await prisma.testVersion.findUnique({
        where: { id: user.activeTestVersionId },
      });
      if (version?.isActive) return version;
    }
  }
  return getDefaultTestVersion();
}

// Powers the version switcher UI.
export async function getAllTestVersions(): Promise<TestVersion[]> {
  return prisma.testVersion.findMany({
    where: { isActive: true },
    orderBy: { year: "asc" },
  });
}

export async function setActiveTestVersion(userId: string, testVersionId: string) {
  const version = await prisma.testVersion.findUnique({ where: { id: testVersionId } });
  if (!version || !version.isActive) {
    throw new Error("That test version isn't available.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { activeTestVersionId: testVersionId },
  });
  return version;
}

export async function getQuestions(filters: QuestionFilters) {
  return prisma.question.findMany({
    where: {
      testVersionId: filters.testVersionId,
      isActive: true,
      category: filters.category,
      isSpecial65_20: filters.special6520Only ? true : undefined,
      question: filters.search ? { contains: filters.search } : undefined,
      tags: filters.tagSlug ? { some: { tag: { slug: filters.tagSlug } } } : undefined,
      progress: filters.favoritesOnly
        ? { some: { userId: filters.userId, isFavorite: true } }
        : undefined,
    },
    select: questionListSelect(filters.userId),
    orderBy: { number: "asc" },
  });
}

// Doesn't need a testVersionId — `id` is a globally unique cuid regardless
// of which version the question belongs to.
export async function getQuestionById(id: string, userId?: string) {
  return prisma.question.findUnique({
    where: { id },
    include: {
      testVersion: { select: { slug: true, name: true } },
      answers: { orderBy: { sortOrder: "asc" } },
      tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      progress: userId ? { where: { userId } } : false,
    },
  });
}

// Random Question mode. `excludeId` avoids immediately repeating the
// question the person just saw when they tap "show me another."
export async function getRandomQuestion(
  testVersionId: string,
  excludeId?: string,
  userId?: string
) {
  const candidates = await prisma.question.findMany({
    where: {
      testVersionId,
      isActive: true,
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true },
  });

  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  if (!pick) return null;

  return getQuestionById(pick.id, userId);
}

// Question pool used by the auto-graded quiz modes (Practice Mode, Mock
// Interview). Deliberately excludes `variesByLocation` questions (state
// capital, Senators, Representative, Governor) — there's no single
// objectively correct multiple-choice answer for those since the real
// answer depends on where the test-taker lives. They still appear fully
// in Browse, Question Details, and Flashcards, just not in auto-scored
// quizzes.
export async function getQuizQuestionPool(options: {
  testVersionId: string;
  category?: QuestionCategory;
  onlyQuestionIds?: string[];
}) {
  return prisma.question.findMany({
    where: {
      testVersionId: options.testVersionId,
      isActive: true,
      variesByLocation: false,
      category: options.category,
      id: options.onlyQuestionIds ? { in: options.onlyQuestionIds } : undefined,
    },
    include: {
      answers: { orderBy: { sortOrder: "asc" } },
    },
  });
}
