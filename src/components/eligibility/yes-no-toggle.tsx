"use client";

import { strings } from "@/lib/i18n";

/**
 * A compact inline Yes/No toggle used across multiple wizard steps
 * (Basis's marriage questions, Military's service questions, Selective
 * Service's registration question). Extracted here after starting to
 * duplicate it a second time in military-step.tsx — one shared
 * implementation instead of near-identical copies drifting apart.
 */
export function YesNoToggle({
  question,
  value,
  onChange,
}: {
  question: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-foreground">{question}</p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={
            value === true
              ? "rounded-xl border-2 border-primary bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary"
              : "rounded-xl border-2 border-border px-4 py-1.5 text-sm font-semibold text-muted-foreground"
          }
        >
          {strings.eligibility.basis.yes}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={
            value === false
              ? "rounded-xl border-2 border-primary bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary"
              : "rounded-xl border-2 border-border px-4 py-1.5 text-sm font-semibold text-muted-foreground"
          }
        >
          {strings.eligibility.basis.no}
        </button>
      </div>
    </div>
  );
}
