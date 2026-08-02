import type { Metadata } from "next";
import {
  Users,
  UserCheck,
  UserPlus,
  FileQuestion,
  Layers,
  Mic2,
  Target,
  AlertTriangle,
  Flame,
  Clock,
} from "lucide-react";
import {
  getDashboardOverview,
  getMostMissedQuestions,
  getMostPopularCategories,
  getRecentActivity,
} from "@/lib/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Admin Dashboard" };

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="font-heading text-xl font-bold leading-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export default async function AdminDashboardPage() {
  const [overview, missed, popular, activity] = await Promise.all([
    getDashboardOverview(),
    getMostMissedQuestions(8),
    getMostPopularCategories(),
    getRecentActivity(10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.admin.dashboard.title}</h1>
        <p className="text-muted-foreground">{strings.admin.dashboard.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label={strings.admin.dashboard.totalUsers} value={String(overview.totalUsers)} />
        <StatCard icon={UserCheck} label={strings.admin.dashboard.activeUsers} value={String(overview.activeUsers)} />
        <StatCard icon={UserPlus} label={strings.admin.dashboard.newUsers} value={String(overview.newUsers7d)} />
        <StatCard icon={FileQuestion} label={strings.admin.dashboard.totalQuestions} value={String(overview.totalQuestions)} />
        <StatCard icon={Layers} label={strings.admin.dashboard.practiceSessions} value={String(overview.practiceSessions)} />
        <StatCard icon={Mic2} label={strings.admin.dashboard.mockExamsCompleted} value={String(overview.mockExamsCompleted)} />
        <StatCard
          icon={Target}
          label={strings.admin.dashboard.averageScore}
          value={overview.averageScorePercent !== null ? `${overview.averageScorePercent}%` : "—"}
        />
        <StatCard
          icon={FileQuestion}
          label={strings.admin.dashboard.questionsByVersion}
          value={overview.questionsByVersion.map((v) => `${v.versionName.replace(" Civics Test", "")}: ${v.count}`).join(" · ")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              {strings.admin.dashboard.mostMissedQuestions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missed.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title={strings.admin.dashboard.noDataYet}
                description={strings.admin.dashboard.missedDataEmpty}
              />
            ) : (
              <ul className="space-y-2">
                {missed.map((m) => (
                  <li key={m.questionId} className="flex items-center justify-between gap-2 rounded-xl border-2 border-border p-2.5 text-sm">
                    <span className="truncate">
                      <span className="font-bold text-foreground">#{m.number}</span>{" "}
                      <span className="text-muted-foreground">{m.question}</span>
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {strings.admin.dashboard.missedCount(m.missedCount, m.attemptCount)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" aria-hidden="true" />
              {strings.admin.dashboard.mostPopularCategories}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popular.length === 0 ? (
              <EmptyState
                icon={Flame}
                title={strings.admin.dashboard.noDataYet}
                description={strings.admin.dashboard.popularDataEmpty}
              />
            ) : (
              <ul className="space-y-2">
                {popular.map((p) => (
                  <li key={p.category} className="flex items-center justify-between gap-2 rounded-xl border-2 border-border p-2.5 text-sm">
                    <span className="font-semibold text-foreground">{p.categoryLabel}</span>
                    <Badge variant="outline">{strings.admin.dashboard.answersCount(p.attemptCount)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-secondary" aria-hidden="true" />
            {strings.admin.dashboard.recentActivity}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState icon={Clock} title={strings.admin.dashboard.noActivityYet} description={strings.admin.dashboard.activityEmpty} />
          ) : (
            <div className="space-y-2">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-border p-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{a.userName}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.userEmail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{a.mode.replace(/_/g, " ")}</Badge>
                    <span className="text-xs font-bold text-foreground">
                      {a.score}/{a.totalQuestions}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatRelative(a.completedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
