import { prisma } from "@/lib/prisma";

const SINGLETON_ID = "singleton";

export async function getSiteSettings() {
  const existing = await prisma.siteSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (existing) return existing;
  // First-ever visit to the settings page — create the row with defaults.
  return prisma.siteSettings.create({ data: { id: SINGLETON_ID } });
}

export interface SiteSettingsInput {
  siteName: string;
  logoUrl: string | null;
  voiceDefaultRate: number;
  maintenanceMode: boolean;
}

export async function updateSiteSettings(input: SiteSettingsInput, updatedBy: string) {
  return prisma.siteSettings.upsert({
    where: { id: SINGLETON_ID },
    update: { ...input, updatedBy },
    create: { id: SINGLETON_ID, ...input, updatedBy },
  });
}

export async function setDefaultTestVersion(testVersionId: string) {
  await prisma.$transaction([
    prisma.testVersion.updateMany({ data: { isDefault: false }, where: { isDefault: true } }),
    prisma.testVersion.update({ where: { id: testVersionId }, data: { isDefault: true } }),
  ]);
}
