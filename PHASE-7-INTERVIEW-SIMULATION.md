# Phase 7 — Full USCIS Naturalization Interview Simulation

The flagship feature: a complete, guided walkthrough of a real N-400
interview — identity questions, the English reading and writing test, and
the civics test, in that order, following the actual USCIS structure and
pass/fail rules rather than a stylized approximation.

---

## Design grounding

Before writing any code, the real interview structure and rules were
researched and verified against current official sources rather than
assumed from general knowledge:

- **Civics pass/fail**: confirmed 6-of-10 (2008 test) and 12-of-20
  (2020/2025 test), stopping as soon as the result is mathematically
  decided — this already matched the existing `mockInterviewStatus()`
  exactly, so it's reused unchanged.
- **Reading**: up to 3 sentences shown, passes on the first one read
  correctly aloud. Standard is lenient — "ordinary usage," tolerating
  pronunciation/wording errors that don't obscure meaning.
- **Writing**: the officer reads a sentence aloud, the applicant writes
  what they heard, same up-to-3/pass-on-first-correct structure.
- **Speaking**: not a separate test — USCIS determines it from how the
  applicant responds throughout the rest of the interview. No isolated
  "speaking test" step was built; speaking is assessed implicitly through
  Identity Questions and Civics.
- **Sections are graded independently**: real applicants who fail one
  portion are retested only on that portion later, not the whole
  interview. This directly shaped the schema and results screen — Reading,
  Writing, and Civics each have their own pass/fail/not-reached result,
  and failing one doesn't stop the simulation from continuing through the
  rest, matching how a real interview actually proceeds in one sitting.

## The one deliberate privacy decision

**Identity Questions (name, date of birth, address, phone, occupation)
are never scored and never stored.** In a real interview these aren't
questions with a checkable "correct answer" — the officer is confirming
information already on file. What's actually valuable to practice is
answering personal questions fluently and confidently, out loud, in
English — not verifying the answer's content, which this app has no way
to do and shouldn't attempt. The applicant's answer (voice or typed) is
captured in the browser, acknowledged, and discarded — it's never sent to
the server at all. This is enforced structurally: there's no column
anywhere in the schema for identity-answer content, not just a convention
in the application code.

---

## Complete changelog

### New database model (real migration, unlike Phase 6)
- `InterviewSimulation` — one row per interview attempt: per-section
  results (`InterviewSectionResult`: `PASSED` / `FAILED` / `NOT_REACHED`),
  civics correct/incorrect counts, reading/writing attempt detail (JSON,
  bounded to 3 entries each), overall pass/fail, timing.
- `InterviewCivicsAnswer` — one row per civics question actually asked,
  mirroring `PracticeTestAnswer`'s shape deliberately, for both per-
  interview review and cross-interview admin analytics.
- Migration: `prisma/migrations/20260801000000_interview_simulation/` —
  hand-written to match the exact SQL conventions of the two existing
  migrations, then verified field-for-field against the schema (every
  column traces to a real field and vice versa) three separate times
  across the phase as the data layer evolved.

### New content
- `src/lib/interview-sentences.ts` — 18 original reading sentences, 17
  original writing sentences, written fresh using the official USCIS
  vocabulary/topic scope (not reproduced from any specific source's exact
  sentences). Every factual claim checked for accuracy.
- `src/lib/officer-dialogue.ts` — the 6 Identity Questions, plus a varied-
  phrasing dialogue bank (greetings, section transitions, encouragement,
  "please repeat that") so the interview doesn't sound identical on
  repeated attempts, which matters for a tool people will use many times.

