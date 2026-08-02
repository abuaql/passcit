"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, Target, BookOpen, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CATEGORY_LABELS } from "@/lib/categories";
import { officerDialogue } from "@/lib/officer-dialogue";
import { strings } from "@/lib/i18n";

type SectionResult = "PASSED" | "FAILED" | "NOT_REACHED";

interface InterviewDetail {
  passed: boolean | null;
  readingResult: SectionResult;
  writingResult: SectionResult;
  civicsResult: SectionResult;
  civicsCorrectCount: number;
  civicsIncorrectCount: number;
  durationSec: number | null;
  testVersion: { name: string };
  civicsAnswers: {
    id: string;
    isCorrect: boolean;
    spokenAnswer: string;
    question: { number: number; question: string; category: string; answers: { text: string }[] };
  }[];
  categoryPerformance: { category: string; correct: number; total: number; accuracyPercent: number }[];
}

function sectionBadge(result: SectionResult) {
  if (result === "PASSED") return { variant: "success" as const, label: strings.interview.results.passedLabel };
  if (result === "FAILED") return { variant: "outline" as const, label: strings.interview.results.failedLabel };
  return { variant: "outline" as const, label: strings.interview.results.notReachedLabel };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function ResultsStep({ interviewId }: { interviewId: string }) {
  const [detail, setDetail] = useState<InterviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Computed once, the moment the result is known — not recomputed on
  // every render, or this would flicker between random variants each
  // time this component re-renders while already showing results.
  const [concludingLine, setConcludingLine] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/interview/${interviewId}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? strings.interview.results.loadFailed);
          return;
        }
        if (!cancelled) {
          const loaded = data.interview as InterviewDetail;
          setDetail(loaded);
          setConcludingLine(officerDialogue.concludingRemark(Boolean(loaded.passed)));
        }
      } catch {
        if (!cancelled) setError(strings.interview.results.loadFailed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  if (error) {
    return <p className="py-12 text-center text-destructive">{error}</p>;
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Spinner />
        <p className="text-sm text-muted-foreground">{strings.interview.results.loading}</p>
      </div>
    );
  }

  const passed = Boolean(detail.passed);
  const weakCategories = detail.categoryPerformance.filter((c) => c.accuracyPercent < 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {strings.interview.results.title}
        </p>
        <p className="mt-1 font-heading text-sm font-semibold text-foreground">
          {strings.interview.results.reportSubtitle(detail.testVersion.name)}
        </p>
      </div>

      <Card
        className={
          passed
            ? "overflow-hidden border-success bg-gradient-to-br from-success/10 via-success/5 to-transparent"
            : "overflow-hidden border-destructive bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent"
        }
      >
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          {passed ? (
            <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
          ) : (
            <XCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
          )}
          <p className="font-heading text-2xl font-bold text-foreground">
            {passed ? strings.interview.results.passed : strings.interview.results.notPassed}
          </p>
          <p className="text-sm text-muted-foreground">{concludingLine}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {strings.interview.results.sectionResults}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SectionTile label={strings.interview.results.reading} result={detail.readingResult} />
            <SectionTile label={strings.interview.results.writing} result={detail.writingResult} />
            <SectionTile label={strings.interview.results.civics} result={detail.civicsResult} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={Target} label={strings.interview.results.totalCorrect} value={String(detail.civicsCorrectCount)} />
        <StatTile icon={XCircle} label={strings.interview.results.totalIncorrect} value={String(detail.civicsIncorrectCount)} />
        <StatTile icon={Clock} label={strings.interview.results.duration} value={formatDuration(detail.durationSec)} />
      </div>

      {weakCategories.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-accent" aria-hidden="true" />
              {strings.interview.results.weakCategories}
            </p>
            <p className="text-sm text-foreground">{strings.interview.results.recommendationIntro}</p>
            <ul className="space-y-2">
              {weakCategories.map((c) => (
                <li
                  key={c.category}
                  className="flex items-center justify-between gap-2 rounded-xl border-2 border-border p-3 text-sm"
                >
                  <span className="font-semibold text-foreground">
                    {CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category}
                  </span>
                  <Badge variant="outline">
                    {strings.interview.results.categoryAccuracy(c.correct, c.total, c.accuracyPercent)}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <p className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <BookOpen className="h-4 w-4 text-secondary" aria-hidden="true" />
            {strings.interview.results.civicsReview}
          </p>
          <div className="space-y-2">
            {detail.civicsAnswers.map((a) => (
              <div
                key={a.id}
                className={
                  a.isCorrect
                    ? "flex gap-3 rounded-xl border-2 border-border bg-success/5 p-3 text-sm"
                    : "flex gap-3 rounded-xl border-2 border-border bg-destructive/5 p-3 text-sm"
                }
              >
                <span
                  className={
                    a.isCorrect
                      ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/20 text-xs font-bold text-success"
                      : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-xs font-bold text-destructive"
                  }
                >
                  {a.question.number}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-foreground">{a.question.question}</span>
                    {a.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {strings.interview.results.yourAnswer} &ldquo;{a.spokenAnswer}&rdquo;
                  </p>
                  {!a.isCorrect && (
                    <p className="text-success">
                      {strings.interview.results.correctAnswer} {a.question.answers.map((ans) => ans.text).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/dashboard">
          <Button variant="outline">{strings.interview.results.backToDashboard}</Button>
        </Link>
        <Link href="/interview/history">
          <Button variant="outline">{strings.interview.results.viewHistory}</Button>
        </Link>
        <Link href="/interview">
          <Button>{strings.interview.results.tryAgain}</Button>
        </Link>
      </div>
    </div>
  );
}

function SectionTile({ label, result }: { label: string; result: SectionResult }) {
  const badge = sectionBadge(result);
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-border p-4 text-center">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <Badge variant={badge.variant}>{badge.label}</Badge>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2.5 p-4">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="font-heading text-lg font-bold leading-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
