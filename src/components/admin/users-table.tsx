"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Shield, Ban, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { strings } from "@/lib/i18n";

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  _count: { practiceTests: number };
}

export function UsersTable({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [pendingDisable, setPendingDisable] = useState<AdminUserRow | null>(null);

  function patchUser(id: string, body: { role?: "USER" | "ADMIN"; isActive?: boolean }, successMessage: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          show(data.error ?? strings.admin.usersList.updateFailed, "error");
          return;
        }
        show(successMessage, "success");
        router.refresh();
      } catch {
        show(strings.admin.usersList.updateFailed, "error");
      }
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border-2 border-border">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-border bg-muted/50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{strings.admin.usersList.colName}</th>
              <th className="px-4 py-3">{strings.admin.usersList.colEmail}</th>
              <th className="px-4 py-3">{strings.admin.usersList.colRole}</th>
              <th className="px-4 py-3">{strings.admin.usersList.colStatus}</th>
              <th className="px-4 py-3">{strings.admin.usersList.colSessions}</th>
              <th className="px-4 py-3 text-right">{strings.admin.usersList.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b-2 border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="font-semibold text-foreground hover:text-primary">
                    {u.name ?? strings.admin.usersList.unnamed}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "ADMIN" ? "secondary" : "outline"}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="text-xs font-bold text-success">{strings.admin.usersList.enabled}</span>
                  ) : (
                    <span className="text-xs font-bold text-destructive">{strings.admin.usersList.disabled}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u._count.practiceTests}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {u.id === currentUserId ? (
                      <span className="text-xs text-muted-foreground">{strings.admin.usersList.you}</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            patchUser(
                              u.id,
                              { role: u.role === "ADMIN" ? "USER" : "ADMIN" },
                              u.role === "ADMIN" ? strings.admin.usersList.demoted : strings.admin.usersList.promoted
                            )
                          }
                          className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                          aria-label={u.role === "ADMIN" ? strings.admin.usersList.demote(u.email) : strings.admin.usersList.promote(u.email)}
                          title={u.role === "ADMIN" ? strings.admin.usersList.demoteTitle : strings.admin.usersList.promoteTitle}
                        >
                          {u.role === "ADMIN" ? <Shield className="h-4 w-4" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => (u.isActive ? setPendingDisable(u) : patchUser(u.id, { isActive: true }, strings.admin.usersList.enabledMsg))}
                          className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label={u.isActive ? strings.admin.usersList.disable(u.email) : strings.admin.usersList.enable(u.email)}
                          title={u.isActive ? strings.admin.usersList.disableTitle : strings.admin.usersList.enableTitle}
                        >
                          {u.isActive ? <Ban className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingDisable !== null}
        title={strings.admin.usersList.disableConfirmTitle(pendingDisable?.email)}
        description={strings.admin.usersList.disableConfirmBody}
        confirmLabel={strings.admin.usersList.disableConfirmLabel}
        isLoading={isPending}
        onConfirm={() => {
          if (pendingDisable) patchUser(pendingDisable.id, { isActive: false }, strings.admin.usersList.disabledMsg);
          setPendingDisable(null);
        }}
        onCancel={() => setPendingDisable(null)}
      />
    </>
  );
}