### New data layer (`src/lib/interview.ts`)
Reuses `evaluateAnswer()`, `mockInterviewStatus()`, and
`getQuizQuestionPool()` directly — none of that logic is duplicated.
Enforces interview ownership (`{id, userId}`) on every action function at
the data layer itself, not left to individual routes to remember.
Reading/Writing use lenient matching (`CORRECT` or `ALMOST_CORRECT` both
pass, matching USCIS's own "ordinary usage" standard); Civics stays strict
(only exact `CORRECT` counts, matching real civics testing rigor) — a
deliberate difference between two genuinely different real standards, not
an inconsistency.

### New API surface (7 routes, all under `/api/interview`)
`POST /` (start) · `GET /` (history) · `POST /[id]/identity` ·
`POST /[id]/reading` · `POST /[id]/writing` · `POST /[id]/civics` ·
`POST /[id]/complete` · `GET /[id]` (detail). The civics route always
looks up accepted answers from the database itself — the client's claim
about what's correct is never trusted.

### New UI
- `/interview` — launcher (version picker, what-to-expect summary, begin)
- The interview session orchestrator and all 6 steps: Welcome, Identity,
  Reading, Writing, Civics, Results
- `/interview/history` — list of past interviews (server component)
- `/interview/history/[id]` — per-interview review, directly reusing the
  Results screen rather than duplicating the results-display logic
- A reusable status bar (step, live elapsed time, correct/remaining)
  during Civics, matching what the spec asked to be visible

### Navigation (purely additive)
- Practice Hub: the Interview Simulation added as a prominent, badge-
  highlighted card — the natural entry point, positioned above the
  existing three practice modes, which are completely unchanged
- Dashboard: deliberately **not** modified — "Practice" already leads to
  the Hub in one click, where the new feature is now the first thing
  shown, so a second entry point would have been redundant disruption to
  an otherwise-untouched grid

### Admin Analytics extension (purely additive)
Three new functions in `admin-analytics.ts` (`getInterviewOverview`,
`getMostMissedInterviewQuestions`, `getMostDifficultInterviewCategories`),
following the exact aggregation pattern already used by
`getMostMissedQuestions()`/`getCategoryPerformance()` — fetch, aggregate
in JS with a `Map`, since Prisma's `groupBy` doesn't support joined-field
grouping. A new "Interview Simulation" section was added to
`/admin/analytics` entirely after the existing content; verified directly
that all 6 original chart cards remain present and unmodified.

### i18n
Every string in this entire feature was built using the dictionary
pattern established in Phase 6 from the start, rather than hardcoding
text that would need migrating later.

---

## Real issues caught and fixed during the build (not after)

- **A security gap**: the data layer's action functions initially didn't
  verify an interview belonged to the requesting user — a malicious
  authenticated user could have passed someone else's interview ID into
  `recordCivicsAnswer`, `completeInterview`, etc. Caught by reviewing the
  code before building routes on top of it, not after. Fixed by enforcing
  ownership in the data layer itself; a row that exists but belongs to
  someone else now throws the identical "not found" as a row that doesn't
  exist, so an interview ID's existence can't be probed with the wrong
  session.
- **A risky TypeScript pattern**: an early draft used computed dynamic
  object keys (`data: { [resultField]: ... }`) to avoid writing near-
  identical Reading/Writing update logic twice. Reconsidered before
  finalizing — Prisma's generated update types have specific named keys,
  not an index signature, so this had real risk of failing to type-check,
  something not verifiable without running `tsc`. Rewritten as explicit,
  separate, fully-typed functions.
- **A recurring re-render bug, caught three separate times**: several
  officer dialogue lines were initially called inline during render
  (`{officerDialogue.acknowledgeIdentity()}`) rather than computed once
  and stored. Since the dialogue bank picks a *random* variant each call,
  this meant any unrelated re-render (a keystroke, a parent re-rendering)
  would silently swap the displayed line to a different random phrase
  mid-step. Fixed each time by computing the line once, at the exact
  moment it's needed, and storing the result — not the function. This
  pattern is now flagged explicitly here because it recurred three times
  across the build, which is worth being honest about rather than
  presenting as fully internalized.
- **A `getInterviewDetail` gap**: the question select was initially
  missing `category`, which the "weak categories" results computation
  needs. Fixed by adding it once, in the data layer, along with the
  category-performance aggregation itself — so that logic exists in
  exactly one place rather than being duplicated at the API or component
  layer.
- **Unused dictionary entries from a plan that changed**: several history-
  screen strings were written for a table layout that was ultimately built
  as cards instead. Checked each for actual usage before assuming it was
  needed, removed the genuinely unused ones, and — for the one that
  *should* have been used (`loadFailed`) — added the missing error
  handling instead of just deleting the string.
- **A missed navigation wire-up**: the launcher had a "View past
  interviews" string defined since the launcher was first built, but the
  actual link was never rendered. Caught by grepping for its usage rather
  than assuming it had been wired up, and fixed.

---

## Architecture summary

```
/interview                          Launcher (version picker → begin)
  └─ InterviewSession                Step state machine (client)
       ├─ WelcomeStep                Officer greeting
       ├─ IdentityStep                6 questions, voice/typed, never scored/stored
       ├─ ReadingStep                 useSpeechRecognition directly, up to 3 sentences
       ├─ WritingStep                 useSpeech directly (officer dictates), typed answer
       ├─ CivicsStep                  Free-response loop, server-side evaluation
       └─ ResultsStep                 Fetches GET /api/interview/[id]

/interview/history                  List (server component)
/interview/history/[id]             Reuses ResultsStep directly

/api/interview                      POST start, GET history
/api/interview/[id]/identity        POST — mark complete, no content stored
/api/interview/[id]/reading         POST — evaluate via evaluateAnswer()
/api/interview/[id]/writing         POST — evaluate via evaluateAnswer()
/api/interview/[id]/civics          POST — evaluate via evaluateAnswer() + mockInterviewStatus()
/api/interview/[id]/complete        POST — compute overall pass/fail
/api/interview/[id]                 GET — full detail + category performance

src/lib/interview.ts                Data layer — ownership-checked, reuses
                                     evaluateAnswer/mockInterviewStatus/getQuizQuestionPool
src/lib/interview-sentences.ts      Original reading/writing content
src/lib/officer-dialogue.ts         Identity questions + varied officer phrasing
```

**What's reused, explicitly**: the entire voice engine (`useSpeech`,
`useSpeechRecognition`), the entire answer-evaluation engine
(`evaluateAnswer`), the entire civics pass/fail engine
(`mockInterviewStatus`), the civics question-selection engine
(`getQuizQuestionPool`), the auth/logging/i18n infrastructure, and the
existing admin analytics aggregation pattern. **What's new**: the guided
multi-step flow itself (nothing existing was a guided flow — Practice Mode
and the existing Mock Interview are both flat quiz sessions), the Reading/
Writing mechanic (nothing existing tested reading or writing at all), and
the interview-history persistence layer.

