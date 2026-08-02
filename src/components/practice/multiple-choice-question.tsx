"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/categories";
import { AudioButton } from "@/components/ui/audio-button";
import { VoiceAnswerRecorder } from "@/components/ui/voice-answer-recorder";
import { strings } from "@/lib/i18n";
import type { PreparedQuizQuestion } from "@/lib/quiz";
import type { QuestionCategory } from "@/generated/prisma/client";

export function MultipleChoiceQuestion({
  question,
  selectedOptionId,
  revealed,
  onSelect,
}: {
  question: PreparedQuizQuestion;
  selectedOptionId: string | null;
  revealed: boolean;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {strings.flashcards.categoryAndNumber(CATEGORY_LABELS[question.category as QuestionCategory], question.number)}
        </p>
        <div className="mt-1 flex items-start gap-1.5">
          <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
            {question.question}
          </h2>
          <AudioButton
            text={question.question}
            id={`quiz-question-${question.id}`}
            label="question"
            className="mt-0.5 shrink-0"
          />
        </div>
      </div>

      <div className="grid gap-3">
        {question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const showAsCorrect = revealed && option.isCorrect;
          const showAsWrong = revealed && isSelected && !option.isCorrect;

          // A plain clickable div, not <button> — every option carries its
          // own AudioButton (uniformly, whether correct or a distractor,
          // so the presence of a speaker icon never hints at the answer),
          // and a <button> can never validly contain another <button>.
          return (
            <div
              key={option.id}
              role="button"
              tabIndex={revealed ? -1 : 0}
              aria-disabled={revealed}
              aria-pressed={isSelected}
              onClick={() => {
                if (!revealed) onSelect(option.id);
              }}
              onKeyDown={(e) => {
                if (revealed) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(option.id);
                }
              }}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 font-semibold transition-colors",
                revealed ? "cursor-default" : "cursor-pointer",
                showAsCorrect && "border-success bg-success/10 text-success",
                showAsWrong && "border-destructive bg-destructive/10 text-destructive",
                !revealed && isSelected && "border-primary bg-primary/10 text-primary",
                !revealed && !isSelected && "border-border text-foreground hover:border-primary/40"
              )}
            >
              <span className="text-left">{option.text}</span>
              <span className="flex shrink-0 items-center gap-1">
                <AudioButton
                  text={option.text}
                  id={`quiz-option-${question.id}-${option.id}`}
                  label="answer option"
                  size="sm"
                />
                {showAsCorrect && <Check className="h-5 w-5" aria-hidden="true" />}
                {showAsWrong && <X className="h-5 w-5" aria-hidden="true" />}
              </span>
            </div>
          );
        })}
      </div>

      {revealed && question.explanation && (
        <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          {question.explanation}
        </p>
      )}

      <div className="space-y-2 border-t-2 border-border pt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {strings.practiceQuiz.orAnswerOutLoud}
        </p>
        <VoiceAnswerRecorder key={question.id} acceptedAnswers={question.acceptedAnswers} />
      </div>
    </div>
  );
}
