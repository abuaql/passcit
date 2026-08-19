/**
 * The Passcit Privacy Policy, as data.
 *
 * IMPORTANT FOR WHOEVER EDITS THIS NEXT: every claim below was written
 * against what this codebase actually does — the Prisma schema, the
 * auth routes in `src/app/api/native/auth/*` and `src/auth.ts`, the AI
 * prompt builders in `src/lib/ai/prompts/*`, the iOS
 * `SpeechTranscriptionService`, and the (deliberate) absence of any
 * analytics, crash-reporting, advertising or payment SDK anywhere in the
 * project. It claims no collection the code does not perform. If the
 * product starts collecting something new — an analytics SDK, in-app
 * purchases, uploaded audio — this file has to change in the same
 * commit, and `lastUpdated` with it.
 */

import type { DocumentSection } from "./types";

/** Shown at the top of the page. Update whenever the text below changes materially. */
export const PRIVACY_LAST_UPDATED = "August 19, 2026";

export const privacyIntro = [
  "Passcit is a study app for the United States naturalization civics test, available on the web and as a native iOS app. This policy explains exactly what information Passcit collects, why it collects it, who it is shared with, and what you can do about it.",
  "This policy covers both the Passcit website and the Passcit iOS app. Where the two behave differently — voice practice is one such place — the difference is spelled out below.",
];

export const privacyIndependenceNotice =
  "Passcit is an independent educational study tool. It is not affiliated with, endorsed by, or sponsored by USCIS, the U.S. Department of Homeland Security, or any other government agency. Passcit does not file, submit, or transmit anything to any government agency on your behalf, and nothing in the app is legal advice.";

