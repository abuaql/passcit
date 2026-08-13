import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getUnit } from "@/lib/roadmap";
import { logger } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    const unit = await getUnit(session.user.id, id);
    if (!unit) {
      return NextResponse.json({ error: "Unit not found." }, { status: 404 });
    }
    return NextResponse.json({ unit });
  } catch (error) {
    logger.error("api.units.get", "Could not load unit", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
