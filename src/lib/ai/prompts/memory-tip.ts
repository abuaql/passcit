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

export function buildMemoryTipPrompt(params: {
  question: string;
  answers: string[];
  languageName: string;
}): PromptSpec {
  const isEnglish = params.languageName.trim().toLowerCase() === "english";

  // Same exposure as the explanation prompt: the answer arrives in English, so
  // without an explicit rule the model threads English fragments through
  // otherwise-Arabic text. A mnemonic is worse than useless if half of it is
  // in a language the reader is still learning.
  const languageDiscipline = isEnglish
    ? []
    : [
        `Write EVERY word in ${params.languageName} — the whole aid, with no English phrases inside it.`,
        `The answer below is given in English only so you can understand it. Express it in ${params.languageName}; you may put the official English wording once in parentheses, since the applicant must say it in English at the interview.`,
        `Do not build the aid on English wordplay, rhymes or initials — it must work naturally for a ${params.languageName} speaker.`,
      ];

  return {
    system: [
      "You create short memory aids for people studying for the USCIS naturalization civics test.",
      "Give exactly one aid — a mnemonic, a vivid association, a tiny story, or an everyday analogy — whichever genuinely fits this fact best.",
      "Keep it to two or three sentences. It must be concrete and easy to picture, and it must lead to the official answer, never to a different one.",
      "Do not restate the question, and do not add a preamble such as 'Here is a memory tip'.",
      `Write your entire response in ${params.languageName}.`,
      ...languageDiscipline,
    ].join(" "),
    user: [
      `Question (English): ${params.question}`,
      `Answer to remember (English): ${formatAnswers(params.answers)}`,
      "",
      isEnglish
        ? `Give one memory aid.`
        : `Give one memory aid, written entirely in ${params.languageName} with no English phrases inside it.`,
    ].join("\n"),
    // Higher temperature: a memorable association benefits from some variety.
    temperature: 0.8,
    maxOutputTokens: 300,
  };
}
