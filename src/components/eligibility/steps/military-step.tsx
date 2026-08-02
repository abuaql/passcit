"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YesNoToggle } from "@/components/eligibility/yes-no-toggle";
import { strings } from "@/lib/i18n";
import type { WizardData } from "@/components/eligibility/eligibility-wizard";

export function MilitaryStep({
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
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold text-foreground">{strings.eligibility.military.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{strings.eligibility.military.subtitle}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="countryServed">{strings.eligibility.military.countryServedLabel}</Label>
        <Input
          id="countryServed"
          value={data.militaryCountryServed}
          onChange={(e) => onUpdate({ militaryCountryServed: e.target.value })}
        />
      </div>

      <YesNoToggle
        question={strings.eligibility.military.usArmedForcesLabel}
        value={data.militaryUSArmedForces}
        onChange={(v) => onUpdate({ militaryUSArmedForces: v })}
      />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{strings.eligibility.military.serviceTypeLabel}</p>
        <div className="flex gap-2">
          {(["MANDATORY", "VOLUNTARY"] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={data.militaryServiceType === type}
              onClick={() => onUpdate({ militaryServiceType: type })}
              className={
                data.militaryServiceType === type
                  ? "flex-1 rounded-xl border-2 border-primary bg-primary/10 py-2 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  : "flex-1 rounded-xl border-2 border-border py-2 text-sm font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              }
            >
              {type === "MANDATORY" ? strings.eligibility.military.mandatory : strings.eligibility.military.voluntary}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceStart">{strings.eligibility.military.startDateLabel}</Label>
        <Input
          id="serviceStart"
          type="date"
          max={today}
          value={data.militaryServiceStart ?? ""}
          onChange={(e) => onUpdate({ militaryServiceStart: e.target.value })}
        />
      </div>

      <YesNoToggle
        question={strings.eligibility.military.currentlyServingLabel}
        value={data.militaryCurrentlyServing}
        onChange={(v) => onUpdate({ militaryCurrentlyServing: v, militaryServiceEnd: v ? null : data.militaryServiceEnd })}
      />

      {data.militaryCurrentlyServing ? (
        <p className="text-xs text-muted-foreground">{strings.eligibility.military.currentlyServingNote}</p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="serviceEnd">{strings.eligibility.military.endDateLabel}</Label>
          <Input
            id="serviceEnd"
            type="date"
            max={today}
            value={data.militaryServiceEnd ?? ""}
            onChange={(e) => onUpdate({ militaryServiceEnd: e.target.value })}
          />
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          {strings.eligibility.nav.back}
        </Button>
        <Button className="flex-1" onClick={onNext}>
          {strings.eligibility.nav.next}
        </Button>
      </div>
    </div>
  );
}
