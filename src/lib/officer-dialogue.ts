/**
 * Content for the "USCIS Officer" persona in the Interview Simulation
 * (Phase 7) — the Identity Questions asked during the speaking-practice
 * step, and the officer's surrounding dialogue (greetings, transitions,
 * encouragement, repeat-requests).
 *
 * Design note on Identity Questions: these are answered but never scored
 * and never stored (see InterviewSimulation in schema.prisma for the full
 * rationale). The value is rehearsing a confident, fluent spoken answer to
 * a personal question in English — not verifying the answer's content,
 * which this app has no way to do and shouldn't try to.
 *
 * Design note on the dialogue bank: a real officer doesn't say the exact
 * same sentence at the exact same moment in every interview, and neither
 * should this one — especially since people will run this simulation many
 * times while practicing. Each moment below has multiple natural variants;
 * the interview flow picks one at random each time rather than hardcoding
 * a single phrase per step.
 */

export interface IdentityQuestion {
  id: string;
  prompt: string;
}

export const IDENTITY_QUESTIONS: IdentityQuestion[] = [
  { id: "id1", prompt: "What is your full name?" },
  { id: "id2", prompt: "What is your date of birth?" },
  { id: "id3", prompt: "What is your current address?" },
  { id: "id4", prompt: "What city do you live in?" },
  { id: "id5", prompt: "What is your phone number?" },
  { id: "id6", prompt: "What is your occupation?" },
];

function pick(variants: string[]): string {
  return variants[Math.floor(Math.random() * variants.length)] ?? variants[0]!;
}

export const officerDialogue = {
  /** Said once, at the very start of the interview. */
  welcome: () =>
    pick([
      "Good morning. Welcome to your naturalization interview. Please have a seat — we'll begin shortly.",
      "Good afternoon. Thank you for coming in today. We'll begin your interview now.",
      "Hello, and welcome. Please have a seat. We'll get started when you're ready.",
    ]),

  /** Introduces the Identity Questions step. */
  introduceIdentity: () =>
    pick([
      "Before we begin the test portion, I'd like to confirm a few details with you. Please answer in your own words.",
      "Let's start by reviewing some basic information. There's no wrong answer here — just answer naturally, the way you would in a real interview.",
      "First, a few questions about you. Take your time, and speak clearly.",
    ]),

  /** After each identity answer is captured (not graded, just acknowledged). */
  acknowledgeIdentity: () =>
    pick(["Thank you.", "Noted, thank you.", "Good, thank you.", "Alright, thank you."]),

  /** Introduces the Reading section. */
  introduceReading: () =>
    pick([
      "Now let's move to the English reading test. I'll show you a sentence — please read it aloud.",
      "Next is the reading portion of the English test. Read the sentence on the screen out loud, in English.",
    ]),

  /** Introduces the Writing section. */
  introduceWriting: () =>
    pick([
      "Now for the writing test. I'm going to read a sentence aloud. Please write exactly what you hear.",
      "Let's move to writing. Listen carefully, and write the sentence I read to you.",
    ]),

  /** Introduces the Civics section. */
  introduceCivics: (questionsAsked: number, passThreshold: number) =>
    pick([
      `Now for the civics test. I'll ask you up to ${questionsAsked} questions about American government and history. You need ${passThreshold} correct answers to pass — and like a real interview, we'll stop as soon as that's decided.`,
      `Let's begin the civics portion. I may ask up to ${questionsAsked} questions. Answer each one in English, out loud if you can. We'll stop once you've clearly passed or clearly can't reach ${passThreshold}.`,
    ]),

  /** Between civics questions, after a correct answer. */
  afterCorrect: () =>
    pick(["Correct.", "That's right.", "Good.", "Yes, that's correct."]),

  /** Between civics questions, after an incorrect answer — encouraging, not discouraging. */
  afterIncorrect: () =>
    pick([
      "That's alright, let's continue.",
      "Not quite, but let's move on.",
      "That's okay. Next question.",
    ]),

  /** Reading/Writing: after an attempt doesn't pass but more attempts remain. Deliberately doesn't say "sentence" or "question" so it fits either section without parameterizing. */
  tryDifferentSentence: () =>
    pick([
      "That's alright — let's try another one.",
      "No trouble — here's a different one.",
      "That's okay, let's try once more.",
    ]),

  /** Reading/Writing/Civics: the section just passed. Doesn't name the section — the next step's own introduce* line carries that, so this stays reusable across all three. */
  sectionPassed: () =>
    pick(["Well done — that's exactly right.", "Good, very well done.", "That's correct. Nicely done."]),

  /** Reading/Writing/Civics: attempts are exhausted without a pass, but the interview continues — same "retested on the failed portion only" spirit as the real process. */
  sectionMovingOn: () =>
    pick([
      "That's alright — let's continue with the interview.",
      "Not to worry, let's move forward.",
      "That's fine — we'll continue.",
    ]),

  /** Generic transition to the next question, used often — needs the most variety. */
  nextQuestion: () =>
    pick(["Let's continue.", "Next question.", "Moving on.", "Here's the next one."]),

  /** When speech recognition confidence is too low to evaluate confidently. */
  askToRepeat: () =>
    pick([
      "I'm sorry, could you please repeat that?",
      "I didn't quite catch that. Could you say it again?",
      "Could you repeat your answer, please?",
    ]),

  /** Gentle reminder if typed/spoken answer arrives in a clearly non-English form is out of scope for this app — used only as a soft nudge, never a hard block. */
  pleaseAnswerInEnglish: () => "Please answer in English if you can.",

  /** Said when the applicant uses Replay or Repeat controls. */
  replaying: () => pick(["Of course, one moment.", "Certainly.", "Here it is again."]),

  /** Encouragement mid-interview, used sparingly (not every question). */
  encouragement: () =>
    pick([
      "You're doing well. Take your time.",
      "No need to rush — take a moment if you need to.",
      "You're doing fine so far.",
    ]),

  /** Said once, right before the final result is revealed. */
  concludingRemark: (passed: boolean) =>
    passed
      ? pick([
          "That concludes your interview. Congratulations.",
          "That's the end of the interview. Well done.",
          "We're finished. Congratulations on a strong interview.",
        ])
      : pick([
          "That concludes today's interview.",
          "That's the end of the interview. Let's go over the results together.",
          "We're finished for today. Here's how it went.",
        ]),
} as const;
