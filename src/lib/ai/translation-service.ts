import { getAIProvider } from "@/lib/ai/gemini-client";
import { buildTranslationPrompt } from "@/lib/ai/prompts/translation";
import { loadQuestionContext } from "@/lib/ai/question-context";
import { getOrGenerateStudyContent } from "@/lib/ai/study-content-cache";
import { studyLanguageInfo } from "@/lib/ai/languages";
import { AIGenerationError } from "@/lib/ai/provider";
import type { StudyLanguage } from "@/generated/prisma/client";

export interface TranslatedQuestion {
  question: string;
  answer: string;
}

/**
 * Pulls the JSON object out of a completion.
 *
 * The prompt asks for bare JSON, but models sometimes wrap it in a fenced
 * block anyway, so the fence is stripped defensively rather than failing a
 * response that is otherwise perfectly good.
 */
function parseTranslation(text: string): TranslatedQuestion {
  const cleaned = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AIGenerationError("Translation was not valid JSON.");
  }
  const record = parsed as { question?: unknown; answer?: unknown };
  if (typeof record.question !== "string" || typeof record.answer !== "string") {
    throw new AIGenerationError("Translation JSON was missing question or answer.");
  }
  if (!record.question.trim() || !record.answer.trim()) {
    throw new AIGenerationError("Translation JSON contained empty fields.");
  }
  return { question: record.question.trim(), answer: record.answer.trim() };
}

/**
 * The official question and answer rendered in the chosen language.
 *
 * The English original is never replaced — callers display this beneath it.
 */
export async function getTranslation(
  questionId: string,
  language: StudyLanguage
): Promise<TranslatedQuestion> {
  const context = await loadQuestionContext(questionId);
  if (!context) throw new AIGenerationError("Question not found.");

  // Translating English into English would spend money to return the text we
  // already hold, so this short-circuits before any provider call and writes
  // no cache row.
  if (language === "EN") {
    return { question: context.question, answer: context.answers.join(", ") };
  }

  const row = await getOrGenerateStudyContent({
    questionId,
    language,
    field: "translation",
    generate: async () => {
      const spec = buildTranslationPrompt({
        question: context.question,
        answers: context.answers,
        languageName: studyLanguageInfo(language).englishName,
      });
      const completion = await getAIProvider().complete({ ...spec, purpose: "translation" });
      const translated = parseTranslation(completion.text);
      return {
        patch: { translatedQuestion: translated.question, translatedAnswer: translated.answer },
        completion,
      };
    },
  });

  if (!row.translatedQuestion || !row.translatedAnswer) {
    throw new AIGenerationError("Translation was not stored.");
  }
  return { question: row.translatedQuestion, answer: row.translatedAnswer };
}
