"use client";

import { useState } from "react";
import { Users, Heart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YesNoToggle } from "@/components/eligibility/yes-no-toggle";
import { strings } from "@/lib/i18n";
import type { WizardData } from "@/components/eligibility/eligibility-wizard";

const OPTIONS = [
  { value: "GENERAL" as const, icon: Users, ...strings.eligibility.basis.general },
  { value: "MARRIED_TO_CITIZEN" as const, icon: Heart, ...strings.eligibility.basis.married },
  { value: "MILITARY" as const, icon: Shield, ...strings.eligibility.basis.military },
];

export function BasisStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: WizardData;
  onUpdate: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [touched, setTouched] = useState(false);
  // Tracks whether the married sub-questions have actually been
  // answered, separately from their boolean values — both default to
  // `false`, which is indistinguishable from "explicitly answered no"
  // unless interaction is tracked on its own. Without this, the mismatch
  // warning below would show immediately on selecting the married path,
  // before the user has answered either question.
  const [marriedQ1Touched, setMarriedQ1Touched] = useState(false);
  const [marriedQ2Touched, setMarriedQ2Touched] = useState(false);

  const isMarried = data.basis === "MARRIED_TO_CITIZEN";
  const marriedAnswered = marriedQ1Touched && marriedQ2Touched;
  const marriedMismatch = isMarried && marriedAnswered && (!data.marriedToUSCitizen || !data.spouseIsUSCitizen);
  const canContinue = Boolean(data.basis) && (!isMarried || (data.marriedToUSCitizen && data.spouseIsUSCitizen));

  function handleNext() {
    setTouched(true);
    if (canContinue) onNext();
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold text-foreground">{strings.eligibility.basis.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{strings.eligibility.basis.subtitle}</p>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label={strings.eligibility.basis.title}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={data.basis === opt.value}
            onClick={() =>
              onUpdate({
                basis: opt.value,
                ...(opt.value !== "MARRIED_TO_CITIZEN"
                  ? { marriedToUSCitizen: false, spouseIsUSCitizen: false }
                  : {}),
              })
            }
            className={
              data.basis === opt.value
                ? "flex w-full items-start gap-3 rounded-2xl border-2 border-primary bg-primary/10 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                : "flex w-full items-start gap-3 rounded-2xl border-2 border-border p-4 text-left hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            }
          >
            <opt.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-heading font-bold text-foreground">{opt.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>

      {isMarried && (
        <div className="space-y-4 rounded-2xl border-2 border-border p-4">
          <YesNoToggle
            question={strings.eligibility.basis.marriedQuestion1}
            value={data.marriedToUSCitizen}
            onChange={(v) => {
              onUpdate({ marriedToUSCitizen: v });
              setMarriedQ1Touched(true);
            }}
          />
          <YesNoToggle
            question={strings.eligibility.basis.marriedQuestion2}
            value={data.spouseIsUSCitizen}
            onChange={(v) => {
              onUpdate({ spouseIsUSCitizen: v });
              setMarriedQ2Touched(true);
            }}
          />
          {marriedMismatch && (
            <div className="space-y-2 rounded-xl bg-accent/10 p-3 text-sm text-accent-foreground" role="alert">
              <p>{strings.eligibility.basis.marriedMismatchWarning}</p>
              <button
                type="button"
                onClick={() => onUpdate({ basis: "GENERAL", marriedToUSCitizen: false, spouseIsUSCitizen: false })}
                className="font-semibold underline"
              >
                {strings.eligibility.basis.switchToGeneral}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          {strings.eligibility.nav.back}
        </Button>
        <Button className="flex-1" onClick={handleNext} disabled={touched && !canContinue}>
          {strings.eligibility.nav.next}
        </Button>
      </div>
    </div>
  );
}
