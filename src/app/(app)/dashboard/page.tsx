import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Target, Heart, Clock, ArrowRight, Layers, Dumbbell } from "lucide-react";
import { auth } from "@/auth";
import { getDashboardStats } from "@/lib/progress";
import { getActiveTestVersion } from "@/lib/questions";
import { Card } from "@/components/ui/card";
import { TorchIcon } from "@/components/ui/torch-icon";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatRelativeDate } from "@/lib/utils";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Dashboard" };

const quickLinks = [
  { href: "/questions", icon: BookOpen, label: strings.dashboard.quickLinks.browseQuestions },
  { href: "/flashcards", icon: Layers, label: strings.dashboard.quickLinks.flashcards },
  { href: "/practice", icon: Dumbbell, label: strings.dashboard.quickLinks.practice },
];

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const testVersion = await getActiveTestVersion(session?.user?.id);
  const stats = session?.user?.id ? await getDashboardStats(session.user.id, testVersion.id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {strings.dashboard.welcome(firstName)}
          </h1>
          <p className="text-muted-foreground">
            {stats && stats.questionsCompleted > 0
              ? strings.dashboard.subtitleWithProgress
              : strings.dashboard.subtitleNoProgress}{" "}
            {strings.dashboard.currentlyStudyingPrefix}{" "}
            <span className="font-semibold text-foreground">{testVersion.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-4 py-2">
          <TorchIcon lit={(stats?.currentStreak ?? 0) > 0} className="h-7 w-7" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{strings.dashboard.studyStreak}</p>
            <p className="font-heading text-lg font-bold leading-none text-foreground">
              {stats?.currentStreak ?? 0} {stats?.currentStreak === 1 ? strings.dashboard.day : strings.dashboard.days}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Target}
          label={strings.dashboard.questionsCompleted}
          value={`${stats?.questionsCompleted ?? 0} / ${stats?.totalQuestions ?? 100}`}
        />
        <StatCard
          icon={BookOpen}
          label={strings.dashboard.accuracy}
          value={stats?.accuracyPercent !== null && stats?.accuracyPercent !== undefined ? `${stats.accuracyPercent}%` : "—"}
        />
        <StatCard icon={Heart} label={strings.dashboard.favorites} value={String(stats?.favoritesCount ?? 0)} />
        <StatCard
          icon={Clock}
          label={strings.dashboard.lastActivity}
          value={formatRelativeDate(stats?.lastActivity ?? null)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {quickLinks.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center justify-between gap-3 p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <span className="font-heading font-bold text-foreground">{label}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
