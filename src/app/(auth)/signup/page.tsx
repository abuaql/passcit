import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div>
      <h1 className="mb-1 font-heading text-2xl font-bold text-foreground">
        {strings.auth.signup.title}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {strings.auth.signup.subtitle}
      </p>
      <SignupForm />
    </div>
  );
}
