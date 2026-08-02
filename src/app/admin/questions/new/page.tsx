import type { Metadata } from "next";
import { getAllTestVersions } from "@/lib/questions";
import { QuestionForm } from "@/components/admin/question-form";

export const metadata: Metadata = { title: "New Question" };

export default async function NewQuestionPage() {
  const testVersions = await getAllTestVersions();
  return <QuestionForm testVersions={testVersions} />;
}
