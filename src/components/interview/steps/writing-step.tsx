"use client";

import { useState } from "react";
import { Volume2, PenLine, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeech } from "@/hooks/useSpeech";
import { officerDialogue } from "@/lib/officer-dialogue";
import { strings } from "@/lib/i18n";
import { InterviewStatusBar } from "@/components/interview/interview-status-bar";
import type { StartedInterview } from "@/components/interview/interview-session";

type Sentence = StartedInterview["writingSentences"][number];

export function WritingStep({
  interviewId,
  sentences,
  startedAt,
  onComplete,
}: {
  interviewId: string;
  sentences: Sentence[];
  startedAt: number;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; line: string } | null>(null);
  // Carries the picked dialogue line alongside the result — see the same
  // pattern and rationale in ReadingStep.
  const [sectionOutcome, setSectionOutcome] = useState<{ result: "PASSED" | "FAILED"; line: string } | null>(null);
  const { speak, isPlaying, isSupported } = useSpeech();
  const [introLine] = useState(() => officerDialogue.introduceWriting());

  const sentence = sentences[index];
  const playingThis = sentence ? isPlaying(`writing-${sentence.id}`) : false;

  async function submit() {
    if (!sentence || !typedAnswer.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/interview/${interviewId}/writing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentenceId: sentence.id, sentenceText: sentence.text, typedAnswer }),
      });
      const data = await res.json();
      if (!res.ok) return;

      const isCorrect: boolean = data.isCorrect;
      const sectionResult: "PASSED" | "FAILED" | "NOT_REACHED" = data.sectionResult;

      if (sectionResult === "PASSED") {
        setSectionOutcome({ result: "PASSED", line: officerDialogue.sectionPassed() });
      } else if (sectionResult === "FAILED") {
        setSectionOutcome({ result: "FAILED", line: officerDialogue.sectionMovingOn() });
      } else {
        setFeedback({
          isCorrect,
          line: isCorrect ? officerDialogue.afterCorrect() : officerDialogue.tryDifferentSentence(),
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function nextSentence() {
    setFeedback(null);
    setTypedAnswer("");
    setIndex((i) => i + 1);
  }

  // Computed once, then wrapped a single time below with the status bar
  // — avoids repeating the status bar across three separate early
  // returns, matching the same pattern used in ReadingStep.
  let content: React.ReactNode;

  if (sectionOutcome) {
    content = (
      <div className="mx-auto max-w-xl space-y-4 py-8 text-center" aria-live="polite">
        {sectionOutcome.result === "PASSED" ? (
          <Check className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
        ) : (
          <PenLine className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        )}
        <p className="font-heading text-xl font-bold text-foreground">{sectionOutcome.line}</p>
        <Button onClick={onComplete}>{strings.interview.writing.continueButton}</Button>
      </div>
    );
  } else if (feedback && !feedback.isCorrect) {
    content = (
      <div className="mx-auto max-w-xl space-y-4 py-8 text-center" aria-live="polite">
        <X className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-foreground">{feedback.line}</p>
        <Button onClick={nextSentence}>{strings.interview.writing.continueButton}</Button>
      </div>
    );
  } else if (!sentence) {
    content = null;
  } else {
    content = (
      <div className="mx-auto max-w-xl space-y-6">
        {index === 0 && <p className="text-center text-sm font-semibold text-muted-foreground">{introLine}</p>}

        <p className="text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {strings.interview.writing.attemptCount(index + 1)}
        </p>

        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-border bg-card p-8">
          <button
            type="button"
            onClick={() => sentence && speak(sentence.text, `writing-${sentence.id}`)}
            disabled={!isSupported}
            className="flex items-center gap-2 rounded-2xl border-2 border-b-4 border-secondary-dark bg-secondary px-6 py-3 font-heading font-bold text-secondary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Volume2 className={playingThis ? "h-5 w-5 animate-pulse" : "h-5 w-5"} aria-hidden="true" />
            {strings.interview.writing.playSentence}
          </button>
          <p className="text-xs text-muted-foreground">{strings.interview.writing.instructions}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="writing-answer">
            {strings.interview.writing.typedAnswerLabel}
          </label>
          <textarea
            id="writing-answer"
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            placeholder={strings.interview.writing.typedAnswerPlaceholder}
            rows={2}
            className="w-full rounded-2xl border-2 border-border bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button className="w-full" disabled={!typedAnswer.trim()} isLoading={submitting} onClick={submit}>
            {strings.interview.writing.submitAnswer}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <InterviewStatusBar currentStep="writing" stepLabel={strings.interview.steps.writing} startedAt={startedAt} />
      {content}
    </div>
  );
}
