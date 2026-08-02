"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/i18n";

export function FavoriteButton({
  questionId,
  initialFavorite,
  size = "default",
  className,
}: {
  questionId: string;
  initialFavorite: boolean;
  size?: "default" | "sm";
  className?: string;
}) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const next = !isFavorite;
    setIsFavorite(next); // optimistic

    startTransition(async () => {
      try {
        const res = await fetch(`/api/questions/${questionId}/favorite`, { method: "POST" });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        setIsFavorite(data.isFavorite);
      } catch {
        setIsFavorite(!next); // revert on failure
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? strings.questions.removeFromFavorites : strings.questions.addToFavorites}
      className={cn(
        "inline-flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-destructive/10 disabled:opacity-60",
        className
      )}
    >
      <Heart
        className={cn(
          size === "sm" ? "h-4 w-4" : "h-5 w-5",
          isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"
        )}
      />
    </button>
  );
}