**What was deliberately left completely untouched**: `useSpeech.ts`,
`useSpeechRecognition.ts`, `answer-matching.ts` (verified — their exports
are identical to before this phase), the existing Mock Interview
(`mock-interview-client.tsx` has zero import of anything from this
phase's new code), and the Dashboard's quick-links grid.

---

## Testing checklist

Verified by tracing the actual code path for each item — this sandbox has
no way to run the app or a browser, so "verified" means confirmed by
careful static reading, not executed. Marked accordingly.

| Item | Status |
|---|---|
| Desktop layout | ✅ Traced — same responsive Tailwind patterns (`max-w-xl`, responsive grids) used throughout the rest of the app |
| Mobile layout | ✅ Traced — no fixed widths introduced anywhere in the new components; touch targets use the same `Button` component sized in Phase 6 |
| Voice Playback reuse | ✅ Traced — `AudioButton`/`useSpeech` used unmodified; core hook exports confirmed identical to pre-Phase-7 |
| Voice Recognition reuse | ✅ Traced — `useSpeechRecognition` used unmodified in Identity/Reading/Civics; core hook exports confirmed identical |
| Reading Test mechanic | ✅ Traced — up to 3 sentences, stops on first pass, lenient matching, server-evaluated |
| Writing Test mechanic | ✅ Traced — officer dictates via TTS, typed answer, same stop-on-pass structure |
| 2008 rules (10 asked / 6 to pass) | ✅ Traced — confirmed zero hardcoded threshold numbers anywhere in the interview code; values flow from the real `TestVersion` row through every layer |
| 2020 rules (20 asked / 12 to pass) | ✅ Traced — same flow, same verification |
| Interview History list | ✅ Traced — fetches real data, empty state included, error handling added |
| Interview History review | ✅ Traced — reuses ResultsStep, so identical correctness to the just-finished results screen |
| Admin Analytics | ✅ Traced — new functions verified against the existing aggregation pattern; existing 6 charts confirmed unmodified |
| Existing Authentication | ✅ Untouched — no auth files modified this phase |
| Existing Dashboard | ✅ Untouched — confirmed no modifications |
| Existing Browse Questions / Flashcards / Practice Mode | ✅ Untouched |
| Existing Mock Exam (multiple-choice) | ✅ Untouched — confirmed zero import of new interview code |
| Existing Progress Tracking | ✅ Untouched |
| Existing Admin Panel (Questions/Categories/Users/Settings) | ✅ Untouched — only Analytics was extended, and only additively |

**What genuinely still needs a human, a browser, and a microphone**:
actual speech recognition accuracy and latency, actual TTS voice quality
and pacing, real mobile touch/tap behavior, and the complete
`npm install && npm run build` toolchain this sandbox cannot execute.
Static tracing confirms the code is structurally correct and internally
consistent; it cannot confirm the lived experience of speaking to it.

---

## Complete list of new/modified files

**New (23 files + 1 migration):**
`prisma/migrations/20260801000000_interview_simulation/migration.sql` ·
`src/lib/interview.ts` · `src/lib/interview-sentences.ts` ·
`src/lib/officer-dialogue.ts` · `src/app/api/interview/route.ts` ·
`src/app/api/interview/[id]/route.ts` ·
`src/app/api/interview/[id]/identity/route.ts` ·
`src/app/api/interview/[id]/reading/route.ts` ·
`src/app/api/interview/[id]/writing/route.ts` ·
`src/app/api/interview/[id]/civics/route.ts` ·
`src/app/api/interview/[id]/complete/route.ts` ·
`src/app/(app)/interview/page.tsx` ·
`src/app/(app)/interview/history/page.tsx` ·
`src/app/(app)/interview/history/[id]/page.tsx` ·
`src/components/interview/interview-launcher.tsx` ·
`src/components/interview/interview-session.tsx` ·
`src/components/interview/interview-status-bar.tsx` ·
`src/components/interview/steps/welcome-step.tsx` ·
`src/components/interview/steps/identity-step.tsx` ·
`src/components/interview/steps/reading-step.tsx` ·
`src/components/interview/steps/writing-step.tsx` ·
`src/components/interview/steps/civics-step.tsx` ·
`src/components/interview/steps/results-step.tsx` ·
`src/components/interview/voice-start-button.tsx` (extracted during the
UI/UX refinement addendum below)

**Modified (5 files, all additive):**
`prisma/schema.prisma` (new Section 10 + relation fields) ·
`src/lib/i18n/en.ts` (new `interview` namespace + 3 practice-hub strings) ·
`src/app/(app)/practice/page.tsx` (flagship card added) ·
`src/lib/admin-analytics.ts` (3 new functions) ·
`src/app/admin/analytics/page.tsx` (new section added) ·
`README.md` (roadmap updated)

---

## Addendum — UI/UX Refinement Pass

A follow-up pass focused entirely on layout, spacing, realism, and user
experience — no business logic or scoring behavior was touched anywhere
in this addendum. Every item below was verified, not assumed.

**Practice page**: the featured card redesigned as a genuine hero — larger
scale, a tinted gradient background (`from-primary/10` to transparent)
instead of just a colored border, and a meaningful 48px gap before the
regular grid. Reconsidered the CTA mid-build: an early version wrapped a
real `Button` component inside the card's `Link`, which would nest an
actual `<button>` inside an `<a>` — invalid HTML. Fixed by keeping the
whole card clickable and using a prominent styled `<span>` for the CTA
instead.

**Launcher**: added the realism/confidence-building copy, and a duration
estimate that scales with the selected test version's civics question
count rather than a single fixed number. A fade-in transition into the
live session uses only core Tailwind opacity/transition utilities — an
earlier draft used `animate-in fade-in` classes from `tailwindcss-animate`,
a plugin that isn't installed in this project, which would have been
silently ineffective (no error, just no visual effect).

**Progress breadcrumb**: shown throughout all six steps, not just Civics
where status display previously lived. Adapted from a vertical text
checklist to a compact horizontal dot row with the current step's full
name shown as text alongside it, since six full labels in a row don't
survive mobile width. Reading and Writing were restructured to compute
their varying content once into a single variable, then wrap it a single
time with the status bar, rather than duplicating the bar across three
separate early returns each.

**Conversational continuity**: found that Reading and Writing's
section-outcome messages were static, unvarying strings while Civics
already used randomized officer dialogue for its feedback — inconsistent
voice across the same interview. Added three new shared dialogue
functions (`tryDifferentSentence`, `sectionPassed`, `sectionMovingOn`)
used across all three graded sections. In every case, the picked line is
computed once at the moment the outcome is determined and stored in
state — calling a randomizing function inline during render was a
mistake this build made and had to fix three separate times earlier, so
this addendum's new code was written to avoid it structurally rather than
by remembering not to repeat it.

**Voice experience — Skip and a real confidence proxy**: true confidence-
based re-prompting isn't achievable without modifying `useSpeechRecognition.ts`
itself — checked, and it types a `confidence` field on the raw browser API
for completeness but never reads or exposes it. Modifying that file would
be a real functional change to an explicitly protected file. Implemented a
reasonable proxy instead: an empty transcript is treated as the low-
confidence case, surfacing the officer's existing "could you repeat that?"
line — which also happened to fix a genuine dead-end where nothing
previously rendered in that state at all. Skip reuses the existing
empty-answer-is-incorrect evaluation path with zero new scoring logic — a
guard clause (`!answerText.trim()`) that had been redundant defense for
the two existing submission paths was quietly also blocking Skip's
intentional empty submission, caught by tracing the call chain rather than
assuming the button would work once wired up.

**Step-to-step transitions**: re-reading the original request surfaced a
real gap — a fade had only been built for entering the interview, not
between the six steps inside it. Added a centralized `goToStep()` that
every transition in the orchestrator now routes through, rather than
five separate call sites each needing to remember to animate. The first
version set the new step and `visible(true)` in the same callback, which
React batches into one render — meaning the "fade in" wouldn't have
actually been visible, just an instant appearance after the fade-out.
Fixed with `requestAnimationFrame` to force a real paint at opacity-0
first, the same technique already used correctly for the launcher's own
entry transition.

**Results screen**: added a formal report header (test version name,
"Practice Interview Report" framing) and gave the pass/fail banner a
tinted background matching the pattern from the Practice page hero, for
visual consistency across the whole feature rather than one screen.
Improved the civics review list with numbered badges and a subtle
correct/incorrect background tint for faster scanning on the longer
2020-test review lists.

**Button consistency, made structural**: found the exact same "start
speaking" button duplicated, pixel-identical, across Identity, Reading
(×2), and Civics. Extracted a shared `VoiceStartButton` component and
replaced all four instances — confirmed via grep afterward that zero
copies of the old inline pattern remained.

**A dedicated accessibility pass**, since "Accessible" was named in the
original request's UI/UX requirements but hadn't had focused attention:
- Computed actual WCAG contrast (not eyeballed) for every new tinted
  gradient background introduced this pass, using the worst-case (most
  saturated) gradient stop against foreground text. All pass comfortably
  in both light and dark mode (11.2–14.8:1, well above the 4.5:1 AA
  minimum).
- Verified every interactive element in every new component is a real
  `<button>` or `<Link>`, never a clickable `<div>`/`<span>` — confirmed
  by tracing every `onClick` in the interview components to its element.
- Found and fixed a real gap: 7 custom interactive elements across 5
  files (the `VoiceStartButton`, the launcher's version-picker buttons,
  two typed-fallback toggle links, the Skip button, the History link, the
  "back to history" link, and the Writing step's Play button) had zero
  `focus-visible` treatment — they'd have relied entirely on inconsistent
  browser-default outlines instead of this app's established focus-ring
  language. Fixed all 7 to match the exact convention used by the shared
  `Button` component.

**Verification**: 155 files, all balanced, 739 imports resolved,
confirmed after every meaningful change throughout this addendum, not
just at the end.
