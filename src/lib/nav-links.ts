import type { LucideIcon } from "lucide-react";
import { Home, BookOpen, Layers, ClipboardCheck, Calculator, User } from "lucide-react";
import { strings } from "@/lib/i18n";

export type NavSurface = "desktop" | "mobile";

export interface NavLink {
  href: string;
  /** Full label, used in the desktop header where there's room. */
  label: string;
  /** Compact label for the mobile tab bar, where each item gets a fraction of the viewport. */
  shortLabel: string;
  icon: LucideIcon;
  /** Which navigation surfaces this destination appears on. */
  surfaces: readonly NavSurface[];
}

/**
 * The single source of truth for primary navigation.
 *
 * The desktop header and the mobile tab bar previously kept two separate
 * hardcoded arrays, which is how /eligibility ended up in one and not the
 * other: adding it to the header couldn't fail a type check or a lint
 * rule for being absent from the tab bar, because nothing connected them.
 * Both surfaces now derive from this list, so a new destination is one
 * entry here and the surfaces it appears on is a deliberate, reviewable
 * choice rather than something that can silently drift.
 */
export const NAV_LINKS: readonly NavLink[] = [
  {
    href: "/dashboard",
    label: strings.nav.dashboard,
    shortLabel: strings.nav.home,
    icon: Home,
    surfaces: ["desktop", "mobile"],
  },
  {
    href: "/questions",
    label: strings.nav.learn,
    shortLabel: strings.nav.learn,
    icon: BookOpen,
    surfaces: ["desktop", "mobile"],
  },
  {
    href: "/flashcards",
    label: strings.nav.flashcards,
    shortLabel: strings.nav.cards,
    icon: Layers,
    surfaces: ["desktop", "mobile"],
  },
  {
    href: "/practice",
    label: strings.nav.practice,
    shortLabel: strings.nav.tests,
    icon: ClipboardCheck,
    surfaces: ["desktop", "mobile"],
  },
  {
    href: "/eligibility",
    label: strings.nav.eligibility,
    shortLabel: strings.nav.eligible,
    // Matches the Calculator icon already used for this feature on the landing page.
    icon: Calculator,
    surfaces: ["desktop", "mobile"],
  },
  {
    // Mobile-only, preserving existing behaviour exactly: the tab bar is
    // currently the only entry point to /profile anywhere in the app. That
    // gap on desktop is pre-existing and deliberately left unchanged here,
    // but it is now visible in one line instead of being hidden across two
    // separate files.
    href: "/profile",
    label: strings.nav.profile,
    shortLabel: strings.nav.profile,
    icon: User,
    surfaces: ["mobile"],
  },
];

export const desktopNavLinks = NAV_LINKS.filter((link) => link.surfaces.includes("desktop"));
export const mobileNavLinks = NAV_LINKS.filter((link) => link.surfaces.includes("mobile"));
