import { prisma } from "@/lib/prisma";
import type { StudyStatus } from "@/generated/prisma/client";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / msPerDay);
}

/**
 * Call this any time a person does something that counts as "studying
 * today" — answering a quiz question, flipping and marking a flashcard,
 * revealing a random question's answer. Updates both the daily
 * StudySession row (version-scoped, since it tracks what was studied)
 * and the running streak (deliberately NOT version-scoped — a streak is
 * about the daily habit, not which test you happened to study, so
 * switching versions never resets it).
 */
export async function recordStudyActivity(
  userId: string,
  testVersionId: string,
  questionsReviewed = 1
) {
  const today = startOfDay(new Date());

  await prisma.studySession.upsert({
    where: { userId_date_testVersionId: { userId, date: today, testVersionId } },
    update: { questionsReviewed: { increment: questionsReviewed } },
    create: { userId, testVersionId, date: today, questionsReviewed },
  });

  const streak = await prisma.studyStreak.findUnique({ where: { userId } });

  if (!streak) {
    await prisma.studyStreak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastStudyDate: today },
    });
    return;
  }

  if (streak.lastStudyDate && daysBetween(streak.lastStudyDate, today) === 0) {
    // Already studied today — streak already reflects it.
    return;
  }

  const continuesStreak = streak.lastStudyDate && daysBetween(streak.lastStudyDate, today) === 1;
  const newCurrent = continuesStreak ? streak.currentStreak + 1 : 1;

  await prisma.studyStreak.update({
    where: { userId },
    data: {
      currentStreak: newCurrent,
      longestStreak: Math.max(newCurrent, streak.longestStreak),
      lastStudyDate: today,
    },
  });
}

// Favorites, like all UserQuestionProgress rows, are naturally scoped to
// a specific TestVersion through the Question they reference — no
// testVersionId needed on this table itself.
export async function toggleFavorite(userId: string, questionId: string) {
  const existing = await prisma.userQuestionProgress.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });

  if (!existing) {
    const created = await prisma.userQuestionProgress.create({
      data: { userId, questionId, isFavorite: true },
    });
    return created.isFavorite;
  }

  const updated = await prisma.userQuestionProgress.update({
    where: { userId_questionId: { userId, questionId } },
    data: { isFavorite: !existing.isFavorite },
  });
  return updated.isFavorite;
}

export async function setStudyStatus(userId: string, questionId: string, status: StudyStatus) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { testVersionId: true },
  });
  if (!question) throw new Error("Question not found.");

  await prisma.userQuestionProgress.upsert({
    where: { userId_questionId: { userId, questionId } },
    update: { status },
    create: { userId, questionId, status },
  });
  await recordStudyActivity(userId, question.testVersionId);
}

export async function recordQuizAnswer(userId: string, questionId: string, isCorrect: boolean) {
  await prisma.userQuestionProgress.upsert({
    where: { userId_questionId: { userId, questionId } },
    update: {
      timesCorrect: { increment: isCorrect ? 1 : 0 },
      timesIncorrect: { increment: isCorrect ? 0 : 1 },
      status: isCorrect ? "KNOWN" : "NEEDS_PRACTICE",
    },
    create: {
      userId,
      questionId,
      timesCorrect: isCorrect ? 1 : 0,
      timesIncorrect: isCorrect ? 0 : 1,
      status: isCorrect ? "KNOWN" : "NEEDS_PRACTICE",
    },
  });
}

export interface DashboardStats {
  questionsCompleted: number;
  totalQuestions: number;
  accuracyPercent: number | null;
  currentStreak: number;
  longestStreak: number;
  favoritesCount: number;
  lastActivity: Date | null;
}

/**
 * Stats split deliberately: "completed," "accuracy," and "favorites" are
 * scoped to whichever TestVersion is passed in — mixing question pools of
 * different sizes/content into one number wouldn't mean anything. Streak
 * and last-activity stay global (see recordStudyActivity above).
 */
export async function getDashboardStats(
  userId: string,
  testVersionId: string
): Promise<DashboardStats> {
  const [progressRows, favoritesCount, streak, totalQuestions] = await Promise.all([
    prisma.userQuestionProgress.findMany({
      where: { userId, question: { testVersionId } },
      select: { timesCorrect: true, timesIncorrect: true },
    }),
    prisma.userQuestionProgress.count({
      where: { userId, isFavorite: true, question: { testVersionId } },
    }),
    prisma.studyStreak.findUnique({ where: { userId } }),
    prisma.question.count({ where: { testVersionId, isActive: true } }),
  ]);

  const attempted = progressRows.filter((p) => p.timesCorrect + p.timesIncorrect > 0);
  const totalCorrect = attempted.reduce((sum, p) => sum + p.timesCorrect, 0);
  const totalAnswers = attempted.reduce((sum, p) => sum + p.timesCorrect + p.timesIncorrect, 0);

  return {
    questionsCompleted: attempted.length,
    totalQuestions,
    accuracyPercent: totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null,
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    favoritesCount,
    lastActivity: streak?.lastStudyDate ?? null,
  };
}
