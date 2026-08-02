"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { CATEGORY_LABELS, CATEGORY_BADGE_VARIANT } from "@/lib/categories";
import { strings } from "@/lib/i18n";
import type { QuestionCategory } from "@/generated/prisma/client";

export interface AdminQuestionRow {
  id: string;
  number: number;
  category: QuestionCategory;
  subcategory: string;
  question: string;
  isActive: boolean;
  testVersion: { id: string; name: string };
  _count: { answers: number };
}

export function QuestionsTable({ questions }: { questions: AdminQuestionRow[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [pendingDelete, setPendingDelete] = useState<AdminQuestionRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function handleDuplicate(id: string) {
    setBusyId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/questions/${id}/duplicate`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          show(data.error ?? strings.admin.questionsList.duplicateFailed, "error");
          return;
        }
        show(strings.admin.questionsList.duplicateSuccess, "success");
        router.refresh();
      } catch {
        show(strings.admin.questionsList.duplicateFailed, "error");
      } finally {
        setBusyId(null);
      }
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setBusyId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          show(data.error ?? strings.admin.questionsList.deleteFailed, "error");
          return;
        }
        show(strings.admin.questionsList.deleteSuccess, "success");
        router.refresh();
      } catch {
        show(strings.admin.questionsList.deleteFailed, "error");
      } finally {
        setBusyId(null);
        setPendingDelete(null);
      }
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border-2 border-border">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-border bg-muted/50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{strings.admin.questionsList.colNumber}</th>
              <th className="px-4 py-3">{strings.admin.questionsList.colQuestion}</th>
              <th className="px-4 py-3">{strings.admin.questionsList.colVersion}</th>
              <th className="px-4 py-3">{strings.admin.questionsList.colCategory}</th>
              <th className="px-4 py-3">{strings.admin.questionsList.colAnswers}</th>
              <th className="px-4 py-3">{strings.admin.questionsList.colStatus}</th>
              <th className="px-4 py-3 text-right">{strings.admin.questionsList.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="border-b-2 border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-bold text-foreground">{q.number}</td>
                <td className="max-w-xs truncate px-4 py-3 text-foreground">{q.question}</td>
                <td className="px-4 py-3 text-muted-foreground">{q.testVersion.name.replace(" Civics Test", "")}</td>
                <td className="px-4 py-3">
                  <Badge variant={CATEGORY_BADGE_VARIANT[q.category]}>{CATEGORY_LABELS[q.category]}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{q._count.answers}</td>
                <td className="px-4 py-3">
                  {q.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" /> {strings.admin.questionsList.active}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> {strings.admin.questionsList.inactive}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/questions/${q.id}/edit`}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      aria-label={strings.admin.questionsList.editQuestion(q.number)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(q.id)}
                      disabled={isPending && busyId === q.id}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                      aria-label={strings.admin.questionsList.duplicateQuestion(q.number)}
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(q)}
                      disabled={isPending && busyId === q.id}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      aria-label={strings.admin.questionsList.deleteQuestion(q.number)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={strings.admin.questionsList.deleteConfirmTitle(pendingDelete?.number)}
        description={strings.admin.questionsList.deleteConfirmBody}
        confirmLabel={strings.admin.questionsList.deleteConfirmLabel}
        isLoading={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
