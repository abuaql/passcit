import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getActiveTestVersion } from "@/lib/questions";
import { getDashboard } from "@/lib/dashboard";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await requireUser();
  if (session instanceof Response) return session;

  try {
    const testVersion = await getActiveTestVersion(session.user.id);
    const dashboard = await getDashboard(session.user.id, testVersion.id);
    return NextResponse.json({ dashboard });
  } catch (error) {
    logger.error("api.dashboard.get", "Could not load dashboard", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
