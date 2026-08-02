import { CheckCircle2, Circle } from "lucide-react";
import { strings } from "@/lib/i18n";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface TimelineItem {
  label: string;
  date: Date;
  isPast: boolean;
  note?: string;
}

export function EligibilityTimeline({
  greenCardDate,
  eligibilityDate,
  earliestFilingDate,
  requiredResidencyYears,
  physicalPresenceDaysActual,
  physicalPresenceDaysReq,
}: {
  greenCardDate: Date;
  eligibilityDate: Date;
  earliestFilingDate: Date;
  requiredResidencyYears: number;
  physicalPresenceDaysActual: number;
  physicalPresenceDaysReq: number;
}) {
  const now = new Date();
  const items: TimelineItem[] = [
    { label: strings.eligibility.results.timeline.greenCardIssued, date: greenCardDate, isPast: now >= greenCardDate },
    {
      label: strings.eligibility.results.timeline.continuousResidence(requiredResidencyYears),
      date: greenCardDate,
      isPast: now >= eligibilityDate,
    },
    {
      label: strings.eligibility.results.timeline.physicalPresence(
        Math.max(0, physicalPresenceDaysActual),
        physicalPresenceDaysReq
      ),
      date: greenCardDate,
      isPast: physicalPresenceDaysActual >= physicalPresenceDaysReq,
    },
    {
      label: strings.eligibility.results.timeline.filingWindow,
      date: earliestFilingDate,
      isPast: now >= earliestFilingDate,
    },
    {
      label: strings.eligibility.results.timeline.eligibilityDate,
      date: eligibilityDate,
      isPast: now >= eligibilityDate,
    },
    {
      label: strings.eligibility.results.timeline.interviewPrep,
      date: earliestFilingDate,
      isPast: now >= earliestFilingDate,
      note: strings.eligibility.results.timeline.interviewPrepNote,
    },
  ];

  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {strings.eligibility.results.timeline.title}
      </p>
      <ol className="space-y-0">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              {item.isPast ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              {i < items.length - 1 && <div className="my-1 w-0.5 flex-1 bg-border" />}
            </div>
            <div className="pb-4">
              <p className={item.isPast ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
              {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
