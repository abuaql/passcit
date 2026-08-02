import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, MapPin, CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { getQuestionById } from "@/lib/questions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/questions/favorite-button";
import { AudioButton } from "@/components/ui/audio-button";
import { SpeedControl } from "@/components/ui/speed-control";
import { VoiceAnswerRecorder } from "@/components/ui/voice-answer-recorder";
import { StudyStatusPicker } from "@/components/questions/study-status-picker";
import { CATEGORY_LABELS, CATEGORY_BADGE_VARIANT } from "@/lib/categories";
import { strings } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const question = await getQuestionById(id);
  return { title: question ? `Question ${question.number}` : "Question" };
}

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const question = await getQuestionById(id, session?.user?.id);

  if (!question) notFound();

  const progress = question.progress?.[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/questions"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {strings.questions.backToAllQuestions}
      </Link>

      <SpeedControl />

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={CATEGORY_BADGE_VARIANT[question.category]}>
                {CATEGORY_LABELS[question.category]}
              </Badge>
              <Badge variant="outline">{question.subcategory}</Badge>
              {question.isSpecial65_20 && <Badge variant="outline">{strings.questions.special6520List}</Badge>}
            </div>
            <FavoriteButton questionId={question.id} initialFavorite={progress?.isFavorite ?? false} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {strings.questions.questionNumber(question.number)}
              {question.requiredAnswerCount > 1 && strings.questions.nameCount(question.requiredAnswerCount)}
            </p>
            <div className="mt-1 flex items-start gap-1.5">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {question.question}
              </h1>
              <AudioButton
                text={question.question}
                id={`question-${question.id}`}
                label="question"
                className="mt-0.5 shrink-0"
              />
            </div>
          </div>

          {question.variesByLocation ? (
            <div className="flex items-start gap-2 rounded-2xl bg-secondary/10 p-4 text-sm text-secondary">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                {strings.questions.variesByLocationLong} {question.dynamicNote ?? strings.questions.variesByLocationDefault}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {question.answers.length > 1 ? strings.questions.acceptedAnswersPlural : strings.questions.acceptedAnswerSingular}
              </p>
              <ul className="space-y-2">
                {question.answers.map((answer) => (
                  <li
                    key={answer.id}
                    className="flex items-start justify-between gap-2 rounded-2xl bg-primary/10 p-3 font-semibold text-foreground"
                  >
                    <span className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {answer.text}
                    </span>
                    <AudioButton
                      text={answer.text}
                      id={`answer-${answer.id}`}
                      label="answer"
                      size="sm"
                      className="shrink-0"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {question.isDynamicAnswer && (
            <div className="flex items-start gap-2 rounded-2xl bg-accent/15 p-4 text-sm text-accent-foreground dark:text-accent">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{question.dynamicNote}</p>
            </div>
          )}

          {question.explanation && (
            <p className="border-t-2 border-border pt-4 text-sm text-muted-foreground">
              {question.explanation}
            </p>
          )}

          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t-2 border-border pt-4">
              {question.tags.map(({ tag }) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!question.variesByLocation && (
        <div className="space-y-2">
          <h2 className="font-heading text-lg font-bold text-foreground">{strings.questions.tryItOutLoud}</h2>
          <VoiceAnswerRecorder
            acceptedAnswers={question.answers.map((a) => a.text)}
            requiredAnswerCount={question.requiredAnswerCount}
          />
        </div>
      )}

      <StudyStatusPicker questionId={question.id} initialStatus={progress?.status ?? "NEW"} />
    </div>
  );
}
