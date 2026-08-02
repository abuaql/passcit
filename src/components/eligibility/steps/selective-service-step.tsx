"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YesNoToggle } from "@/components/eligibility/yes-no-toggle";
import { selectiveServiceRequired } from "@/lib/eligibility";
import { strings } from "@/lib/i18n";
import type { WizardData } from "@/components/eligibility/eligibility-wizard";

export function SelectiveServiceStep({
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
  // Tracks whether the registration question has been answered AT ALL,
  // separately from the answer's value — "not sure" is a deliberate,
  // valid answer that maps to null, indistinguishable from "hasn't
  // answered yet" if only the stored value were checked.
  const [registrationTouched, setRegistrationTouched] = useState(false);

  // Determined live, using the exact same tested function the server
  // uses — not a separate UI-side rule that could drift from it.
  const applies = useMemo(() => {
    if (data.isMale !== true || !data.birthDate || !data.greenCardDate) return false;
    return selectiveServiceRequired(new Date(data.birthDate), new Date(data.greenCardDate), true);
  }, [data.isMale, data.birthDate, data.greenCardDate]);

  const canContinue = data.isMale !== null && (!applies || registrationTouched);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold text-foreground">{strings.eligibility.selectiveService.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{strings.eligibility.selectiveService.subtitle}</p>
      </div>

      <YesNoToggle
        question={strings.eligibility.selectiveService.isMaleQuestion}
        value={data.isMale ?? false}
        onChange={(v) => {
          onUpdate({ isMale: v, selectiveServiceRegisteredAnswer: null });
          setRegistrationTouched(false);
        }}
      />

      <div aria-live="polite">
        {data.isMale !== null && !applies && (
          <div className="flex items-center gap-2 rounded-2xl bg-success/10 p-4 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {strings.eligibility.selectiveService.notApplicable}
          </div>
        )}

        {applies && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{strings.eligibility.selectiveService.registeredQuestion}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { label: strings.eligibility.basis.yes, value: true },
                { label: strings.eligibility.basis.no, value: false },
                { label: strings.eligibility.selectiveService.notSure, value: null },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onUpdate({ selectiveServiceRegisteredAnswer: opt.value });
                    setRegistrationTouched(true);
                  }}
                  className={
                    data.selectiveServiceRegisteredAnswer === opt.value
                      ? "rounded-xl border-2 border-primary bg-primary/10 py-2 text-sm font-semibold text-primary"
                      : "rounded-xl border-2 border-border py-2 text-sm font-semibold text-muted-foreground"
                  }
              >
                {opt.label}
              </button>
            ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          {strings.eligibility.nav.back}
        </Button>
        <Button className="flex-1" onClick={onNext} disabled={!canContinue}>
          {strings.eligibility.nav.next}
        </Button>
      </div>
    </div>
  );
}
