"use client";

import { RotateCw, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/categories";
import { AudioButton } from "@/components/ui/audio-button";
import { strings } from "@/lib/i18n";
import type { QuestionCategory } from "@/generated/prisma/client";

export interface FlashcardData {
  id: string;
  number: number;
  category: QuestionCategory;
  question: string;
  variesByLocation: boolean;
  requiredAnswerCount: number;
  answers: { id: string; text: string }[];
}

export function StudyFlashcard({
  card,
  flipped,
  onFlip,
}: {
  card: FlashcardData;
  flipped: boolean;
  onFlip: () => void;
}) {
  // A plain clickable div (not <button>) wraps the whole card, because it
  // needs to contain AudioButtons of its own — a <button> can never
  // validly contain another <button>. role="button" + onKeyDown restores
  // the same keyboard/screen-reader behavior a real button would have.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip();
        }
      }}
      aria-pressed={flipped}
      className="group mx-auto block w-full cursor-pointer [perspective:1400px]"
    >
      <div
        className={cn(
          "relative h-80 w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none sm:h-72",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-border bg-card p-8 text-center shadow-sm [backface-visibility:hidden]">
          <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-bold text-secondary">
            {strings.flashcards.categoryAndNumber(CATEGORY_LABELS[card.category], card.number)}
          </span>
          <div className="flex items-start gap-1.5">
            <p className="font-heading text-xl font-bold text-foreground sm:text-2xl">{card.question}</p>
            <AudioButton
              text={card.question}
              id={`flashcard-question-${card.id}`}
              label="question"
              className="mt-0.5 shrink-0 bg-card/80"
            />
          </div>
          <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            {strings.flashcards.tapToFlip}
          </span>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto rounded-3xl border-2 border-primary-dark bg-primary p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {card.variesByLocation ? (
            <>
              <MapPin className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
              <p className="font-heading text-lg font-bold text-primary-foreground">
                {strings.flashcards.variesByLocationTitle}
              </p>
              <p className="text-sm text-primary-foreground/80">{strings.flashcards.variesByLocationBody}</p>
            </>
          ) : (
            <ul className="space-y-1.5">
              {card.answers.map((a) => (
                <li key={a.id} className="flex items-center justify-center gap-1.5">
                  <span className="font-heading text-lg font-bold text-primary-foreground sm:text-xl">
                    {a.text}
                  </span>
                  <AudioButton
                    text={a.text}
                    id={`flashcard-answer-${a.id}`}
                    label="answer"
                    size="sm"
                    className="shrink-0 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
