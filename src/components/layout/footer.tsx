import Link from "next/link";
import { strings } from "@/lib/i18n";

export function Footer() {
  return (
    <footer className="border-t-2 border-border py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        <nav aria-label="Footer" className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/privacy" className="font-semibold text-foreground hover:text-primary hover:underline">
            {strings.footer.privacy}
          </Link>
          <Link href="/support" className="font-semibold text-foreground hover:text-primary hover:underline">
            {strings.footer.support}
          </Link>
        </nav>
        <p>{strings.footer.disclaimer}</p>
        <p className="mt-2">{strings.footer.copyright(new Date().getFullYear())}</p>
      </div>
    </footer>
  );
}
