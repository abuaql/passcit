"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Gauge, AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EligibilityTimeline } from "@/components/eligibility/eligibility-timeline";
import { strings } from "@/lib/i18n";
import type { WarningCode, RecommendationCode } from "@/lib/eligibility";

interface EligibilityResultDTO {
  isMilitaryPath: boolean;
  requiredResidencyYears: number;
  eligibilityDate: string;
  earliestFilingDate: string;
  physicalPresenceDaysReq: number;
  physicalPresenceDaysActual: number;
  totalDaysOutsideUS: number;
  longestTripDays: number;
  continuousResidenceOk: boolean;
  continuousResidenceRisk: "none" | "review" | "likely_broken";
  selectiveServiceRequired: boolean;
  isEligibleNow: boolean;
  readinessScore: number;
  warnings: WarningCode[];
  recommendations: RecommendationCode[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function ResultsStep({ calculationId }: { calculationId: string }) {
  const [result, setResult] = useState<EligibilityResultDTO | null>(null);
  const [greenCardDate, setGreenCardDate] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/eligibility/${calculationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setResult(json.result);
          setGreenCardDate(json.greenCardDate);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [calculationId]);

  if (error) {
    return <p className="text-center text-sm text-destructive">{strings.eligibility.results.loadError}</p>;
  }
  if (!result) {
    return <p className="text-center text-sm text-muted-foreground">{strings.eligibility.results.loading}</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-center font-heading text-xl font-bold text-foreground">{strings.eligibility.results.title}</h2>

      {result.isMilitaryPath ? (
        <p className="rounded-2xl bg-accent/10 p-4 text-sm text-accent-foreground">
          {strings.eligibility.results.militaryNotice}
        </p>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div
              className={
                result.isEligibleNow
                  ? "flex items-center gap-2 rounded-xl bg-success/10 p-3 text-success"
                  : "flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-accent-foreground"
              }
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="font-heading font-bold">
                {result.isEligibleNow ? strings.eligibility.results.eligibleNow : strings.eligibility.results.notYetEligible}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">{strings.eligibility.results.eligibilityDateLabel}</p>
                <p className="font-heading font-bold text-foreground">{formatDate(result.eligibilityDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{strings.eligibility.results.earliestFilingLabel}</p>
                <p className="font-heading font-bold text-foreground">{formatDate(result.earliestFilingDate)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border-2 border-border p-3">
              <Gauge className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{strings.eligibility.results.readinessScoreLabel}</p>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${result.readinessScore}%` }}
                  />
                </div>
              </div>
              <span className="font-heading text-lg font-bold text-foreground">{result.readinessScore}%</span>
            </div>

            {!result.isEligibleNow && (
              <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {strings.eligibility.results.notEligibleYetTitle} {formatDate(result.eligibilityDate)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!result.isMilitaryPath && greenCardDate && (
        <Card>
          <CardContent className="p-6">
            <EligibilityTimeline
              greenCardDate={new Date(greenCardDate)}
              eligibilityDate={new Date(result.eligibilityDate)}
              earliestFilingDate={new Date(result.earliestFilingDate)}
              requiredResidencyYears={result.requiredResidencyYears}
              physicalPresenceDaysActual={result.physicalPresenceDaysActual}
              physicalPresenceDaysReq={result.physicalPresenceDaysReq}
            />
          </CardContent>
        </Card>
      )}

      {result.warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {strings.eligibility.results.warnings.title}
          </p>
          <ul className="space-y-2">
            {result.warnings.map((code) => (
              <li key={code} className="flex items-start gap-2 rounded-xl bg-accent/10 p-3 text-sm text-accent-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {strings.eligibility.results.warnings[code]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {strings.eligibility.results.recommendations.title}
          </p>
          <ul className="space-y-2">
            {result.recommendations.map((code) => (
              <li key={code} className="flex items-start gap-2 rounded-xl border-2 border-border p-3 text-sm text-foreground">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {strings.eligibility.results.recommendations[code]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!result.isMilitaryPath && result.isEligibleNow && (
        <a
          href="https://www.uscis.gov/n-400"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {strings.eligibility.results.fileNowButton}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
