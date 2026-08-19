import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/**
 * Page frame for the public, unauthenticated documents (Privacy Policy,
 * Support). Same navbar and footer as the marketing home page, so these
 * read as part of the site rather than as bolted-on legal pages — and
 * deliberately outside the `(app)` route group, whose layout requires a
 * session and would redirect an unauthenticated visitor to /login.
 */
export function PublicPageShell({
  title,
  intro,
  eyebrow,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
          <header className="border-b-2 border-border pb-8">
            {eyebrow && (
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
            )}
            <h1 className="mt-2 font-heading text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {intro && <div className="mt-4 space-y-3 text-muted-foreground">{intro}</div>}
          </header>

          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
