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

export function buildExplanationPrompt(params: {
  question: string;
  answers: string[];
  /** Target language written in English, e.g. "Spanish" — models follow this more reliably than a code. */
  languageName: string;
}): PromptSpec {
  const isEnglish = params.languageName.trim().toLowerCase() === "english";

  // The official question and answers reach the model in English, and without
  // this the model quotes them verbatim — producing Arabic prose with English
  // fragments like "Sets up the government" embedded in it. Stated as an
  // explicit, positive rule rather than a vague "write in X", because the
  // English source text sitting in the prompt is a strong pull.
  const languageDiscipline = isEnglish
    ? []
    : [
        `Write EVERY word in ${params.languageName}: every sentence, every heading, every bullet, every label.`,
        `The official question and answers below are given in English only so you can understand them. Express them in ${params.languageName} when you refer to them — never copy the English text into your response.`,
        `One exception: immediately after the first mention of an accepted answer you may put the official English wording in parentheses, because the applicant must say that answer in English at the interview. That parenthetical is the only English allowed, and it must never form a sentence of its own.`,
        `Do not leave any English sentence, heading, bullet or phrase anywhere else in your response.`,
        `Write natural, fluent ${params.languageName} as a native speaker would — not a word-for-word rendering of English phrasing.`,
      ];

  return {
    system: [
      "You are a patient civics teacher helping immigrants prepare for the USCIS naturalization interview.",
      "Explain why the given official answer is correct. Add brief historical or legal context only where it genuinely aids understanding.",
      "Write for someone who may be studying in a second language: short sentences, everyday words, no jargon left unexplained.",
      "Use a short heading or bullet points only if they make the explanation easier to scan. Keep the whole explanation under about 180 words.",
      "Never contradict the official answer, never suggest a different answer, and never claim an answer is outdated.",
      `Write your entire response in ${params.languageName}.`,
      ...languageDiscipline,
    ].join(" "),
    user: [
      `Official USCIS question (English): ${params.question}`,
      "",
      `Official accepted answer(s) (English):`,
      formatAnswers(params.answers),
      "",
      isEnglish
        ? `Explain why this answer is correct.`
        : `Explain why this answer is correct. Respond entirely in ${params.languageName}, including any heading or bullet, and express the official question and answer in ${params.languageName} rather than repeating the English.`,
    ].join("\n"),
    temperature: 0.4,
    maxOutputTokens: 600,
  };
}
