"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { strings } from "@/lib/i18n";

export function UpdateNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? strings.common.somethingWentWrong });
      return;
    }

    setMessage({ type: "success", text: strings.profile.nameUpdated });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.profile.updateNameTitle}</CardTitle>
        <CardDescription>{strings.profile.updateNameSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <FormErrorBanner variant={message.type}>{message.text}</FormErrorBanner>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{strings.profile.nameLabel}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <Button type="submit" isLoading={loading}>
            {strings.profile.saveChanges}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  if (!hasPassword) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{strings.profile.googleAccountTitle}</CardTitle>
          <CardDescription>
            {strings.profile.googleAccountBody}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? strings.common.somethingWentWrong });
      return;
    }

    setMessage({ type: "success", text: strings.profile.passwordUpdated });
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.profile.changePasswordTitle}</CardTitle>
        <CardDescription>{strings.profile.changePasswordSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <FormErrorBanner variant={message.type}>{message.text}</FormErrorBanner>
          )}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{strings.profile.currentPasswordLabel}</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{strings.profile.newPasswordLabel}</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" isLoading={loading}>
            {strings.profile.updatePassword}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
