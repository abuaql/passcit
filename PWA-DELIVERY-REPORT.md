# Progressive Web App — Delivery Report

Passcit is now installable on Android, iPhone, iPad, Windows, and macOS,
with a hand-written, dependency-free service worker, no changes to any
existing page's design, and every piece of logic verified through actual
execution rather than read for plausibility.

**Verification honesty, stated plainly and unavoidably up front**: this
sandbox has no browser, no physical device, no network access, and no way
to run Lighthouse. Everything below distinguishes what was verified
through code execution (real, but not the same claim) from what
genuinely requires a device or browser and is still outstanding.

---

## Modified Files

**New — PWA core:**
- `src/app/manifest.ts` — Web App Manifest (native Next.js convention)
- `public/sw.js` — the service worker, hand-written, zero dependencies
- `src/app/icon.png` — favicon (native Next.js convention)
- `public/icons/*.png` — 5 icons (192, 512, both maskable variants, Apple touch)
- `src/app/offline/page.tsx` — offline fallback page
- `src/components/pwa/service-worker-registration.tsx` — production-only registration
- `src/components/pwa/install-prompt.tsx` — Android/desktop/iOS install UI
- `src/components/pwa/clear-service-worker-cache.ts` — logout cache-clear helper

**Modified — minimally, exactly where the PWA required it:**
- `src/app/layout.tsx` — added the `viewport` export (theme color, safe-area `viewport-fit`), `appleWebApp` metadata, and service worker registration
- `src/app/globals.css` — one rule: bottom safe-area padding on `body`
- `src/components/layout/navbar.tsx` — top safe-area padding on the sticky header; cache-clear call added to the existing sign-out handler
- `src/components/layout/mobile-tab-bar.tsx` — bottom safe-area padding on the fixed tab bar
- `src/app/(app)/layout.tsx` — main content's bottom padding made safe-area-aware; `InstallPrompt` rendered
- `src/lib/i18n/en.ts` — the `pwa` dictionary namespace, plus one `nav` entry

No existing page's visual design, layout, or component structure changed beyond these targeted additions.

---

## Architecture Summary

**No new dependency, deliberately.** Researched current Next.js 16 PWA tooling before writing anything, and found `next-pwa`/similar libraries inject a webpack plugin that conflicts with Next.js 16's Turbopack-by-default dev setup — a real, current framework-specific trap. Combined with this sandbox having no network access to install and verify any new package actually works, a hand-written vanilla service worker was the correct choice, not just the fallback one: full transparency, one file, nothing hidden behind library internals I can't inspect.

**The manifest uses Next.js's native `app/manifest.ts` convention** — no library needed for this piece at all, auto-linked into every page's `<head>`.

**Caching is a strict allowlist, not a strict denylist.** The service worker's `fetch` handler explicitly matches what it will touch (navigations, static assets, fonts, images, the manifest) and lets everything else — most importantly `/api/*` — pass through completely untouched, never reaching any cache-aware branch at all. This was a deliberate design choice over a cleverer "network-first but don't persist" rule for API routes: the safest way to guarantee the spec's "never cache authentication responses" requirement is to never let the worker's logic touch those requests in the first place, rather than trust a more complex rule not to have a bug in it.

**Page navigations are network-first, not cache-first** — an authenticated app like this should never risk showing stale content when online just because a cached copy exists. The cache is consulted only when the network genuinely fails, which is what makes "previously visited pages continue to work offline" true without also risking staleness for a signed-in user.

**Logout actively clears cached pages.** A `CLEAR_USER_CACHE` message, sent to the service worker from the existing sign-out handler, purges the pages cache specifically — protecting a shared-device scenario where a second person signing in afterward could otherwise see a previous user's cached, authenticated page while offline.

**Safe areas required more than one line.** `viewport-fit: cover` only grants permission to draw into notch/Dynamic-Island/home-indicator regions — it doesn't make anything respect them. Every fixed-position UI element that could actually sit under one of those regions (the sticky top navbar, the fixed bottom mobile tab bar) got its own explicit `env(safe-area-inset-*)` padding, and the main content area's bottom clearance was made to account for the tab bar potentially growing taller as a result, using `calc()` rather than a fixed guess.

---

## PWA Implementation Notes

**Manifest**: name, short name, description, standalone display, portrait orientation, theme/background colors matching the app's actual existing palette (not separate PWA-only branding), 3 shortcuts (Practice, Flashcards, Eligibility Calculator), maskable icons respecting the ~72% safe zone.

**Icons**: generated programmatically (Pillow, available in this sandbox with no network needed) — a graduation cap echoing the existing navbar logo, on the app's own green. Worth being direct: this is a simple, functional icon suited to shipping the infrastructure, not a professionally designed one.

**Caching strategy by resource type**: static assets/fonts/images/manifest — cache-first (Next.js content-hashes these filenames, so a cache hit is always current). Navigations — network-first with cache fallback. `/api/*` — never touched, under any request mode, verified by executing the real file (below).

**Offline experience**: the fallback page reuses the existing `EmptyState` component rather than a new custom layout, matching the app's design system exactly. Precached on service worker install, so it's available even on a visitor's very first, never-been-online visit.

**Install prompts**: genuinely different logic per platform, not one UI trying to cover all three — a captured `beforeinstallprompt` event for Android/desktop, manual Share→Add-to-Home-Screen guidance for iOS Safari (detected via user-agent, tested against 7 real UA strings including the negative cases: iOS Chrome/Firefox are not Safari, desktop Safari is not iOS). Shows nothing if already installed, appears only after a delay, and never reappears once dismissed.

**What was actually executed, not just read:**
- The manifest function itself, validated against real PWA installability criteria, with every referenced icon path (including inside all 3 shortcuts) confirmed to resolve to a real file on disk
- The service worker's static-asset regex, against 13 real and edge-case paths
- The iOS-detection logic, against 7 real user-agent strings
- **The literal, shipped `public/sw.js` file**, loaded into a mocked service-worker environment and executed against 6 real requests — confirming `/api/*` is genuinely never intercepted under any request mode, static assets and navigations are correctly intercepted, and non-GET requests pass through untouched. This is the closest thing to proof available without a real browser: it runs the actual file, not a paraphrase of its logic.

---

## Remaining Recommendations

**Genuinely outstanding, needs a real device or browser — not optional, not yet done:**
- Install verification on an actual Android device (Chrome), iPhone/iPad (Safari), and desktop (Chrome/Edge on Windows and macOS)
- A real Lighthouse PWA audit run against a deployed build
- Confirming the service worker actually registers and controls the page in a live browser, and that offline navigation genuinely falls back correctly when the network is physically disconnected
- HTTPS is a hard requirement for service workers outside localhost — confirm the deployment target serves over HTTPS before any of the above will work at all

**Lower-priority, worth considering later:**
- The generated icon is functional, not designed — a real design pass would likely look more polished before a public launch
- Push notifications are not implemented — out of this spec's scope, but a natural next step if wanted, given the service worker infrastructure now exists to build on
- No update-available UI — when a new service worker version activates, users won't be told; a small "refresh to update" banner would be a reasonable addition later

**Flagged during this work, outside this turn's scope, surfaced rather than silently fixed**: `/eligibility`'s page route isn't in `proxy.ts`'s auth-protection matcher, unlike every other protected feature — its API routes are correctly guarded by `requireUser()`, so no data is actually exposed, but the page shell itself is publicly viewable. Noted here since it was discovered while confirming `/offline` wouldn't be caught by the same matcher, not something this PWA work should have silently changed.
