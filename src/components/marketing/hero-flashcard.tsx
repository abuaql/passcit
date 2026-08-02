"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeroFlashcard() {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label="Flip flashcard"
        className="group [perspective:1200px]"
      >
        <div
          className={cn(
            "relative h-64 w-72 transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none sm:h-72 sm:w-80",
            flipped && "[transform:rotateY(180deg)]"
          )}
        >
          {/* Front — question */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-border bg-card p-8 text-center shadow-md [backface-visibility:hidden]"
          >
            <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-bold text-secondary">
              Question 1 of 100
            </span>
            <p className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
              What is the supreme law of the land?
            </p>
            <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              Tap to flip
            </span>
          </div>

          {/* Back — answer */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-primary-dark bg-primary p-8 text-center shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold text-primary-foreground">
              Answer
            </span>
            <p className="font-heading text-3xl font-bold text-primary-foreground sm:text-4xl">
              The Constitution
            </p>
          </div>
        </div>
      </button>
      <p className="text-sm text-muted-foreground">
        That&apos;s a real question from the official USCIS test.
      </p>
    </div>
  );
}
