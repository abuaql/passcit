import "dotenv/config";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { completeLesson, startUnitExam, completeUnitExam } from "./roadmap-progress";
import { getUnit } from "./roadmap";
import { XP_VALUES, getUserTotalXP } from "./xp";
import {
  createTestVersionWithQuestions,
  deleteTestVersion,
  createUnit,
  createLesson,
  createUnitExam,
  completeLessonDirectly,
} from "./roadmap-test-helpers";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./native-auth/test-helpers";

async function correctAnswerFor(questionId: string): Promise<string> {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: { answers: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  return question.answers[0]!.text;
}

describe("completeLesson", () => {
  let dbReady = false;
  before(async () => {
    dbReady = await isDatabaseReachable();
  });

  test("completes an AVAILABLE lesson and returns the updated state", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));

      const result = await completeLesson(user.id, lesson.id);
      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;
      assert.equal(result.alreadyCompleted, false);
      assert.equal(result.lesson.status, "COMPLETED");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("is idempotent and never double-logs StudySession activity", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));

      const first = await completeLesson(user.id, lesson.id);
      const second = await completeLesson(user.id, lesson.id);

      assert.equal(first.status, "ok");
      assert.equal(second.status, "ok");
      if (first.status !== "ok" || second.status !== "ok") return;
      assert.equal(first.alreadyCompleted, false);
      assert.equal(second.alreadyCompleted, true);
      assert.equal(second.lesson.status, "COMPLETED");

      const session = await prisma.studySession.findUnique({
        where: { userId_date_testVersionId: { userId: user.id, date: new Date(new Date().toDateString()), testVersionId: testVersion.id } },
      });
      assert.ok(session);
      assert.equal(session!.questionsReviewed, 3); // exactly one completion's worth, not doubled
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("rejects a LOCKED lesson", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      await createLesson(unit.id, 1, questions.slice(0, 3).map((q) => q.id));
      const lesson2 = await createLesson(unit.id, 2, questions.slice(3, 6).map((q) => q.id));

      const result = await completeLesson(user.id, lesson2.id);
      assert.equal(result.status, "locked");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("returns not_found for a nonexistent lesson", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser();
    try {
      const result = await completeLesson(user.id, "does-not-exist");
      assert.equal(result.status, "not_found");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("two users completing the same lesson have fully independent progress", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user: userA } = await createTestUser();
    const { user: userB } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));

      const resultA = await completeLesson(userA.id, lesson.id);
      assert.equal(resultA.status, "ok");
      if (resultA.status === "ok") assert.equal(resultA.alreadyCompleted, false);

      // B's view of the same lesson is unaffected by A's completion.
      const resultB = await completeLesson(userB.id, lesson.id);
      assert.equal(resultB.status, "ok");
      if (resultB.status === "ok") assert.equal(resultB.alreadyCompleted, false);

      const progressA = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: userA.id, lessonId: lesson.id } } });
      const progressB = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: userB.id, lessonId: lesson.id } } });
      assert.equal(progressA?.status, "COMPLETED");
      assert.equal(progressB?.status, "COMPLETED");
      assert.notEqual(progressA!.id, progressB!.id);
    } finally {
      await deleteTestUser(userA.id);
      await deleteTestUser(userB.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("awards LESSON_COMPLETED XP exactly once, never again on repeat completion", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));

      await completeLesson(user.id, lesson.id);
      assert.equal(await getUserTotalXP(user.id), XP_VALUES.LESSON_COMPLETED);
      const eventsAfterFirst = await prisma.xPEvent.count({ where: { userId: user.id, reason: "LESSON_COMPLETED" } });
      assert.equal(eventsAfterFirst, 1);

      // Idempotent replay must not create a second event or double the total.
      await completeLesson(user.id, lesson.id);
      assert.equal(await getUserTotalXP(user.id), XP_VALUES.LESSON_COMPLETED);
      const eventsAfterSecond = await prisma.xPEvent.count({ where: { userId: user.id, reason: "LESSON_COMPLETED" } });
      assert.equal(eventsAfterSecond, 1);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("concurrent completion attempts for the same lesson never award XP twice", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));

      const [first, second] = await Promise.all([completeLesson(user.id, lesson.id), completeLesson(user.id, lesson.id)]);
      assert.equal(first.status, "ok");
      assert.equal(second.status, "ok");

      assert.equal(await getUserTotalXP(user.id), XP_VALUES.LESSON_COMPLETED);
      const events = await prisma.xPEvent.count({ where: { userId: user.id, reason: "LESSON_COMPLETED" } });
      assert.equal(events, 1);

      // The roadmap/progress invariant survives too — exactly one LessonProgress row, COMPLETED.
      const progressRows = await prisma.lessonProgress.count({ where: { userId: user.id, lessonId: lesson.id } });
      assert.equal(progressRows, 1);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

