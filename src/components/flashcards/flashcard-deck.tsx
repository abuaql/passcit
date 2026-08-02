"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, RotateCcw, Shuffle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/questions/favorite-button";
import { StudyFlashcard, type FlashcardData } from "@/components/flashcards/study-flashcard";
import { SpeedControl } from "@/components/ui/speed-control";
import { VoiceAnswerRecorder } from "@/components/ui/voice-answer-recorder";
import { EmptyState } from "@/components/ui/empty-state";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/i18n";
import type { QuestionCategory } from "@/generated/prisma/client";

interface DeckQuestion extends FlashcardData {
  isFavorite: boolean;
  status: string;
}

type Filter = "all" | "favorites" | "needs_practice";

export function FlashcardDeck({ questions }: { questions: DeckQuestion[] }) {
  const [category, setCategory] = useState<QuestionCategory | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [favorites] = useState(() => new Set(questions.filter((q) => q.isFavorite).map((q) => q.id)));

  const deck = useMemo(() => {
    return questions.filter((q) => {
      if (category && q.category !== category) return false;
      if (filter === "favorites" && !favorites.has(q.id)) return false;
      if (filter === "needs_practice" && q.status !== "NEEDS_PRACTICE") return false;
      return true;
    });
  }, [questions, category, filter, favorites]);

  const current = deck[Math.min(index, deck.length - 1)];

  function changeFilters(next: { category?: QuestionCategory | null; filter?: Filter }) {
    if (next.category !== undefined) setCategory(next.category);
    if (next.filter !== undefined) setFilter(next.filter);
    setIndex(0);
    setFlipped(false);
  }

  function goTo(newIndex: number) {
    setIndex(Math.max(0, Math.min(deck.length - 1, newIndex)));
    setFlipped(false);
  }

  async function mark(status: "KNOWN" | "NEEDS_PRACTICE") {
    if (!current) return;
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: current.id, status }),
      });
    } catch {
      // Non-critical — the person can keep studying even if this write failed.
    }
    goTo(index + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.flashcards.title}</h1>
        <p className="text-muted-foreground">{strings.flashcards.subtitle}</p>
      </div>

      <SpeedControl />

      <div className="flex flex-wrap gap-2">
        <FilterPill active={filter === "all"} onClick={() => changeFilters({ filter: "all" })} label={strings.flashcards.filterAll} />
        <FilterPill
          active={filter === "favorites"}
          onClick={() => changeFilters({ filter: "favorites" })}
          label={strings.flashcards.filterFavorites}
        />
        <FilterPill
          active={filter === "needs_practice"}
          onClick={() => changeFilters({ filter: "needs_practice" })}
          label={strings.flashcards.filterNeedsPractice}
        />
        <span className="mx-1 w-px self-stretch bg-border" />
        <FilterPill active={category === null} onClick={() => changeFilters({ category: null })} label={strings.flashcards.filterAnyCategory} />
        {CATEGORY_OPTIONS.map((opt) => (
          <FilterPill
            key={opt.value}
            active={category === opt.value}
            onClick={() => changeFilters({ category: opt.value })}
            label={opt.label}
          />
        ))}
      </div>

      {deck.length === 0 || !current ? (
        <EmptyState
          icon={Layers}
          title={strings.flashcards.noCardsTitle}
          description={strings.flashcards.noCardsBody}
        />
      ) : (
        <div className="mx-auto max-w-xl space-y-4">
          <p className="text-center text-sm font-semibold text-muted-foreground">
            {strings.flashcards.cardProgress(index + 1, deck.length)}
          </p>

          <StudyFlashcard card={current} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />

          {!current.variesByLocation && (
            <VoiceAnswerRecorder
              key={current.id}
              acceptedAnswers={current.answers.map((a) => a.text)}
              requiredAnswerCount={current.requiredAnswerCount}
            />
          )}

          <div className="flex items-center justify-center gap-2">
            <FavoriteButton
              questionId={current.id}
              initialFavorite={favorites.has(current.id)}
              className="border-2 border-border"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="icon" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Button>

            <div className="flex flex-1 justify-center gap-2">
              <Button variant="outline" onClick={() => mark("NEEDS_PRACTICE")}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {strings.questions.needsPractice}
              </Button>
              <Button onClick={() => mark("KNOWN")}>
                <Check className="h-4 w-4" aria-hidden="true" />
                {strings.questions.iKnowIt}
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => goTo(index + 1)}
              disabled={index === deck.length - 1}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          <button
            type="button"
            onClick={() => goTo(Math.floor(Math.random() * deck.length))}
            className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
            {strings.flashcards.jumpToRandom}
          </button>
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
