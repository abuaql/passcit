import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTestVersion } from "@/lib/questions";
import { FlashcardDeck } from "@/components/flashcards/flashcard-deck";

export const metadata: Metadata = { title: "Flashcards" };

export default async function FlashcardsPage() {
  const session = await auth();
  const testVersion = await getActiveTestVersion(session?.user?.id);

  const questions = await prisma.question.findMany({
    where: { testVersionId: testVersion.id, isActive: true },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      category: true,
      question: true,
      variesByLocation: true,
      requiredAnswerCount: true,
      answers: { select: { id: true, text: true }, orderBy: { sortOrder: "asc" } },
      progress: session?.user?.id
        ? { where: { userId: session.user.id }, select: { isFavorite: true, status: true } }
        : false,
    },
  });

  const deck = questions.map((q) => ({
    ...q,
    isFavorite: q.progress && q.progress[0]?.isFavorite === true,
    status: (q.progress && q.progress[0]?.status) || "NEW",
  }));

  return <FlashcardDeck questions={deck} />;
}
