import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { completeUnitExam } from "@/lib/roadmap-progress";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedAnswer: z.string(),
      })
    )
    .min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id, attemptId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await completeUnitExam(session.user.id, id, attemptId, parsed.data.answers);

    switch (result.status) {
      case "not_found":
        return NextResponse.json({ error: "Exam attempt not found." }, { status: 404 });
      case "invalid_submission":
        return NextResponse.json(
          { error: "Submitted answers don't match this exam attempt." },
          { status: 400 }
        );
      case "ok":
        return NextResponse.json({ alreadyCompleted: result.alreadyCompleted, attempt: result.attempt });
    }
  } catch (error) {
    logger.error("api.units.exam.complete", "Could not complete unit exam", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
