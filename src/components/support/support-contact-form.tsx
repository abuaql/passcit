"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { SUPPORT_CATEGORIES } from "@/lib/validations/support";
import { strings } from "@/lib/i18n";

/**
 * The one interactive piece of the support page. It asks for the details
 * that make a report diagnosable (device, iOS version, app version) and
 * deliberately asks for no credential of any kind — see the notice
 * rendered above it on the page.
 */
export function SupportContactForm() {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0]);
  const [deviceInfo, setDeviceInfo] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category, deviceInfo, appVersion, message }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? strings.common.somethingWentWrong);
        return;
      }

      setSent(true);
    } catch {
      setError(strings.common.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-border bg-card p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
        <p className="font-heading font-bold text-foreground">Message sent</p>
        <p className="text-sm text-muted-foreground">
          Thanks for writing in. A reply will come to <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <FormErrorBanner>{error}</FormErrorBanner>}

      <div className="space-y-2">
        <Label htmlFor="support-email">Your email</Label>
        <Input
          id="support-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <p className="text-xs text-muted-foreground">Used only to reply to you about this message.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-category">What is this about?</Label>
        <select
          id="support-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex h-12 w-full rounded-2xl border-2 border-border bg-background px-4 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {SUPPORT_CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="support-device">Device and iOS version</Label>
          <Input
            id="support-device"
            value={deviceInfo}
            onChange={(e) => setDeviceInfo(e.target.value)}
            placeholder="iPhone 14 Pro, iOS 18.4"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-version">Passcit app version</Label>
          <Input
            id="support-version"
            value={appVersion}
            onChange={(e) => setAppVersion(e.target.value)}
            placeholder="1.0.0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-message">What happened?</Label>
        <textarea
          id="support-message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What you were doing, what you expected, and what happened instead."
          className="flex w-full rounded-2xl border-2 border-border bg-background p-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto" isLoading={loading}>
        Send message
      </Button>
    </form>
  );
}
