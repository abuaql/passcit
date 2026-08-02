"use client";

import { Button } from "@/components/ui/button";
import { YesNoToggle } from "@/components/eligibility/yes-no-toggle";
import { strings } from "@/lib/i18n";
import type { WizardData } from "@/components/eligibility/eligibility-wizard";

export function AdditionalStep({
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
  const canContinue = data.goodMoralCharacterConcern !== null && data.livedInStateThreeMonths !== null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold text-foreground">{strings.eligibility.additional.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{strings.eligibility.additional.subtitle}</p>
      </div>

      <div className="space-y-2 rounded-2xl border-2 border-border p-4">
        <YesNoToggle
          question={strings.eligibility.additional.moralCharacterQuestion}
          value={data.goodMoralCharacterConcern ?? false}
          onChange={(v) => onUpdate({ goodMoralCharacterConcern: v })}
        />
        <p className="text-xs text-muted-foreground">{strings.eligibility.additional.moralCharacterHelp}</p>
      </div>

      <YesNoToggle
        question={strings.eligibility.additional.stateResidencyQuestion}
        value={data.livedInStateThreeMonths ?? false}
        onChange={(v) => onUpdate({ livedInStateThreeMonths: v })}
      />

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          {strings.eligibility.nav.back}
        </Button>
        <Button className="flex-1" onClick={onNext} disabled={!canContinue}>
          {strings.eligibility.nav.submit}
        </Button>
      </div>
    </div>
  );
}
