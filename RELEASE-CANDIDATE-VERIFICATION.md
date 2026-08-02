# Production Build Verification — Release Candidate Report

## Verification honesty, stated first

**I could not run `npm run build`, `tsc`, `next build`, `eslint`, or `prisma generate`.** This environment has no network access, so `node_modules` was never installed — the actual toolchain has never run once in this project's history.

Everything below is rigorous static analysis targeting the specific error classes a production build catches: server/client boundary violations, unused imports, missing modules, App Router convention errors, unsafe SSR patterns, and dead code. Several checks were done by *executing* code directly. This meaningfully raises confidence. **It is not a substitute for `npm run build`, and running that remains the single most important outstanding step.**

---

## Every Issue Found

### 1. Build roadmap card on the dashboard (build-breaking + user-facing)
A "Build roadmap" section displayed internal development-phase tracking to end users, with "Coming soon" badges — and had become actively wrong, showing the fully-shipped Eligibility Calculator as unavailable. Removing it orphaned **5 dictionary entries and 5 imports**, and those unused imports would have **failed the production build** under `next/typescript`'s unused-vars rule, since `build` is defined as `npm run lint && next build`.

### 2. Dead `enabled` feature flag in the mobile tab bar
Every nav item was `enabled: true`, making the `if (!enabled)` branch and its "coming soon" tooltip unreachable. Removing it orphaned the `nav.comingSoon` dictionary entry.

### 3. Two protected routes missing from the auth middleware
`/eligibility` and `/interview` live under the authenticated `(app)` group but were absent from `proxy.ts`'s matcher. **Verified before fixing that this was not a security hole** — the `(app)` layout performs a real server-side `auth()` check and redirects. But it broke this project's own documented defense-in-depth pattern: two routes had one protection layer where six others had two. Fixed **both** the matcher config and the handler's `isProtectedRoute` condition — changing only one would have been a silent no-op, since the matcher controls invocation and the condition controls the redirect.

### 4. Password reset tokens could print to production logs
`mail.ts` logged the full reset URL whenever SMTP was unconfigured — intentional dev convenience, but the condition is environment-*based*, not environment-*guarded*. If SMTP were ever misconfigured in production, working reset tokens would print in plaintext to server logs: a real credential leak. Now logs a loud error in production (without the link) while preserving the dev behavior exactly.

---

## Every File Modified, and Why

| File | Why |
|---|---|
| `src/app/(app)/dashboard/page.tsx` | Removed the build-roadmap card; removed 5 imports it orphaned (would fail lint) |
| `src/lib/i18n/en.ts` | Removed 6 orphaned dictionary entries (`roadmapTitle`, `roadmapSubtitle`, `live`, `dashboard.comingSoon`, `phases`, `nav.comingSoon`) |
| `src/components/layout/mobile-tab-bar.tsx` | Removed the dead `enabled` flag and its unreachable branch |
| `src/proxy.ts` | Added `/interview` and `/eligibility` to both the matcher and the handler condition |
| `src/lib/mail.ts` | Guarded reset-link logging to non-production; added the `logger` import it required |

No other files were touched. No UI was redesigned, no features added, no speculative refactoring.

---

## Removed

**Pages removed:** none. All 29 routes are legitimate and reachable — including `/offline` (service worker fallback) and `/403` (auth redirect target). There were no demo, debug, test, or placeholder pages.

**Components removed:** none. The dead-file sweep across all 176 source files found **zero** unreferenced files. `Badge` was verified still in use across 5 other files before only its dashboard *import* was removed — the component itself stays.

**Dead code removed:** the roadmap card, the `enabled` feature flag and its unreachable branch, 6 orphaned dictionary entries, 5 orphaned imports.

**Obsolete TODOs:** none existed — zero `TODO`/`FIXME`/`HACK` comments in the codebase.

---

## Verified Clean

- **Server/client boundaries** — zero violations. (My first scan flagged 4; investigating showed 3 were `import type`, fully erased at compile time, and the 4th imported a pure function from a module with only type-level Prisma imports. All false positives from an overly-broad filter.)
- **Dynamic routes** — all 13 API route handlers and all 4 dynamic page components correctly use Next.js 15+'s Promise-based `params`.
- **Metadata** — no `viewport`/`generateViewport` conflict; no client component illegally exports `metadata`.
- **Environment variables** — every var used in source is documented. Three documented-but-unscanned vars verified legitimate rather than assumed stale (`ADMIN_EMAIL`/`ADMIN_PASSWORD` used by `prisma/seed.ts`; `AUTH_SECRET` read by Auth.js itself).
- **Prisma** — generator path matches all 22 imports; `src/generated/` correctly gitignored with `postinstall: prisma generate`; all 21 models present across 3 migrations.
- **API authorization** — all 31 routes checked; the 5 unguarded are exactly those that must be public.
- **SSR safety** — no unguarded module-scope browser API access. (6 flagged by an indentation heuristic; each examined individually, all inside function bodies. For the two least obvious, I traced the call chain to confirm both only run behind a `typeof window` guard.)
- **Lint-error classes** — zero unused imports (176 files), zero `any`, zero raw `<img>`, zero unescaped entities in JSX text nodes.
- **PWA** — manifest executes and validates; service worker syntax valid; all icon paths resolve.
- **Structural** — 179 files balanced, 833 imports resolved.

---

## Remaining Recommendations Before Release Candidate

**Blocking — must happen before RC:**
1. **Run `npm install && npm run build`.** Nothing above substitutes for it. This is the one gate that has never been passed in this project's entire history.
2. **Verify the PWA on real devices** — Android, iPhone/iPad, and desktop installation, plus a real Lighthouse audit. All previously flagged, all still outstanding.

**Strongly recommended:**
3. **Add rate limiting to auth endpoints** (register, login, forgot-password) — flagged in the earlier production audit, still the most significant known security gap.
4. **Confirm HTTPS on the deployment target** — a hard requirement for service workers outside localhost.
5. **Make a deliberate call on registration user-enumeration** — `/api/auth/register` returns a distinct "already exists" error. A common, defensible tradeoff, but it should be a decision rather than an oversight.

**Worth considering:**
6. **No automated test suite.** Extensive verification happened during development by executing code directly, but none of it is wired into CI. This is the largest gap between "carefully built" and "safely changeable."
7. **No CI pipeline and no production error tracking** beyond structured logging.
8. **The PWA icon is functional, not designed** — a real design pass would likely look more polished before public launch.
