import { prisma } from "@/lib/prisma";

/** The official USCIS content a prompt builder needs. Always English. */
export interface QuestionContext {
  id: string;
  question: string;
  answers: string[];
}

/**
 * Loads the official question and its accepted answers.
 *
 * Every AI service starts here rather than trusting a client-supplied
 * question or answer: the text sent to the provider must be the official
 * content from our own database, never something a caller can influence.
 */
export async function loadQuestionContext(questionId: string): Promise<QuestionContext | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      question: true,
      answers: { select: { text: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!question) return null;
  return {
    id: question.id,
    question: question.question,
    answers: question.answers.map((a) => a.text),
  };
}
