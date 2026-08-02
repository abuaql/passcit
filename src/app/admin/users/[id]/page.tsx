import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Target, Heart, Flame, Calendar } from "lucide-react";
import { getAdminUserDetail } from "@/lib/admin-users";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { UserRoleStatusControls } from "@/components/admin/user-role-status-controls";
import { auth } from "@/auth";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "User Detail" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, session] = await Promise.all([getAdminUserDetail(id), auth()]);

  if (!detail) notFound();
  const { user, progress, practiceTests } = detail;

  const accuracy =
    progress.totalCorrect + progress.totalIncorrect > 0
      ? Math.round((progress.totalCorrect / (progress.totalCorrect + progress.totalIncorrect)) * 100)
      : null;

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {strings.admin.userDetail.backToUsers}
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">{user.name ?? strings.admin.userDetail.unnamedUser}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={user.role === "ADMIN" ? "secondary" : "outline"}>{user.role}</Badge>
              <Badge variant={user.isActive ? "success" : "outline"}>{user.isActive ? strings.admin.usersList.enabled : strings.admin.usersList.disabled}</Badge>
              {user.activeTestVersion && <Badge variant="outline">{strings.admin.userDetail.studying(user.activeTestVersion.name)}</Badge>}
              <span className="text-xs text-muted-foreground">
                {strings.admin.userDetail.joined(user.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}
              </span>
            </div>
          </div>
          <UserRoleStatusControls userId={user.id} role={user.role} isActive={user.isActive} isSelf={user.id === session!.user.id} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Target} label={strings.admin.userDetail.questionsTouched} value={String(progress.questionsTouched)} />
        <StatTile icon={Target} label={strings.admin.userDetail.accuracy} value={accuracy !== null ? `${accuracy}%` : "—"} />
        <StatTile icon={Heart} label={strings.admin.userDetail.favorites} value={String(progress.favoritesCount)} />
        <StatTile icon={Flame} label="Streak" value={strings.admin.userDetail.streak(user.streak?.currentStreak ?? 0)} />
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <Calendar className="h-4 w-4 text-secondary" aria-hidden="true" />
            {strings.admin.userDetail.practiceHistory}
          </h2>
          {practiceTests.length === 0 ? (
            <EmptyState icon={Calendar} title={strings.admin.userDetail.noSessionsTitle} description={strings.admin.userDetail.noSessionsBody} />
          ) : (
            <div className="space-y-2">
              {practiceTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-border p-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t.mode.replace(/_/g, " ")}</Badge>
                    <span className="text-muted-foreground">{t.testVersion.name.replace(" Civics Test", "")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.completedAt ? (
                      <>
                        <span className="font-bold text-foreground">{t.score}/{t.totalQuestions}</span>
                        {t.passed !== null && (
                          <Badge variant={t.passed ? "success" : "outline"}>{t.passed ? strings.admin.userDetail.passed : strings.admin.userDetail.failed}</Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">{strings.admin.userDetail.notCompleted}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {t.startedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
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

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2.5 p-4">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="font-heading text-lg font-bold leading-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
