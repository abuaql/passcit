"use client";

import { useState, useEffect } from "react";
import { Clock, Check } from "lucide-react";
import { strings } from "@/lib/i18n";

const STEP_ORDER = ["welcome", "identity", "reading", "writing", "civics", "results"] as const;
export type InterviewStep = (typeof STEP_ORDER)[number];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * A compact dot row rather than the full text-labeled checklist from the
 * spec example ("✓ Welcome / ✓ Identity / ○ Reading..." etc.) — six full
 * text labels in a row doesn't fit on mobile without wrapping awkwardly.
 * The current step's full name is still shown as text (via stepLabel,
 * right below this), so nothing from the example is lost, just laid out
 * to actually work at phone width.
 */
function StepBreadcrumb({ currentStep }: { currentStep: InterviewStep }) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="mx-auto flex max-w-xl items-center" aria-label="Interview progress">
      {STEP_ORDER.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <span
              className={
                isDone
                  ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground"
                  : isCurrent
                    ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/15"
                    : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border"
              }
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="sr-only">
                {strings.interview.steps[step]},{" "}
                {isDone
                  ? strings.interview.progress.stepCompleted
                  : isCurrent
                    ? strings.interview.progress.stepCurrent
                    : strings.interview.progress.stepUpcoming}
              </span>
              {isDone ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : (
                <span className={isCurrent ? "h-1.5 w-1.5 rounded-full bg-primary" : "h-1.5 w-1.5 rounded-full bg-transparent"} />
              )}
            </span>
            {i < STEP_ORDER.length - 1 && (
              <span className={isDone ? "h-0.5 flex-1 bg-success" : "h-0.5 flex-1 bg-border"} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function InterviewStatusBar({
  currentStep,
  stepLabel,
  startedAt,
  questionProgress,
  correctCount,
  remainingCount,
}: {
  currentStep: InterviewStep;
  stepLabel: string;
  startedAt: number;
  /** e.g. "Question 3 of 10" — omit outside Civics, where this isn't meaningful. */
  questionProgress?: string;
  correctCount?: number;
  remainingCount?: number;
}) {
  const [elapsedSec, setElapsedSec] = useState(() => Math.floor((Date.now() - startedAt) / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="mx-auto mb-6 max-w-xl space-y-3">
      <StepBreadcrumb currentStep={currentStep} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-xs">
        <span className="font-heading font-bold text-foreground">{stepLabel}</span>
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          {questionProgress && <span className="font-semibold">{questionProgress}</span>}
          {correctCount !== undefined && (
            <span>
              {strings.interview.statusBar.correctLabel}: <span className="font-bold text-success">{correctCount}</span>
            </span>
          )}
          {remainingCount !== undefined && (
            <span>
              {strings.interview.statusBar.remainingLabel}: <span className="font-bold text-foreground">{remainingCount}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatElapsed(elapsedSec)}
          </span>
        </div>
      </div>
    </div>
  );
}
