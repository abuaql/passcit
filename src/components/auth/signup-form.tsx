"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { Label } from "@/components/ui/label";
import { strings } from "@/lib/i18n";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? strings.common.somethingWentWrong);
        setLoading(false);
        return;
      }

      // Auto sign-in right after successful registration.
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);

      if (signInRes?.error) {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(strings.common.somethingWentWrong);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <FormErrorBanner>{error}</FormErrorBanner>}

      <div className="space-y-2">
        <Label htmlFor="name">{strings.auth.signup.nameLabel}</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={strings.auth.signup.namePlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{strings.auth.signup.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={strings.auth.signup.emailPlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{strings.auth.signup.passwordLabel}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={strings.auth.signup.passwordPlaceholder}
        />
        <p className="text-xs text-muted-foreground">
          {strings.auth.signup.passwordHint}
        </p>
      </div>

      <Button type="submit" className="w-full" isLoading={loading}>
        {strings.auth.signup.submit}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {strings.auth.signup.alreadyHaveAccount}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {strings.auth.signup.logInLink}
        </Link>
      </p>
    </form>
  );
}
