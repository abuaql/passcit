import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { toggleFavorite } from "@/lib/progress";
import { logger } from "@/lib/logger";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    const isFavorite = await toggleFavorite(session.user.id, id);
    return NextResponse.json({ isFavorite });
  } catch (error) {
    logger.error("api.questions.favorite", "Could not update favorite", error);
    return NextResponse.json({ error: "Could not update favorite." }, { status: 500 });
  }
}
