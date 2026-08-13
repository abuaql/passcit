import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getQuestions, getActiveTestVersion } from "@/lib/questions";
import { logger } from "@/lib/logger";
import type { QuestionCategory } from "@/generated/prisma/client";

const VALID_CATEGORIES = new Set<string>(["AMERICAN_GOVERNMENT", "AMERICAN_HISTORY", "INTEGRATED_CIVICS", "SYMBOLS_AND_HOLIDAYS"]);

// Thin JSON wrapper over the exact filters getQuestions() already
// supports — no pagination, no filters invented here, since none exist
// in the underlying implementation to reuse.
export async function GET(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { searchParams } = new URL(req.url);
  const testVersionIdParam = searchParams.get("testVersionId") ?? undefined;
  const categoryParam = searchParams.get("category") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const tagSlug = searchParams.get("tagSlug") ?? undefined;
  const favoritesOnly = searchParams.get("favoritesOnly") === "true";
  const special6520Only = searchParams.get("special6520Only") === "true";

  if (categoryParam && !VALID_CATEGORIES.has(categoryParam)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  try {
    const testVersion = testVersionIdParam
      ? { id: testVersionIdParam }
      : await getActiveTestVersion(session.user.id);

    const questions = await getQuestions({
      testVersionId: testVersion.id,
      category: categoryParam as QuestionCategory | undefined,
      search,
      tagSlug,
      favoritesOnly,
      special6520Only,
      userId: session.user.id,
    });

    return NextResponse.json({ questions });
  } catch (error) {
    logger.error("api.questions.list", "Could not load questions", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
