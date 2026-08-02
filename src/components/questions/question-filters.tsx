"use client";

import { useCallback, useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { strings } from "@/lib/i18n";

export function QuestionFiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

  const activeCategory = searchParams.get("category");
  const favoritesOnly = searchParams.get("favorites") === "true";
  const special6520Only = searchParams.get("special6520") === "true";

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  // Debounce the free-text search so we're not navigating on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchValue !== (searchParams.get("q") ?? "")) {
        updateParam("q", searchValue || null);
      }
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className={cn("space-y-3", isPending && "opacity-70")}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={strings.questions.searchPlaceholder}
          aria-label="Search questions"
          className="h-11 w-full rounded-2xl border-2 border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill
          active={!activeCategory}
          onClick={() => updateParam("category", null)}
          label={strings.questions.allCategories}
        />
        {CATEGORY_OPTIONS.map((opt) => (
          <FilterPill
            key={opt.value}
            active={activeCategory === opt.value}
            onClick={() => updateParam("category", opt.value)}
            label={opt.label}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill
          active={favoritesOnly}
          onClick={() => updateParam("favorites", favoritesOnly ? null : "true")}
          label={strings.questions.favoritesOnly}
        />
        <FilterPill
          active={special6520Only}
          onClick={() => updateParam("special6520", special6520Only ? null : "true")}
          label={strings.questions.special6520Only}
        />
        {(activeCategory || favoritesOnly || special6520Only || searchValue) && (
          <button
            type="button"
            onClick={() => {
              setSearchValue("");
              router.push(pathname);
            }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {strings.questions.clearFilters}
          </button>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
