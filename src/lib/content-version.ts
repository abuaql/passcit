/**
 * A minimal, dependency-free "has the native content bundle changed"
 * signal — deliberately not a sync protocol. The native app caches
 * Question/Unit/Lesson content read-only (see Phase 3's design) and just
 * needs to know whether to refetch, not what changed or why.
 *
 * No new table: the five tables that actually constitute native content
 * (Question, TestVersion, Unit, Lesson, UnitExam) already carry a
 * Prisma-managed `updatedAt`. The version is an opaque hash of the
 * newest one across all five — never a raw timestamp, so the response
 * doesn't hand back a literal database column value.
 *
 * Known, accepted limitation: QuestionAnswer, LessonQuestion, and
 * UnitExamQuestion have no `updatedAt` of their own, so a change that
 * only touches one of those join/child rows (e.g. swapping which
 * questions belong to a lesson without editing the lesson's own title)
 * won't move this signal. Acceptable for "should I refetch," not
 * intended as a precise per-row change feed.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

async function latestUpdatedAt(): Promise<Date[]> {
  const [question, testVersion, unit, lesson, unitExam] = await Promise.all([
    prisma.question.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.testVersion.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.unit.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.lesson.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.unitExam.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);

  return [question, testVersion, unit, lesson, unitExam]
    .filter((row): row is { updatedAt: Date } => row !== null)
    .map((row) => row.updatedAt);
}

/**
 * Pure — split out from getContentVersion() so the empty-content
 * fallback (a fresh, unseeded database, or a test) is directly testable
 * without needing to manufacture that state in a real database. Never
 * throws for an empty array: falls back to a fixed zero point so the
 * endpoint always returns a well-formed response.
 */
export function computeVersionHash(timestamps: Date[]): string {
  const maxTime = timestamps.length > 0 ? Math.max(...timestamps.map((d) => d.getTime())) : 0;
  return createHash("sha256").update(String(maxTime)).digest("hex").slice(0, 16);
}

/**
 * Stable, opaque, comparable-for-equality — an ETag-style token, not a
 * parseable value.
 */
export async function getContentVersion(): Promise<string> {
  const timestamps = await latestUpdatedAt();
  return computeVersionHash(timestamps);
}
