import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getLesson } from "@/lib/roadmap";
import { logger } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    const lesson = await getLesson(session.user.id, id);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }
    return NextResponse.json({ lesson });
  } catch (error) {
    logger.error("api.lessons.get", "Could not load lesson", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
