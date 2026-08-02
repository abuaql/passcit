import { CheckCircle2, XCircle, PartyPopper, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AudioButton } from "@/components/ui/audio-button";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/i18n";

export interface QuizResultAnswer {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export function QuizResults({
  score,
  totalQuestions,
  passed,
  stoppedEarly,
  answers,
  onRetry,
}: {
  score: number;
  totalQuestions: number;
  passed: boolean;
  stoppedEarly: boolean;
  answers: QuizResultAnswer[];
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card className={cn("border-2", passed ? "border-success" : "border-destructive")}>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          {passed ? (
            <PartyPopper className="h-10 w-10 text-success" aria-hidden="true" />
          ) : (
            <XCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
          )}
          <p className={cn("font-heading text-2xl font-bold", passed ? "text-success" : "text-destructive")}>
            {passed ? strings.practiceQuiz.passed : strings.practiceQuiz.notPassed}
          </p>
          <p className="text-muted-foreground">
            {strings.practiceQuiz.scoreOutOf(score, totalQuestions)}
            {stoppedEarly && strings.practiceQuiz.stoppedEarlyNote}
          </p>
          <Button onClick={onRetry} className="mt-2">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {strings.practiceQuiz.tryAgain}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-bold text-foreground">{strings.practiceQuiz.review}</h2>
        {answers.map((a, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-2xl border-2 p-4",
              a.isCorrect ? "border-border" : "border-destructive/40 bg-destructive/5"
            )}
          >
            {a.isCorrect ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-start gap-1.5">
                <p className="font-semibold text-foreground">{a.question}</p>
                <AudioButton
                  text={a.question}
                  id={`results-question-${i}`}
                  label="question"
                  size="sm"
                  className="shrink-0"
                />
              </div>
              <p className="text-sm text-muted-foreground">{strings.practiceQuiz.yourAnswer} {a.selectedAnswer}</p>
              {!a.isCorrect && (
                <div className="flex items-start gap-1.5">
                  <p className="text-sm font-medium text-success">{strings.practiceQuiz.correctAnswer} {a.correctAnswer}</p>
                  <AudioButton
                    text={a.correctAnswer}
                    id={`results-answer-${i}`}
                    label="correct answer"
                    size="sm"
                    className="shrink-0"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
