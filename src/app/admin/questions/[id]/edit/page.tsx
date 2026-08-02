import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminQuestionById } from "@/lib/admin-questions";
import { getAllTestVersions } from "@/lib/questions";
import { QuestionForm } from "@/components/admin/question-form";

export const metadata: Metadata = { title: "Edit Question" };

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [question, testVersions] = await Promise.all([getAdminQuestionById(id), getAllTestVersions()]);

  if (!question) notFound();

  return (
    <QuestionForm
      questionId={question.id}
      testVersions={testVersions}
      initialValues={{
        testVersionId: question.testVersionId,
        number: question.number,
        category: question.category,
        subcategory: question.subcategory,
        question: question.question,
        explanation: question.explanation ?? "",
        answers: question.answers.length > 0 ? question.answers.map((a) => a.text) : [""],
        requiredAnswerCount: question.requiredAnswerCount,
        isSpecial65_20: question.isSpecial65_20,
        isDynamicAnswer: question.isDynamicAnswer,
        dynamicNote: question.dynamicNote ?? "",
        variesByLocation: question.variesByLocation,
        isActive: question.isActive,
      }}
    />
  );
}
