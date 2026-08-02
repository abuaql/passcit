# Eligibility Calculator — Delivery Report

The most comprehensive USCIS Naturalization Eligibility Calculator this
build could support, matching the existing architecture and code quality
standards. Every rule below was verified against current USCIS sources
before implementation, not assumed from training data — and every
calculation function was tested by actually executing it, not just read
for plausibility.

---

## Modified Files

**New — calculation and data layer:**
- `src/lib/eligibility.ts` — pure calculation logic (313 lines): every date/day-count rule, warning/recommendation derivation, readiness scoring
- `src/lib/eligibility-data.ts` — Prisma-touching layer: create-and-save, and fetch-with-re-derivation
- `src/lib/eligibility-wizard-flow.ts` — pure step-sequencing logic, extracted specifically so it could be tested via execution
- `src/lib/us-states.ts` — the state-of-residence list

**New — API:**
- `src/app/api/eligibility/route.ts` — `POST`, validates and runs the calculation
- `src/app/api/eligibility/[id]/route.ts` — `GET`, ownership-checked fetch

**New — UI:**
- `src/app/(app)/eligibility/page.tsx` — entry point
- `src/components/eligibility/eligibility-wizard.tsx` — orchestrator
- `src/components/eligibility/eligibility-timeline.tsx` — the visual timeline
- `src/components/eligibility/yes-no-toggle.tsx` — shared toggle, extracted after starting to duplicate it twice
- `src/components/eligibility/steps/*.tsx` — all 7 (Personal, Basis, Travel, Military, Selective Service, Additional, Results)

**Modified — schema and migration:**
- `prisma/schema.prisma` — extended `EligibilityBasis` with `MILITARY`, added `MilitaryServiceType` enum, added 6 military fields to `EligibilityCalculation`
- `prisma/migrations/20260801100000_eligibility_calculator/migration.sql`

**Modified — existing app files, minimally:**
- `src/lib/i18n/en.ts` — the full `eligibility` dictionary namespace, plus one line in the existing `nav` namespace
- `src/components/layout/navbar.tsx` — one added link (see note below)

---

## A gap caught and fixed before delivery, not left for "future enhancements"

Checking what already referenced "eligibility" in the codebase, I found the landing page already had a marketing mention of this feature — but tracing further, **the main app's navigation had no link to `/eligibility` at all.** The entire feature was fully built and functional, but unreachable by a logged-in user except by typing the URL directly. This isn't a nice-to-have; an unreachable feature isn't really shippable. Fixed with the single, minimal addition listed above — no broader navigation redesign, matching the spec's "do not redesign unrelated pages."

---

## Architecture Summary

**Reused the existing `EligibilityCalculation` model** rather than introducing a new one, exactly as instructed. Extended it only where the spec genuinely required new data (military service fields, the `MILITARY` basis) — every other new question in the wizard (Selective Service's "are you male," the good-moral-character and state-residency checks) is a transient wizard input that feeds a calculation, never stored as its own column, since only the *result* needed persisting.

**Calculation logic is fully separated from persistence and from UI.** `eligibility.ts` has zero Prisma imports and zero React imports — every function takes plain data in, returns plain data out, which is what made rigorous execution-based testing possible throughout the build. `eligibility-data.ts` is the only file that touches the database. The wizard's step-sequencing logic was similarly extracted into its own pure module partway through, specifically so the conditional routing could be tested the same way.

**Warnings and recommendations are stored and passed as codes, not sentences** (`LONG_ABSENCE_REVIEW`, `CONSULT_USCIS_MILITARY`, etc.), with the results page mapping codes to display text via the i18n dictionary. This keeps the calculation module language-agnostic and makes the stored data durable — a database row from today reads correctly even if the displayed wording changes later.

**The wizard persists nothing mid-flow.** All six steps' state lives in client-side React state, matching how the interview simulation's own wizard already worked. The database receives exactly one write, on final submission — matching the existing model's shape, where every field except `id`/`userId`/`createdAt` is required, not built for partial/draft rows.

**The results page re-derives rather than duplicates.** Viewing a saved calculation recomputes time-dependent values (readiness score, whether it's eligible *now*) fresh against the current date, while directly reusing values that were correctly computed once and don't need re-deriving (`selectiveServiceRequired`, `warnings`) — deliberately avoiding a real bug caught mid-build, where reconstructing the original "is male" input from a stored boolean output would have silently misclassified real cases.

---

## Calculation Rules Implemented

**5-year general rule**: continuous residence 5 years from the Green Card date; physical presence ≥913 days (30 months); eligible to file 90 days before the anniversary.

**3-year rule**: requires both `marriedToUSCitizen` and `spouseIsUSCitizen` true — enforced server-side, not just trusted from the wizard's own flow; continuous residence 3 years; physical presence ≥548 days (18 months); same 90-day window, scaled to the 3-year mark. If the wizard's own answers don't support the 3-year rule, the person is guided to switch to the general rule rather than getting stuck.

**Continuous residence risk**: any single absence ≥180 days flags a review-risk warning (USCIS's rebuttable-presumption range); ≥365 days flags a stronger warning. Verified this is based on the longest *single* trip, not cumulative time abroad, matching USCIS's actual "any single absence" language — confirmed by testing four 50-day trips (200 days cumulative) correctly showing zero risk.

**Military service (INA 328/329)**: deliberately never calculated. Discharge characterization, designated hostility periods, and current-vs-former service status are all USCIS case-by-case determinations this tool has no way to safely estimate. Selecting this path routes straight to a documentation checklist and a recommendation to consult USCIS or an attorney — never a computed date.

**Selective Service**: required for males who held LPR status at any point between ages 18–25, determined live in the UI from the same tested function the server uses. Verified at the exact age boundaries, including the nuance that "aging out" (can no longer register past 26) doesn't erase whether the obligation was met during the years it did apply.

**Age 18+**: a categorical block on current eligibility, independent of how clean the residency math is — verified at the exact 18th-birthday boundary.

**Good moral character**: one non-invasive question, flagging a warning for professional review rather than attempting any assessment — this specifically does not auto-reject eligibility, matching "never automatically reject eligibility solely because of [a flagged concern]."

**3-month state residency**: flags a warning when the applicant hasn't yet met this filing-district requirement.

**Readiness score**: a transparent, explained heuristic (0–100, time-elapsed-based with deductions for real risk factors) — never presented as a legal conclusion.

---

## Remaining / Future Enhancements

- **No automated test suite persists past this session** — every calculation was verified via real execution during the build (30+ scenarios across boundary values, orchestration, and conditional flows), but nothing is wired into CI. Converting the test scripts used throughout this build into a permanent suite would be the highest-value next step.
- **No `PasswordResetToken`-style follow-up here**, but similarly: `EligibilityCalculation` rows accumulate with no cleanup policy. Low priority at current scale, worth a look if usage grows.
- **English only** — the calculator's own strings follow the existing i18n structure, but this app has no second locale yet regardless.
- **No history/list view** for a user's past calculations, even though the data model and the `GET /[id]` route support revisiting a specific one directly. Deliberately out of scope — the spec didn't ask for it, and adding it would have been exactly the "unnecessary abstraction" the spec warned against.
- **The interview-prep timeline marker is intentionally approximate** — anchored to the earliest filing date rather than a predicted interview date, since USCIS processing times vary by field office and can't be estimated reliably from here. A future version could pull live USCIS processing-time data if that becomes available via an API.
