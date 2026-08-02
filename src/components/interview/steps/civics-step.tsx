"use client";

import { useState, useEffect } from "react";
import { Check, X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioButton } from "@/components/ui/audio-button";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { officerDialogue } from "@/lib/officer-dialogue";
import { strings } from "@/lib/i18n";
import { InterviewStatusBar } from "@/components/interview/interview-status-bar";
import { VoiceStartButton } from "@/components/interview/voice-start-button";
import { ListeningIndicator } from "@/components/ui/listening-indicator";
import type { StartedInterview } from "@/components/interview/interview-session";

type CivicsQuestion = StartedInterview["civicsQuestions"][number];

export function CivicsStep({
  interviewId,
  questions,
  passThreshold,
  questionsAsked,
  startedAt,
  onComplete,
}: {
  interviewId: string;
  questions: CivicsQuestion[];
  passThreshold: number;
  questionsAsked: number;
  startedAt: number;
  onComplete: (passed: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [useTyped, setUseTyped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; line: string } | null>(null);
  const [sectionOutcome, setSectionOutcome] = useState<{ passed: boolean; line: string } | null>(null);
  const { isSupported, status, transcript, interimTranscript, start, reset } = useSpeechRecognition();
  const [introLine] = useState(() => officerDialogue.introduceCivics(questionsAsked, passThreshold));
  // Picked once per occurrence via the effect below, not inline during
  // render — otherwise this would re-roll to a different random variant
  // on any unrelated re-render while the message is showing, the same
  // bug this build has hit (and fixed) several times already.
  const [askToRepeatLine, setAskToRepeatLine] = useState("");

  useEffect(() => {
    if (status === "done" && !transcript.trim()) {
      // Picked once, on the transition into "nothing was captured", and then
      // held stable while the message is on screen. Choosing it during
      // render instead would re-roll a different random variant on every
      // unrelated re-render — the exact bug this build has hit and fixed
      // several times already.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAskToRepeatLine(officerDialogue.askToRepeat());
    }
  }, [status, transcript]);

  const question = questions[index];
  const remaining = Math.max(0, questionsAsked - correctCount - incorrectCount);

  async function submit(answerText: string) {
    // Both normal submission paths (voice, typed) already prevent an
    // empty answerText from reaching here at the UI level — the voice
    // Submit button only renders when transcript.trim() is truthy, and
    // the typed Submit button is disabled while empty. So this only
    // guards against a missing question, deliberately allowing Skip's
    // intentional submit("") through to reuse the same evaluation path.
    if (!question) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/interview/${interviewId}/civics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          answerText,
          passThreshold,
          questionsAsked,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;

      const isCorrect: boolean = data.isCorrect;
      const done: boolean = data.done;
      const passed: boolean | null = data.passed;

      if (isCorrect) setCorrectCount((c) => c + 1);
      else setIncorrectCount((c) => c + 1);

      if (done) {
        const isPassed = Boolean(passed);
        setSectionOutcome({
          passed: isPassed,
          line: isPassed ? officerDialogue.sectionPassed() : officerDialogue.sectionMovingOn(),
        });
      } else {
        setFeedback({
          isCorrect,
          line: isCorrect ? officerDialogue.afterCorrect() : officerDialogue.afterIncorrect(),
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    setFeedback(null);
    setTypedAnswer("");
    setUseTyped(false);
    setIndex((i) => i + 1);
    reset();
  }

  if (sectionOutcome !== null) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-8 text-center" aria-live="polite">
        {sectionOutcome.passed ? (
          <Check className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
        ) : (
          <X className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        )}
        <p className="font-heading text-xl font-bold text-foreground">{sectionOutcome.line}</p>
        <Button onClick={() => onComplete(sectionOutcome.passed)}>{strings.interview.civics.continueButton}</Button>
      </div>
    );
  }

  if (feedback) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-8 text-center">
        <InterviewStatusBar
          currentStep="civics"
          stepLabel={strings.interview.steps.civics}
          startedAt={startedAt}
          questionProgress={strings.interview.progress.questionNumber(index + 1, questionsAsked)}
          correctCount={correctCount}
          remainingCount={remaining}
        />
        <div className="space-y-4" aria-live="polite">
          {feedback.isCorrect ? (
            <Check className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
          ) : (
            <X className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          )}
          <p className="text-foreground">{feedback.line}</p>
          <Button onClick={nextQuestion}>{strings.practiceQuiz.nextQuestion}</Button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div>
      <InterviewStatusBar
        currentStep="civics"
        stepLabel={strings.interview.steps.civics}
        startedAt={startedAt}
        questionProgress={strings.interview.progress.questionNumber(index + 1, questionsAsked)}
        correctCount={correctCount}
        remainingCount={remaining}
      />

      <div className="mx-auto max-w-xl space-y-6">
        {index === 0 && <p className="text-center text-sm font-semibold text-muted-foreground">{introLine}</p>}

        <div className="flex items-start gap-2 rounded-3xl border-2 border-border bg-card p-6 text-center">
          <p className="mx-auto font-heading text-xl font-bold text-foreground">{question.question}</p>
          <AudioButton text={question.question} id={`civics-${question.id}`} label="question" className="shrink-0" />
        </div>

        <p className="text-center text-sm text-muted-foreground">{strings.interview.civics.instructions}</p>

        {useTyped || !isSupported ? (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground" htmlFor="civics-typed">
              {strings.interview.civics.typedFallbackLabel}
            </label>
            <textarea
              id="civics-typed"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              placeholder={strings.interview.civics.typedFallbackPlaceholder}
              rows={2}
              className="w-full rounded-2xl border-2 border-border bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button className="w-full" disabled={!typedAnswer.trim()} isLoading={submitting} onClick={() => submit(typedAnswer)}>
              {strings.interview.civics.submitAnswer}
            </Button>
          </div>
        ) : (
          <div className="space-y-3" aria-live="polite">
            {status === "idle" && (
              <VoiceStartButton label={strings.interview.civics.speakYourAnswer} onClick={start} />
            )}
            {status === "listening" && (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <ListeningIndicator />
                <p className="text-sm font-semibold text-foreground">{strings.interview.civics.listening}</p>
                {interimTranscript && (
                  <p className="text-sm italic text-muted-foreground">&ldquo;{interimTranscript}&rdquo;</p>
                )}
              </div>
            )}
            {status === "done" && transcript.trim() && (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  {strings.interview.civics.youSaid} <span className="font-semibold text-foreground">&ldquo;{transcript}&rdquo;</span>
                </p>
                <Button className="w-full" isLoading={submitting} onClick={() => submit(transcript)}>
                  {strings.interview.civics.submitAnswer}
                </Button>
              </div>
            )}
            {status === "done" && !transcript.trim() && (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">{askToRepeatLine}</p>
                <Button className="w-full" variant="outline" onClick={reset}>
                  {strings.interview.civics.didntCatchThat}
                </Button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setUseTyped(true)}
              className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
            >
              <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
              {strings.interview.civics.typedFallbackLabel}
            </button>
          </div>
        )}

        {/* Reuses submit() with an empty answer — evaluateAnswer() already
            treats a blank transcript as INCORRECT (unchanged, existing
            logic), so "Skip" is a pure UI shortcut to a path that already
            existed, not a new scoring rule. */}
        <button
          type="button"
          disabled={submitting}
          onClick={() => submit("")}
          className="mx-auto flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          {strings.interview.civics.skipQuestion}
        </button>
      </div>
    </div>
  );
}
