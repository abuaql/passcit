"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { strings } from "@/lib/i18n";

export interface AdminTagRow {
  id: string;
  name: string;
  slug: string;
  _count: { questions: number };
}

export function CategoryManager({ tags }: { tags: AdminTagRow[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminTagRow | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          show(data.error ?? strings.admin.categories.createFailed, "error");
          return;
        }
        show(strings.admin.categories.created, "success");
        setNewName("");
        router.refresh();
      } catch {
        show(strings.admin.categories.createFailed, "error");
      }
    });
  }

  function startEdit(tag: AdminTagRow) {
    setEditingId(tag.id);
    setEditingName(tag.name);
  }

  function saveEdit(id: string) {
    if (!editingName.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/categories/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editingName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          show(data.error ?? strings.admin.categories.updateFailed, "error");
          return;
        }
        show(strings.admin.categories.updated, "success");
        setEditingId(null);
        router.refresh();
      } catch {
        show(strings.admin.categories.updateFailed, "error");
      }
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/categories/${pendingDelete.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          show(data.error ?? strings.admin.categories.deleteFailed, "error");
          return;
        }
        show(strings.admin.categories.deleted, "success");
        router.refresh();
      } catch {
        show(strings.admin.categories.deleteFailed, "error");
      } finally {
        setPendingDelete(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={strings.admin.categories.newNamePlaceholder}
          className="max-w-sm"
        />
        <Button type="submit" isLoading={isPending} disabled={!newName.trim()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {strings.admin.categories.addCategory}
        </Button>
      </form>

      {tags.length === 0 ? (
        <EmptyState icon={Tags} title={strings.admin.categories.noCategoriesTitle} description={strings.admin.categories.noCategoriesBody} />
      ) : (
        <div className="overflow-hidden rounded-2xl border-2 border-border">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between gap-3 border-b-2 border-border p-3 last:border-0">
              {editingId === tag.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    className="max-w-xs"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(tag.id)}
                    className="rounded-full p-1.5 text-success hover:bg-success/10"
                    aria-label={strings.admin.categories.save}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label={strings.admin.categories.cancel}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{tag.name}</span>
                    <Badge variant="outline">{strings.admin.categories.questionCount(tag._count.questions)}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(tag)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      aria-label={strings.admin.categories.editTag(tag.name)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(tag)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={strings.admin.categories.deleteTag(tag.name)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={strings.admin.categories.deleteConfirmTitle(pendingDelete?.name)}
        description={strings.admin.categories.deleteConfirmBody(pendingDelete?._count.questions ?? 0)}
        isLoading={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
