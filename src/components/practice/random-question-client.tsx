"use client";

import { useState } from "react";
import { Shuffle, Sparkles, MapPin, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/questions/favorite-button";
import { StudyStatusPicker } from "@/components/questions/study-status-picker";
import { CATEGORY_LABELS, CATEGORY_BADGE_VARIANT } from "@/lib/categories";
import { strings } from "@/lib/i18n";
import type { StudyStatus } from "@/generated/prisma/client";

interface RandomQuestion {
  id: string;
  number: number;
  category: keyof typeof CATEGORY_LABELS;
  question: string;
  explanation: string | null;
  isDynamicAnswer: boolean;
  dynamicNote: string | null;
  variesByLocation: boolean;
  answers: { id: string; text: string }[];
  progress?: { isFavorite: boolean; status: string }[];
}

export function RandomQuestionClient({ initialQuestion }: { initialQuestion: RandomQuestion }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function next() {
    setLoading(true);
    setRevealed(false);
    try {
      const res = await fetch(`/api/questions/random?exclude=${question.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setQuestion(data.question);
    } finally {
      setLoading(false);
    }
  }

  const progress = question.progress?.[0];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">{strings.randomQuestion.title}</h1>
          <p className="text-muted-foreground">{strings.randomQuestion.subtitle}</p>
        </div>
        <Shuffle className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <Badge variant={CATEGORY_BADGE_VARIANT[question.category]}>
              {CATEGORY_LABELS[question.category]}
            </Badge>
            <FavoriteButton questionId={question.id} initialFavorite={progress?.isFavorite ?? false} />
          </div>

          <h2 className="font-heading text-xl font-bold text-foreground">
            {question.number}. {question.question}
          </h2>

          {revealed ? (
            <div className="space-y-3">
              {question.variesByLocation ? (
                <div className="flex items-start gap-2 rounded-2xl bg-secondary/10 p-4 text-sm text-secondary">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {strings.randomQuestion.variesByLocation}
                </div>
              ) : (
                <ul className="space-y-2">
                  {question.answers.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start gap-2 rounded-2xl bg-primary/10 p-3 font-semibold text-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {a.text}
                    </li>
                  ))}
                </ul>
              )}
              {question.isDynamicAnswer && question.dynamicNote && (
                <div className="flex items-start gap-2 rounded-2xl bg-accent/15 p-3 text-sm text-accent-foreground dark:text-accent">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {question.dynamicNote}
                </div>
              )}
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setRevealed(true)}>
              {strings.randomQuestion.showAnswer}
            </Button>
          )}
        </CardContent>
      </Card>

      {revealed && (
        <StudyStatusPicker
          questionId={question.id}
          initialStatus={(progress?.status as StudyStatus) ?? "NEW"}
        />
      )}

      <Button className="w-full" size="lg" onClick={next} isLoading={loading}>
        {loading ? "" : strings.randomQuestion.showMeAnother}
      </Button>
    </div>
  );
}
