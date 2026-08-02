import type { Metadata, Viewport } from "next";
import { Baloo_2, Figtree } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

const headingFont = Baloo_2({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
});

const bodyFont = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// themeColor, colorScheme, and viewport were deprecated out of the
// `metadata` export as of Next.js 14 — they render nothing (silently,
// with only a build-time warning) unless placed here instead.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2d8142",
  // "cover" lets the app draw into notch/Dynamic-Island/home-indicator
  // safe areas on iOS in standalone mode, rather than leaving bars of
  // unstyled background there — the app's own layout is responsible for
  // then respecting those insets via env(safe-area-inset-*) so real
  // content doesn't sit underneath the notch or home indicator.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Passcit — U.S. Citizenship Test Practice",
    template: "%s | Passcit",
  },
  description:
    "Study and prepare for the official USCIS naturalization civics test with flashcards, practice interviews, and progress tracking.",
  keywords: [
    "USCIS civics test",
    "naturalization test",
    "citizenship test practice",
    "N-400",
    "US citizenship questions",
  ],
  openGraph: {
    title: "Passcit — U.S. Citizenship Test Practice",
    description:
      "Study and prepare for the official USCIS naturalization civics test with flashcards, practice interviews, and progress tracking.",
    type: "website",
    siteName: "Passcit",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Passcit — U.S. Citizenship Test Practice",
    description:
      "Study and prepare for the official USCIS naturalization civics test with flashcards, practice interviews, and progress tracking.",
  },
  // Not deprecated — appleWebApp stays inside `metadata`, unlike
  // themeColor. Governs iOS standalone-mode behavior specifically:
  // capable removes Safari's browser chrome when launched from the home
  // screen, statusBarStyle controls the status bar's overlay appearance,
  // and title sets the name shown under the home-screen icon (kept short
  // deliberately, matching the manifest's own short_name).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Passcit",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${bodyFont.variable} antialiased`}>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
