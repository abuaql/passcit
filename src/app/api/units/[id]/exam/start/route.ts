import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { startUnitExam } from "@/lib/roadmap-progress";
import { logger } from "@/lib/logger";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    const result = await startUnitExam(session.user.id, id);

    switch (result.status) {
      case "not_found":
        return NextResponse.json({ error: "Unit not found." }, { status: 404 });
      case "locked":
        return NextResponse.json({ error: "This unit is locked." }, { status: 403 });
      case "not_available":
        return NextResponse.json(
          { error: "Complete all lessons in this unit before taking the exam." },
          { status: 400 }
        );
      case "insufficient_questions":
        return NextResponse.json(
          { error: "Not enough questions are available to build this exam yet." },
          { status: 400 }
        );
      case "ok":
        return NextResponse.json(
          {
            attemptId: result.attemptId,
            passThreshold: result.passThreshold,
            totalQuestions: result.totalQuestions,
            questions: result.questions,
          },
          { status: 201 }
        );
    }
  } catch (error) {
    logger.error("api.units.exam.start", "Could not start unit exam", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
