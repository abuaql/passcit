"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { strings } from "@/lib/i18n";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <FormErrorBanner>
        {strings.auth.resetPassword.missingTokenPrefix}{" "}
        <Link href="/forgot-password" className="underline">
          {strings.auth.resetPassword.forgotPasswordLink}
        </Link>{" "}
        {strings.auth.resetPassword.missingTokenSuffix}
      </FormErrorBanner>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(strings.auth.resetPassword.passwordsDontMatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? strings.common.somethingWentWrong);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError(strings.common.somethingWentWrong);
      setLoading(false);
    }
  }

  if (success) {
    return <FormErrorBanner variant="success">{strings.auth.resetPassword.success}</FormErrorBanner>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <FormErrorBanner>{error}</FormErrorBanner>}

      <div className="space-y-2">
        <Label htmlFor="password">{strings.auth.resetPassword.newPasswordLabel}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={strings.auth.resetPassword.newPasswordPlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{strings.auth.resetPassword.confirmPasswordLabel}</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={strings.auth.resetPassword.confirmPasswordPlaceholder}
        />
      </div>

      <Button type="submit" className="w-full" isLoading={loading}>
        {strings.auth.resetPassword.submit}
      </Button>
    </form>
  );
}
