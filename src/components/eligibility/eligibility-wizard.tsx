"use client";

import { useState, useEffect, useRef } from "react";
import { strings } from "@/lib/i18n";
import { nextStepAfter, prevStepBefore } from "@/lib/eligibility-wizard-flow";
import { PersonalStep } from "@/components/eligibility/steps/personal-step";
import { BasisStep } from "@/components/eligibility/steps/basis-step";
import { TravelStep } from "@/components/eligibility/steps/travel-step";
import { MilitaryStep } from "@/components/eligibility/steps/military-step";
import { SelectiveServiceStep } from "@/components/eligibility/steps/selective-service-step";
import { AdditionalStep } from "@/components/eligibility/steps/additional-step";
import { ResultsStep } from "@/components/eligibility/steps/results-step";

export type WizardStep =
  | "personal"
  | "basis"
  | "travel"
  | "military"
  | "selectiveService"
  | "additional"
  | "results";

export interface Trip {
  departDate: string;
  returnDate: string;
}

export interface WizardData {
  greenCardDate: string | null;
  birthDate: string | null;
  state: string;
  basis: "GENERAL" | "MARRIED_TO_CITIZEN" | "MILITARY" | null;
  marriedToUSCitizen: boolean;
  spouseIsUSCitizen: boolean;
  trips: Trip[];
  militaryCountryServed: string;
  militaryServiceType: "MANDATORY" | "VOLUNTARY" | null;
  militaryServiceStart: string | null;
  militaryServiceEnd: string | null;
  militaryCurrentlyServing: boolean;
  militaryUSArmedForces: boolean;
  isMale: boolean | null;
  selectiveServiceRegisteredAnswer: boolean | null;
  goodMoralCharacterConcern: boolean | null;
  livedInStateThreeMonths: boolean | null;
}

const INITIAL_DATA: WizardData = {
  greenCardDate: null,
  birthDate: null,
  state: "",
  basis: null,
  marriedToUSCitizen: false,
  spouseIsUSCitizen: false,
  trips: [],
  militaryCountryServed: "",
  militaryServiceType: null,
  militaryServiceStart: null,
  militaryServiceEnd: null,
  militaryCurrentlyServing: false,
  militaryUSArmedForces: false,
  isMale: null,
  selectiveServiceRegisteredAnswer: null,
  goodMoralCharacterConcern: null,
  livedInStateThreeMonths: null,
};

export function EligibilityWizard() {
  const [step, setStep] = useState<WizardStep>("personal");
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  // Same fade-and-focus pattern as the interview simulation's step
  // transitions, reused rather than reinvented for a second wizard.
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    containerRef.current?.focus();
  }, [step]);

  function updateData(patch: Partial<WizardData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  function goTo(newStep: WizardStep) {
    setVisible(false);
    window.setTimeout(() => {
      setStep(newStep);
      window.requestAnimationFrame(() => setVisible(true));
    }, 200);
  }

  function goNext() {
    goTo(nextStepAfter(step, data));
  }
  function goBack() {
    goTo(prevStepBefore(step, data));
  }

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [calculationId, setCalculationId] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitError(null);
    try {
      const res = await fetch("/api/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basis: data.basis,
          greenCardDate: data.greenCardDate,
          state: data.state,
          birthDate: data.birthDate,
          marriedToUSCitizen: data.marriedToUSCitizen,
          spouseIsUSCitizen: data.spouseIsUSCitizen,
          trips: data.trips,
          isMale: data.isMale ?? false,
          selectiveServiceRegisteredAnswer: data.selectiveServiceRegisteredAnswer,
          goodMoralCharacterConcern: data.goodMoralCharacterConcern,
          livedInStateThreeMonths: data.livedInStateThreeMonths,
          militaryCountryServed: data.militaryCountryServed || undefined,
          militaryServiceType: data.militaryServiceType ?? undefined,
          militaryServiceStart: data.militaryServiceStart ?? undefined,
          militaryServiceEnd: data.militaryServiceEnd ?? undefined,
          militaryCurrentlyServing: data.militaryCurrentlyServing,
          militaryUSArmedForces: data.militaryUSArmedForces,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();
      setCalculationId(json.id);
      goTo("results");
    } catch {
      setSubmitError(strings.eligibility.submitError);
    }
  }

  let content: React.ReactNode;
  switch (step) {
    case "personal":
      content = <PersonalStep data={data} onUpdate={updateData} onNext={goNext} />;
      break;
    case "basis":
      content = <BasisStep data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />;
      break;
    case "travel":
      content = <TravelStep data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />;
      break;
    case "military":
      content = <MilitaryStep data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />;
      break;
    case "selectiveService":
      content = <SelectiveServiceStep data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />;
      break;
    case "additional":
      content = (
        <AdditionalStep data={data} onUpdate={updateData} onNext={handleSubmit} onBack={goBack} />
      );
      break;
    case "results":
      content = calculationId ? (
        <ResultsStep calculationId={calculationId} />
      ) : submitError ? (
        <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
          <button type="button" onClick={handleSubmit} className="text-sm font-semibold text-primary underline">
            Try again
          </button>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">{strings.eligibility.results.loading}</p>
      );
      break;
    default:
      content = null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.eligibility.title}</h1>
        <p className="mt-2 text-muted-foreground">{strings.eligibility.subtitle}</p>
      </div>
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`outline-none transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {content}
      </div>
    </div>
  );
}