describe("startUnitExam", () => {
  test("cannot start an exam for a LOCKED unit", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      const unit1 = await createUnit(testVersion.id, 1);
      const unit2 = await createUnit(testVersion.id, 2);
      await createLesson(unit1.id, 1, questions.slice(0, 5).map((q) => q.id));
      await createLesson(unit2.id, 1, questions.slice(5, 10).map((q) => q.id));
      await createUnitExam(unit2.id, 5, 3);

      const result = await startUnitExam(user.id, unit2.id);
      assert.equal(result.status, "locked");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("is not_available until every lesson is completed, then starts successfully", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson1 = await createLesson(unit.id, 1, questions.slice(0, 3).map((q) => q.id));
      const lesson2 = await createLesson(unit.id, 2, questions.slice(3, 6).map((q) => q.id));
      await createUnitExam(unit.id, 5, 3);

      const tooEarly = await startUnitExam(user.id, unit.id);
      assert.equal(tooEarly.status, "not_available");

      await completeLessonDirectly(user.id, lesson1.id);
      await completeLessonDirectly(user.id, lesson2.id);

      const result = await startUnitExam(user.id, unit.id);
      assert.equal(result.status, "ok");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("uses the curated UnitExamQuestion pool, excluding inactive and variesByLocation questions", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      await prisma.question.update({ where: { id: questions[0]!.id }, data: { isActive: false } });
      await prisma.question.update({ where: { id: questions[1]!.id }, data: { variesByLocation: true } });

      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await completeLessonDirectly(user.id, lesson.id);
      // Curated pool: includes the 2 ineligible questions plus 5 eligible ones.
      await createUnitExam(unit.id, 5, 3, questions.slice(0, 7).map((q) => q.id));

      const result = await startUnitExam(user.id, unit.id);
      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;

      const returnedIds = new Set(result.questions.map((q) => q.id));
      assert.equal(returnedIds.has(questions[0]!.id), false, "inactive question must be excluded");
      assert.equal(returnedIds.has(questions[1]!.id), false, "variesByLocation question must be excluded");
      assert.equal(result.questions.length, 5);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("falls back to the unit's lesson pool when no curated UnitExamQuestion rows exist", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await completeLessonDirectly(user.id, lesson.id);
      await createUnitExam(unit.id, 5, 3); // no curated pool

      const result = await startUnitExam(user.id, unit.id);
      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;
      const lessonQuestionIds = new Set(questions.map((q) => q.id));
      for (const q of result.questions) {
        assert.ok(lessonQuestionIds.has(q.id));
      }
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("never exposes which option is correct, nor the accepted-answers list", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(8);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await completeLessonDirectly(user.id, lesson.id);
      await createUnitExam(unit.id, 5, 3);

      const result = await startUnitExam(user.id, unit.id);
      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;

      const raw = JSON.stringify(result.questions);
      assert.equal(raw.includes("isCorrect"), false);
      assert.equal(raw.includes("acceptedAnswers"), false);
      for (const q of result.questions) {
        assert.equal(Object.prototype.hasOwnProperty.call(q, "explanation"), false);
        for (const option of q.options) {
          assert.deepEqual(Object.keys(option).sort(), ["id", "text"]);
        }
      }
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("insufficient_questions when the eligible pool is smaller than questionCount", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await completeLessonDirectly(user.id, lesson.id);
      await createUnitExam(unit.id, 10, 6); // needs 10, only 3 exist

      const result = await startUnitExam(user.id, unit.id);
      assert.equal(result.status, "insufficient_questions");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

describe("completeUnitExam", () => {
  test("grades correctly, passes, completes the unit, and unlocks the next unit", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(20);
    const { user } = await createTestUser();
    try {
      const unit1 = await createUnit(testVersion.id, 1);
      const unit2 = await createUnit(testVersion.id, 2);
      const lesson1 = await createLesson(unit1.id, 1, questions.slice(0, 10).map((q) => q.id));
      await createLesson(unit2.id, 1, questions.slice(10, 20).map((q) => q.id));
      await createUnitExam(unit1.id, 5, 3);
      await createUnitExam(unit2.id, 5, 3);
      await completeLessonDirectly(user.id, lesson1.id);

      const started = await startUnitExam(user.id, unit1.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      const answers = await Promise.all(
        started.questions.map(async (q) => ({ questionId: q.id, selectedAnswer: await correctAnswerFor(q.id) }))
      );

      const completed = await completeUnitExam(user.id, unit1.id, started.attemptId, answers);
      assert.equal(completed.status, "ok");
      if (completed.status !== "ok") return;
      assert.equal(completed.alreadyCompleted, false);
      assert.equal(completed.attempt.result, "PASSED");
      assert.equal(completed.attempt.score, 5);

      const unitProgress = await prisma.unitProgress.findUnique({ where: { userId_unitId: { userId: user.id, unitId: unit1.id } } });
      assert.equal(unitProgress?.examPassed, true);
      assert.equal(unitProgress?.status, "COMPLETED");
      assert.ok(unitProgress?.completedAt);

      // Unit 2 is now unlocked.
      const unit2Progress = await startUnitExam(user.id, unit2.id);
      assert.notEqual(unit2Progress.status, "locked");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("a failing score does not unlock the next unit, and allows another attempt", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(15);
    const { user } = await createTestUser();
    try {
      const unit1 = await createUnit(testVersion.id, 1);
      const unit2 = await createUnit(testVersion.id, 2);
      const lesson1 = await createLesson(unit1.id, 1, questions.slice(0, 10).map((q) => q.id));
      await createLesson(unit2.id, 1, questions.slice(10, 15).map((q) => q.id));
      await createUnitExam(unit1.id, 5, 3);
      await createUnitExam(unit2.id, 3, 2);
      await completeLessonDirectly(user.id, lesson1.id);

      const started = await startUnitExam(user.id, unit1.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      // Answer everything wrong.
      const answers = started.questions.map((q) => ({ questionId: q.id, selectedAnswer: "definitely wrong" }));
      const completed = await completeUnitExam(user.id, unit1.id, started.attemptId, answers);
      assert.equal(completed.status, "ok");
      if (completed.status !== "ok") return;
      assert.equal(completed.attempt.result, "FAILED");
      assert.equal(completed.attempt.score, 0);

      const unitProgress = await prisma.unitProgress.findUnique({ where: { userId_unitId: { userId: user.id, unitId: unit1.id } } });
      assert.notEqual(unitProgress?.examPassed, true);

      const unit2Attempt = await startUnitExam(user.id, unit2.id);
      assert.equal(unit2Attempt.status, "locked");

      // A retry is allowed — a brand-new attempt can be started.
      const retry = await startUnitExam(user.id, unit1.id);
      assert.equal(retry.status, "ok");
      if (retry.status === "ok") assert.notEqual(retry.attemptId, started.attemptId);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("completion is idempotent — a replay never re-grades", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await createUnitExam(unit.id, 5, 3);
      await completeLessonDirectly(user.id, lesson.id);

      const started = await startUnitExam(user.id, unit.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      const wrongAnswers = started.questions.map((q) => ({ questionId: q.id, selectedAnswer: "wrong" }));
      const first = await completeUnitExam(user.id, unit.id, started.attemptId, wrongAnswers);
      assert.equal(first.status, "ok");
      if (first.status !== "ok") return;
      assert.equal(first.attempt.result, "FAILED");

      // Replay with now-correct answers must NOT flip the result.
      const correctAnswers = await Promise.all(
        started.questions.map(async (q) => ({ questionId: q.id, selectedAnswer: await correctAnswerFor(q.id) }))
      );
      const second = await completeUnitExam(user.id, unit.id, started.attemptId, correctAnswers);
      assert.equal(second.status, "ok");
      if (second.status !== "ok") return;
      assert.equal(second.alreadyCompleted, true);
      assert.equal(second.attempt.result, "FAILED");
      assert.equal(second.attempt.score, first.attempt.score);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("another user cannot complete this attempt", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user: owner } = await createTestUser();
    const { user: intruder } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await createUnitExam(unit.id, 5, 3);
      await completeLessonDirectly(owner.id, lesson.id);

      const started = await startUnitExam(owner.id, unit.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      const answers = started.questions.map((q) => ({ questionId: q.id, selectedAnswer: "whatever" }));
      const result = await completeUnitExam(intruder.id, unit.id, started.attemptId, answers);
      assert.equal(result.status, "not_found");

      // The attempt is untouched — the real owner can still complete it.
      const stillOwners = await completeUnitExam(owner.id, unit.id, started.attemptId, answers);
      assert.equal(stillOwners.status, "ok");
    } finally {
      await deleteTestUser(owner.id);
      await deleteTestUser(intruder.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("rejects completion via the wrong unit's URL", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(15);
    const { user } = await createTestUser();
    try {
      const unit1 = await createUnit(testVersion.id, 1);
      const unit2 = await createUnit(testVersion.id, 2);
      const lesson1 = await createLesson(unit1.id, 1, questions.slice(0, 10).map((q) => q.id));
      await createLesson(unit2.id, 1, questions.slice(10, 15).map((q) => q.id));
      await createUnitExam(unit1.id, 5, 3);
      await completeLessonDirectly(user.id, lesson1.id);

      const started = await startUnitExam(user.id, unit1.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      const answers = started.questions.map((q) => ({ questionId: q.id, selectedAnswer: "x" }));
      const result = await completeUnitExam(user.id, unit2.id, started.attemptId, answers);
      assert.equal(result.status, "not_found");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("rejects a submission whose question ids don't match the attempt", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await createUnitExam(unit.id, 5, 3);
      await completeLessonDirectly(user.id, lesson.id);

      const started = await startUnitExam(user.id, unit.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      const tooFew = started.questions.slice(0, 2).map((q) => ({ questionId: q.id, selectedAnswer: "x" }));
      assert.equal((await completeUnitExam(user.id, unit.id, started.attemptId, tooFew)).status, "invalid_submission");

      const wrongQuestion = [
        ...started.questions.slice(1).map((q) => ({ questionId: q.id, selectedAnswer: "x" })),
        { questionId: "not-part-of-this-attempt", selectedAnswer: "x" },
      ];
      assert.equal((await completeUnitExam(user.id, unit.id, started.attemptId, wrongQuestion)).status, "invalid_submission");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("returns not_found for a nonexistent attempt", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion } = await createTestVersionWithQuestions(1);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const result = await completeUnitExam(user.id, unit.id, "does-not-exist", [{ questionId: "x", selectedAnswer: "y" }]);
      assert.equal(result.status, "not_found");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("awards UNIT_EXAM_PASSED XP exactly once on a genuine pass", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await createUnitExam(unit.id, 5, 3);
      await completeLessonDirectly(user.id, lesson.id);

      const started = await startUnitExam(user.id, unit.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      const answers = await Promise.all(
        started.questions.map(async (q) => ({ questionId: q.id, selectedAnswer: await correctAnswerFor(q.id) }))
      );
      await completeUnitExam(user.id, unit.id, started.attemptId, answers);

      assert.equal(await getUserTotalXP(user.id), XP_VALUES.UNIT_EXAM_PASSED);
      const events = await prisma.xPEvent.findMany({ where: { userId: user.id, reason: "UNIT_EXAM_PASSED" } });
      assert.equal(events.length, 1);
      assert.equal(events[0]!.refId, started.attemptId);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("no XP is awarded on a failed exam attempt", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await createUnitExam(unit.id, 5, 3);
      await completeLessonDirectly(user.id, lesson.id);

      const started = await startUnitExam(user.id, unit.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      const answers = started.questions.map((q) => ({ questionId: q.id, selectedAnswer: "definitely wrong" }));
      const completed = await completeUnitExam(user.id, unit.id, started.attemptId, answers);
      assert.equal(completed.status, "ok");
      if (completed.status === "ok") assert.equal(completed.attempt.result, "FAILED");

      assert.equal(await getUserTotalXP(user.id), 0);
      const events = await prisma.xPEvent.count({ where: { userId: user.id, reason: "UNIT_EXAM_PASSED" } });
      assert.equal(events, 0);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("replaying an already-passed attempt never awards XP again", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await createUnitExam(unit.id, 5, 3);
      await completeLessonDirectly(user.id, lesson.id);

      const started = await startUnitExam(user.id, unit.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      const answers = await Promise.all(
        started.questions.map(async (q) => ({ questionId: q.id, selectedAnswer: await correctAnswerFor(q.id) }))
      );
      await completeUnitExam(user.id, unit.id, started.attemptId, answers);
      const totalAfterFirst = await getUserTotalXP(user.id);

      const replay = await completeUnitExam(user.id, unit.id, started.attemptId, answers);
      assert.equal(replay.status, "ok");
      if (replay.status === "ok") assert.equal(replay.alreadyCompleted, true);
      assert.equal(await getUserTotalXP(user.id), totalAfterFirst);
      const events = await prisma.xPEvent.count({ where: { userId: user.id, reason: "UNIT_EXAM_PASSED" } });
      assert.equal(events, 1);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("concurrent completion attempts for the same passing attempt never award XP twice", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await createUnitExam(unit.id, 5, 3);
      await completeLessonDirectly(user.id, lesson.id);

      const started = await startUnitExam(user.id, unit.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;

      const answers = await Promise.all(
        started.questions.map(async (q) => ({ questionId: q.id, selectedAnswer: await correctAnswerFor(q.id) }))
      );

      await Promise.all([
        completeUnitExam(user.id, unit.id, started.attemptId, answers),
        completeUnitExam(user.id, unit.id, started.attemptId, answers),
      ]);

      assert.equal(await getUserTotalXP(user.id), XP_VALUES.UNIT_EXAM_PASSED);
      const events = await prisma.xPEvent.count({ where: { userId: user.id, reason: "UNIT_EXAM_PASSED" } });
      assert.equal(events, 1);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("XP never influences roadmap unlocking — a heavily-XP'd user with an unpassed exam stays locked out of the next unit", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      const unit1 = await createUnit(testVersion.id, 1);
      const unit2 = await createUnit(testVersion.id, 2);
      await createLesson(unit1.id, 1, questions.slice(0, 5).map((q) => q.id));
      await createLesson(unit2.id, 1, questions.slice(5, 10).map((q) => q.id));
      await createUnitExam(unit2.id, 5, 3);

      // Give the user a large amount of XP directly — no lesson/exam
      // completion behind it at all — and confirm it has zero bearing on
      // unlocking. Only unit1.examPassed (still false) governs unit2.
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < 20; i++) {
          await tx.xPEvent.create({ data: { userId: user.id, amount: 1000, reason: "STREAK_BONUS" } });
        }
        await tx.userXP.upsert({
          where: { userId: user.id },
          update: { totalXP: 20000 },
          create: { userId: user.id, totalXP: 20000 },
        });
      });
      assert.equal(await getUserTotalXP(user.id), 20000);

      const result = await startUnitExam(user.id, unit2.id);
      assert.equal(result.status, "locked");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

// End-to-end proof against the real, live-seeded 2025 roadmap (Phase
// 10): completing every lesson in Unit 1, then passing its exam,
// unlocks Unit 2 — exercising the exact same generic completeLesson /
// startUnitExam / completeUnitExam path as the synthetic-fixture tests
// above, now against real content and real question pools (15-question
// exam draws, not 3-5).
describe("2025 roadmap (real seeded content)", () => {
  test("completing all of Unit 1's lessons and passing its exam unlocks Unit 2", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await prisma.testVersion.findUniqueOrThrow({ where: { slug: "2025" } });
    const unit1 = await prisma.unit.findUniqueOrThrow({
      where: { testVersionId_slug: { testVersionId: testVersion.id, slug: "american-government-2025" } },
      include: { lessons: { orderBy: { order: "asc" } } },
    });
    const unit2 = await prisma.unit.findUniqueOrThrow({
      where: { testVersionId_slug: { testVersionId: testVersion.id, slug: "american-history-2025" } },
    });
    const { user } = await createTestUser();
    try {
      assert.equal(unit1.lessons.length, 8);
      for (const lesson of unit1.lessons) {
        const result = await completeLesson(user.id, lesson.id);
        assert.equal(result.status, "ok", `lesson "${lesson.slug}" should be completable in order`);
      }

      const unit2Before = await getUnit(user.id, unit2.id);
      assert.equal(unit2Before!.status, "LOCKED");

      const started = await startUnitExam(user.id, unit1.id);
      assert.equal(started.status, "ok");
      if (started.status !== "ok") return;
      assert.equal(started.questions.length, 15);
      assert.equal(started.passThreshold, 9);

      const answers = await Promise.all(
        started.questions.map(async (q) => ({ questionId: q.id, selectedAnswer: await correctAnswerFor(q.id) }))
      );
      const completed = await completeUnitExam(user.id, unit1.id, started.attemptId, answers);
      assert.equal(completed.status, "ok");
      if (completed.status !== "ok") return;
      assert.equal(completed.attempt.result, "PASSED");
      assert.equal(completed.attempt.score, 15);

      const unit2After = await getUnit(user.id, unit2.id);
      assert.equal(unit2After!.status, "AVAILABLE");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
