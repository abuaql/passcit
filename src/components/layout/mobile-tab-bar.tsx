"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mobileNavLinks } from "@/lib/nav-links";

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="Primary"
    >
      {/* items-stretch + flex-1 gives every item an exact equal share of the
          width and the full 64px bar height as its tap target, which keeps
          targets comfortably above the 44px guideline even at 320px with
          six items. `truncate` is a safety net for very narrow viewports
          rather than something expected to trigger. */}
      <div className="flex h-16 items-stretch">
        {mobileNavLinks.map(({ href, shortLabel, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const textColor = active ? "text-primary" : "text-muted-foreground";

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <Icon className={cn("h-6 w-6 shrink-0", textColor)} aria-hidden="true" />
              <span className={cn("w-full truncate text-center text-[10px] font-semibold", textColor)}>
                {shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
