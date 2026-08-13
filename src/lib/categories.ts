import type { QuestionCategory } from "@/generated/prisma/client";

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  AMERICAN_GOVERNMENT: "American Government",
  AMERICAN_HISTORY: "American History",
  INTEGRATED_CIVICS: "Integrated Civics",
  SYMBOLS_AND_HOLIDAYS: "Symbols and Holidays",
};

export const CATEGORY_BADGE_VARIANT: Record<QuestionCategory, "default" | "secondary" | "warning"> = {
  AMERICAN_GOVERNMENT: "default",
  AMERICAN_HISTORY: "secondary",
  INTEGRATED_CIVICS: "warning",
  SYMBOLS_AND_HOLIDAYS: "warning",
};

export const CATEGORY_OPTIONS: { value: QuestionCategory; label: string }[] = (
  Object.keys(CATEGORY_LABELS) as QuestionCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));
