import type { Metadata } from "next";
import { auth } from "@/auth";
import { getActiveTestVersion, getAllTestVersions } from "@/lib/questions";
import { InterviewLauncher } from "@/components/interview/interview-launcher";

export const metadata: Metadata = { title: "Interview Simulation" };

export default async function InterviewPage() {
  const session = await auth();
  const [activeVersion, allVersions] = await Promise.all([
    getActiveTestVersion(session?.user?.id),
    getAllTestVersions(),
  ]);

  return (
    <InterviewLauncher
      testVersions={allVersions.map((v) => ({
        id: v.id,
        name: v.name,
        questionsAsked: v.questionsAsked,
        passThreshold: v.passThreshold,
      }))}
      defaultTestVersionId={activeVersion.id}
    />
  );
}
