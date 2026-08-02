"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/i18n";

export interface TestVersionOption {
  id: string;
  slug: string;
  name: string;
  totalQuestions: number;
}

export function TestVersionSwitcher({
  versions,
  activeId,
}: {
  versions: TestVersionOption[];
  activeId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const active = versions.find((v) => v.id === activeId) ?? versions[0];

  if (!active || versions.length < 2) {
    // Nothing to switch between (e.g. only one version seeded) — no
    // point showing a dropdown of one.
    return null;
  }

  function switchTo(versionId: string) {
    setOpen(false);
    if (versionId === activeId) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/user/active-test-version", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testVersionId: versionId }),
        });
        if (!res.ok) return;
        router.refresh();
      } catch {
        // Silently ignore — the switcher just won't visually update.
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary/40 disabled:opacity-60"
      >
        {active.name}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* Click-outside catcher */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-2 w-64 space-y-1 rounded-2xl border-2 border-border bg-card p-2 shadow-md"
          >
            {versions.map((version) => (
              <li key={version.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={version.id === activeId}
                  onClick={() => switchTo(version.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted",
                    version.id === activeId && "font-bold text-primary"
                  )}
                >
                  <span>
                    {version.name}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {strings.nav.versionQuestionCount(version.totalQuestions)}
                    </span>
                  </span>
                  {version.id === activeId && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
