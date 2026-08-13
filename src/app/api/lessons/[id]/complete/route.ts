import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { completeLesson } from "@/lib/roadmap-progress";
import { logger } from "@/lib/logger";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    const result = await completeLesson(session.user.id, id);

    switch (result.status) {
      case "not_found":
        return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
      case "locked":
        return NextResponse.json({ error: "This lesson is locked." }, { status: 403 });
      case "ok":
        return NextResponse.json({
          alreadyCompleted: result.alreadyCompleted,
          lesson: result.lesson,
          unit: result.unit,
        });
    }
  } catch (error) {
    logger.error("api.lessons.complete", "Could not complete lesson", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
