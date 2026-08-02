import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-1 font-heading text-2xl font-bold text-foreground">{strings.auth.login.title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {strings.auth.login.subtitle}
      </p>
      <LoginForm />
    </div>
  );
}
