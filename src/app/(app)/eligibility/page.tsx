import type { Metadata } from "next";
import { EligibilityWizard } from "@/components/eligibility/eligibility-wizard";

export const metadata: Metadata = { title: "Eligibility Calculator" };

export default function EligibilityPage() {
  return <EligibilityWizard />;
}
