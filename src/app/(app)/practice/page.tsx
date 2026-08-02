import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, Shuffle, Mic2, GraduationCap, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Practice" };

const modes = [
  { href: "/practice/quiz", icon: Dumbbell, ...strings.practiceHub.modes.quiz },
  { href: "/practice/random", icon: Shuffle, ...strings.practiceHub.modes.random },
  { href: "/practice/mock-interview", icon: Mic2, ...strings.practiceHub.modes.mockInterview },
];

const flagshipMode = {
  href: "/interview",
  icon: GraduationCap,
  ...strings.practiceHub.modes.interviewSimulation,
};

export default function PracticeHubPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.practiceHub.title}</h1>
        <p className="text-muted-foreground">{strings.practiceHub.subtitle}</p>
      </div>

      {/* Hero — deliberately larger scale and tinted background than the
          mode cards below, so it reads as the featured experience rather
          than a bigger grid item. The whole card stays clickable, same
          as every mode card below, for consistency — the CTA is a
          prominent styled span, not a real nested <button>, since Link
          already renders an <a> and a <button> can't validly nest inside
          one. */}
      <Link href={flagshipMode.href}>
        <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/15">
              <flagshipMode.icon className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl font-bold text-foreground">{flagshipMode.title}</h2>
                <Badge variant="default">{strings.practiceHub.mostRealistic}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{flagshipMode.description}</p>
            </div>
            <span className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-primary-dark bg-primary px-6 py-3 font-heading font-bold text-primary-foreground">
              {strings.practiceHub.start}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </Card>
      </Link>

      {/* space-y-8 already puts 32px between the hero and this grid;
          pt-4 adds 16px more on top (48px total) so the featured card
          reads as its own section, not just the first grid item. */}
      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {modes.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="flex h-full flex-col gap-3 p-6 transition-transform hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading font-bold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
              <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                {strings.practiceHub.start}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
