"use client";

import { Mic } from "lucide-react";

/**
 * The "start speaking" trigger used in Identity, Reading, and Civics.
 * Was four pixel-identical copies of the same className across three
 * files before this extraction — same visual result, but consistency was
 * coincidental rather than structural (a future tweak would need to be
 * applied in four places by hand, easy to miss one).
 */
export function VoiceStartButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-primary-dark bg-primary px-4 py-3 font-heading font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Mic className="h-5 w-5" aria-hidden="true" />
      {label}
    </button>
  );
}
