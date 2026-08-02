import Link from "next/link";
import { BookOpen, Layers, Mic, Calculator, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroFlashcard } from "@/components/marketing/hero-flashcard";
import { TorchIcon } from "@/components/ui/torch-icon";
import { strings } from "@/lib/i18n";

const modes = [
  { icon: BookOpen, ...strings.landing.modes.category },
  { icon: Layers, ...strings.landing.modes.flashcards },
  { icon: Mic, ...strings.landing.modes.voice },
  { icon: Calculator, ...strings.landing.modes.eligibility },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:py-24 lg:flex-row lg:justify-between">
          <div className="max-w-xl text-center lg:text-left">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-foreground dark:text-accent">
              <TorchIcon className="h-4 w-4" />
              {strings.landing.badge}
            </span>
            <h1 className="font-heading text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
              {strings.landing.heroTitle}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {strings.landing.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  {strings.landing.startFree}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  {strings.landing.logIn}
                </Button>
              </Link>
            </div>
          </div>

          <HeroFlashcard />
        </section>

        {/* Study modes */}
        <section className="border-t-2 border-border bg-muted/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center font-heading text-3xl font-bold text-foreground">
              {strings.landing.modesTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
              {strings.landing.modesSubtitle}
            </p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {modes.map(({ icon: Icon, title, description }) => (
                <Card key={title}>
                  <CardContent className="flex gap-4 p-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
                      <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-foreground">{title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <h2 className="font-heading text-3xl font-bold text-foreground">
            {strings.landing.ctaTitle}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {strings.landing.ctaSubtitle}
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-6">
              {strings.landing.ctaButton}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
