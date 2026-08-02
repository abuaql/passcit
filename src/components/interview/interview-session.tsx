"use client";

import { useState, useEffect, useRef } from "react";
import { WelcomeStep } from "@/components/interview/steps/welcome-step";
import { IdentityStep } from "@/components/interview/steps/identity-step";
import { ReadingStep } from "@/components/interview/steps/reading-step";
import { WritingStep } from "@/components/interview/steps/writing-step";
import { CivicsStep } from "@/components/interview/steps/civics-step";
import { ResultsStep } from "@/components/interview/steps/results-step";

export interface StartedInterview {
  interviewId: string;
  testVersion: {
    id: string;
    name: string;
    questionsAsked: number;
    passThreshold: number;
  };
  readingSentences: { id: string; text: string }[];
  writingSentences: { id: string; text: string }[];
  civicsQuestions: {
    id: string;
    number: number;
    question: string;
    requiredAnswerCount: number;
    answers: { text: string }[];
  }[];
}

type Step = "welcome" | "identity" | "reading" | "writing" | "civics" | "results";

// Kept short and snappy on purpose — this fires between every step in the
// interview, so anything longer would start to feel like waiting rather
// than a transition. Matches the fade timing already used from the
// launcher into the live session, just faster since it recurs so often.
const TRANSITION_MS = 200;

export function InterviewSession({ started }: { started: StartedInterview }) {
  const [step, setStep] = useState<Step>("welcome");
  // Moves keyboard/screen-reader focus to the new step whenever it
  // changes, so focus doesn't silently fall to <body> when the previous
  // step's focused button is removed from the DOM — a well-known issue
  // with single-page "step" transitions like this one. Skips the very
  // first render, where focus is already reasonably positioned from
  // whatever the applicant just clicked to get here.
  const stepContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    stepContainerRef.current?.focus();
  }, [step]);
  // Drives a brief fade between every step change below — a hard cut
  // between six different screens is exactly the "isolated questions,
  // not a conversation" feeling this whole pass is meant to fix.
  const [visible, setVisible] = useState(true);
  // Captured once, when the session mounts (right after the interview
  // row was created server-side) — only used for the live elapsed-time
  // display. The authoritative duration is computed server-side in
  // completeInterview() from the DB's own startedAt, not from this.
  const [clientStartedAt] = useState(() => Date.now());

  /**
   * The single place every step transition goes through — fades the
   * current step out, swaps the underlying state once it's invisible,
   * then fades the new one in. Every setStep(...) in this file goes
   * through here instead of being called directly, so the transition is
   * structural (impossible to add a seventh step later and forget it)
   * rather than something that has to be remembered at each call site.
   *
   * Genuinely two-phase, not just a fade-out: setting `step` and
   * `visible` back to true in the same callback would let React batch
   * them into one render, so the new content would just appear at full
   * opacity with no fade-in at all. The requestAnimationFrame gives the
   * browser one real paint at opacity-0 first, matching the same
   * pattern the launcher already uses correctly for its own entry fade.
   */
  function goToStep(next: Step) {
    setVisible(false);
    window.setTimeout(() => {
      setStep(next);
      window.requestAnimationFrame(() => setVisible(true));
    }, TRANSITION_MS);
  }

  async function advanceFromIdentity() {
    try {
      await fetch(`/api/interview/${started.interviewId}/identity`, { method: "POST" });
    } catch {
      // Non-critical — this only marks a completion flag for the history
      // screen. The interview itself continues either way.
    }
    goToStep("reading");
  }

  async function advanceFromCivics() {
    try {
      await fetch(`/api/interview/${started.interviewId}/complete`, { method: "POST" });
    } catch {
      // The results screen re-fetches the interview by id regardless, so
      // a failed request here doesn't strand the applicant — worst case
      // the results screen shows a retry rather than losing their answers.
    }
    goToStep("results");
  }

  let content: React.ReactNode;

  switch (step) {
    case "welcome":
      content = <WelcomeStep startedAt={clientStartedAt} onContinue={() => goToStep("identity")} />;
      break;

    case "identity":
      content = <IdentityStep startedAt={clientStartedAt} onComplete={advanceFromIdentity} />;
      break;

    case "reading":
      content = (
        <ReadingStep
          interviewId={started.interviewId}
          sentences={started.readingSentences}
          startedAt={clientStartedAt}
          onComplete={() => goToStep("writing")}
        />
      );
      break;

    case "writing":
      content = (
        <WritingStep
          interviewId={started.interviewId}
          sentences={started.writingSentences}
          startedAt={clientStartedAt}
          onComplete={() => goToStep("civics")}
        />
      );
      break;

    case "civics":
      content = (
        <CivicsStep
          interviewId={started.interviewId}
          questions={started.civicsQuestions}
          passThreshold={started.testVersion.passThreshold}
          questionsAsked={started.testVersion.questionsAsked}
          startedAt={clientStartedAt}
          onComplete={advanceFromCivics}
        />
      );
      break;

    // Results is the last step — everything up through here is fully
    // wired, and the interview is already finalized server-side by the
    // time this renders, via advanceFromCivics above.
    case "results":
      content = <ResultsStep interviewId={started.interviewId} />;
      break;

    default:
      content = null;
  }

  return (
    <div
      ref={stepContainerRef}
      tabIndex={-1}
      className={`outline-none transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {content}
    </div>
  );
}
