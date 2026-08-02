"use client";

import { useState, useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/i18n";
import type { StudyStatus } from "@/generated/prisma/client";

export function StudyStatusPicker({
  questionId,
  initialStatus,
}: {
  questionId: string;
  initialStatus: StudyStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function mark(next: StudyStatus) {
    setStatus(next); // optimistic
    startTransition(async () => {
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, status: next }),
        });
        if (!res.ok) throw new Error("Request failed");
      } catch {
        setStatus(initialStatus); // revert on failure
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{strings.questions.doYouKnowThisOne}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={status === "KNOWN" ? "default" : "outline"}
          isLoading={isPending && status === "KNOWN"}
          onClick={() => mark("KNOWN")}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {strings.questions.iKnowIt}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={status === "NEEDS_PRACTICE" ? "destructive" : "outline"}
          isLoading={isPending && status === "NEEDS_PRACTICE"}
          onClick={() => mark("NEEDS_PRACTICE")}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {strings.questions.needsPractice}
        </Button>
      </div>
    </div>
  );
}
