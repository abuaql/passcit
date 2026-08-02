import type { Metadata } from "next";
import { auth } from "@/auth";
import { getActiveTestVersion, getRandomQuestion } from "@/lib/questions";
import { RandomQuestionClient } from "@/components/practice/random-question-client";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Random Question" };

export default async function RandomQuestionPage() {
  const session = await auth();
  const testVersion = await getActiveTestVersion(session?.user?.id);
  const question = await getRandomQuestion(testVersion.id, undefined, session?.user?.id);

  if (!question) {
    return (
      <p className="text-center text-muted-foreground">
        {strings.randomQuestion.noQuestionsAvailable}
      </p>
    );
  }

  return (
    <RandomQuestionClient
      initialQuestion={{
        ...question,
        progress: session?.user?.id ? question.progress : undefined,
      }}
    />
  );
}
