import { getAIProvider } from "@/lib/ai/gemini-client";
import { buildExplanationPrompt } from "@/lib/ai/prompts/explanation";
import { loadQuestionContext } from "@/lib/ai/question-context";
import { getOrGenerateStudyContent } from "@/lib/ai/study-content-cache";
import { studyLanguageInfo } from "@/lib/ai/languages";
import { AIGenerationError } from "@/lib/ai/provider";
import type { StudyLanguage } from "@/generated/prisma/client";

/**
 * Why the official answer is correct, in the chosen language.
 * Generated once per (question, language) and then served from cache forever.
 */
export async function getExplanation(questionId: string, language: StudyLanguage): Promise<string> {
  const context = await loadQuestionContext(questionId);
  if (!context) throw new AIGenerationError("Question not found.");

  const row = await getOrGenerateStudyContent({
    questionId,
    language,
    field: "explanation",
    generate: async () => {
      const spec = buildExplanationPrompt({
        question: context.question,
        answers: context.answers,
        languageName: studyLanguageInfo(language).englishName,
      });
      const completion = await getAIProvider().complete({ ...spec, purpose: "explanation" });
      return { patch: { explanation: completion.text }, completion };
    },
  });

  if (!row.explanation) throw new AIGenerationError("Explanation was not stored.");
  return row.explanation;
}
