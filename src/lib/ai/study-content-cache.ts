import { prisma } from "@/lib/prisma";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { logger } from "@/lib/logger";
import type { AICompletionResult } from "@/lib/ai/provider";
import type {
  AIContentType,
  Prisma,
  QuestionStudyContent,
  StudyContentStatus,
  StudyLanguage,
} from "@/generated/prisma/client";

export type StudyContentField = "explanation" | "translation" | "memoryTip";

const CONTENT_TYPE: Record<StudyContentField, AIContentType> = {
  explanation: "EXPLANATION",
  translation: "TRANSLATION",
  memoryTip: "MEMORY_TIP",
};

export interface StudyContentPatch {
  explanation?: string;
  translatedQuestion?: string;
  translatedAnswer?: string;
  memoryTip?: string;
}

export interface GenerationOutcome {
  patch: StudyContentPatch;
  completion: AICompletionResult;
}

/**
 * Status is the single source of truth for whether content is cached.
 *
 * Never inferred from text being present: a row can hold text from an earlier
 * attempt, or be mid-generation, or have failed, and only the status
 * distinguishes those. Deciding from text alone would let two mechanisms
 * disagree about what "cached" means — which surfaces later as either
 * duplicate spend or content that can never be regenerated.
 */
function isCompleted(row: QuestionStudyContent, field: StudyContentField): boolean {
  switch (field) {
    case "explanation":
      return row.explanationStatus === "COMPLETED";
    case "translation":
      return row.translationStatus === "COMPLETED";
    case "memoryTip":
      return row.memoryTipStatus === "COMPLETED";
  }
}

/**
 * Status transitions are written as explicit per-field objects rather than
 * computed keys, so TypeScript checks every column name against the Prisma
 * input type instead of the whole thing widening to a loose record.
 */
/**
 * Status-only patch, deliberately narrower than QuestionStudyContentUpdateInput.
 *
 * markGenerating is the one transition spread into a `create` as well as passed
 * to an `update`. UpdateInput declares every column optional, including
 * `language`, so spreading it over an explicit `language` widens that property
 * to `EnumStudyLanguageFieldUpdateOperationsInput | StudyLanguage` — which a
 * create rejects. This type carries only the three status columns as plain
 * enum values, which both create and update accept.
 */
type StatusPatch = {
  explanationStatus?: StudyContentStatus;
  translationStatus?: StudyContentStatus;
  memoryTipStatus?: StudyContentStatus;
};

function markGenerating(field: StudyContentField): StatusPatch {
  switch (field) {
    case "explanation":
      return { explanationStatus: "GENERATING" };
    case "translation":
      return { translationStatus: "GENERATING" };
    case "memoryTip":
      return { memoryTipStatus: "GENERATING" };
  }
}

function markFailed(field: StudyContentField): Prisma.QuestionStudyContentUpdateInput {
  // Only the status moves. Any previously completed content for this or any
  // other field is left exactly as it was — a failed attempt must never
  // destroy something a user already had.
  switch (field) {
    case "explanation":
      return { explanationStatus: "FAILED" };
    case "translation":
      return { translationStatus: "FAILED" };
    case "memoryTip":
      return { memoryTipStatus: "FAILED" };
  }
}

function markCompleted(
  field: StudyContentField,
  patch: StudyContentPatch,
  completion: AICompletionResult
): Prisma.QuestionStudyContentUpdateInput {
  const generatedAt = new Date();
  switch (field) {
    case "explanation":
      return {
        explanation: patch.explanation,
        explanationStatus: "COMPLETED",
        explanationAiVersion: completion.model,
        explanationGeneratedAt: generatedAt,
        explanationDurationMs: completion.durationMs,
      };
    case "translation":
      return {
        translatedQuestion: patch.translatedQuestion,
        translatedAnswer: patch.translatedAnswer,
        translationStatus: "COMPLETED",
        translationAiVersion: completion.model,
        translationGeneratedAt: generatedAt,
        translationDurationMs: completion.durationMs,
      };
    case "memoryTip":
      return {
        memoryTip: patch.memoryTip,
        memoryTipStatus: "COMPLETED",
        memoryTipAiVersion: completion.model,
        memoryTipGeneratedAt: generatedAt,
        memoryTipDurationMs: completion.durationMs,
      };
  }
}

