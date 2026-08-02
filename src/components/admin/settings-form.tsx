"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { strings } from "@/lib/i18n";

export function SettingsForm({
  initialSettings,
  testVersions,
  currentDefaultId,
}: {
  initialSettings: { siteName: string; logoUrl: string | null; voiceDefaultRate: number; maintenanceMode: boolean };
  testVersions: { id: string; name: string; isDefault: boolean }[];
  currentDefaultId: string | undefined;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [defaultVersionId, setDefaultVersionId] = useState(currentDefaultId ?? testVersions[0]?.id ?? "");
  const [isSaving, startSaving] = useTransition();
  const [isSavingVersion, startSavingVersion] = useTransition();

  function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    startSaving(async () => {
      try {
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        const data = await res.json();
        if (!res.ok) {
          show(data.error ?? strings.admin.settings.saveFailed, "error");
          return;
        }
        show(strings.admin.settings.saved, "success");
        router.refresh();
      } catch {
        show(strings.admin.settings.saveFailed, "error");
      }
    });
  }

  function saveDefaultVersion() {
    startSavingVersion(async () => {
      try {
        const res = await fetch("/api/admin/settings/default-test-version", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testVersionId: defaultVersionId }),
        });
        const data = await res.json();
        if (!res.ok) {
          show(data.error ?? strings.admin.settings.defaultVersionUpdateFailed, "error");
          return;
        }
        show(strings.admin.settings.defaultVersionUpdated, "success");
        router.refresh();
      } catch {
        show(strings.admin.settings.defaultVersionUpdateFailed, "error");
      }
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={saveSettings}>
        <Card>
          <CardHeader>
            <CardTitle>{strings.admin.settings.siteSettingsTitle}</CardTitle>
            <CardDescription>{strings.admin.settings.siteSettingsSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">{strings.admin.settings.siteName}</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => setSettings((s) => ({ ...s, siteName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">{strings.admin.settings.logoUrl}</Label>
              <Input
                id="logoUrl"
                type="url"
                value={settings.logoUrl ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, logoUrl: e.target.value }))}
                placeholder="https://…"
              />
              <p className="text-xs text-muted-foreground">{strings.admin.settings.logoUrlHint}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voiceDefaultRate">{strings.admin.settings.voiceDefaultSpeed}</Label>
              <select
                id="voiceDefaultRate"
                value={settings.voiceDefaultRate}
                onChange={(e) => setSettings((s) => ({ ...s, voiceDefaultRate: Number(e.target.value) }))}
                className="h-10 rounded-2xl border-2 border-border bg-card px-3 text-sm"
              >
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {strings.admin.settings.voiceDefaultHint}
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings((s) => ({ ...s, maintenanceMode: e.target.checked }))}
                className="h-4 w-4 rounded border-2 border-border accent-primary"
              />
              {strings.admin.settings.maintenanceMode}
            </label>
            {settings.maintenanceMode && (
              <div className="flex items-start gap-2 rounded-2xl bg-accent/15 p-3 text-sm text-accent-foreground dark:text-accent">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {strings.admin.settings.maintenanceModeHint}
              </div>
            )}

            <Button type="submit" isLoading={isSaving}>
              {strings.admin.settings.saveSettings}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{strings.admin.settings.defaultVersionTitle}</CardTitle>
          <CardDescription>{strings.admin.settings.defaultVersionSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <select
            value={defaultVersionId}
            onChange={(e) => setDefaultVersionId(e.target.value)}
            className="h-10 flex-1 rounded-2xl border-2 border-border bg-card px-3 text-sm"
          >
            {testVersions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.isDefault ? strings.admin.settings.currentDefault : ""}
              </option>
            ))}
          </select>
          <Button type="button" onClick={saveDefaultVersion} isLoading={isSavingVersion} disabled={defaultVersionId === currentDefaultId}>
            {strings.admin.settings.setAsDefault}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
