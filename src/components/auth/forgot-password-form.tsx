"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { CheckCircle2 } from "lucide-react";
import { strings } from "@/lib/i18n";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? strings.common.somethingWentWrong);
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError(strings.common.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
        <p className="font-semibold">{strings.auth.forgotPassword.checkEmailTitle}</p>
        <p className="text-sm text-muted-foreground">
          {strings.auth.forgotPassword.checkEmailPrefix} <strong>{email}</strong>
          {strings.auth.forgotPassword.checkEmailSuffix}
        </p>
        <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
          {strings.auth.forgotPassword.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <FormErrorBanner>{error}</FormErrorBanner>}

      <div className="space-y-2">
        <Label htmlFor="email">{strings.auth.forgotPassword.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={strings.auth.forgotPassword.emailPlaceholder}
        />
      </div>

      <Button type="submit" className="w-full" isLoading={loading}>
        {strings.auth.forgotPassword.submit}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {strings.auth.forgotPassword.rememberedPassword}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {strings.auth.forgotPassword.logInLink}
        </Link>
      </p>
    </form>
  );
}
