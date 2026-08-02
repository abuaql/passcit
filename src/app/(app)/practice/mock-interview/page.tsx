import type { Metadata } from "next";
import { auth } from "@/auth";
import { getActiveTestVersion } from "@/lib/questions";
import { MockInterviewClient } from "@/components/practice/mock-interview-client";

export const metadata: Metadata = { title: "Mock Interview" };

export default async function MockInterviewPage() {
  const session = await auth();
  const testVersion = await getActiveTestVersion(session?.user?.id);

  return (
    <MockInterviewClient
      testVersionName={testVersion.name}
      passThreshold={testVersion.passThreshold}
      questionsAsked={testVersion.questionsAsked}
    />
  );
}
