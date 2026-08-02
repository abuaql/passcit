"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/i18n";

export function AudioButton({
  text,
  id,
  label = "text",
  size = "default",
  className,
}: {
  /** The exact text to speak. */
  text: string;
  /** Unique id for this piece of text — used to track which button (if any) is currently playing. */
  id: string;
  /** Used only in the accessible label, e.g. "question" or "answer" — not shown visually. */
  label?: string;
  size?: "default" | "sm";
  className?: string;
}) {
  const { speak, stop, isPlaying, isSupported } = useSpeech();
  const playing = isPlaying(id);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (!isSupported) {
    return (
      <span
        title={strings.voice.playbackUnsupportedTitle}
        aria-label={strings.voice.playbackUnsupportedLabel}
        className={cn("inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground/30", className)}
      >
        <VolumeX className={iconSize} aria-hidden="true" />
      </span>
    );
  }

  function handleClick(e: React.MouseEvent) {
    // AudioButton is often placed inside clickable cards/links (e.g. a
    // QuestionCard wrapped in <Link>) — this must never also trigger
    // navigation or a parent's own click handler.
    e.preventDefault();
    e.stopPropagation();
    if (playing) {
      stop();
    } else {
      speak(text, id);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={playing}
      aria-label={playing ? strings.voice.stopReadingAloud(label) : strings.voice.readAloud(label)}
      className={cn(
        "inline-flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-primary/10",
        playing ? "text-primary" : "text-muted-foreground",
        className
      )}
    >
      <Volume2 className={cn(iconSize, playing && "animate-pulse")} aria-hidden="true" />
    </button>
  );
}
