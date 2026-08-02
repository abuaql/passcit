"use client";

import { useState } from "react";
import { Layers, ListFilter, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { QuizSession } from "@/components/practice/quiz-session";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { strings } from "@/lib/i18n";
import type { PreparedQuizQuestion } from "@/lib/quiz";
import type { QuestionCategory } from "@/generated/prisma/client";

type Selection = { kind: "all" } | { kind: "category"; category: QuestionCategory } | { kind: "missed" };

export function PracticeQuizClient() {
  const [session, setSession] = useState<{ testId: string; questions: PreparedQuizQuestion[] } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(selection: Selection) {
    setLoading(true);
    setError(null);

    const body =
      selection.kind === "category"
        ? { mode: "CATEGORY", category: selection.category }
        : selection.kind === "missed"
          ? { mode: "MISSED_ONLY" }
          : { mode: "RANDOM_10" };

    try {
      const res = await fetch("/api/practice-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? strings.practiceQuiz.startFailed);
        setLoading(false);
        return;
      }
      setSession({ testId: data.testId, questions: data.questions });
    } catch {
      setError(strings.practiceQuiz.startFailedRetry);
    } finally {
      setLoading(false);
    }
  }

  if (session) {
    return (
      <QuizSession
        testId={session.testId}
        questions={session.questions}
        revealImmediately
        useEarlyStop={false}
        restartHref="/practice/quiz"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.practiceQuiz.title}</h1>
        <p className="text-muted-foreground">{strings.practiceQuiz.subtitle}</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <Layers className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-2 font-heading font-bold text-foreground">{strings.practiceQuiz.mixedTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{strings.practiceQuiz.mixedBody}</p>
            <Button className="mt-4 w-full" onClick={() => start({ kind: "all" })}>
              {strings.practiceQuiz.start}
            </Button>
          </Card>

          <Card className="p-6">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
            <h2 className="mt-2 font-heading font-bold text-foreground">{strings.practiceQuiz.missedTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {strings.practiceQuiz.missedBody}
            </p>
            <Button className="mt-4 w-full" variant="outline" onClick={() => start({ kind: "missed" })}>
              {strings.practiceQuiz.start}
            </Button>
          </Card>

          {CATEGORY_OPTIONS.map((opt) => (
            <Card key={opt.value} className="p-6 sm:col-span-2">
              <ListFilter className="h-6 w-6 text-secondary" aria-hidden="true" />
              <h2 className="mt-2 font-heading font-bold text-foreground">{opt.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {strings.practiceQuiz.categoryBody}
              </p>
              <Button
                className="mt-4 w-full sm:w-auto"
                variant="secondary"
                onClick={() => start({ kind: "category", category: opt.value })}
              >
                {strings.practiceQuiz.start}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
