import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { getActiveTestVersion, getQuizQuestionPool } from "@/lib/questions";
import { prepareQuizQuestion } from "@/lib/quiz";
import { logger } from "@/lib/logger";
import type { QuestionCategory } from "@/generated/prisma/client";

const bodySchema = z.object({
  mode: z.enum(["RANDOM_10", "CATEGORY", "MISSED_ONLY", "MOCK_INTERVIEW"]),
  category: z.enum(["AMERICAN_GOVERNMENT", "AMERICAN_HISTORY", "INTEGRATED_CIVICS", "SYMBOLS_AND_HOLIDAYS"]).optional(),
});

// Practice Mode sessions stay a fixed, practice-friendly size regardless
// of which test version is active. Mock Interview is different — it
// mimics the real interview, so it uses the version's own
// `questionsAsked` (10 for the 2008 test, 20 for the 2020 test) instead.
const PRACTICE_SESSION_SIZE = 10;

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { mode, category } = parsed.data;
  const userId = session.user.id;

  try {
    const testVersion = await getActiveTestVersion(userId);

    let questionIds: string[] | undefined;

    if (mode === "MISSED_ONLY") {
      // Scoped to the active version — a question missed in the 2008 test
      // shouldn't surface while studying the 2020 test, since they're
      // entirely different question pools.
      const missed = await prisma.userQuestionProgress.findMany({
        where: {
          userId,
          question: { testVersionId: testVersion.id },
          OR: [{ status: "NEEDS_PRACTICE" }, { timesIncorrect: { gt: 0 } }],
        },
        select: { questionId: true },
      });

      if (missed.length === 0) {
        return NextResponse.json(
          { error: "No missed questions yet — practice a bit first, then come back here." },
          { status: 400 }
        );
      }

      questionIds = missed.map((m) => m.questionId);
    }

    const pool = await getQuizQuestionPool({
      testVersionId: testVersion.id,
      category: mode === "CATEGORY" ? category : undefined,
      onlyQuestionIds: questionIds,
    });

    if (pool.length < 4) {
      return NextResponse.json(
        { error: "Not enough questions available to build a fair quiz right now." },
        { status: 400 }
      );
    }

    const selected = pickRandom(
      pool,
      Math.min(mode === "MOCK_INTERVIEW" ? testVersion.questionsAsked : PRACTICE_SESSION_SIZE, pool.length)
    );

    // Distractors are drawn from the whole pool (not just the selected
    // set) so multiple-choice options stay varied even in small sessions.
    const finalQuestions = selected
      .map((q) => prepareQuizQuestion(q, pool))
      .filter((q): q is NonNullable<typeof q> => q !== null);

    if (finalQuestions.length === 0) {
      return NextResponse.json(
        { error: "Couldn't build multiple-choice options for this selection." },
        { status: 400 }
      );
    }

    const test = await prisma.practiceTest.create({
      data: {
        userId,
        testVersionId: testVersion.id,
        mode,
        category: mode === "CATEGORY" ? (category as QuestionCategory) : null,
        totalQuestions: finalQuestions.length,
      },
    });

    return NextResponse.json({
      testId: test.id,
      mode,
      questions: finalQuestions,
      passThreshold: testVersion.passThreshold,
      questionsAsked: testVersion.questionsAsked,
    });
  } catch (error) {
    logger.error("api.practiceTests.create", "Could not start a practice test", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
