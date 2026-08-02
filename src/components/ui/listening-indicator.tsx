import { Mic } from "lucide-react";

/**
 * The pulsing "actively listening" mic indicator. Consolidates what had
 * become four separate copies across VoiceAnswerRecorder and three
 * interview steps (Civics, Reading, Identity) — three of which had lost
 * the pulsing-ring animation the original had, since they were built in
 * separate sessions without it in view. This brings all callers back to
 * the same, more polished version rather than just deduplicating
 * whichever copy happened to be simplest.
 */
export function ListeningIndicator() {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/40" />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
        <Mic className="h-6 w-6" aria-hidden="true" />
      </span>
    </div>
  );
}
