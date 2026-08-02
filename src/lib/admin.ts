import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/categories";
import type { QuestionCategory } from "@/generated/prisma/client";

const DAY_MS = 1000 * 60 * 60 * 24;

export interface DashboardOverview {
  totalUsers: number;
  activeUsers: number;
  newUsers7d: number;
  totalQuestions: number;
  questionsByVersion: { versionName: string; count: number }[];
  practiceSessions: number;
  mockExamsCompleted: number;
  averageScorePercent: number | null;
}

/**
 * "Active users" means studied recently (a StudyStreak/StudySession
 * signal), not User.isActive — that field means "not admin-disabled,"
 * a different concept. Conflating the two would make this number
 * misleading (a brand-new, never-studied user is enabled but not active).
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS);
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);

  const [
    totalUsers,
    activeUsers,
    newUsers7d,
    totalQuestions,
    versions,
    practiceSessions,
    mockExamsCompleted,
    completedTests,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.studyStreak.count({ where: { lastStudyDate: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.question.count({ where: { isActive: true } }),
    prisma.testVersion.findMany({
      select: { name: true, _count: { select: { questions: true } } },
      orderBy: { year: "asc" },
    }),
    prisma.practiceTest.count(),
    prisma.practiceTest.count({ where: { mode: "MOCK_INTERVIEW", completedAt: { not: null } } }),
    prisma.practiceTest.findMany({
      where: { completedAt: { not: null }, score: { not: null } },
      select: { score: true, totalQuestions: true },
    }),
  ]);

  let averageScorePercent: number | null = null;
  if (completedTests.length > 0) {
    const sumOfRatios = completedTests.reduce((sum, t) => {
      if (!t.totalQuestions) return sum;
      return sum + (t.score ?? 0) / t.totalQuestions;
    }, 0);
    averageScorePercent = Math.round((sumOfRatios / completedTests.length) * 100);
  }

  return {
    totalUsers,
    activeUsers,
    newUsers7d,
    totalQuestions,
    questionsByVersion: versions.map((v) => ({ versionName: v.name, count: v._count.questions })),
    practiceSessions,
    mockExamsCompleted,
    averageScorePercent,
  };
}

export interface MissedQuestionStat {
  questionId: string;
  number: number;
  question: string;
  category: QuestionCategory;
  missedCount: number;
  attemptCount: number;
}

export async function getMostMissedQuestions(limit = 10): Promise<MissedQuestionStat[]> {
  // Grouping by a joined field (Question.category) isn't something
  // Prisma's groupBy supports directly, and this data volume is small
  // enough that fetching and aggregating in JS is simple and safe to
  // reason about without a live database to test complex SQL against.
  const answers = await prisma.practiceTestAnswer.findMany({
    select: {
      questionId: true,
      isCorrect: true,
      question: { select: { number: true, question: true, category: true } },
    },
  });

  const byQuestion = new Map<
    string,
    { number: number; question: string; category: QuestionCategory; missed: number; total: number }
  >();

  for (const a of answers) {
    const existing = byQuestion.get(a.questionId) ?? {
      number: a.question.number,
      question: a.question.question,
      category: a.question.category,
      missed: 0,
      total: 0,
    };
    existing.total += 1;
    if (!a.isCorrect) existing.missed += 1;
    byQuestion.set(a.questionId, existing);
  }

  return Array.from(byQuestion.entries())
    .map(([questionId, stat]) => ({
      questionId,
      number: stat.number,
      question: stat.question,
      category: stat.category,
      missedCount: stat.missed,
      attemptCount: stat.total,
    }))
    .filter((s) => s.missedCount > 0)
    .sort((a, b) => b.missedCount - a.missedCount)
    .slice(0, limit);
}

export interface CategoryPopularityStat {
  category: QuestionCategory;
  categoryLabel: string;
  attemptCount: number;
}

export async function getMostPopularCategories(): Promise<CategoryPopularityStat[]> {
  const answers = await prisma.practiceTestAnswer.findMany({
    select: { question: { select: { category: true } } },
  });

  const counts = new Map<QuestionCategory, number>();
  for (const a of answers) {
    counts.set(a.question.category, (counts.get(a.question.category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, attemptCount]) => ({
      category,
      categoryLabel: CATEGORY_LABELS[category],
      attemptCount,
    }))
    .sort((a, b) => b.attemptCount - a.attemptCount);
}

export interface RecentActivityItem {
  id: string;
  userName: string;
  userEmail: string;
  mode: string;
  score: number | null;
  totalQuestions: number;
  passed: boolean | null;
  completedAt: Date;
}

export async function getRecentActivity(limit = 15): Promise<RecentActivityItem[]> {
  const tests = await prisma.practiceTest.findMany({
    where: { completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: limit,
    select: {
      id: true,
      mode: true,
      score: true,
      totalQuestions: true,
      passed: true,
      completedAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return tests.map((t) => ({
    id: t.id,
    userName: t.user.name ?? "Unnamed user",
    userEmail: t.user.email,
    mode: t.mode,
    score: t.score,
    totalQuestions: t.totalQuestions,
    passed: t.passed,
    completedAt: t.completedAt!,
  }));
}
