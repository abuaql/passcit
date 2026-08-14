import type { AICompletionRequest } from "@/lib/ai/provider";

/**
 * Prompts live apart from service logic on purpose: wording is the part most
 * likely to be tuned, and it should be possible to improve it without
 * touching caching, claiming or persistence. `purpose` is supplied by the
 * caller, so a builder describes only what to generate.
 */
export type PromptSpec = Omit<AICompletionRequest, "purpose">;

function formatAnswers(answers: string[]): string {
  if (answers.length === 1) return answers[0]!;
  return answers.map((a, i) => `${i + 1}. ${a}`).join("\n");
}

export function buildTranslationPrompt(params: {
  question: string;
  answers: string[];
  languageName: string;
}): PromptSpec {
  return {
    system: [
      "You are a professional translator.",
      "Translate faithfully and completely. Do not explain, summarise, add commentary, or omit anything.",
      "Keep proper nouns, names of institutions, and official terminology accurate; where a term has an established rendering in the target language, use it.",
      "Respond with valid JSON only — no markdown fences, no commentary before or after.",
    ].join(" "),
    user: [
      `Translate the following into ${params.languageName}.`,
      "",
      `Question: ${params.question}`,
      `Answer: ${formatAnswers(params.answers)}`,
      "",
      'Respond with exactly this JSON shape: {"question": "<translated question>", "answer": "<translated answer>"}',
    ].join("\n"),
    // Low temperature: translation should be faithful and repeatable, not creative.
    temperature: 0.1,
    maxOutputTokens: 600,
  };
}
