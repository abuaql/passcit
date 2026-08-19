/**
 * Content for the public support page.
 *
 * Same reasoning as privacy-policy.ts: this is document content, not UI
 * chrome, so it lives here rather than in `src/lib/i18n/en.ts`.
 *
 * Every answer below describes behaviour this app actually has. There is
 * deliberately no billing or subscription topic — Passcit has no
 * purchases, subscriptions, or payment processing anywhere in the
 * codebase, and a support page that implies otherwise would send people
 * looking for a screen that does not exist.
 */

import type { DocumentBlock, SupportTopic } from "./types";

export const supportIntro =
  "Answers to the problems people run into most often, and how to reach a human when the answer isn't here.";

/** What someone should include in a support message so it can actually be diagnosed. */
export const supportReportChecklist: DocumentBlock[] = [
  {
    type: "ul",
    lead: "Including these details in your first message usually saves a round trip:",
    items: [
      "Your device model — for example, iPhone 14 Pro or iPad Air (11-inch).",
      "Your iOS version — Settings → General → About → Software Version.",
      "The Passcit app version — Settings → General → iPhone Storage → Passcit shows it. If you are writing about the website instead, tell us which browser you used.",
      "The email address on your Passcit account, if the problem involves signing in.",
      "What you were doing, what you expected to happen, and what happened instead.",
      "Roughly when it happened, and whether it happens every time or only sometimes.",
      "A screenshot or screen recording, if the problem is something you can see.",
    ],
  },
  {
    type: "note",
    text: "Passcit support will never ask you for your password, your Apple ID password, your Google password, a verification or two-factor code, or any other credential. Never send those to anyone — including anyone claiming to be Passcit support.",
  },
];

