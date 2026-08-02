import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResultsStep } from "@/components/interview/steps/results-step";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Interview Review" };

export default async function InterviewHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <Link
        href="/interview/history"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {strings.interview.history.backToHistory}
      </Link>
      <ResultsStep interviewId={id} />
    </div>
  );
}
