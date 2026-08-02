"use client";

import { useState } from "react";
import { Check, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioButton } from "@/components/ui/audio-button";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { officerDialogue, IDENTITY_QUESTIONS } from "@/lib/officer-dialogue";
import { strings } from "@/lib/i18n";
import { InterviewStatusBar } from "@/components/interview/interview-status-bar";
import { VoiceStartButton } from "@/components/interview/voice-start-button";
import { ListeningIndicator } from "@/components/ui/listening-indicator";

export function IdentityStep({ startedAt, onComplete }: { startedAt: number; onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [acknowledgment, setAcknowledgment] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [useTyped, setUseTyped] = useState(false);
  const { isSupported, status, transcript, interimTranscript, start, reset } = useSpeechRecognition();
  // Picked once, not recomputed on every render (typing, listening, etc.
  // would otherwise re-roll this to a different random variant mid-step).
  const [introLine] = useState(() => officerDialogue.introduceIdentity());

  const question = IDENTITY_QUESTIONS[index];
  const isLast = index === IDENTITY_QUESTIONS.length - 1;

  // Deliberately not stored anywhere and not sent to the server — this
  // step is rehearsal, not data collection. See schema.prisma for why.
  function markAnswered() {
    setAcknowledgment(officerDialogue.acknowledgeIdentity());
    setAnswered(true);
  }

  function next() {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(false);
    setAcknowledgment("");
    setTypedAnswer("");
    setUseTyped(false);
    reset();
  }

  if (!question) return null;

  return (
    <>
      <InterviewStatusBar currentStep="identity" stepLabel={strings.interview.steps.identity} startedAt={startedAt} />
      <div className="mx-auto max-w-xl space-y-6">
        <p className="text-center text-sm font-semibold text-muted-foreground">
        {index === 0 ? introLine : null}
      </p>

      <div className="flex items-start gap-2 rounded-3xl border-2 border-border bg-card p-6 text-center">
        <p className="mx-auto font-heading text-xl font-bold text-foreground">{question.prompt}</p>
        <AudioButton text={question.prompt} id={`identity-${question.id}`} label="question" className="shrink-0" />
      </div>

      {answered ? (
        <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
          <div className="flex items-center gap-2 text-success">
            <Check className="h-5 w-5" aria-hidden="true" />
            <p className="font-semibold">{acknowledgment}</p>
          </div>
          <Button onClick={next}>
            {isLast ? strings.interview.identity.continueToReading : strings.interview.identity.continueButton}
          </Button>
        </div>
      ) : useTyped || !isSupported ? (
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground" htmlFor="identity-typed">
            {strings.interview.identity.typedFallbackLabel}
          </label>
          <textarea
            id="identity-typed"
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            placeholder={strings.interview.identity.typedFallbackPlaceholder}
            rows={2}
            className="w-full rounded-2xl border-2 border-border bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button className="w-full" disabled={!typedAnswer.trim()} onClick={markAnswered}>
            {strings.interview.identity.submitAnswer}
          </Button>
        </div>
      ) : (
        <div className="space-y-3" aria-live="polite">
          {status === "idle" && (
            <VoiceStartButton label={strings.interview.identity.speakYourAnswer} onClick={start} />
          )}
          {status === "listening" && (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <ListeningIndicator />
              {interimTranscript && (
                <p className="text-sm italic text-muted-foreground">&ldquo;{interimTranscript}&rdquo;</p>
              )}
            </div>
          )}
          {status === "done" && transcript.trim() && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                {strings.interview.identity.youSaid} <span className="font-semibold text-foreground">&ldquo;{transcript}&rdquo;</span>
              </p>
              <Button className="w-full" onClick={markAnswered}>
                {strings.interview.identity.submitAnswer}
              </Button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setUseTyped(true)}
            className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
            {strings.interview.identity.typedFallbackLabel}
          </button>
        </div>
      )}
      </div>
    </>
  );
}