export const supportTopics: SupportTopic[] = [
  {
    id: "account",
    title: "Account and sign-in",
    entries: [
      {
        question: "Do I need an account to use Passcit?",
        blocks: [
          {
            type: "p",
            text: "You can open the app and start learning without signing in. An account is what saves your progress, streaks, and practice history so they follow you between devices — so it is worth creating one before you have put real study time in.",
          },
        ],
      },
      {
        question: "I forgot my password",
        blocks: [
          {
            type: "p",
            text: "On the sign-in screen, choose Forgot password and enter the email address on your account. A reset link is emailed to you and is valid for one hour. If it has not arrived after a few minutes, check your spam folder and confirm you used the same address you signed up with.",
          },
        ],
      },
      {
        question: "I can't sign in, or my password isn't accepted",
        blocks: [
          {
            type: "ul",
            items: [
              "Check the email address for typos, and remember that it is not case-sensitive but your password is.",
              "If you originally created the account with Apple or Google, it may not have a password at all — use the same button you used the first time.",
              "If a reset link has expired, request a new one; each new link cancels the previous one.",
              "Still stuck? Contact support with the email address on the account. Do not include your password.",
            ],
          },
        ],
      },
      {
        question: "How do I change my name or password?",
        blocks: [
          {
            type: "p",
            text: "Open Profile → Account Settings. Your display name can be changed there, and so can your password if your account has one. Changing your password signs you out on every device, including this one.",
          },
        ],
      },
      {
        question: "How do I delete my account?",
        blocks: [
          {
            type: "p",
            text: "Profile → Delete Account. If your account has a password you will be asked to confirm it. Deletion is permanent: your progress, practice history, interview results, streaks, and saved eligibility calculations are removed and cannot be restored. If you cannot get into the app to do this, contact support from the email address on the account.",
          },
        ],
      },
    ],
  },
  {
    id: "apple-sign-in",
    title: "Sign in with Apple",
    entries: [
      {
        question: "Sign in with Apple fails or returns to the sign-in screen",
        blocks: [
          {
            type: "ul",
            items: [
              "Confirm your device is signed in to iCloud: Settings → your name at the top.",
              "Check that you have a working network connection — Apple's sign-in check happens online.",
              "Cancelling the Apple sheet, deliberately or accidentally, returns you to the sign-in screen with nothing saved. Try again and complete the sheet.",
              "If it keeps failing, contact support and mention that it is Apple sign-in and what the screen said.",
            ],
          },
        ],
      },
      {
        question: "I used Hide My Email — is that a problem?",
        blocks: [
          {
            type: "p",
            text: "No. Passcit works normally with Apple's private relay address, and that relay address is the one shown on your account. Keep it in mind if you later try to sign in with email and password, or ask for a password reset: use the relay address, since that is the address Passcit knows.",
          },
        ],
      },
      {
        question: "I already had a Passcit account with the same email",
        blocks: [
          {
            type: "p",
            text: "If Apple gives Passcit a verified email address that matches an existing account, signing in with Apple links to that same account rather than creating a second one — your progress stays where it is. If Apple gives a private relay address instead, that is a different address, so it creates a separate account. Contact support if you end up with two accounts and want help.",
          },
        ],
      },
    ],
  },
  {
    id: "google-sign-in",
    title: "Sign in with Google",
    entries: [
      {
        question: "Sign in with Google fails or closes immediately",
        blocks: [
          {
            type: "ul",
            items: [
              "Make sure you finish the Google screen rather than dismissing it — closing the browser sheet cancels the sign-in.",
              "If you have several Google accounts, check you picked the one you use for Passcit.",
              "Google sign-in requires a verified Google email address. If your Google account's email is unverified, Passcit cannot link it.",
              "If the problem persists, contact support and say which Google account you used — never include the password.",
            ],
          },
        ],
      },
      {
        question: "Can I use both Google and email/password on the same account?",
        blocks: [
          {
            type: "p",
            text: "Yes. If you sign in with Google using the verified email of an existing Passcit account, the two are linked to the same account and your progress is shared. If your account has no password yet and you want one, use the Forgot password flow to set one.",
          },
        ],
      },
    ],
  },
  {
    id: "voice-practice",
    title: "Voice practice",
    entries: [
      {
        question: "The app isn't hearing me",
        blocks: [
          {
            type: "ul",
            items: [
              "Grant microphone and speech recognition access: Settings → Passcit, and turn both on.",
              "Check that the ringer switch is not silencing something else on screen, and that no other app — a call, a recorder — is holding the microphone.",
              "If you use Bluetooth headphones, try the built-in microphone once to rule out the headset.",
              "Speak at a normal, steady pace in a quiet room. Background noise is by far the most common cause of a missed answer.",
            ],
          },
        ],
      },
      {
        question: "It transcribed my answer wrong",
        blocks: [
          {
            type: "p",
            text: "Speech recognition runs on your device and can misread names and places, especially over background noise. Try again more slowly, and if a specific question is consistently mis-heard, send it to support with the wording you spoke and the text that came out — that is exactly the kind of report that improves answer matching.",
          },
        ],
      },
      {
        question: "Is my voice recorded or uploaded?",
        blocks: [
          {
            type: "p",
            text: "No. Your speech is converted to text on your device, and only that text is sent to Passcit so your answer can be scored and saved to your practice history. The audio itself is never uploaded or stored. See the Privacy Policy for the full detail.",
          },
        ],
      },
    ],
  },
  {
    id: "flashcards",
    title: "Flashcards",
    entries: [
      {
        question: "A card won't flip, or the deck seems stuck",
        blocks: [
          {
            type: "p",
            text: "Open flashcards from the Practice tab. If a deck misbehaves, leave it and reopen it — the deck rebuilds from your saved progress, so nothing is lost. If it keeps happening, close and reopen the app, and tell support which deck it was.",
          },
        ],
      },
      {
        question: "Why do I keep seeing the same cards?",
        blocks: [
          {
            type: "p",
            text: "That is deliberate. Cards you have answered incorrectly, or have not seen recently, come back sooner than cards you have answered correctly several times. As your accuracy on a question improves, the gap before you see it again grows.",
          },
        ],
      },
      {
        question: "How do I study only the questions I keep getting wrong?",
        blocks: [
          {
            type: "p",
            text: "In the Practice tab, choose Review Missed Questions — it draws only from questions you have answered incorrectly before. You can also mark a card as a favorite while studying flashcards and come back to your favorites later.",
          },
        ],
      },
    ],
  },
  {
    id: "practice",
    title: "Practice questions and tests",
    entries: [
      {
        question: "My answer was correct but marked wrong",
        blocks: [
          {
            type: "p",
            text: "Passcit accepts the officially recognized answers plus close variations, but wording it has not seen can slip through. Report it to support with the question number, exactly what you answered, and how it was scored, and the accepted answers can be corrected.",
          },
        ],
      },
      {
        question: "An answer looks out of date",
        blocks: [
          {
            type: "p",
            text: "Some civics answers depend on who currently holds an office and change over time. Passcit tracks those separately so they can be updated without a new app release. If you spot one that looks stale, send us the question number.",
          },
        ],
      },
      {
        question: "A test ended early or didn't save",
        blocks: [
          {
            type: "p",
            text: "A practice test is recorded when it finishes — including when you choose to end it early, which is saved as a partial attempt. Closing the app in the middle of a test without ending it means that attempt is not recorded. If a test you did finish is missing from your history, check that you were signed in when you took it: work done while signed out is not attached to an account.",
          },
        ],
      },
    ],
  },
  {
    id: "progress",
    title: "Learning progress, streaks, and unlocking",
    entries: [
      {
        question: "My progress is missing or looks reset",
        blocks: [
          {
            type: "ul",
            items: [
              "Check which account you are signed in to. Progress belongs to an account, so a second account created with a different sign-in method has its own, separate history.",
              "Progress made while signed out is not saved to an account.",
              "If you switched the test version you are studying, each version keeps its own progress — switching back brings the other one into view again.",
              "If it is genuinely missing on the right account, contact support with the account email and roughly when you last saw it.",
            ],
          },
        ],
      },
      {
        question: "Why is the next unit locked?",
        blocks: [
          {
            type: "p",
            text: "Units unlock in order: finish the lessons in the current unit and pass its exam, and the next unit opens. The unit's screen shows what is still outstanding. Failing an exam does not lock anything you had already unlocked — you can review the questions you missed and retake it.",
          },
        ],
      },
      {
        question: "My streak disappeared",
        blocks: [
          {
            type: "p",
            text: "A streak counts consecutive days with study activity, measured on your device's date. Missing a full day ends it. If you studied and the day did not count, tell support the date and your time zone.",
          },
        ],
      },
    ],
  },
  {
    id: "app-problems",
    title: "App problems",
    entries: [
      {
        question: "The app crashes, freezes, or shows a blank screen",
        blocks: [
          {
            type: "ul",
            items: [
              "Force-quit Passcit and reopen it.",
              "Check for a Passcit update in the App Store, and for an iOS update in Settings → General → Software Update.",
              "Restart the device if the problem survives a reopen.",
              "If it still happens, send support the steps that lead to it, plus your device model, iOS version, and app version. A screen recording helps a great deal here.",
            ],
          },
        ],
      },
      {
        question: "Content won't load or I see a network error",
        blocks: [
          {
            type: "p",
            text: "Passcit needs a connection to sync your progress and load new lessons. Check your network, and try switching between Wi-Fi and cellular once. If other apps are fine and Passcit is not, tell support what the error said and when it started.",
          },
        ],
      },
      {
        question: "Text is too small, or I use VoiceOver",
        blocks: [
          {
            type: "p",
            text: "Passcit follows your system text size and works with VoiceOver and Dark Mode. If a specific screen scales badly or reads incorrectly, that is a bug worth reporting — name the screen and the settings you use, and it will be fixed.",
          },
        ],
      },
    ],
  },
];
