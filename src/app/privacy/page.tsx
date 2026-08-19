import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PublicPageShell } from "@/components/legal/public-page-shell";
import { DocumentBlocks } from "@/components/legal/document-blocks";
import {
  PRIVACY_LAST_UPDATED,
  privacyIntro,
  privacyIndependenceNotice,
  privacySections,
} from "@/lib/legal/privacy-policy";
import { getPublicSupportEmail } from "@/lib/legal/support-contact";

export const metadata: Metadata = {
  // Absolute so the root layout's "%s | Passcit" template doesn't apply
  // twice — this exact string is what App Store Connect points at.
  title: { absolute: "Privacy Policy | Passcit" },
  description:
    "Passcit Privacy Policy explaining how user information is collected, used, protected, and managed.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Passcit",
    description:
      "Passcit Privacy Policy explaining how user information is collected, used, protected, and managed.",
    url: "/privacy",
    type: "article",
  },
};

/**
 * Rendered per request rather than prerendered at build time: the
 * publicly shown support address comes from SUPPORT_EMAIL, and an
 * operator who sets or changes that env var should not have to rebuild
 * the site for this page to say the right thing. Nothing here touches
 * the database, so the page still returns 200 regardless of app state.
 */
export const dynamic = "force-dynamic";

export default function PrivacyPolicyPage() {
  const supportEmail = getPublicSupportEmail();

  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      intro={
        <>
          <p className="text-sm font-semibold text-foreground">Last updated {PRIVACY_LAST_UPDATED}</p>
          {privacyIntro.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </>
      }
    >
      <div className="mt-8 flex gap-3 rounded-3xl border-2 border-border bg-muted/50 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-foreground">{privacyIndependenceNotice}</p>
      </div>

      <nav aria-label="On this page" className="mt-8">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-muted-foreground">
          On this page
        </h2>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {privacySections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {section.heading}
              </a>
            </li>
          ))}
          <li>
            <a href="#contact" className="text-sm font-semibold text-primary hover:underline">
              Contact us about privacy
            </a>
          </li>
        </ul>
      </nav>

      <article className="mt-10 space-y-10">
        {privacySections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="font-heading text-2xl font-bold text-foreground">{section.heading}</h2>
            <div className="mt-4">
              <DocumentBlocks blocks={section.blocks} />
            </div>
          </section>
        ))}

        <section id="contact" className="scroll-mt-24">
          <h2 className="font-heading text-2xl font-bold text-foreground">Contact us about privacy</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Questions about this policy, or a request to access or delete your information? Use the
            form on the{" "}
            <Link href="/support" className="font-semibold text-primary hover:underline">
              Passcit support page
            </Link>
            {supportEmail ? (
              <>
                {" "}
                or email{" "}
                <a href={`mailto:${supportEmail}`} className="font-semibold text-primary hover:underline">
                  {supportEmail}
                </a>
              </>
            ) : null}
            . Privacy requests are answered as quickly as we can, and always by a person.
          </p>
        </section>
      </article>
    </PublicPageShell>
  );
}
