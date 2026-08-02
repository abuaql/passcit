"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefFor(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `${pathname}?${params.toString()}`;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <Link
        href={hrefFor(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border-2 border-border",
          currentPage === 1 ? "pointer-events-none opacity-40" : "hover:border-primary/40"
        )}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Link>

      {pages.map((page, i) => {
        const prevPage = pages[i - 1];
        const showEllipsis = prevPage !== undefined && page - prevPage > 1;
        return (
          <span key={page} className="flex items-center gap-1">
            {showEllipsis && <span className="px-1 text-sm text-muted-foreground">…</span>}
            <Link
              href={hrefFor(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold",
                page === currentPage
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-foreground hover:border-primary/40"
              )}
            >
              {page}
            </Link>
          </span>
        );
      })}

      <Link
        href={hrefFor(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border-2 border-border",
          currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:border-primary/40"
        )}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}
