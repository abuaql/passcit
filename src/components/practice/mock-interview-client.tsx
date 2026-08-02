"use client";

import { useState } from "react";
import { Mic2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { QuizSession } from "@/components/practice/quiz-session";
import { strings } from "@/lib/i18n";
import type { PreparedQuizQuestion } from "@/lib/quiz";

interface SessionState {
  testId: string;
  questions: PreparedQuizQuestion[];
  passThreshold: number;
  questionsAsked: number;
}

export function MockInterviewClient({
  testVersionName,
  passThreshold,
  questionsAsked,
}: {
  testVersionName: string;
  passThreshold: number;
  questionsAsked: number;
}) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const failThreshold = questionsAsked - passThreshold + 1;

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/practice-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "MOCK_INTERVIEW" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? strings.mockInterview.startFailed);
        setLoading(false);
        return;
      }
      setSession({
        testId: data.testId,
        questions: data.questions,
        passThreshold: data.passThreshold,
        questionsAsked: data.questionsAsked,
      });
    } catch {
      setError(strings.mockInterview.startFailedRetry);
    } finally {
      setLoading(false);
    }
  }

  if (session) {
    return (
      <QuizSession
        testId={session.testId}
        questions={session.questions}
        revealImmediately={false}
        useEarlyStop
        passThreshold={session.passThreshold}
        questionsAsked={session.questionsAsked}
        restartHref="/practice/mock-interview"
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <Mic2 className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-3 font-heading text-3xl font-bold text-foreground">{strings.mockInterview.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {strings.mockInterview.subtitle(testVersionName)}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          <Rule text={strings.mockInterview.ruleAskedUpTo(questionsAsked)} />
          <Rule text={strings.mockInterview.ruleAnswerCorrectly(passThreshold)} />
          <Rule text={strings.mockInterview.ruleGetWrong(failThreshold)} />
          <Rule text={strings.mockInterview.ruleNoImmediateReveal} />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="flex justify-center">
        {loading ? <Spinner /> : <Button size="lg" onClick={start}>{strings.mockInterview.begin}</Button>}
      </div>
    </div>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}
