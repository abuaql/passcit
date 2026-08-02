"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { strings } from "@/lib/i18n";

export function QuestionImportExportBar() {
  const router = useRouter();
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/admin/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) {
        show(data.error ?? strings.admin.questionsList.importFailed, "error");
        return;
      }
      show(
        strings.admin.questionsList.importResult(data.created, data.updated, data.errors.length),
        data.errors.length ? "info" : "success"
      );
      router.refresh();
    } catch {
      show(strings.admin.questionsList.importInvalidFile, "error");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} className="hidden" />
      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={isImporting}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        {strings.admin.questionsList.importJson}
      </Button>
      {/* A file download served by a route handler, not a Next.js page.
          next/link would hijack this with client-side navigation and break
          the download entirely. The rule matches on internal paths and
          can't distinguish a route handler from a page. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/admin/questions/export">
        <Button type="button" variant="outline" size="sm">
          <Download className="h-4 w-4" aria-hidden="true" />
          {strings.admin.questionsList.exportJson}
        </Button>
      </a>
    </div>
  );
}
