"use client";

import { useState } from "react";
import { BookOpen, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { officerDialogue } from "@/lib/officer-dialogue";
import { strings } from "@/lib/i18n";
import { InterviewStatusBar } from "@/components/interview/interview-status-bar";
import { VoiceStartButton } from "@/components/interview/voice-start-button";
import { ListeningIndicator } from "@/components/ui/listening-indicator";
import type { StartedInterview } from "@/components/interview/interview-session";

type Sentence = StartedInterview["readingSentences"][number];

export function ReadingStep({
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
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; line: string } | null>(null);
  // Carries the picked dialogue line alongside the result, same shape as
  // `feedback` above — picked once, when the outcome is determined below,
  // never called again during render. Calling officerDialogue functions
  // inline during render re-rolls them to a different random variant on
  // every re-render, a bug this build has hit and fixed three times now.
  const [sectionOutcome, setSectionOutcome] = useState<{ result: "PASSED" | "FAILED"; line: string } | null>(null);
  const { isSupported, status, transcript, interimTranscript, start, reset } = useSpeechRecognition();
  const [introLine] = useState(() => officerDialogue.introduceReading());

  const sentence = sentences[index];

  async function submit() {
    if (!sentence || !transcript.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/interview/${interviewId}/reading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentenceId: sentence.id, sentenceText: sentence.text, transcript }),
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
    setIndex((i) => i + 1);
    reset();
  }

  // Computed once, then wrapped a single time below with the status bar
  // — avoids repeating the status bar across three separate early
  // returns (section outcome, incorrect-attempt feedback, main content).
  let content: React.ReactNode;

  if (sectionOutcome) {
    content = (
      <div className="mx-auto max-w-xl space-y-4 py-8 text-center" aria-live="polite">
        {sectionOutcome.result === "PASSED" ? (
          <Check className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
        ) : (
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        )}
        <p className="font-heading text-xl font-bold text-foreground">{sectionOutcome.line}</p>
        <Button onClick={onComplete}>{strings.interview.reading.continueButton}</Button>
      </div>
    );
  } else if (feedback && !feedback.isCorrect) {
    content = (
      <div className="mx-auto max-w-xl space-y-4 py-8 text-center" aria-live="polite">
        <X className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-foreground">{feedback.line}</p>
        <Button onClick={nextSentence}>{strings.interview.reading.continueButton}</Button>
      </div>
    );
  } else if (!sentence) {
    content = null;
  } else {
    content = (
      <div className="mx-auto max-w-xl space-y-6">
        {index === 0 && <p className="text-center text-sm font-semibold text-muted-foreground">{introLine}</p>}

        <p className="text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {strings.interview.reading.attemptCount(index + 1)}
        </p>

        <div className="rounded-3xl border-2 border-border bg-card p-8 text-center">
          <p className="font-heading text-2xl font-bold text-foreground">{sentence.text}</p>
        </div>

        <p className="text-center text-sm text-muted-foreground">{strings.interview.reading.instructions}</p>

        <div aria-live="polite">
          {!isSupported ? (
            <p className="text-center text-sm text-destructive">{strings.voice.recognitionNotSupported}</p>
          ) : status === "idle" ? (
            <VoiceStartButton label={strings.interview.reading.startListening} onClick={start} />
          ) : status === "listening" ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <ListeningIndicator />
              <p className="text-sm font-semibold text-foreground">{strings.interview.reading.listening}</p>
              {interimTranscript && (
                <p className="text-sm italic text-muted-foreground">&ldquo;{interimTranscript}&rdquo;</p>
              )}
            </div>
          ) : transcript.trim() ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">&ldquo;{transcript}&rdquo;</p>
              <Button className="w-full" isLoading={submitting} onClick={submit}>
                {strings.interview.reading.submitAnswer}
              </Button>
            </div>
          ) : (
            <VoiceStartButton label={strings.interview.reading.startListening} onClick={start} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <InterviewStatusBar currentStep="reading" stepLabel={strings.interview.steps.reading} startedAt={startedAt} />
      {content}
    </div>
  );
}
