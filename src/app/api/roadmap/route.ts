import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getActiveTestVersion } from "@/lib/questions";
import { getRoadmap } from "@/lib/roadmap";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { searchParams } = new URL(req.url);
  const requestedTestVersionId = searchParams.get("testVersionId") ?? undefined;

  try {
    const testVersion = requestedTestVersionId
      ? { id: requestedTestVersionId }
      : await getActiveTestVersion(session.user.id);

    const roadmap = await getRoadmap(session.user.id, testVersion.id);
    return NextResponse.json({ roadmap });
  } catch (error) {
    logger.error("api.roadmap.get", "Could not load roadmap", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
