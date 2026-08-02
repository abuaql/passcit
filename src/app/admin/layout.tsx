import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  LayoutDashboard,
  FileQuestion,
  Tags,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { auth } from "@/auth";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { strings } from "@/lib/i18n";

// robots.ts already disallows /admin at the crawler level, but that's
// only a polite request well-behaved crawlers respect. This is the
// stronger, page-level signal — the same defense-in-depth approach used
// for auth throughout this app, applied to search-engine exposure.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: "/admin", label: strings.admin.nav.dashboard, icon: LayoutDashboard, exact: true },
  { href: "/admin/questions", label: strings.admin.nav.questions, icon: FileQuestion },
  { href: "/admin/categories", label: strings.admin.nav.categories, icon: Tags },
  { href: "/admin/users", label: strings.admin.nav.users, icon: Users },
  { href: "/admin/analytics", label: strings.admin.nav.analytics, icon: BarChart3 },
  { href: "/admin/settings", label: strings.admin.nav.settings, icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirects non-admins to /403 as the first line of
  // defense. This is the second line, server-side — the same
  // defense-in-depth pattern src/app/(app)/layout.tsx uses, since
  // proxy-only protection has known bypass classes in Next.js.
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/403");

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-64 shrink-0 flex-col border-r-2 border-border bg-card sm:flex">
          <div className="flex h-16 items-center gap-2 border-b-2 border-border px-5">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-heading text-lg font-bold text-foreground">{strings.admin.nav.adminLabel}</span>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t-2 border-border p-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              {strings.admin.nav.backToStudentApp}
            </Link>
          </div>
        </aside>

        <div className="flex-1">
          <header className="flex h-16 items-center justify-between border-b-2 border-border bg-card px-4 sm:px-6">
            <p className="text-sm font-semibold text-muted-foreground sm:hidden">{strings.admin.nav.adminLabel}</p>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.name ?? session.user.email}
              </span>
              <ThemeToggle />
            </div>
          </header>

          {/* Mobile nav — the sidebar is desktop-only above */}
          <nav className="flex gap-1 overflow-x-auto border-b-2 border-border bg-card px-3 py-2 sm:hidden">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-foreground"
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
