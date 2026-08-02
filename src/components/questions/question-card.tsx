import Link from "next/link";
import { Sparkles, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/questions/favorite-button";
import { AudioButton } from "@/components/ui/audio-button";
import { CATEGORY_LABELS, CATEGORY_BADGE_VARIANT } from "@/lib/categories";
import { strings } from "@/lib/i18n";
import type { QuestionCategory } from "@/generated/prisma/client";

export interface QuestionCardData {
  id: string;
  number: number;
  category: QuestionCategory;
  question: string;
  isSpecial65_20: boolean;
  isDynamicAnswer: boolean;
  variesByLocation: boolean;
  answers: { text: string }[];
  progress?: { isFavorite: boolean; status: string }[] | false;
}

export function QuestionCard({ data }: { data: QuestionCardData }) {
  const isFavorite = data.progress && data.progress[0]?.isFavorite === true;

  return (
    <Link href={`/questions/${data.id}`}>
      <Card className="flex h-full flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={CATEGORY_BADGE_VARIANT[data.category]}>
              {CATEGORY_LABELS[data.category]}
            </Badge>
            {data.isSpecial65_20 && (
              <Badge variant="outline" title={strings.questions.special6520Title}>
                {strings.questions.special6520Badge}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <AudioButton text={data.question} id={`question-${data.id}`} label="question" size="sm" />
            <FavoriteButton questionId={data.id} initialFavorite={isFavorite ?? false} size="sm" />
          </div>
        </div>

        <p className="line-clamp-3 flex-1 font-heading font-semibold text-foreground">
          {data.number}. {data.question}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {data.variesByLocation ? (
            <>
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {strings.questions.variesByLocationShort}
            </>
          ) : data.isDynamicAnswer ? (
            <>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {strings.questions.dynamicAnswerShort}
            </>
          ) : (
            <span className="truncate">{data.answers[0]?.text}</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
