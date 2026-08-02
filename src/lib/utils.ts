import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { strings } from "@/lib/i18n";

/** Merge Tailwind classes safely, resolving conflicts (later wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(date: Date | null): string {
  if (!date) return strings.dates.noActivityYet;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return strings.dates.today;
  if (diffDays === 1) return strings.dates.yesterday;
  if (diffDays > 1 && diffDays < 7) return strings.dates.daysAgo(diffDays);

  return target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Prisma's unique-constraint violation message shape isn't a typed error
 * class — this centralizes the string-matching check that was previously
 * duplicated across 4 admin API routes (categories create/update,
 * questions create/update), each re-implementing the same
 * `error instanceof Error && error.message.includes(...)` test with only
 * the resulting user-facing message differing.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Unique constraint");
}
