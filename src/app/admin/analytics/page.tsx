import type { Metadata } from "next";
import { TrendingUp, Users, Target, AlertTriangle, Layers, BarChart3, ClipboardCheck, Award, Clock3 } from "lucide-react";
import {
  getDailyActiveUsers,
  getUserGrowth,
  getAverageScoresByMode,
  getTestVersionUsage,
  getCategoryPerformance,
  getInterviewOverview,
  getMostMissedInterviewQuestions,
  getMostDifficultInterviewCategories,
} from "@/lib/admin-analytics";
import { getMostMissedQuestions } from "@/lib/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart } from "@/components/admin/charts";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const [
    dau,
    growth,
    scoresByMode,
    versionUsage,
    categoryPerformance,
    missed,
    interviewOverview,
    missedInterviewQuestions,
    difficultInterviewCategories,
  ] = await Promise.all([
    getDailyActiveUsers(14),
    getUserGrowth(14),
    getAverageScoresByMode(),
    getTestVersionUsage(),
    getCategoryPerformance(),
    getMostMissedQuestions(8),
    getInterviewOverview(),
    getMostMissedInterviewQuestions(8),
    getMostDifficultInterviewCategories(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.admin.analytics.title}</h1>
        <p className="text-muted-foreground">{strings.admin.analytics.subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              {strings.admin.analytics.dailyActiveUsers}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={dau} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" aria-hidden="true" />
              {strings.admin.analytics.userGrowth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={growth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" aria-hidden="true" />
              {strings.admin.analytics.averageScoresByMode}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={scoresByMode} suffix="%" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-secondary" aria-hidden="true" />
              {strings.admin.analytics.testVersionUsage}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={versionUsage} suffix=" sessions" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
              {strings.admin.analytics.categoryPerformance}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={categoryPerformance.map((c) => ({ label: c.categoryLabel, value: c.accuracyPercent }))}
              suffix="%"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              {strings.admin.analytics.mostMissedQuestions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={missed.map((m) => ({ label: `#${m.number} ${m.question.slice(0, 40)}${m.question.length > 40 ? "…" : ""}`, value: m.missedCount }))}
              suffix=" missed"
            />
          </CardContent>
        </Card>
      </div>

      <h2 className="pt-2 font-heading text-xl font-bold text-foreground">
        {strings.admin.analytics.interviewSectionTitle}
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AnalyticsStatTile
          icon={ClipboardCheck}
          label={strings.admin.analytics.totalInterviews}
          value={String(interviewOverview.totalInterviews)}
        />
        <AnalyticsStatTile
          icon={Award}
          label={strings.admin.analytics.passRate}
          value={interviewOverview.passRate !== null ? `${interviewOverview.passRate}%` : "—"}
        />
        <AnalyticsStatTile
          icon={Target}
          label={strings.admin.analytics.averageScore}
          value={interviewOverview.averageScorePercent !== null ? `${interviewOverview.averageScorePercent}%` : "—"}
        />
        <AnalyticsStatTile
          icon={Clock3}
          label={strings.admin.analytics.averageDuration}
          value={
            interviewOverview.averageDurationSec !== null
              ? `${Math.floor(interviewOverview.averageDurationSec / 60)}m ${interviewOverview.averageDurationSec % 60}s`
              : "—"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              {strings.admin.analytics.mostMissedInterviewQuestions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={missedInterviewQuestions.map((m) => ({
                label: `#${m.number} ${m.question.slice(0, 40)}${m.question.length > 40 ? "…" : ""}`,
                value: m.missedCount,
              }))}
              suffix=" missed"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
              {strings.admin.analytics.mostDifficultCategories}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={difficultInterviewCategories.map((c) => ({ label: c.categoryLabel, value: c.accuracyPercent }))}
              suffix="%"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsStatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
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
