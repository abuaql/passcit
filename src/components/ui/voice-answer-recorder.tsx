"use client";

import { useEffect, useState } from "react";
import { Mic, Square, CheckCircle2, AlertTriangle, XCircle, RotateCcw, MicOff } from "lucide-react";
import { ListeningIndicator } from "@/components/ui/listening-indicator";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { evaluateAnswer, type MatchResult } from "@/lib/answer-matching";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/i18n";

const PROCESSING_DELAY_MS = 500;

const VERDICT_CONFIG = {
  CORRECT: {
    icon: CheckCircle2,
    label: strings.voice.verdictCorrect,
    emoji: "✅",
    classes: "border-success bg-success/10 text-success",
  },
  ALMOST_CORRECT: {
    icon: AlertTriangle,
    label: strings.voice.verdictAlmostCorrect,
    emoji: "⚠️",
    classes: "border-warning bg-warning/10 text-warning",
  },
  INCORRECT: {
    icon: XCircle,
    label: strings.voice.verdictIncorrect,
    emoji: "❌",
    classes: "border-destructive bg-destructive/10 text-destructive",
  },
} as const;

export function VoiceAnswerRecorder({
  acceptedAnswers,
  requiredAnswerCount = 1,
  className,
}: {
  /** Every officially accepted answer text for this question. */
  acceptedAnswers: string[];
  /** How many distinct answers the question asks for (e.g. "name two…"). Defaults to 1. */
  requiredAnswerCount?: number;
  className?: string;
}) {
  const { isSupported, status, transcript, interimTranscript, error, start, reset } = useSpeechRecognition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  // Recognition just finished with something captured — run the (fast,
  // fully local) evaluation after a brief, deliberate beat so "listening"
  // doesn't jump straight to a verdict with no transition at all.
  useEffect(() => {
    if (status !== "done") return;
    if (!transcript.trim()) return; // nothing captured — let the person just try again

    // This must be set synchronously: it drives the visible "processing"
    // state for the duration of the delay below. Deferring it into the
    // timeout would mean nothing renders during the beat it exists to fill.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsProcessing(true);
    const timeout = setTimeout(() => {
      setResult(evaluateAnswer(transcript, acceptedAnswers, requiredAnswerCount));
      setIsProcessing(false);
    }, PROCESSING_DELAY_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleStart() {
    setResult(null);
    setIsProcessing(false);
    start();
  }

  function handleRetry() {
    reset();
    setResult(null);
    setIsProcessing(false);
  }

  if (!isSupported) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border-2 border-dashed border-border p-3 text-sm text-muted-foreground",
          className
        )}
      >
        <MicOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        {strings.voice.interviewUnsupported}
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border-2 border-border bg-card p-4", className)}>
      {status === "idle" && !isProcessing && (
        <button
          type="button"
          onClick={handleStart}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-primary-dark bg-primary px-4 py-3 font-heading font-bold text-primary-foreground transition-transform active:translate-y-0.5 active:border-b-2"
        >
          <Mic className="h-5 w-5" aria-hidden="true" />
          {strings.voice.speakAnswer}
        </button>
      )}

      {status === "listening" && (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <ListeningIndicator />
          <p className="text-sm font-semibold text-foreground">{strings.voice.listening}</p>
          {interimTranscript && (
            <p className="text-sm italic text-muted-foreground">&ldquo;{interimTranscript}&rdquo;</p>
          )}
          <p className="text-xs text-muted-foreground">{strings.voice.autoStopHint}</p>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-muted-foreground">
          <Square className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          {strings.voice.evaluating}
        </div>
      )}

      {!isProcessing && status === "error" && error && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border px-4 py-2 text-sm font-bold text-foreground hover:border-primary/40"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {strings.voice.tryAgain}
          </button>
        </div>
      )}

      {!isProcessing && status === "done" && !transcript.trim() && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">{strings.voice.didntCatchThat}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border px-4 py-2 text-sm font-bold text-foreground hover:border-primary/40"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {strings.voice.tryAgain}
          </button>
        </div>
      )}

      {!isProcessing && result && (
        <div className="space-y-3">
          <div className={cn("flex items-center gap-2 rounded-2xl border-2 p-3 font-bold", VERDICT_CONFIG[result.verdict].classes)}>
            {(() => {
              const Icon = VERDICT_CONFIG[result.verdict].icon;
              return <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />;
            })()}
            {VERDICT_CONFIG[result.verdict].emoji} {VERDICT_CONFIG[result.verdict].label}
            {requiredAnswerCount > 1 && (
              <span className="ml-auto text-xs font-semibold opacity-80">
                {strings.voice.namedCount(result.matchedCount, requiredAnswerCount)}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {strings.voice.youSaid} <span className="text-foreground">&ldquo;{transcript}&rdquo;</span>
          </p>

          <div className="rounded-2xl bg-primary/10 p-3 text-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {acceptedAnswers.length > 1 ? strings.voice.officialAnswersPlural : strings.voice.officialAnswerSingular}
            </p>
            <p className="mt-1 font-semibold text-foreground">{acceptedAnswers.join(" · ")}</p>
          </div>

          <button
            type="button"
            onClick={handleRetry}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border px-4 py-2 text-sm font-bold text-foreground hover:border-primary/40"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {strings.voice.tryAgain}
          </button>
        </div>
      )}
    </div>
  );
}
