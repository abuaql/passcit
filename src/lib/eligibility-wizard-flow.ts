import type { WizardStep, WizardData } from "@/components/eligibility/eligibility-wizard";

export const STEP_ORDER: WizardStep[] = [
  "personal",
  "basis",
  "travel",
  "military",
  "selectiveService",
  "additional",
  "results",
];

/**
 * The military step only appears when that basis is actually selected —
 * everyone else skips straight from travel to Selective Service, per the
 * spec's "only display if applicable." Extracted out of the wizard
 * component so this conditional logic can be tested directly via
 * execution, not just reasoned through by reading it.
 */
export function nextStepAfter(current: WizardStep, data: WizardData): WizardStep {
  const idx = STEP_ORDER.indexOf(current);
  let next = STEP_ORDER[idx + 1];
  if (next === "military" && data.basis !== "MILITARY") {
    next = STEP_ORDER[idx + 2];
  }
  return next ?? "results";
}

export function prevStepBefore(current: WizardStep, data: WizardData): WizardStep {
  const idx = STEP_ORDER.indexOf(current);
  let prev = STEP_ORDER[idx - 1];
  if (prev === "military" && data.basis !== "MILITARY") {
    prev = STEP_ORDER[idx - 2];
  }
  return prev ?? "personal";
}