export const privacySections: DocumentSection[] = [
  {
    id: "information-we-collect",
    heading: "Information we collect",
    blocks: [
      {
        type: "p",
        text: "Passcit collects only what it needs to sign you in, save your study progress, and keep accounts secure. Each category below corresponds to data the app actually stores.",
      },
      {
        type: "ul",
        lead: "Account information.",
        items: [
          "Your email address, which identifies your account.",
          "Your name, if you provide one when signing up or later edit it in your profile.",
          "A cryptographic hash of your password, if you sign up with email and password. Passcit never stores your password itself and cannot read it.",
          "A profile picture URL, only if it is supplied by the sign-in provider you chose.",
          "Account settings you choose, such as your preferred study language and which version of the civics test you are studying.",
          "The dates your account was created and last updated, and whether the account is active.",
        ],
      },
      {
        type: "ul",
        lead: "Sign-in identifiers from Apple and Google.",
        items: [
          "When you use Sign in with Apple or Sign in with Google, the provider sends Passcit a signed token. Passcit verifies it and keeps the provider's unique identifier for you and the verified email address in that token, so the same account is found the next time you sign in.",
          "If you use Apple's Hide My Email option, Passcit only ever receives and stores that private relay address — not your personal address.",
          "For Google sign-in on the website, the standard OAuth tokens returned by Google are stored alongside that link so the session keeps working. No other Google account data is requested or stored.",
          "Passcit never receives your Apple ID password, your Google password, or any other credential belonging to those providers.",
        ],
      },
      {
        type: "ul",
        lead: "Session and security data.",
        items: [
          "Sign-in sessions, and for the iOS app a refresh token that is stored on our server only as a hash, together with its expiry and whether it has been revoked. The token itself is kept on your device in the iOS Keychain.",
          "Password reset tokens, which expire one hour after they are issued and are deleted once used.",
          "Your IP address is used momentarily to rate-limit sign-in, registration, and password-reset requests so accounts cannot be attacked by brute force, and may appear in short-lived server logs. It is not stored in the Passcit database and is not linked to your learning activity.",
        ],
      },
      {
        type: "ul",
        lead: "Learning and practice activity. This is the data that makes progress tracking work, and it is tied to your account.",
        items: [
          "Per-question progress: which questions you have studied or marked as favorites, how many times you answered each one correctly or incorrectly, and the review schedule Passcit calculates from that.",
          "Practice tests and quizzes: the answers you give, whether each was correct, your score, and whether you passed.",
          "Interview simulations: how long the simulation took, your results for each section, the text of your reading answers as transcribed on your device, the sentences you typed in the writing section, and which civics questions you were asked and how you answered.",
          "Voice practice: the text transcript of your spoken answer, the resulting evaluation, and any feedback shown to you.",
          "Study habits: your daily streak, how many questions you reviewed on each day you studied, and the experience points you earned.",
          "Which kinds of AI study content you requested for a question — an explanation, a translation, or a memory tip — and in which language.",
        ],
      },
      {
        type: "ul",
        lead: "Eligibility calculator (entirely optional — on the website, and in the iOS app under Profile → Naturalization Eligibility Check).",
        items: [
          "If you choose to use the eligibility calculator, the answers you enter are used to produce your estimate. Depending on the questions you answer, that can include your permanent-resident date, date of birth, state of residence, marital status and whether your spouse is a U.S. citizen, military service details, trips outside the United States, and Selective Service answers.",
          "If you are signed in, the calculation is saved to your account so you can return to it. If you are not signed in, it is saved without any link to a Passcit account.",
          "You never have to use the calculator to use the rest of Passcit.",
        ],
      },
      {
        type: "ul",
        lead: "Support messages.",
        items: [
          "If you contact Passcit support through the support page, the message you write, the email address you give so a reply can reach you, and any device or app details you choose to include are sent to the Passcit support inbox by email.",
        ],
      },
    ],
  },
  {
    id: "what-we-do-not-collect",
    heading: "What Passcit does not collect",
    blocks: [
      {
        type: "p",
        text: "Some categories are worth stating plainly, because Passcit deliberately does not use them:",
      },
      {
        type: "ul",
        items: [
          "No third-party analytics or usage-tracking SDK is present in the app or on the website. Passcit does not build advertising profiles and does not track you across other apps or websites.",
          "No advertising, no ad identifiers, and no data brokers. Passcit does not sell or rent your information.",
          "No third-party crash-reporting or diagnostics SDK. Passcit does not collect crash reports itself. If you have enabled Apple's own app analytics on your device, Apple may share aggregate crash information with developers under Apple's terms — that is Apple's mechanism, not Passcit's, and it does not contain your Passcit account data.",
          "No audio recordings. Voice practice never uploads or stores your voice; see below.",
          "No location tracking, no contacts, no photo library, and no health, financial, or immigration case files.",
          "No purchases or subscriptions. Passcit currently has no in-app purchases, no subscriptions, and no payment processing, so no payment or billing information is ever collected.",
        ],
      },
    ],
  },
  {
    id: "voice-practice",
    heading: "Voice practice and your microphone",
    blocks: [
      {
        type: "p",
        text: "Voice practice lets you rehearse answering out loud, the way the civics portion of the naturalization interview is actually conducted.",
      },
      {
        type: "ul",
        lead: "In the iOS app:",
        items: [
          "Passcit asks for microphone and speech recognition permission the first time you use voice practice, and voice practice simply does not run without your permission.",
          "Speech is converted to text using Apple's Speech framework, and Passcit requests on-device recognition whenever your device and language support it.",
          "Your audio is not uploaded to Passcit's servers and is not stored by Passcit. Only the resulting text transcript is sent, so your answer can be evaluated and appear in your practice history.",
          "You can revoke microphone or speech recognition access at any time in the iOS Settings app.",
        ],
      },
      {
        type: "ul",
        lead: "On the website:",
        items: [
          "Voice features use your browser's built-in speech recognition. Some browsers perform this on your device and some send audio to the browser vendor's own servers to transcribe it — that processing is governed by your browser vendor's privacy policy, not by Passcit.",
          "Passcit itself receives only the text transcript in either case.",
        ],
      },
    ],
  },
  {
    id: "how-we-use-information",
    heading: "How Passcit uses this information",
    blocks: [
      {
        type: "ul",
        items: [
          "To create your account and sign you in, including through Apple and Google.",
          "To save your learning progress so it is there the next time you open Passcit, on any device you sign in from.",
          "To show you your own results: accuracy, streaks, weak areas, exam scores, and what to study next.",
          "To schedule question reviews using spaced repetition based on how you answered before.",
          "To generate study material — explanations, translations, and memory tips — for civics questions.",
          "To keep accounts secure: hashing passwords, expiring tokens, and rate-limiting sign-in attempts.",
          "To answer you when you contact support.",
          "To understand, in aggregate, which questions and categories learners find hardest, so the study content can be improved. This analysis uses counts and averages across all users, not individual profiles.",
          "To comply with the law where Passcit is legally required to do so.",
        ],
      },
      {
        type: "p",
        text: "Passcit does not use your information for advertising, and does not make automated decisions about you that produce legal or similarly significant effects.",
      },
    ],
  },
  {
    id: "sharing",
    heading: "Sharing and service providers",
    blocks: [
      {
        type: "p",
        text: "Passcit does not sell your personal information and does not share it for advertising. Information is shared only with the service providers that make the app work, and only to the extent each one needs:",
      },
      {
        type: "ul",
        items: [
          "Hosting and database provider — operates the servers and database where your account and progress are stored.",
          "Apple and Google — when you choose Sign in with Apple or Sign in with Google, Passcit verifies the token they issue against their public keys. This is a verification of the credential you chose to present; Passcit does not send them your study data.",
          "Google Gemini — generates the AI study content (explanations, translations, memory tips) for civics questions. Only the official civics question text, its accepted answers, and the target language are sent. No account identifier, name, email, or personal information is included in those requests, and the generated result is cached and reused for every learner studying the same question.",
          "Email delivery provider — delivers password-reset emails and carries messages you send through the support form to the Passcit support inbox.",
        ],
      },
      {
        type: "p",
        text: "Passcit may also disclose information where required by law, to enforce its terms, or to protect the rights and safety of its users. If Passcit is ever involved in a merger, acquisition, or sale of assets, you will be notified before your information becomes subject to a different privacy policy.",
      },
      {
        type: "p",
        text: "Passcit's providers may process and store data in countries other than the one you live in, including the United States.",
      },
    ],
  },
  {
    id: "security",
    heading: "How your information is protected",
    blocks: [
      {
        type: "ul",
        items: [
          "All traffic between the apps and Passcit's servers is encrypted with HTTPS.",
          "Passwords are stored only as bcrypt hashes and are never recoverable, by anyone, including Passcit.",
          "The iOS app's refresh token is stored in the iOS Keychain on your device, and only its hash is kept on the server, so a copy of the server's records cannot be used to sign in as you.",
          "Sign-in, registration, and password-reset endpoints are rate-limited against brute-force attempts, and password reset links expire after one hour.",
          "Administrative access to the underlying data is restricted to Passcit administrator accounts.",
        ],
      },
      {
        type: "p",
        text: "No online service can promise perfect security, but Passcit's data is limited on purpose: it holds study progress and account details, not immigration filings or payment data.",
      },
    ],
  },
  {
    id: "retention",
    heading: "How long information is kept",
    blocks: [
      {
        type: "ul",
        items: [
          "Your account and learning history are kept for as long as your account exists, because that history is what your progress, streaks, and review schedule are built from.",
          "Password reset tokens expire after one hour. Sign-in tokens expire on their own schedule, and the iOS app's refresh token is revoked when you sign out.",
          "Support emails are kept in the support inbox for as long as needed to resolve your issue and keep a record of it.",
          "When you delete your account, your account and the learning records attached to it are permanently deleted, as described below.",
        ],
      },
    ],
  },
  {
    id: "deletion-and-choices",
    heading: "Deleting your account and your choices",
    blocks: [
      {
        type: "ul",
        items: [
          "Delete your account: in the iOS app, open Profile and choose Delete Account. If your account has a password, you will be asked to confirm it first. Deletion is permanent and immediate — your profile, question progress, practice tests, interview simulations, voice practice transcripts, streaks, experience points, saved eligibility calculations, and sign-in links are all deleted, and deleted data cannot be restored.",
          "Correct your information: your display name and your password can be changed in the iOS app under Profile → Account Settings, at any time.",
          "Use less: voice practice and the eligibility calculator are optional, and you can use Passcit without either. You can also revoke microphone and speech recognition access in iOS Settings.",
          "Ask for help: if you cannot access the app to delete your account, or you want a copy of the information Passcit holds about you, contact support and Passcit will handle the request.",
        ],
      },
      {
        type: "p",
        text: "Depending on where you live, you may have additional rights over your personal information — such as the right to access, correct, delete, or receive a copy of it, and the right to withdraw consent. Passcit honors these requests for anyone who asks, regardless of where they live. Contact support to make one.",
      },
    ],
  },
  {
    id: "children",
    heading: "Children's privacy",
    blocks: [
      {
        type: "p",
        text: "Passcit is intended for adults preparing for the naturalization interview and is not directed to children under 13. Passcit does not knowingly collect personal information from children under 13. If you believe a child has created an account, contact support and the account and its data will be deleted.",
      },
    ],
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    blocks: [
      {
        type: "p",
        text: "If this policy changes, the updated version is posted on this page with a new date at the top. Material changes — for example, a new category of information being collected — will be described here rather than made quietly. Continuing to use Passcit after an update means the updated policy applies to you.",
      },
    ],
  },
];
