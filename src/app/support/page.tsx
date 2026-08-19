import type { Metadata } from "next";
import Link from "next/link";
import {
  Apple,
  Chrome,
  KeyRound,
  Layers,
  LifeBuoy,
  ListChecks,
  Mic,
  Smartphone,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { PublicPageShell } from "@/components/legal/public-page-shell";
import { DocumentBlocks } from "@/components/legal/document-blocks";
import { SupportContactForm } from "@/components/support/support-contact-form";
import { supportIntro, supportReportChecklist, supportTopics } from "@/lib/legal/support";
import { getPublicSupportEmail } from "@/lib/legal/support-contact";

export const metadata: Metadata = {
  // Absolute so the root layout's "%s | Passcit" template doesn't append
  // a second "| Passcit" — this exact string is what App Store Connect
  // points at.
  title: { absolute: "Passcit Support" },
  description:
    "Get help with Passcit, including account access, Apple Sign In, Google Sign In, voice practice, flashcards, and other app issues.",
  alternates: { canonical: "/support" },
  openGraph: {
    title: "Passcit Support",
    description:
      "Get help with Passcit, including account access, Apple Sign In, Google Sign In, voice practice, flashcards, and other app issues.",
    url: "/support",
    type: "article",
  },
};

/** Icons live with the page, not with the content module, so the content stays plain data. */
const TOPIC_ICONS: Record<string, LucideIcon> = {
  account: KeyRound,
  "apple-sign-in": Apple,
  "google-sign-in": Chrome,
  "voice-practice": Mic,
  flashcards: Layers,
  practice: ListChecks,
  progress: TrendingUp,
  "app-problems": Smartphone,
};

/**
 * Rendered per request rather than prerendered at build time: the
 * publicly shown support address comes from SUPPORT_EMAIL, and an
 * operator who sets or changes that env var should not have to rebuild
 * the site for this page to say the right thing. Nothing here touches
 * the database, so the page still returns 200 regardless of app state.
 */
export const dynamic = "force-dynamic";

export default function SupportPage() {
  const supportEmail = getPublicSupportEmail();

  return (
    <PublicPageShell
      eyebrow="Help"
      title="Passcit Support"
      intro={<p className="leading-relaxed">{supportIntro}</p>}
    >
      <nav aria-label="Support topics" className="mt-8">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Jump to a topic
        </h2>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {supportTopics.map((topic) => (
            <li key={topic.id}>
              <a href={`#${topic.id}`} className="text-sm font-semibold text-primary hover:underline">
                {topic.title}
              </a>
            </li>
          ))}
          <li>
            <a href="#contact" className="text-sm font-semibold text-primary hover:underline">
              Contact Passcit support
            </a>
          </li>
        </ul>
      </nav>

      <div className="mt-10 space-y-10">
        {supportTopics.map((topic) => {
          const Icon = TOPIC_ICONS[topic.id] ?? LifeBuoy;

          return (
            <section key={topic.id} id={topic.id} className="scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground">{topic.title}</h2>
              </div>

              <div className="mt-5 space-y-6">
                {topic.entries.map((entry) => (
                  <div key={entry.question} className="rounded-3xl border-2 border-border bg-card p-6">
                    <h3 className="font-heading text-base font-bold text-foreground">{entry.question}</h3>
                    <div className="mt-3 text-sm">
                      <DocumentBlocks blocks={entry.blocks} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <section id="reporting" className="scroll-mt-24">
          <h2 className="font-heading text-2xl font-bold text-foreground">Reporting a problem</h2>
          <div className="mt-4">
            <DocumentBlocks blocks={supportReportChecklist} />
          </div>
        </section>

        <section id="contact" className="scroll-mt-24">
          <h2 className="font-heading text-2xl font-bold text-foreground">Contact Passcit support</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Send a message below and a reply will come to the email address you give us.
            {supportEmail ? (
              <>
                {" "}
                You can also write directly to{" "}
                <a href={`mailto:${supportEmail}`} className="font-semibold text-primary hover:underline">
                  {supportEmail}
                </a>
                .
              </>
            ) : null}{" "}
            For anything about your data or this app&apos;s data practices, see the{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          <div className="mt-6">
            <SupportContactForm />
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}
