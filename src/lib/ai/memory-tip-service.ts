import { getAIProvider } from "@/lib/ai/gemini-client";
import { buildMemoryTipPrompt } from "@/lib/ai/prompts/memory-tip";
import { loadQuestionContext } from "@/lib/ai/question-context";
import { getOrGenerateStudyContent } from "@/lib/ai/study-content-cache";
import { studyLanguageInfo } from "@/lib/ai/languages";
import { AIGenerationError } from "@/lib/ai/provider";
import type { StudyLanguage } from "@/generated/prisma/client";

/** A mnemonic or association for recalling the official answer. */
export async function getMemoryTip(questionId: string, language: StudyLanguage): Promise<string> {
  const context = await loadQuestionContext(questionId);
  if (!context) throw new AIGenerationError("Question not found.");

  const row = await getOrGenerateStudyContent({
    questionId,
    language,
    field: "memoryTip",
    generate: async () => {
      const spec = buildMemoryTipPrompt({
        question: context.question,
        answers: context.answers,
        languageName: studyLanguageInfo(language).englishName,
      });
      const completion = await getAIProvider().complete({ ...spec, purpose: "memoryTip" });
      return { patch: { memoryTip: completion.text }, completion };
    },
  });

  if (!row.memoryTip) throw new AIGenerationError("Memory tip was not stored.");
  return row.memoryTip;
}
