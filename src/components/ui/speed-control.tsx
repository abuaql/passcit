"use client";

import { Gauge } from "lucide-react";
import { useSpeech, PLAYBACK_RATES } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/i18n";

export function SpeedControl({ className }: { className?: string }) {
  const { rate, setRate, isSupported } = useSpeech();

  if (!isSupported) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-2 border-border bg-card p-1 pl-2.5",
        className
      )}
    >
      <Gauge className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="mr-0.5 text-xs font-semibold text-muted-foreground">{strings.voice.speedLabel}</span>
      {PLAYBACK_RATES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setRate(option)}
          aria-pressed={rate === option}
          className={cn(
            "rounded-full px-2 py-1 text-xs font-bold transition-colors",
            rate === option
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option}x
        </button>
      ))}
    </div>
  );
}
