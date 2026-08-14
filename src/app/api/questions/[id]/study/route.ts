import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { STUDY_LANGUAGES } from "@/lib/ai/languages";
import { peekStudyContent, type StudyContentField } from "@/lib/ai/study-content-cache";
import { getExplanation } from "@/lib/ai/explanation-service";
import { getTranslation } from "@/lib/ai/translation-service";
import { getMemoryTip } from "@/lib/ai/memory-tip-service";
import { getAIProvider } from "@/lib/ai/gemini-client";
import { AIGenerationError, AIUnavailableError } from "@/lib/ai/provider";
import { logger } from "@/lib/logger";
import type { StudyLanguage } from "@/generated/prisma/client";

// Derived from the single language list so a new language never needs a
// second edit here. The assertion is only about tuple shape (z.enum needs a
// non-empty tuple), not about the values themselves.
const LANGUAGE_CODES = STUDY_LANGUAGES.map((l) => l.code) as [StudyLanguage, ...StudyLanguage[]];

const bodySchema = z.object({
  type: z.enum(["explanation", "translation", "memoryTip"]),
  language: z.enum(LANGUAGE_CODES),
});

/**
 * Generation budget per user. Deliberately metered on generations only —
 * serving something already cached costs nothing, so a user revising cached
 * material never burns quota and never sees a 429 for studying hard.
 */
const GENERATION_LIMIT = 30;
const GENERATION_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id: questionId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { type, language } = parsed.data;

  // English needs no translation, so it never touches the cache or a quota.
  const isNoOpTranslation = type === "translation" && language === "EN";

  // Without an API key the provider returns deterministic development content
  // rather than failing, so there is no unavailable path to guard here. The
  // flag is passed back so the UI can label what it is showing.
  const devMode = !getAIProvider().isConfigured();

  if (!isNoOpTranslation) {
    const cached = await peekStudyContent(questionId, language, type as StudyContentField);
    if (cached) {
      return NextResponse.json({ ...serialise(type, cached, true), devMode });
    }

    // Only metered when calls actually reach the API. Development content is
    // free and instant, and burning a real quota on it would just make local
    // testing hit a 429 for no reason.
    if (!devMode) {
      const limit = checkRateLimit(`ai:${session.user.id}`, { max: GENERATION_LIMIT, windowMs: GENERATION_WINDOW_MS });
      if (!limit.allowed) {
        return NextResponse.json(
          { error: "You have reached the generation limit. Please try again later.", retryable: true },
          { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
        );
      }
    }
  }

  try {
    if (type === "explanation") {
      return NextResponse.json({ type, cached: false, devMode, explanation: await getExplanation(questionId, language) });
    }
    if (type === "memoryTip") {
      return NextResponse.json({ type, cached: false, devMode, memoryTip: await getMemoryTip(questionId, language) });
    }
    return NextResponse.json({ type, cached: isNoOpTranslation, devMode, translation: await getTranslation(questionId, language) });
  } catch (error) {
    // Both AI failure modes are retryable from the user's point of view: the
    // page keeps working and offers to try again rather than blocking study.
    if (error instanceof AIUnavailableError) {
      logger.warn("api.study", `AI unavailable for ${type}`, error);
      return NextResponse.json({ error: "AI content is unavailable right now.", retryable: true }, { status: 503 });
    }
    if (error instanceof AIGenerationError) {
      logger.warn("api.study", `Generation failed for ${type}`, error);
      return NextResponse.json({ error: "Could not generate that just now.", retryable: true }, { status: 502 });
    }
    logger.error("api.study", `Unexpected failure for ${type}`, error);
    return NextResponse.json({ error: "Something went wrong.", retryable: true }, { status: 500 });
  }
}

function serialise(
  type: "explanation" | "translation" | "memoryTip",
  row: { explanation: string | null; translatedQuestion: string | null; translatedAnswer: string | null; memoryTip: string | null },
  cached: boolean
) {
  if (type === "explanation") return { type, cached, explanation: row.explanation };
  if (type === "memoryTip") return { type, cached, memoryTip: row.memoryTip };
  return { type, cached, translation: { question: row.translatedQuestion, answer: row.translatedAnswer } };
}
