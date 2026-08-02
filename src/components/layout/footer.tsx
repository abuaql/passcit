import { strings } from "@/lib/i18n";

export function Footer() {
  return (
    <footer className="border-t-2 border-border py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        <p>{strings.footer.disclaimer}</p>
        <p className="mt-2">{strings.footer.copyright(new Date().getFullYear())}</p>
      </div>
    </footer>
  );
}
