import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FileQuestion } from "lucide-react";
import { listAdminQuestions } from "@/lib/admin-questions";
import { getAllTestVersions } from "@/lib/questions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { QuestionsTable } from "@/components/admin/questions-table";
import { AdminQuestionFiltersBar } from "@/components/admin/question-filters-bar";
import { QuestionImportExportBar } from "@/components/admin/question-import-export-bar";
import { strings } from "@/lib/i18n";
import type { QuestionCategory } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Manage Questions" };

const VALID_CATEGORIES = new Set(["AMERICAN_GOVERNMENT", "AMERICAN_HISTORY", "INTEGRATED_CIVICS"]);

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const categoryParam = typeof params.category === "string" ? params.category : undefined;

  const [{ questions, total, page, totalPages }, testVersions] = await Promise.all([
    listAdminQuestions({
      search: typeof params.q === "string" ? params.q : undefined,
      testVersionId: typeof params.version === "string" ? params.version : undefined,
      category: categoryParam && VALID_CATEGORIES.has(categoryParam) ? (categoryParam as QuestionCategory) : undefined,
      page: typeof params.page === "string" ? Number(params.page) : 1,
    }),
    getAllTestVersions(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">{strings.admin.questionsList.title}</h1>
          <p className="text-muted-foreground">{strings.admin.questionsList.subtitle(total)}</p>
        </div>
        <div className="flex items-center gap-2">
          <QuestionImportExportBar />
          <Link href="/admin/questions/new">
            <Button size="sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {strings.admin.questionsList.newQuestion}
            </Button>
          </Link>
        </div>
      </div>

      <AdminQuestionFiltersBar testVersions={testVersions} />

      {questions.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title={strings.admin.questionsList.noResultsTitle}
          description={strings.admin.questionsList.noResultsBody}
        />
      ) : (
        <>
          <QuestionsTable questions={questions} />
          <Pagination currentPage={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
