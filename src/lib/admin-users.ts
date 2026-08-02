import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function listAdminUsers(options: { search?: string; page?: number }) {
  const page = Math.max(1, options.page ?? 1);

  const where = options.search
    ? {
        OR: [
          { name: { contains: options.search } },
          { email: { contains: options.search } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { practiceTests: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAdminUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      activeTestVersion: { select: { name: true } },
      streak: { select: { currentStreak: true, longestStreak: true, lastStudyDate: true } },
    },
  });
  if (!user) return null;

  const [progressStats, practiceTests] = await Promise.all([
    prisma.userQuestionProgress.aggregate({
      where: { userId: id },
      _count: { _all: true },
      _sum: { timesCorrect: true, timesIncorrect: true },
    }),
    prisma.practiceTest.findMany({
      where: { userId: id },
      orderBy: { startedAt: "desc" },
      take: 25,
      select: {
        id: true,
        mode: true,
        score: true,
        totalQuestions: true,
        passed: true,
        startedAt: true,
        completedAt: true,
        testVersion: { select: { name: true } },
      },
    }),
  ]);

  const favoritesCount = await prisma.userQuestionProgress.count({ where: { userId: id, isFavorite: true } });

  return {
    user,
    progress: {
      questionsTouched: progressStats._count._all,
      totalCorrect: progressStats._sum.timesCorrect ?? 0,
      totalIncorrect: progressStats._sum.timesIncorrect ?? 0,
      favoritesCount,
    },
    practiceTests,
  };
}

export async function setUserRole(id: string, role: "USER" | "ADMIN") {
  return prisma.user.update({ where: { id }, data: { role } });
}

export async function setUserActive(id: string, isActive: boolean) {
  return prisma.user.update({ where: { id }, data: { isActive } });
}
