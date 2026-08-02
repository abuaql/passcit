"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Shield, Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { strings } from "@/lib/i18n";

export function UserRoleStatusControls({
  userId,
  role,
  isActive,
  isSelf,
}: {
  userId: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmingDisable, setConfirmingDisable] = useState(false);

  if (isSelf) {
    return <p className="text-sm text-muted-foreground">{strings.admin.userDetail.ownAccountNote}</p>;
  }

  function patch(body: { role?: "USER" | "ADMIN"; isActive?: boolean }, successMessage: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
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
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={isPending}
          onClick={() => patch({ role: role === "ADMIN" ? "USER" : "ADMIN" }, role === "ADMIN" ? strings.admin.usersList.demoted : strings.admin.usersList.promoted)}
        >
          {role === "ADMIN" ? <Shield className="h-4 w-4" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          {role === "ADMIN" ? strings.admin.usersList.demoteTitle : strings.admin.usersList.promoteTitle}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={isPending}
          onClick={() => (isActive ? setConfirmingDisable(true) : patch({ isActive: true }, strings.admin.usersList.enabledMsg))}
        >
          {isActive ? <Ban className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          {isActive ? strings.admin.usersList.disableTitle : strings.admin.usersList.enableTitle}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingDisable}
        title={strings.admin.userDetail.disableConfirmTitleShort}
        description={strings.admin.userDetail.disableConfirmBodyShort}
        confirmLabel={strings.admin.usersList.disableConfirmLabel}
        isLoading={isPending}
        onConfirm={() => {
          patch({ isActive: false }, strings.admin.usersList.disabledMsg);
          setConfirmingDisable(false);
        }}
        onCancel={() => setConfirmingDisable(false)}
      />
    </>
  );
}
