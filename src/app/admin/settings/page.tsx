import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/admin-settings";
import { getAllTestVersions } from "@/lib/questions";
import { SettingsForm } from "@/components/admin/settings-form";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const [settings, testVersions] = await Promise.all([getSiteSettings(), getAllTestVersions()]);
  const currentDefault = testVersions.find((v) => v.isDefault);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.admin.settings.title}</h1>
        <p className="text-muted-foreground">{strings.admin.settings.subtitle}</p>
      </div>
      <SettingsForm
        initialSettings={{
          siteName: settings.siteName,
          logoUrl: settings.logoUrl,
          voiceDefaultRate: settings.voiceDefaultRate,
          maintenanceMode: settings.maintenanceMode,
        }}
        testVersions={testVersions.map((v) => ({ id: v.id, name: v.name, isDefault: v.isDefault }))}
        currentDefaultId={currentDefault?.id}
      />
    </div>
  );
}
