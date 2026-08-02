import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Access Denied" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{strings.errorPages.error403}</p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-foreground">{strings.errorPages.accessDenied}</h1>
      </div>
      <p className="text-muted-foreground">
        {strings.errorPages.accessDeniedBody}
      </p>
      <Link href="/dashboard">
        <Button className="mt-2">{strings.errorPages.backToDashboard}</Button>
      </Link>
    </div>
  );
}
