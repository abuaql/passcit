"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { Label } from "@/components/ui/label";
import { strings } from "@/lib/i18n";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", { email, password, redirect: false });

    setLoading(false);

    if (res?.error) {
      setError(strings.auth.login.incorrectCredentials);
      return;
    }

    router.push(searchParams.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <FormErrorBanner>{error}</FormErrorBanner>}

      <div className="space-y-2">
        <Label htmlFor="email">{strings.auth.login.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={strings.auth.login.emailPlaceholder}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{strings.auth.login.passwordLabel}</Label>
          <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
            {strings.auth.login.forgotPassword}
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={strings.auth.login.passwordPlaceholder}
        />
      </div>

      <Button type="submit" className="w-full" isLoading={loading}>
        {strings.auth.login.submit}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {strings.auth.login.noAccount}{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          {strings.auth.login.signUpLink}
        </Link>
      </p>
    </form>
  );
}

// useSearchParams requires a Suspense boundary in the App Router.
export function LoginForm() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <LoginFormInner />
    </Suspense>
  );
}
