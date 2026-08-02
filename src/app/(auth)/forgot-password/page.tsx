import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="mb-1 font-heading text-2xl font-bold text-foreground">
        {strings.auth.forgotPassword.title}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {strings.auth.forgotPassword.subtitle}
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
