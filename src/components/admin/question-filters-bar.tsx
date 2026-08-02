"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { strings } from "@/lib/i18n";

export function AdminQuestionFiltersBar({
  testVersions,
}: {
  testVersions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

  const activeVersion = searchParams.get("version") ?? "";
  const activeCategory = searchParams.get("category") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // any filter change resets to page 1
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchValue !== (searchParams.get("q") ?? "")) updateParam("q", searchValue);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={strings.admin.questionsList.searchPlaceholder}
          aria-label="Search questions"
          className="h-10 w-full rounded-2xl border-2 border-border bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <select
        value={activeVersion}
        onChange={(e) => updateParam("version", e.target.value)}
        aria-label="Filter by test version"
        className={cn(
          "h-10 rounded-2xl border-2 bg-card px-3 text-sm font-semibold",
          activeVersion ? "border-primary text-primary" : "border-border text-foreground"
        )}
      >
        <option value="">{strings.admin.questionsList.allVersions}</option>
        {testVersions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>

      <select
        value={activeCategory}
        onChange={(e) => updateParam("category", e.target.value)}
        aria-label="Filter by category"
        className={cn(
          "h-10 rounded-2xl border-2 bg-card px-3 text-sm font-semibold",
          activeCategory ? "border-primary text-primary" : "border-border text-foreground"
        )}
      >
        <option value="">{strings.admin.questionsList.allCategories}</option>
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
