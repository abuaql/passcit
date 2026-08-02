"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SpeedControl } from "@/components/ui/speed-control";
import { MultipleChoiceQuestion } from "@/components/practice/multiple-choice-question";
import { QuizResults, type QuizResultAnswer } from "@/components/practice/quiz-results";
import { mockInterviewStatus } from "@/lib/quiz";
import { strings } from "@/lib/i18n";
import type { PreparedQuizQuestion } from "@/lib/quiz";

interface CollectedAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

export function QuizSession({
  testId,
  questions,
  /** Practice Mode reveals correct/incorrect after each answer; Mock Interview holds it until the end, like a real interview. */
  revealImmediately,
  /** Mock Interview stops as soon as pass/fail is mathematically decided. */
  useEarlyStop,
  /** How many correct answers this test version's interview requires to pass (6 for 2008, 12 for 2020). Only used when useEarlyStop is true. */
  passThreshold,
  /** How many questions this test version's interview asks (10 for 2008, 20 for 2020). Only used when useEarlyStop is true. */
  questionsAsked,
  restartHref,
}: {
  testId: string;
  questions: PreparedQuizQuestion[];
  revealImmediately: boolean;
  useEarlyStop: boolean;
  passThreshold?: number;
  questionsAsked?: number;
  restartHref: string;
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [collected, setCollected] = useState<CollectedAnswer[]>([]);
  const [phase, setPhase] = useState<"quiz" | "submitting" | "results" | "error">("quiz");
  const [result, setResult] = useState<{
    score: number;
    totalQuestions: number;
    passed: boolean;
    stoppedEarly: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex];
  const correctCount = collected.filter((a) => a.isCorrect).length;
  const incorrectCount = collected.length - correctCount;

  function handleSelect(optionId: string) {
    if (revealed) return;
    setSelectedOptionId(optionId);
  }

  async function submitSession(finalAnswers: CollectedAnswer[], stoppedEarly: boolean) {
    setPhase("submitting");
    try {
      const res = await fetch(`/api/practice-tests/${testId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers, stoppedEarly }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      const data = await res.json();
      setResult(data);
      setPhase("results");
    } catch {
      setErrorMessage(strings.practiceQuiz.submitFailed);
      setPhase("error");
    }
  }

  function handleConfirm() {
    if (!currentQuestion || !selectedOptionId) return;

    const option = currentQuestion.options.find((o) => o.id === selectedOptionId);
    if (!option) return;

    const answer: CollectedAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: option.text,
      isCorrect: option.isCorrect,
    };
    const nextCollected = [...collected, answer];
    setCollected(nextCollected);

    if (revealImmediately) {
      setRevealed(true);
      return; // wait for explicit "Next" click
    }

    advance(nextCollected);
  }

  function advance(nextCollected: CollectedAnswer[]) {
    const nextCorrect = nextCollected.filter((a) => a.isCorrect).length;
    const nextIncorrect = nextCollected.length - nextCorrect;

    if (useEarlyStop && passThreshold !== undefined && questionsAsked !== undefined) {
      const status = mockInterviewStatus(nextCorrect, nextIncorrect, passThreshold, questionsAsked);
      if (status.done) {
        submitSession(nextCollected, nextCollected.length < questions.length);
        return;
      }
    }

    const isLastQuestion = currentIndex >= questions.length - 1;
    if (isLastQuestion) {
      submitSession(nextCollected, false);
      return;
    }

    setCurrentIndex((i) => i + 1);
    setSelectedOptionId(null);
    setRevealed(false);
  }

  function handleNext() {
    advance(collected);
  }

  if (phase === "error") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-destructive">{errorMessage}</p>
        <Button onClick={() => submitSession(collected, collected.length < questions.length)}>
          {strings.practiceQuiz.tryAgainSubmit}
        </Button>
      </div>
    );
  }

  if (phase === "submitting") {
    return <p className="py-12 text-center text-muted-foreground">{strings.practiceQuiz.scoring}</p>;
  }

  if (phase === "results" && result) {
    const reviewAnswers: QuizResultAnswer[] = collected.map((a) => {
      const q = questions.find((question) => question.id === a.questionId);
      return {
        question: q?.question ?? "",
        selectedAnswer: a.selectedAnswer,
        correctAnswer: q?.options.find((o) => o.isCorrect)?.text ?? "",
        isCorrect: a.isCorrect,
      };
    });

    return (
      <QuizResults
        score={result.score}
        totalQuestions={result.totalQuestions}
        passed={result.passed}
        stoppedEarly={result.stoppedEarly}
        answers={reviewAnswers}
        onRetry={() => router.push(restartHref)}
      />
    );
  }

  if (!currentQuestion) {
    return <p className="py-12 text-center text-muted-foreground">{strings.practiceQuiz.noQuestions}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
          <span>
            {strings.practiceQuiz.questionProgress(currentIndex + 1, questions.length)}
          </span>
          {useEarlyStop && (
            <span>
              {strings.practiceQuiz.correctIncorrectCount(correctCount, incorrectCount)}
            </span>
          )}
        </div>
        <ProgressBar value={((currentIndex + (revealed ? 1 : 0)) / questions.length) * 100} />
      </div>

      <SpeedControl />

      <MultipleChoiceQuestion
        question={revealImmediately ? currentQuestion : { ...currentQuestion, explanation: null }}
        selectedOptionId={selectedOptionId}
        revealed={revealImmediately && revealed}
        onSelect={handleSelect}
      />

      <div className="flex justify-end">
        {revealImmediately && revealed ? (
          <Button onClick={handleNext}>
            {currentIndex >= questions.length - 1 ? strings.practiceQuiz.seeResults : strings.practiceQuiz.nextQuestion}
          </Button>
        ) : (
          <Button onClick={handleConfirm} disabled={!selectedOptionId}>
            {revealImmediately ? strings.practiceQuiz.checkAnswer : strings.practiceQuiz.submitAnswer}
          </Button>
        )}
      </div>
    </div>
  );
}
