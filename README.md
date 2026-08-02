# Passcit — Phase 2: Official USCIS Study Engine

A Duolingo-inspired study app for the official USCIS naturalization civics test.
This is **Phase 2 of 9** — see [Roadmap](#roadmap) at the bottom.

> 📌 Working name: the app is called "Passcit" throughout the code (renamed
> from "CivicsPrep"). Rename freely — it's a placeholder, not a registered
> product.

## What's in Phase 1 (Foundation)

- ✅ Sign up, log in, log out (email + password)
- ✅ Password reset (email link, 1-hour expiry)
- ✅ Profile page (update name, change password)
- ✅ Optional Google sign-in (auto-enables if you add credentials)
- ✅ Protected routes (proxy + server-side check, defense in depth)
- ✅ Light/dark mode
- ✅ Responsive shell: top nav on desktop, bottom tab bar on mobile
- ✅ Reusable UI kit (`src/components/ui`) in a Duolingo-style visual language
- ✅ SEO basics: metadata, `robots.ts`, `sitemap.ts`
- ✅ `/api/health` endpoint to verify DB connectivity after deploy

## What's in Phase 2 (Study Engine)

- ✅ **Two full official USCIS civics tests** — the 2008 test (100 questions)
  and the 2020 test (128 questions), both sourced from official USCIS
  documents: category, subcategory, every accepted answer (not just one),
  the 65/20 senior-exception flag, and current officeholder answers
  (President, VP, Speaker, Chief Justice) verified as of this build
- ✅ **Multi-test-version architecture** — every question belongs to a
  `TestVersion`; the 2008 test is seeded as the default. A future version
  can be added later as pure data, no schema change needed — see
  [Multi-version support](#multi-version-support) below
- ✅ **Version switcher** — pick which test to study from the navbar; the
  choice persists per-user and every page (Browse, Flashcards, Practice,
  Dashboard) respects it
- ✅ Tags, independent from USCIS's fixed category/subcategory taxonomy, for
  cross-cutting browsing ("Constitution," "Elections," "Wars," …)
- ✅ Browse Questions (search, category filter, tag filter, favorites filter)
- ✅ Question Details page (all accepted answers, explanation, tags)
- ✅ Favorites (heart toggle everywhere a question appears)
- ✅ Flashcards (flip card, filter by category/favorites/needs-practice, mark
  Known / Needs practice)
- ✅ Practice Mode (multiple-choice, instant feedback — all questions, one
  category, or just what you've missed before)
- ✅ Random Question mode (one at a time, no scoring, no pressure)
- ✅ Mock Interview mode — the *real* format for whichever test is active:
  10 questions/6 to pass for the 2008 test, 20 questions/12 to pass for the
  2020 test, stopping early the instant pass or fail is mathematically
  decided, just like the actual interview
- ✅ Progress tracking (per-question correct/incorrect counts, study status)
  and a real dashboard: questions completed, accuracy, study streak,
  favorites, last activity

**Not yet built** (later phases): AI/voice recognition, Arabic translation,
reminders/notifications, spaced repetition, the eligibility calculator, and
the admin panel — all deliberately out of scope for this phase.

## Voice Practice (Stage 1)

Every question and every official answer can be read aloud — a speaker icon
next to each, in Browse Questions, Flashcards, Practice Mode, and Mock
Interview. Built entirely on the browser's own Web Speech API
(`speechSynthesis`): no paid API, no server involvement, no new
dependency, and nothing added to the database.

- **`src/hooks/useSpeech.ts`** — the reusable hook. Automatically scores
  and picks the best available American English voice from whatever the
  browser exposes (voice lists vary a lot: Chrome/Android usually offer
  "Google US English," Safari/iOS offer "Samantha" or newer Siri voices,
  Edge sometimes offers higher-quality "...Online (Natural)..." voices —
  the picker ranks by signal rather than one hardcoded name). Voice
  loading is handled asynchronously (`voiceschanged`) since Chrome/Edge
  return an empty voice list on the very first call after page load.
- **`src/components/ui/audio-button.tsx`** — the reusable speaker button.
  Only one plays at a time anywhere on the page (starting a new one stops
  whatever was playing); clicking a playing button stops it; renders as a
  disabled, clearly-labeled icon on the rare browser with no Speech API at
  all instead of failing silently.
- **`src/components/ui/speed-control.tsx`** — 0.75x / 1x / 1.25x, shared
  across every page via the hook's state, remembered for the session via
  `sessionStorage`.
- In the Practice Mode / Mock Interview multiple-choice view, **every**
  option gets a speaker button, not just the correct one — giving only
  the correct answer a speaker icon would visually give away the answer
  before you'd picked.
- Deliberately not wired up in Random Question mode — it wasn't part of
  this stage's scope, so it's unchanged for now rather than assumed.

## Admin Panel (Phase 5)

A complete, secure admin system at `/admin` — dashboard, question/category/user
management, site settings, and analytics — entirely separate from the student
experience. Nothing about student functionality, auth flows, Voice Playback,
or Voice Interview changed; three narrow, specifically-justified additions
were made to already-existing protected files, explained below.

### Architecture

**Routing and protection (defense in depth, same pattern used everywhere
else in this app):**
- `proxy.ts` (named `middleware.ts` at the time this phase was built —
  renamed under Phase 6's Next.js audit, see below) already redirected
  non-admins away from `/admin/*` — the only change *in this phase* was
  the redirect *target* for that case, from `/dashboard` to a new `/403`
  page, so hitting an admin route as a logged-in non-admin now shows an
  actual "access denied" page instead of a silent bounce.
- `src/app/admin/layout.tsx` re-checks `role === "ADMIN"` server-side —
  the second line of defense, mirroring exactly how `(app)/layout.tsx`
  already re-checks authentication.
- Every admin API route calls `src/lib/require-admin.ts` at the top — a
  third check, so even a route hit directly (bypassing the UI) is protected.
- The admin section has its **own sidebar/top nav** (`admin/layout.tsx`),
  entirely separate from `navbar.tsx` and `mobile-tab-bar.tsx`. Those files
  were never touched, so admin links can't leak into student navigation by
  construction, not just by care.

**The two schema additions** (now part of
`prisma/migrations/20260730000000_baseline/`):
- `User.isActive` — makes "enable/disable accounts" a real, working
  feature. Checked in `auth.ts`'s Credentials `authorize()` (blocks
  disabled accounts from password login) and in a new `signIn` callback
  (blocks disabled accounts from Google login too — without it, a disabled
  user could simply switch to Google to bypass the restriction). Normal,
  enabled users are completely unaffected by either check. Disabling
  doesn't invalidate an already-active session instantly — sessions are
  JWT-based/stateless, so it takes effect on the account's next login
  attempt. That's a standard, honest tradeoff of stateless sessions, not a
  gap introduced here.
- `SiteSettings` — a singleton table (application code always reads/writes
  the row with a fixed id `"singleton"`, since Prisma/MySQL have no clean
  native "at most one row" constraint) for site name, logo URL, a stored
  voice-default-rate preference, and a maintenance-mode flag.

**Design decisions worth knowing about:**
- **"Category Management" operates on the existing `Tag` model, not
  `QuestionCategory`.** The latter is a fixed 3-value enum deeply wired
  into the student app (badges, filters, Practice Mode's dedicated
  category cards) — letting admins create/delete values there would mean
  either breaking existing functionality or a much larger migration
  reassigning 228 questions. `Tag` already existed specifically as
  "flexible, cross-cutting, independent from the fixed taxonomy" (see
  Phase 2's docs above) and already supports real CRUD with question
  counts — it's the correct, safe target for this feature. Explained on
  the admin Categories page itself, not just here.
- **"Default Test Version" reads/writes `TestVersion.isDefault`
  directly** rather than duplicating that fact into a new `SiteSettings`
  field, avoiding two sources of truth that could drift out of sync.
- **Voice defaults and maintenance mode are stored but not enforced.**
  Wiring the stored voice rate into `useSpeech.ts`, or making maintenance
  mode actually gate the student app, would mean modifying files this
  phase explicitly leaves untouched. Both are labeled as such directly in
  the Settings UI — honest about being a data field today, not a
  fully-wired feature yet.
- **Analytics charts are hand-built SVG/CSS** (`src/components/admin/charts.tsx`),
  not a charting library. Given how much earlier trouble a single dependency
  conflict caused in this project, adding a new npm package for what are
  fundamentally simple bar/line charts felt like unnecessary risk.
- A safety check in `PATCH /api/admin/users/[id]` prevents an admin from
  demoting or disabling their *own* account — without it, an admin could
  lock themselves out with no one able to undo it.

### Testing checklist

- [ ] Log in as a non-admin user, visit `/admin` directly — redirected to
      `/403`, which shows a proper page (not a broken redirect loop)
- [ ] Log in as an admin — sidebar nav appears, and it does **not** appear
      anywhere in the regular student navbar or mobile tab bar
- [ ] `/admin` dashboard shows real numbers for all 10 stats, not zeros
      (assuming you've done some practice sessions as a student first)
- [ ] `/admin/questions` — search, filter by version/category, pagination
      all work; create a question, confirm it appears; edit it, use
      **Preview** to see the student-facing rendering before saving;
      duplicate a question — confirm the copy is inactive and numbered
      past the version's highest existing number; delete a question —
      confirm dialog appears first, toast confirms after
- [ ] Export questions to JSON, then re-import that same file — should
      report updates, not duplicate errors
- [ ] `/admin/categories` — create, rename, delete a category; question
      counts update correctly
- [ ] `/admin/users` — search by name/email; promote a user to admin, log
      in as them, confirm they can reach `/admin`; demote them back;
      disable an account, confirm that account can no longer log in;
      re-enable it, confirm login works again
- [ ] Try to disable or demote your **own** admin account — blocked with a
      clear message
- [ ] `/admin/users/[id]` — shows accurate progress stats and full
      practice/mock-exam history for that specific user
- [ ] `/admin/settings` — change site name and save; change the default
      test version and confirm `TestVersion.isDefault` actually moved
      (check Prisma Studio, or that new signups start on the new default)
- [ ] `/admin/analytics` — all 6 charts render without errors, including
      on a mostly-empty database (should show "No data yet," not crash)
- [ ] Confirm nothing changed for students: sign-in, Browse Questions,
      Flashcards, Practice Mode, Mock Interview, and both Voice Playback
      and Voice Interview Mode all still work exactly as before

## Voice Interview Mode (Stage 2)

Builds on Stage 1 (text-to-speech) with the other half: speak an answer,
get evaluated. A "Speak Answer" button appears in Browse Questions (the
question detail page), Flashcards, Practice Mode, and Mock Interview.
Entirely client-side — no backend, no paid API, no AI service, no
database or schema change. This is a fully standalone addition; nothing
about Stage 1, auth, navigation, or the database was touched.

### Speech recognition architecture

- **`src/hooks/useSpeechRecognition.ts`** wraps the browser's own
  `SpeechRecognition` (`webkitSpeechRecognition` on Chrome/Edge/Safari).
  Its own local TypeScript types describe the API rather than trusting
  `lib.dom.d.ts` to already have them — unlike `SpeechSynthesis`,
  `SpeechRecognition` typings have historically been inconsistent across
  TypeScript versions, and getting that wrong would fail the build. These
  types are scoped under unique names, so there's no risk of colliding
  with anything the DOM lib does provide.
- Exposes a clean **status lifecycle** — `idle → listening → done | error
  → idle` — rather than making consuming components infer state from
  raw event timing.
- **Microphone permission is requested only inside the button's own click
  handler**, never proactively. `continuous = false` means the browser's
  own silence detection stops listening automatically once you pause —
  nothing extra needed to satisfy "stop automatically."
- **Only one microphone session at a time anywhere on the page**: starting
  a new one looks up a shared module-level "active session" record and
  stops whatever was previously listening first, mirroring how Stage 1's
  audio playback works, adapted for the fact that `SpeechRecognition`
  sessions are per-object rather than one global API call.
- **`src/components/ui/voice-answer-recorder.tsx`** is the reusable "Speak
  Answer" widget: idle button → listening animation with a live interim
  transcript → a brief, deliberate "Evaluating…" beat → verdict, with the
  official answer always shown regardless of the result, and unlimited
  retry. Renders a plain explanatory message instead of a button on
  browsers with no Speech API at all.
- Each surface gives the widget a `key` tied to the question's id.
  `FlashcardDeck` and `MultipleChoiceQuestion` swap which question they're
  showing by changing props, not by unmounting — without a fresh `key`
  per question, a previous question's leftover transcript/verdict would
  stick around when you moved to the next one.

### Answer matching algorithm

**`src/lib/answer-matching.ts`** — a deterministic, fully offline pipeline,
not a machine-learning model. Worth being direct about what that means: it
handles wording, filler words, and transcription noise well, but it
can't recognize a genuine paraphrase that shares no vocabulary with the
official answer (describing "the Constitution" as "the highest law of the
land" without saying the word will score as incorrect). That's the honest
tradeoff of "no AI services."

1. **Normalize** both the transcript and each accepted answer: lowercase,
   strip punctuation, collapse abbreviations split apart by punctuation
   stripping ("D.C." → isolated "d"/"c" → back to "dc"), strip filler
   words and hedges ("um," "i think," "my answer is"), drop a/an/the/and/or,
   apply a small hand-picked table of civics-relevant synonyms (US/America/
   United States, Congress/legislature, President/chief executive, and
   similar — not a general thesaurus), convert spoken compound numbers
   ("twenty-seven" → "27"), and lightly stem plurals.
2. **Score** the normalized transcript against each accepted answer,
   blending three signals: outright containment (common — a short official
   answer spoken inside a fuller sentence), word-level recall with
   per-word fuzzy matching via Levenshtein distance (catches minor
   mis-transcriptions like "consitution"), and whole-string edit-distance
   similarity as a catch-all.
3. **Verdict**: for ordinary questions, the best-scoring accepted answer
   determines Correct (≥0.72) / Almost Correct (≥0.4) / Incorrect. For
   "name two/three…" questions, it separately checks how many *distinct*
   accepted answers were named (each against a lower per-item bar, since
   it only has to be identified within a longer utterance) and requires
   that count to meet the question's required number for a full Correct.

This was tested against 25 realistic cases before shipping — including the
exact examples from the spec ("The Constitution" and "Constitution" both
correct) — not just reasoned about. That process caught two real bugs:
compound spoken numbers ("twenty seven") were being mapped word-by-word
instead of combined into 27, and abbreviations with periods ("D.C.") were
silently broken by the punctuation-stripping step running before
abbreviation handling. Both are fixed in the shipped version.

One deliberate limitation: in Practice Mode and Mock Interview, the shared
quiz-question data doesn't carry how many answers a question requires
("name two…"), and getting that added would mean modifying `quiz.ts`'s
multiple-choice generation logic — working code this change didn't need to
touch. Voice evaluation there defaults to "any one accepted answer is
enough," which affects roughly 6% of questions. Browse Questions and
Flashcards fetch the real count and evaluate multi-answer questions fully
correctly.

## Multi-version support

Every `Question` belongs to exactly one `TestVersion`, with numbering
unique *within* that version (`@@unique([testVersionId, number])`) rather
than globally — the 2020 test's own #1–128 legitimately reuses numbers the
2008 test also uses. Adding a future USCIS test version means adding one
config entry to `prisma/seed.ts` plus its own `questions-*.json`; nothing
in the schema changes.

A few design decisions worth knowing about if you're extending this:

- **Streak and "last activity" are global, not per-version.** Switching
  from studying the 2008 test to the 2020 test never resets your streak —
  a streak is about the daily habit, not which question bank you happened
  to open. "Questions completed," "accuracy," and "favorites" *are*
  scoped per version, since mixing two different-sized question pools into
  one percentage wouldn't mean anything.
- **`User.activeTestVersionId`** stores which version a user is currently
  studying (nullable — falls back to whichever `TestVersion` has
  `isDefault: true` if unset). Switching versions never touches any other
  data: progress, favorites, and practice history all live on rows scoped
  to a specific `Question`, and every `Question` belongs to exactly one
  version, so there's nothing to migrate.
- **Four questions per version have no single correct answer** — your
  state's Senator, Representative, Governor, and capital depend on where
  you live. These stay out of auto-graded quiz modes (Practice Mode, Mock
  Interview) for both versions, but remain fully visible in Browse,
  Question Details, and Flashcards.
- **The 2008 and 2020 tests use genuinely different category structures**,
  not just different numbering — the 2020 test dropped the 2008 test's
  standalone "Geography" subcategory, for instance. `category` stays a
  fixed 3-value enum shared across versions for consistent top-level
  filtering; `subcategory` is a free string that faithfully reflects each
  version's own actual taxonomy.



## Tech stack (and why these exact versions)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Current stable major as of mid-2026; Turbopack is now the default bundler, Node 20+ required |
| Language | TypeScript 5, strict mode | |
| Styling | Tailwind CSS v4 | CSS-first config (`@theme` in `globals.css`) — there's intentionally no `tailwind.config.ts`, that file is gone in v4 |
| Auth | Auth.js v5 (`next-auth`) | Pinned to an exact beta (`5.0.0-beta.32`) rather than the floating `beta` tag, on purpose — see Troubleshooting |
| ORM | Prisma ORM 7 | **Different setup than most tutorials** — mandatory driver adapters, `prisma.config.ts`, custom client output path. Details below. |
| Database | MySQL | Via `@prisma/adapter-mariadb`, works with Hostinger, PlanetScale, local Docker, etc. |
| Email | Nodemailer | Falls back to console-logging the reset link if SMTP isn't configured |

## Folder structure

```
passcit/
├─ prisma/
│  ├─ schema.prisma       # full data model for all 9 phases
│  ├─ seed.ts             # loads both test versions + all questions + admin user
│  ├─ migrations/
│  │  ├─ migration_lock.toml
│  │  ├─ 20260730000000_baseline/
│  │  │  └─ migration.sql     # see "About the included migrations" below
│  │  └─ 20260801000000_interview_simulation/
│  │     └─ migration.sql     # InterviewSimulation + InterviewCivicsAnswer (Phase 7)
│  └─ data/
│     ├─ questions-2008.json   # the official 100 questions, sourced and verified
│     └─ questions-2020.json   # the official 128 questions, sourced and verified
├─ prisma.config.ts       # Prisma 7 CLI config (connection string, seed command)
├─ src/
│  ├─ app/
│  │  ├─ (auth)/          # login, signup, forgot/reset password — shared centered layout
│  │  ├─ (app)/           # protected pages, shared nav shell
│  │  │  ├─ dashboard/    # real stats: completed, accuracy, streak, favorites, last activity
│  │  │  ├─ profile/
│  │  │  ├─ questions/    # Browse (search/filter) + [id] Question Details
│  │  │  ├─ flashcards/
│  │  │  ├─ practice/     # hub + quiz (Practice Mode) + random + mock-interview
│  │  │  └─ 403/          # access-denied page for non-admins hitting /admin
│  │  ├─ admin/           # admin panel (Phase 5) — own layout, own nav, ADMIN-only
│  │  │  ├─ page.tsx      # dashboard: 8 stat cards, most-missed, most-popular, activity feed
│  │  │  ├─ questions/    # list/filter/import/export + new/[id]/edit (shared form + live preview)
│  │  │  ├─ categories/   # Tag CRUD — cross-cutting labels, distinct from the fixed USCIS category
│  │  │  ├─ users/        # list/search + [id] detail — role & active-status controls
│  │  │  ├─ settings/     # site settings + default test version
│  │  │  └─ analytics/    # DAU/growth line charts, score/usage/category bar charts
│  │  ├─ api/
│  │  │  ├─ auth/         # NextAuth handler, register, forgot/reset password
│  │  │  ├─ user/         # profile update, change password, active test version
│  │  │  ├─ questions/    # favorite toggle, random question
│  │  │  ├─ practice-tests/  # start a session, complete/score it
│  │  │  ├─ progress/     # study-status updates (flashcards, question details)
│  │  │  ├─ admin/        # questions CRUD+import/export, categories, users, settings — all requireAdmin()-guarded
│  │  │  └─ health/       # DB connectivity check
│  │  ├─ layout.tsx       # root layout: fonts, metadata, providers
│  │  ├─ page.tsx         # public landing page
│  │  ├─ globals.css      # design tokens (light/dark), Tailwind v4 theme
│  │  ├─ opengraph-image.tsx  # dynamic OG image via next/og — no static asset needed
│  │  ├─ robots.ts        # disallows /dashboard, /profile, /admin, /api
│  │  └─ sitemap.ts       # public pages only
│  ├─ auth.ts             # FULL Auth.js config: adapter + real providers — Node runtime only
│  ├─ auth.config.ts      # Edge-safe subset: session/pages/callbacks, zero database code
│  ├─ proxy.ts            # route protection — imports auth.config.ts, NEVER auth.ts
│  ├─ components/
│  │  ├─ ui/              # Button, Card, Input, Badge, Toast, ConfirmDialog, Pagination, EmptyState…
│  │  ├─ layout/          # Navbar, MobileTabBar, ThemeToggle, Footer, TestVersionSwitcher
│  │  ├─ auth/            # form components for each auth page
│  │  ├─ profile/         # profile edit forms
│  │  ├─ marketing/       # landing page pieces
│  │  ├─ questions/       # QuestionCard, FavoriteButton, filters, study-status picker
│  │  ├─ flashcards/      # StudyFlashcard, FlashcardDeck
│  │  ├─ practice/        # QuizSession (shared engine), MultipleChoiceQuestion, results
│  │  ├─ dashboard/       # StatCard
│  │  └─ admin/           # tables, filters, forms, charts — one component per admin concern
│  ├─ lib/
│  │  ├─ prisma.ts        # Prisma Client singleton
│  │  ├─ db-adapter.ts    # builds the MySQL driver adapter from DATABASE_URL
│  │  ├─ mail.ts          # password-reset email (+ dev console fallback)
│  │  ├─ utils.ts         # cn() className helper, date formatting, isUniqueConstraintError()
│  │  ├─ logger.ts        # minimal structured logging (JSON in prod, readable in dev) — no new dependency
│  │  ├─ questions.ts     # browse/search/random/quiz-pool queries
│  │  ├─ progress.ts      # favorites, study status, streak logic, dashboard stats
│  │  ├─ quiz.ts          # multiple-choice generation, mock-interview pass/fail rule
│  │  ├─ categories.ts    # category labels/colors shared across components
│  │  ├─ require-admin.ts # guard used by every admin API route
│  │  ├─ admin*.ts        # admin.ts, admin-questions.ts, admin-tags.ts, admin-users.ts,
│  │  │                   # admin-settings.ts, admin-analytics.ts — one file per admin concern
│  │  ├─ i18n/            # en.ts (the string dictionary) + index.ts (barrel export)
│  │  └─ validations/     # Zod schemas
│  ├─ hooks/               # useSpeech (TTS), useSpeechRecognition (STT)
│  ├─ types/next-auth.d.ts # session/user type augmentation
│  └─ generated/prisma/   # 🤖 generated by `prisma generate` — do not edit, not committed
├─ docker-compose.yml     # local MySQL for development
├─ PHASE-6-AUDIT-REPORT.md # full production-readiness audit: changelog, issues, score
└─ .env.example
```

Why this shape is mobile-ready later: everything the app *does* lives behind
`/api/*` REST routes with plain JSON in/out. A future React Native or Flutter
app calls those same routes — the backend doesn't change. The one thing a
mobile client would need that isn't here yet is a token-based sign-in (Auth.js
sessions are cookie-based, which doesn't suit native apps); that's a small,
additive change when you get there, not a rewrite.

## About the included migrations

`prisma/migrations/` ships with two migrations:

- **`20260730000000_baseline`** — every model except the interview
  simulation (all the accounts/auth, questions, flashcards, progress,
  practice-test, admin, and settings tables). This is a consolidated
  replacement for what used to be two separate migrations
  (`20260730000000_init` and `20260731051758_phase5_admin`) — merged into
  one after they were found to have diverged from an existing
  development database's own recorded history (details below, kept for
  the record rather than quietly dropped).
- **`20260801000000_interview_simulation`** — `InterviewSimulation` and
  `InterviewCivicsAnswer`, the newest addition.

Both were hand-written directly against `schema.prisma`, not generated
by running the Prisma CLI — this project's build environment has no
network or database access, so the CLI itself was never available to
generate and verify them the normal way. They were checked with
dedicated scripts that cross-reference every table, column, foreign key
(including `onDelete` behavior), index, and enum in the SQL against the
schema — every one of the 21 models and 7 enums in `schema.prisma` maps
to exactly one `CREATE TABLE` or SQL `ENUM(...)` across these two files,
with zero duplicates or gaps. That's real, but it's a different kind of
confidence than what the actual tool running against a real database
gives you, and it's worth being direct about that difference rather than
overstating it.

**On a fresh database — nothing has run against it yet** — `npx prisma
migrate dev` (no flags needed) applies both directly, and the plain
install sequence in [Setup](#setup) works end to end with no manual
intervention.

### Why this changed from three migrations to two

An earlier version of this project had three: `init`, `admin_panel`
(hand-chosen name), and `interview_simulation`. On at least one real
development database, the actual Prisma CLI had been run for real at
some point, and recorded a *different* auto-generated name for the
admin-panel change — `20260731051758_phase5_admin`, a precise,
to-the-second timestamp, versus this project's hand-chosen
`20260731000000_admin_panel`. Prisma tracks applied migrations by folder
name in its own `_prisma_migrations` table, not by content, so that
name mismatch alone caused real friction. Renaming the folder to match
narrowed the problem, but didn't fully resolve it — the file's exact
content, never having come from that database's real history, produced
"modified after applied" and drift warnings on top of the name issue.

Consolidating `init` and `admin_panel` into one verified-identical
`baseline` migration (confirmed column-for-column, index-for-index,
foreign-key-for-foreign-key equivalent to the two it replaces, using the
same kind of cross-reference script mentioned above) removes the
project-side inconsistency this caused. It's a genuinely cleaner project
from here forward — any new clone, CI run, or fresh database will apply
cleanly with zero ambiguity.

**What this does not do, stated plainly**: it cannot retroactively
reconcile a database that already has `_prisma_migrations` rows
recorded under the old three-migration names. No restructuring of this
project's files can do that — Prisma's own tracking table lives in your
database, not in this repo, and reconciling a database's recorded
history with a changed set of migration files requires touching that
history somehow. Prisma provides exactly three tools for that:
`migrate reset` (rebuilds from scratch — real data loss), `migrate
resolve` or a direct edit to `_prisma_migrations` (tells Prisma what's
already true, without running SQL or touching any real table), or
`db push` (skips migration history entirely). If your database already
has migrations applied under the old names, one of the middle two is
necessary — there isn't a fourth option. `migrate resolve` is the
narrower, more precise tool of the two (it edits one row at a time
rather than the whole table), and — worth repeating since it's easy to
read past — neither it nor a direct edit of `_prisma_migrations` can
touch `User`, `Question`, `SiteSettings`, or any table your data
actually lives in; that table only stores migration bookkeeping.

**On a database that's never seen any version of this project's
migrations** (a fresh Docker container, a new environment, CI), none of
the above applies — `migrate dev` or `migrate deploy` will simply apply
both migrations in order and everything works with no manual steps.

## Prerequisites

- Node.js **20.9+** (Next.js 16's minimum)
- A MySQL database — either:
  - Docker (for local dev — `docker compose up -d` uses the included compose file), or
  - A Hostinger MySQL database (or any MySQL 8+), reachable now for dev

## Windows quickstart (Docker Desktop)

The commands below use PowerShell. This is the setup this whole project is
pre-configured for — `docker-compose.yml` and `.env.example` already match
each other, so there's nothing to reconcile.

1. **Install [Node.js 20+ LTS](https://nodejs.org/)** — run the Windows
   installer, accept the defaults. Confirm it worked: `node -v` in a new
   PowerShell window should print `v20.x` or higher.
2. **Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)** —
   run the installer. It'll prompt to enable WSL2 if it isn't already on;
   accept, and restart Windows if asked to. Launch Docker Desktop afterward
   and wait for the whale icon in your system tray to say it's running.
3. **Unzip the project** anywhere, e.g. `C:\Users\<you>\passcit`.
4. **Open PowerShell in that folder** — in File Explorer,
   Shift+right-click the folder → "Open PowerShell window here."
5. **Install dependencies:**
   ```powershell
   npm install
   ```
   This also runs `prisma generate` automatically — no database needed yet.
6. **Add the `.env` file** — place the `.env` I generated alongside
   `package.json` (same folder). It already matches step 7 below exactly.
7. **Start MySQL:**
   ```powershell
   docker compose up -d
   ```
   First run downloads the MySQL 8.4 image, so give it a minute. Check it's
   ready with `docker ps` — you're looking for `(healthy)` next to the
   `civicsprep` container before continuing.
8. **Create the database tables** — a migration already ships with this
   project (`prisma/migrations/`), so this applies it rather than
   generating a new one:
   ```powershell
   npx prisma migrate dev
   ```
9. **Load the civics questions:**
   ```powershell
   npm run db:seed
   ```
10. **Run the app:**
    ```powershell
    npm run dev
    ```
    Visit `http://localhost:3000`, sign up, and you should land on
    `/dashboard`.

**Not using Docker?** Install
[MySQL Community Server 8.4](https://dev.mysql.com/downloads/mysql/) for
Windows instead, create a database and user matching what's in `.env`
(or edit `DATABASE_URL` to match whatever you create), then continue from
step 8.

## Setup

```bash
# 1. Install dependencies
npm install
# `postinstall` runs `prisma generate` automatically — this works with
# zero setup, no .env and no database required (see Troubleshooting if
# you're curious why that's safe). If generate gets skipped entirely
# (e.g. npm install --ignore-scripts), run it manually:
npx prisma generate

# 2. Configure environment
cp .env.example .env
# then edit .env — at minimum set DATABASE_URL and AUTH_SECRET
# generate a secret with:
openssl rand -base64 32

# 3. Start a local database (skip if pointing at a remote MySQL already)
docker compose up -d

# 4. Create the database tables — a migration ships with this project
#    (prisma/migrations/), so this applies it directly.
npx prisma migrate dev

# 5. Seed the database — loads both civics tests (2008: 100 questions,
#    2020: 128 questions) plus tags. Also bootstraps an admin account if
#    you set ADMIN_EMAIL / ADMIN_PASSWORD in .env first.
npx prisma db seed

# 6. Run the dev server
npm run dev
```

Visit `http://localhost:3000`.

Steps 1 and 2 can happen in either order — `npm install` never needs a
database. Steps 3–5 do: the app itself (`npm run dev`, `npm run build`, or
any deploy) needs a real, reachable MySQL the moment you hit a page that
touches the database — which in this app is nearly every page, since
almost everything sits behind auth. That's intentional, not a bug: if you
skip straight to step 6, you'll get a clear `DATABASE_URL is not set...`
error out of `src/lib/db-adapter.ts` telling you exactly what to do next.

> **No `package-lock.json` is included.** It gets generated the first time
> you run `npm install`, from the pinned versions in `package.json`. If you
> ever hit an install error again, delete `package-lock.json` and
> `node_modules` and reinstall before assuming the versions themselves are
> wrong — a stale lockfile is a more common cause than a bad pin.

## Testing checklist for this phase

Since I can't run `npm install` or connect to a live database from the
sandbox this was built in, here's exactly what to click through:

- [ ] `npm run build` completes with no type errors
- [ ] Sign up with a new email — you land on `/dashboard`
- [ ] Check the database: `npx prisma studio` → the `User` row has a
      `passwordHash` (never a plain-text password) and a matching `StudyStreak` row
- [ ] Log out, then log back in with the same credentials
- [ ] Try logging in with the wrong password — you get a clear error, not a crash
- [ ] Visit `/dashboard` in an incognito window (logged out) — you're redirected to `/login`
- [ ] On the login page, click "Forgot password?" → submit your email → since
      SMTP probably isn't configured yet, check your **terminal**, not your
      inbox — the reset link prints there
- [ ] Paste that link into your browser, set a new password, confirm you can
      log in with it
- [ ] On `/profile`, update your name, then change your password
- [ ] Toggle dark/light mode (sun/moon icon, top right) — refresh the page,
      confirm it stuck
- [ ] Resize the browser to a phone width — a bottom tab bar should appear
      with Home/Learn/Cards/Tests/Profile all active
- [ ] `curl http://localhost:3000/api/health` → `{"status":"ok","database":"connected"}`

### Phase 2 additions

- [ ] `npx prisma studio` → the `TestVersion` table has 2 rows (2008,
      default; 2020); `Question` has 228 rows total (100 + 128), all with
      `testVersionId` pointing at the right version; `QuestionAnswer` has
      more than 228 rows (many questions accept multiple answers)
- [ ] `/questions` shows 100 questions by default; search for "president"
      and confirm it filters; click a category pill; toggle "Favorites
      only" (should show none until you favorite something)
- [ ] Open a question's detail page, favorite it, refresh — it's still favorited
- [ ] `/flashcards` — flip a card, mark one "I know it" and another "Needs
      practice," then filter by "Needs practice" and confirm only that one shows
- [ ] `/practice` → Practice Mode → Mixed questions — answer a few, confirm
      correct/incorrect shows immediately with an explanation
- [ ] `/practice` → Random Question — reveal an answer, tap "Show me another"
      a few times, confirm it doesn't immediately repeat the same question
- [ ] `/practice` → Mock Interview — answer questions and confirm it stops
      early once you hit 6 correct *or* 5 incorrect, not always at 10
- [ ] Back on `/dashboard`, confirm "Questions completed," "Accuracy," and
      "Favorites" reflect what you just did, and "Last activity" says "Today"

### Multi-version additions

- [ ] The version switcher (top right of the navbar) shows "2008 Civics
      Test" and "2020 Civics Test"
- [ ] Switch to the 2020 test — `/questions` now shows 128 questions, not 100
- [ ] Favorite a question under the 2020 test, then switch back to 2008 —
      that favorite shouldn't appear, since they're entirely different
      `Question` rows. Switch back to 2020 — it's still favorited
- [ ] Your study streak number should **not** change just from switching
      versions
- [ ] `/practice` → Mock Interview under the 2020 test — confirm the intro
      screen says "up to 20 questions," "12 correctly," "9 wrong" (not the
      2008 test's 10/6/5), and that it actually stops at those numbers
- [ ] `/dashboard` stats (completed, accuracy, favorites) should change
      when you switch versions; streak and last activity should not

### Voice Interview Mode (Stage 2)

- [ ] `/questions/[id]` (any question detail page) — "Try it out loud"
      section shows a "Speak Answer" button; clicking it prompts for
      microphone permission the *first* time only
- [ ] Say the exact official answer out loud — get ✅ Correct, with your
      transcript and the official answer both shown
- [ ] Say the answer with an article dropped, filler words, or slightly
      mispronounced — still ✅ Correct
- [ ] Say something unrelated — ❌ Incorrect, official answer still shown
- [ ] Click "Try Again" after a result — goes back to the mic button,
      unlimited retries
- [ ] Stop talking mid-sentence — listening stops on its own within a
      couple seconds, no need to click anything
- [ ] `/flashcards` — flip a card, use "Speak Answer," then go to the next
      card — confirm the recorder resets (no leftover result from the
      previous card)
- [ ] `/practice/quiz` and `/practice/mock-interview` — "Or answer out
      loud" appears below the multiple-choice options; using it doesn't
      interfere with clicking an option normally
- [ ] Deny microphone permission (or test in a browser without Speech
      Recognition, e.g. Firefox) — a friendly explanatory message appears
      instead of anything breaking
- [ ] Confirm Stage 1 (speaker buttons, playback speed) still works
      exactly as before on all four surfaces — nothing here should have
      changed it

## Environment variables

All documented with inline comments in `.env.example`. Only `DATABASE_URL`
and `AUTH_SECRET` are required to run the app; everything else (Google
sign-in, SMTP, admin bootstrap) is optional and safely no-ops when blank.

## Troubleshooting

**`prisma migrate dev` reports drift against the included migrations.**
See [About the included migrations](#about-the-included-migrations)
above for the full explanation. Short version: on a database that's
never had any version of this project's migrations applied, this
shouldn't happen — if it does, `rm -rf prisma/migrations && npx prisma
migrate dev --name baseline` regenerates a fresh migration directly from
`schema.prisma` with the real Prisma CLI. On a database that already has
migrations applied under different names (a common situation as this
project evolved), that command is the wrong fix — see the linked section
for why, and use `prisma migrate resolve` instead, never `migrate reset`
or `db push`, to avoid losing data.

**`next-auth` is pinned to an exact beta version (`5.0.0-beta.32`), not
`"beta"`.** This is deliberate, not an oversight. Auth.js v5 is still
published under the `beta` npm dist-tag — that's expected and is the
standard way to do auth with the App Router — but tracking that tag with
`"next-auth": "beta"` means every `npm install` can silently pick up a
*different* beta with a different peer-dependency graph. That's exactly what
broke Phase 1's first install: a beta shipped that bumped the `nodemailer`
peer requirement from `^6.x` to `^7.0.7`, which conflicted with the
`nodemailer` version pinned here, and npm refused to install
(`ERESOLVE`). Pinning to an exact version fixes today's install and stops it
from happening again on its own. If you deliberately want to move to a newer
beta later, bump `next-auth` and `nodemailer` together — check the new
beta's `peerDependencies` first (`npm view next-auth@beta peerDependencies`)
rather than re-pinning blind.

**`ERESOLVE` errors in general.** If you ever see this on a fresh clone, it
means two packages want incompatible versions of the same dependency. Run
`npm install <package>@<version> --dry-run` on the package npm names in the
error to see what range is actually required, rather than guessing — that's
how the nodemailer conflict above was diagnosed and fixed.

**`npm install` fails with `PrismaConfigEnvError: Missing required
environment variable: DATABASE_URL`.** This would happen on any fresh clone
before you've created a `.env` file, because `postinstall` runs
`prisma generate`, and — per
[Prisma's own docs](https://www.prisma.io/docs/orm/reference/prisma-config-reference) —
every Prisma CLI command loads `prisma.config.ts`, including `generate`,
even though `generate` doesn't need a working database connection at all
(it only turns `schema.prisma` into typed client code). The problem is
specifically the `env()` helper from `prisma/config`: it throws the instant
the named variable is unset, with no way to opt out from inside a schema.
This project's `prisma.config.ts` avoids that entirely by reading
`process.env.DATABASE_URL` directly with a fallback placeholder instead of
using `env()` — so `generate` always has a syntactically valid string to
work with and never throws, regardless of whether you've set up a database
yet. If you ever add another env-backed value to `prisma.config.ts`, follow
the same pattern rather than reaching for `env()`.

**Prisma errors after `npm install`.** Prisma 7 (released Nov 2025) changed
MySQL setup significantly from what most existing tutorials show:
connection config moved from `schema.prisma` into `prisma.config.ts`, the
generated client now lives at `src/generated/prisma` instead of
`node_modules/@prisma/client`, and `PrismaClient` now *requires* an explicit
driver adapter (`src/lib/db-adapter.ts` builds it from `DATABASE_URL`). This
project follows Prisma's own current MySQL quickstart docs — if something's
off, that's the page to compare against:
`https://www.prisma.io/docs/prisma-orm/quickstart/mysql`. This is the one
area I'd sanity-check first if `npm run build` complains.

**Edge Runtime errors mentioning Prisma, `net`, `tls`, or "A Node.js API is
used which is not supported in the Edge Runtime."** This class of error is
no longer possible from `proxy.ts` specifically — Next.js 16 made `proxy.ts`
Node.js-only (Edge is no longer supported there, confirmed in both
[Next.js's own upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
and [Vercel's routing docs](https://vercel.com/docs/routing-middleware)) —
but the project still keeps its Auth.js config split the way
[Auth.js's Edge Compatibility guide](https://authjs.dev/guides/edge-compatibility)
recommends, as a deliberate hedge rather than a strict requirement:

- `src/auth.config.ts` — session strategy, pages, and the `jwt`/`session`
  callbacks only. No adapter, no providers with database-backed
  `authorize()` functions. Safe under either runtime model.
- `src/auth.ts` — the full config: spreads `auth.config.ts`, adds the
  Prisma adapter and the real providers (including the Credentials
  provider, whose `authorize()` queries the database). Only ever imported
  by Route Handlers, Server Actions, API routes, and Server Components.
- `src/proxy.ts` builds its own lightweight `NextAuth(authConfig)`
  instance from the edge-safe config alone, instead of importing `auth`
  from `@/auth`. Route protection still works because sessions here are
  JWT-based — checking one only needs `AUTH_SECRET`, not a database round
  trip.

Why keep an edge-safe split for a file that's now Node-only? Because it's
still entirely correct under Node.js too (Node is a superset of what Edge
could do), and this specific feature's runtime model has had real,
documented inconsistency from the Next.js team in just the last several
months — an implementation that's correct either way costs nothing and
hedges against that settling differently again.

If you add a field to a session or JWT, put the transformation logic in
`auth.config.ts`'s callbacks (shared), not duplicated in `auth.ts`. If you
add a new provider, check whether its `authorize()` touches the database —
if it does, it belongs only in `auth.ts`, never `auth.config.ts`.

**`P3014` shadow database error / `P1010` access denied on
`prisma_migrate_shadow_db...`.** `prisma migrate dev` (not `db push` or
`migrate deploy`) creates a temporary "shadow database" to detect schema
drift, which needs the connecting user to have server-wide CREATE/DROP
privileges — not just privileges on its own database. The official MySQL
Docker image's `MYSQL_USER`/`MYSQL_DATABASE` env vars only grant privileges
scoped to that one database, so this fails out of the box. Two ways to fix it:

*If your container is already running* (you hit this error, so it
probably is) — run this once, no restart or data loss:
```powershell
docker compose exec mysql mysql -u root -pcivicsprep_root -e "GRANT ALL PRIVILEGES ON *.* TO 'civicsprep'@'%'; FLUSH PRIVILEGES;"
```
Then re-run `npx prisma migrate dev`.

*Going forward*, this project's `docker-compose.yml` mounts
`docker/mysql-init/01-grant-shadow-db-privileges.sql`, which runs this same
grant automatically — but only the first time a fresh volume initializes.
If you ever fully reset (`docker compose down -v`), the next
`docker compose up -d` will apply it on its own and you won't need the
manual command again. This grant only affects your local throwaway
container; it has no bearing on production, where Hostinger manages its
own MySQL credentials separately.

**`DriverAdapterError` / connection refused.** Double-check `DATABASE_URL`
is a full connection string (`mysql://user:pass@host:port/dbname`) and that
the database is actually reachable from where you're running the app
(Hostinger databases are sometimes restricted to specific IPs — check
"Remote MySQL" in hPanel).

**Tailwind styles not applying.** There's deliberately no `tailwind.config.ts`
— v4 configures itself from `@theme` in `src/app/globals.css`. If you added
a `tailwind.config.ts` from an old tutorial, delete it.

## Roadmap

Phase 2 turned out to cover more ground than the original phase-by-phase
sketch in Phase 1's README — the question bank, flashcards, practice modes,
and progress dashboard all landed together as one "study engine" delivery,
per how the work was actually scoped. Remaining phases below are renumbered
to match.

| # | Phase | Status |
|---|---|---|
| 1 | Foundation & authentication | ✅ Delivered |
| 2 | Study engine — question bank, flashcards, practice modes, dashboard | ✅ Delivered |
| 2.5 | Multi-version support — 2008 + 2020 tests, version switcher | ✅ Delivered |
| 3 | Rebrand (CivicsPrep → Passcit) | ✅ Delivered |
| 4.1 | Voice Playback (Stage 1 — text-to-speech) | ✅ Delivered |
| 4.2 | Voice Interview Mode (Stage 2 — speech recognition + answer matching) | ✅ Delivered |
| 5 | Admin panel | ✅ Delivered |
| 6 | Production Readiness Audit — security, i18n prep, accessibility, performance, quality | ✅ Delivered |
| 7 | Full Naturalization Interview Simulation — identity, reading, writing, civics, results, history, admin analytics | ✅ This delivery |
| 8 | Eligibility calculator (N-400 filing date estimator) | Planned |
| 9 | Full Hostinger deployment guide | Planned |

See [`PHASE-7-INTERVIEW-SIMULATION.md`](./PHASE-7-INTERVIEW-SIMULATION.md) for
the complete changelog, modified files list, architecture summary, and
testing checklist for this delivery.

See [`PHASE-6-AUDIT-REPORT.md`](./PHASE-6-AUDIT-REPORT.md) for the complete
changelog, every issue found and fixed, remaining recommendations, and the
Production Readiness Score for this delivery.

### A note on test versions

USCIS now runs **two** civics tests concurrently, based on filing date, not
interview date:

- **2008 test** (100 questions, 10 asked, 6 to pass) — applicants who filed
  Form N-400 before October 20, 2025. Seeded here, and set as the default
  `TestVersion`.
- **2020 test** (128 questions, 20 asked, 12 to pass) — introduced in 2020,
  briefly used, then rescinded in 2021. Also seeded here, selectable via
  the version switcher.

One nuance worth being precise about: applicants who file on or after
October 20, 2025 take what USCIS calls the **"2025" test**, which reuses
the 2020 test's 128-question bank with five questions given updated
wording (senators/representatives explicitly representing their
state/district, presidential power to appoint judges, expanded
Cabinet-level options, and updated citizenship-by-birth wording tied to
the 14th Amendment). What's seeded here is the *original* 2020 version's
wording — the one actually named in this feature request — not the 2025
variant. Both draw from the same 128-question bank and the same
category structure, so updating the five changed questions later, or
adding an actual `slug: "2025"` `TestVersion` row that reuses most of the
existing 2020 question data, is a small, additive change whenever it's
wanted — not a redesign.

---

*Passcit is an independent study tool and is not affiliated with,
endorsed by, or sponsored by USCIS or the U.S. Department of Homeland
Security.*
