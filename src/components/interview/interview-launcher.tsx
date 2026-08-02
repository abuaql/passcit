"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mic2, AlertTriangle, BookOpen, PenLine, Users, Clock, History, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { strings } from "@/lib/i18n";
import { InterviewSession, type StartedInterview } from "@/components/interview/interview-session";

export interface InterviewTestVersion {
  id: string;
  name: string;
  questionsAsked: number;
  passThreshold: number;
}

/**
 * A rough, honest estimate, not a precise calculation — meant to set
 * expectations before starting, the same way a real appointment notice
 * gives a ballpark rather than an exact minute count. Scales with the
 * civics question count, since that's what actually varies between test
 * versions and dominates total time (Identity/Reading/Writing are a
 * similar length regardless of which civics test is selected).
 */
function estimateDurationRange(questionsAsked: number): string {
  const low = 6 + Math.round(questionsAsked * 0.3);
  const high = 6 + Math.round(questionsAsked * 0.6);
  return `${low}–${high}`;
}

export function InterviewLauncher({
  testVersions,
  defaultTestVersionId,
}: {
  testVersions: InterviewTestVersion[];
  defaultTestVersionId: string;
}) {
  const [selectedVersionId, setSelectedVersionId] = useState(defaultTestVersionId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<StartedInterview | null>(null);
  // Briefly fades the launcher out before swapping to the live session,
  // rather than an instant hard cut — the interview should feel like it's
  // being entered, not like a page suddenly changed underneath you.
  const [entering, setEntering] = useState(false);

  const selectedVersion = testVersions.find((v) => v.id === selectedVersionId) ?? testVersions[0];

  async function begin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testVersionId: selectedVersionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? strings.interview.launcher.startFailed);
        setLoading(false);
        return;
      }
      setEntering(true);
      // Matches the 300ms duration on the fade below — the interview
      // itself has already been created server-side by this point, so
      // this delay is purely the visual transition, not a wait on data.
      window.setTimeout(() => setStarted(data as StartedInterview), 300);
    } catch {
      setError(strings.interview.launcher.startFailedRetry);
      setLoading(false);
    }
  }

  if (started) {
    return <EnteringInterview started={started} />;
  }

  return (
    <div
      className={`mx-auto max-w-2xl space-y-6 transition-opacity duration-300 ${entering ? "opacity-0" : "opacity-100"}`}
    >
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <Mic2 className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-3 font-heading text-3xl font-bold text-foreground">
          {strings.interview.launcher.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{strings.interview.launcher.subtitle}</p>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border-2 border-border bg-card p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-foreground">{strings.interview.launcher.realismNote}</p>
          <p className="text-muted-foreground">{strings.interview.launcher.confidenceNote}</p>
        </div>
      </div>

      {testVersions.length > 1 && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm font-semibold text-foreground" id="choose-version-label">
              {strings.interview.launcher.chooseVersion}
            </p>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby="choose-version-label">
              {testVersions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVersionId(v.id)}
                  role="radio"
                  aria-checked={v.id === selectedVersionId}
                  className={
                    v.id === selectedVersionId
                      ? "rounded-2xl border-2 border-primary bg-primary/10 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      : "rounded-2xl border-2 border-border p-4 text-left hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  }
                >
                  <p className="font-heading font-bold text-foreground">{v.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.questionsAsked} questions · {v.passThreshold} to pass
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {strings.interview.launcher.whatToExpectTitle}
            </p>
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {strings.interview.launcher.estimatedDuration(estimateDurationRange(selectedVersion?.questionsAsked ?? 10))}
            </span>
          </div>
          <ExpectRow icon={Users} text={strings.interview.launcher.expectIdentity} />
          <ExpectRow icon={BookOpen} text={strings.interview.launcher.expectReading} />
          <ExpectRow icon={PenLine} text={strings.interview.launcher.expectWriting} />
          <ExpectRow
            icon={Mic2}
            text={strings.interview.launcher.expectCivics(selectedVersion?.questionsAsked ?? 10)}
          />
          <div className="flex items-start gap-2 rounded-2xl bg-secondary/10 p-3 text-sm text-secondary">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {strings.interview.launcher.expectStop}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        {loading ? (
          <Spinner />
        ) : (
          <Button size="lg" onClick={begin}>
            {strings.interview.launcher.begin}
          </Button>
        )}
        <p className="text-center text-xs text-muted-foreground">{strings.interview.launcher.micNote}</p>
        <Link
          href="/interview/history"
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          <History className="h-4 w-4" aria-hidden="true" />
          {strings.interview.launcher.viewHistory}
        </Link>
      </div>
    </div>
  );
}

function ExpectRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="text-sm text-foreground">{text}</span>
    </div>
  );
}

/**
 * Fades the live session in on mount, using only core Tailwind opacity +
 * transition utilities (no animation plugin is installed, and adding one
 * for a single fade would be disproportionate). Mounts at opacity-0, then
 * flips to opacity-100 on the next tick so the browser has a starting
 * frame to transition from — setting both classes in the same render
 * would skip the transition entirely.
 */
function EnteringInterview({ started }: { started: StartedInterview }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      <InterviewSession started={started} />
    </div>
  );
}
