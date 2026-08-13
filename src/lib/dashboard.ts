/**
 * Aggregates existing, independently-tested pieces for the native app's
 * Home/Learn header — deliberately thin. This file computes nothing that
 * isn't already computed elsewhere (getDashboardStats, getRoadmap) except
 * the daily-goal read, which is a single indexed row lookup.
 *
 * Unlock rules are never duplicated here — `resume` is a direct
 * relabeling of getRoadmap()'s own already-computed resumeTarget.
 */

import { prisma } from "@/lib/prisma";
import { getDashboardStats, type DashboardStats } from "@/lib/progress";
import { getRoadmap, type ResumeTarget } from "@/lib/roadmap";
import { getUserTotalXP } from "@/lib/xp";

/**
 * A single global constant, not a per-user or database setting — matches
 * the approved blueprint's "target is ONE global constant, do not create
 * a database settings table" instruction. Chosen to match the existing
 * PRACTICE_SESSION_SIZE convention (10 questions) already used elsewhere
 * in this codebase, so "one practice session" and "today's goal" read as
 * the same-sized unit of study to a user.
 */
export const DAILY_GOAL_TARGET = 10;

export interface DailyGoal {
  target: number;
  progress: number;
  met: boolean;
}

export interface DashboardResume {
  type: "LESSON" | "UNIT_EXAM";
  unitId: string;
  lessonId?: string;
}

export interface Dashboard {
  stats: DashboardStats;
  xp: { totalXP: number };
  dailyGoal: DailyGoal;
  resume: DashboardResume | null;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Progress source: StudySession.questionsReviewed for today, not a
 * same-day sum of XPEvent.amount. Reasoning: the daily goal should
 * reflect study EFFORT — did the user show up and work today — not
 * reward OUTCOMES. recordStudyActivity() is already called
 * unconditionally on every completion path regardless of pass/fail (see
 * completeUnitExam, completePracticeTest), so a failed unit exam attempt
 * still counts as today's effort; XP does NOT get awarded on a failed
 * attempt, so an XP-based goal would silently under-count exactly that
 * day. StudySession is also a single indexed row lookup
 * (userId_date_testVersionId is already unique+indexed) versus a SUM
 * aggregate over however many XPEvent rows exist for today.
 */
export async function computeDailyGoal(userId: string, testVersionId: string): Promise<DailyGoal> {
  const today = startOfDay(new Date());
  const session = await prisma.studySession.findUnique({
    where: { userId_date_testVersionId: { userId, date: today, testVersionId } },
    select: { questionsReviewed: true },
  });
  const progress = session?.questionsReviewed ?? 0;
  return { target: DAILY_GOAL_TARGET, progress, met: progress >= DAILY_GOAL_TARGET };
}

function toDashboardResume(resumeTarget: ResumeTarget): DashboardResume | null {
  if (!resumeTarget) return null;
  if (resumeTarget.type === "lesson") {
    return { type: "LESSON", unitId: resumeTarget.unitId, lessonId: resumeTarget.lessonId };
  }
  return { type: "UNIT_EXAM", unitId: resumeTarget.unitId };
}

/**
 * Safe for a TestVersion with no seeded roadmap at all (currently 2020):
 * getRoadmap() returns `{units: [], resumeTarget: null}` for that case
 * without throwing (confirmed in roadmap.ts — the per-unit loop simply
 * doesn't execute), which resolves here to `resume: null` — the same
 * value returned once a user has completed every unit. Both are
 * legitimately "nothing to resume right now," and callers don't need to
 * distinguish them for the header/Continue-Learning UI this serves.
 */
export async function getDashboard(userId: string, testVersionId: string): Promise<Dashboard> {
  const [stats, roadmap, totalXP, dailyGoal] = await Promise.all([
    getDashboardStats(userId, testVersionId),
    getRoadmap(userId, testVersionId),
    getUserTotalXP(userId),
    computeDailyGoal(userId, testVersionId),
  ]);

  return {
    stats,
    xp: { totalXP },
    dailyGoal,
    resume: toDashboardResume(roadmap.resumeTarget),
  };
}
