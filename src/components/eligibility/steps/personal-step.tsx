"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { US_STATES } from "@/lib/us-states";
import { strings } from "@/lib/i18n";
import type { WizardData } from "@/components/eligibility/eligibility-wizard";

export function PersonalStep({
  data,
  onUpdate,
  onNext,
}: {
  data: WizardData;
  onUpdate: (patch: Partial<WizardData>) => void;
  onNext: () => void;
}) {
  const [touched, setTouched] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const greenCardValid = Boolean(data.greenCardDate) && data.greenCardDate! <= today;
  const birthDateValid = Boolean(data.birthDate) && data.birthDate! <= today;
  const stateValid = data.state.trim().length > 0;
  const canContinue = greenCardValid && birthDateValid && stateValid;

  function handleNext() {
    setTouched(true);
    if (canContinue) onNext();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-center font-heading text-xl font-bold text-foreground">
        {strings.eligibility.personal.title}
      </h2>

      <div className="space-y-2">
        <Label htmlFor="greenCardDate">{strings.eligibility.personal.greenCardDateLabel}</Label>
        <Input
          id="greenCardDate"
          type="date"
          max={today}
          value={data.greenCardDate ?? ""}
          onChange={(e) => onUpdate({ greenCardDate: e.target.value })}
          error={touched && !greenCardValid}
        />
        <p className="text-xs text-muted-foreground">{strings.eligibility.personal.greenCardDateHelp}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="birthDate">{strings.eligibility.personal.birthDateLabel}</Label>
        <Input
          id="birthDate"
          type="date"
          max={today}
          value={data.birthDate ?? ""}
          onChange={(e) => onUpdate({ birthDate: e.target.value })}
          error={touched && !birthDateValid}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">{strings.eligibility.personal.stateLabel}</Label>
        <select
          id="state"
          value={data.state}
          onChange={(e) => onUpdate({ state: e.target.value })}
          className={`flex h-12 w-full rounded-2xl border-2 bg-background px-4 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            touched && !stateValid ? "border-destructive" : "border-border focus-visible:border-primary"
          }`}
        >
          <option value="">{strings.eligibility.personal.statePlaceholder}</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Button className="w-full" size="lg" onClick={handleNext}>
        {strings.eligibility.nav.next}
      </Button>
    </div>
  );
}