function markPending(field: StudyContentField): Prisma.QuestionStudyContentUpdateManyMutationInput {
  switch (field) {
    case "explanation":
      return {
        explanation: null,
        explanationStatus: "PENDING",
        explanationAiVersion: null,
        explanationGeneratedAt: null,
        explanationDurationMs: null,
      };
    case "translation":
      return {
        translatedQuestion: null,
        translatedAnswer: null,
        translationStatus: "PENDING",
        translationAiVersion: null,
        translationGeneratedAt: null,
        translationDurationMs: null,
      };
    case "memoryTip":
      return {
        memoryTip: null,
        memoryTipStatus: "PENDING",
        memoryTipAiVersion: null,
        memoryTipGeneratedAt: null,
        memoryTipDurationMs: null,
      };
  }
}

/**
 * Generations currently running, keyed by question + language + field.
 *
 * LIMITATION: per Node process, so it collapses concurrent requests within one
 * instance only. Behind several instances one call per instance is still
 * possible. It cannot cause duplicate rows — the (questionId, language) unique
 * constraint and the upsert below make concurrent writes converge. The
 * GENERATING status is the cross-instance signal; promoting it to a true lock
 * would need Redis or a DB advisory lock and would replace only this map.
 */
const inFlight = new Map<string, Promise<QuestionStudyContent>>();

/** Cached content, or null. COMPLETED is the only state that counts as cached. */
export async function peekStudyContent(
  questionId: string,
  language: StudyLanguage,
  field: StudyContentField
): Promise<QuestionStudyContent | null> {
  const row = await prisma.questionStudyContent.findUnique({
    where: { questionId_language: { questionId, language } },
  });
  return row && isCompleted(row, field) ? row : null;
}

async function recordCost(
  questionId: string,
  language: StudyLanguage,
  field: StudyContentField,
  completion: AICompletionResult
) {
  try {
    await prisma.aIGenerationLog.create({
      data: {
        questionId,
        language,
        contentType: CONTENT_TYPE[field],
        model: completion.model,
        promptTokens: completion.usage.promptTokens,
        completionTokens: completion.usage.completionTokens,
        totalTokens: completion.usage.totalTokens,
        estimatedCostUsd: estimateCostUsd(
          completion.model,
          completion.usage.promptTokens,
          completion.usage.completionTokens
        ),
        durationMs: completion.durationMs,
      },
    });
  } catch (error) {
    // Losing a cost log must never cost the user their content: the
    // generation already succeeded and has already been saved.
    logger.error("ai.costLog", "Could not record a generation log entry", error);
  }
}

/**
 * Returns COMPLETED content, or generates it exactly once and stores it.
 *
 * COMPLETED content is never regenerated here — only an administrator resetting
 * the field to PENDING allows that. A failure records FAILED (so the UI can
 * offer a retry) without erasing anything, and releases the in-flight entry so
 * a retry genuinely retries.
 */
export async function getOrGenerateStudyContent(params: {
  questionId: string;
  language: StudyLanguage;
  field: StudyContentField;
  generate: () => Promise<GenerationOutcome>;
}): Promise<QuestionStudyContent> {
  const { questionId, language, field, generate } = params;
  const where = { questionId_language: { questionId, language } };

  const cached = await peekStudyContent(questionId, language, field);
  if (cached) return cached;

  const key = `${questionId}:${language}:${field}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async () => {
    // Claim the work before calling out, so the row reflects that a
    // generation is in progress rather than looking untouched.
    await prisma.questionStudyContent.upsert({
      where,
      create: { questionId, language, ...markGenerating(field) },
      update: markGenerating(field),
    });

    try {
      const { patch, completion } = await generate();
      const saved = await prisma.questionStudyContent.update({
        where,
        data: markCompleted(field, patch, completion),
      });
      await recordCost(questionId, language, field, completion);
      return saved;
    } catch (error) {
      try {
        await prisma.questionStudyContent.update({ where, data: markFailed(field) });
      } catch (statusError) {
        logger.error("ai.cache", "Could not record FAILED status", statusError);
      }
      throw error;
    }
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Resets one field to PENDING, clearing its content and metadata.
 * The only supported route to regeneration, and admin-only by policy — the
 * next ordinary request regenerates it through the standard pipeline.
 */
export async function clearStudyContentField(
  questionId: string,
  language: StudyLanguage,
  field: StudyContentField
): Promise<void> {
  await prisma.questionStudyContent.updateMany({
    where: { questionId, language },
    data: markPending(field),
  });
}
