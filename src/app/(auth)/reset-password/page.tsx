import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="mb-1 font-heading text-2xl font-bold text-foreground">
        {strings.auth.resetPassword.title}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {strings.auth.resetPassword.subtitle}
      </p>
      <Suspense fallback={<div className="h-56" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
