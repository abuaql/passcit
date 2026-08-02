import type { Metadata } from "next";
import Link from "next/link";
import { History as HistoryIcon, CheckCircle2, XCircle, Clock } from "lucide-react";
import { auth } from "@/auth";
import { getInterviewHistory } from "@/lib/interview";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/i18n";
import { logger } from "@/lib/logger";

export const metadata: Metadata = { title: "Interview History" };

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default async function InterviewHistoryPage() {
  const session = await auth();

  let history: Awaited<ReturnType<typeof getInterviewHistory>> = [];
  let loadError = false;
  if (session?.user?.id) {
    try {
      history = await getInterviewHistory(session.user.id);
    } catch (error) {
      logger.error("page.interview.history", "Could not load interview history", error);
      loadError = true;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.interview.history.title}</h1>
        <p className="text-muted-foreground">{strings.interview.history.subtitle}</p>
      </div>

      {loadError ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {strings.interview.history.loadFailed}
        </p>
      ) : history.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title={strings.interview.history.noHistoryTitle}
          description={strings.interview.history.noHistoryBody}
          action={
            <Link href="/interview">
              <Button size="sm">{strings.interview.history.startOne}</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {history.map((interview) => (
            <Link key={interview.id} href={`/interview/history/${interview.id}`}>
              <Card className="transition-transform hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    {interview.passed ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">
                        {interview.testVersion.name.replace(" Civics Test", "")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {interview.completedAt?.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={interview.passed ? "success" : "outline"}>
                      {interview.passed ? strings.interview.history.passed : strings.interview.history.notPassed}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDuration(interview.durationSec)}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {interview.civicsCorrectCount}/{interview.civicsCorrectCount + interview.civicsIncorrectCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
