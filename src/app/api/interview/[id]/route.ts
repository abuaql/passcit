import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getInterviewDetail } from "@/lib/interview";
import { logger } from "@/lib/logger";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    const interview = await getInterviewDetail(id, session.user.id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    }
    return NextResponse.json({ interview });
  } catch (error) {
    logger.error("api.interview.detail", "Could not load the interview", error);
    return NextResponse.json({ error: "Could not load the interview." }, { status: 500 });
  }
}
