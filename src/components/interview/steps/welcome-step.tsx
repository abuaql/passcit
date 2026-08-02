"use client";

import { useState } from "react";
import { Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioButton } from "@/components/ui/audio-button";
import { officerDialogue } from "@/lib/officer-dialogue";
import { strings } from "@/lib/i18n";
import { InterviewStatusBar } from "@/components/interview/interview-status-bar";

export function WelcomeStep({ startedAt, onContinue }: { startedAt: number; onContinue: () => void }) {
  // Picked once when this step mounts, not on every render — otherwise
  // the greeting would change out from under the AudioButton's replay.
  const [greeting] = useState(() => officerDialogue.welcome());

  return (
    <div>
      <InterviewStatusBar currentStep="welcome" stepLabel={strings.interview.steps.welcome} startedAt={startedAt} />
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Mic2 className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>

        <div className="flex items-start gap-2 rounded-3xl border-2 border-border bg-card p-6">
          <p className="font-heading text-lg font-semibold text-foreground">{greeting}</p>
          <AudioButton text={greeting} id="interview-welcome" label="greeting" className="mt-0.5 shrink-0" />
        </div>

        <p className="text-sm text-muted-foreground">{strings.interview.welcome.seatedNote}</p>

        <Button size="lg" onClick={onContinue}>
          {strings.interview.welcome.continueButton}
        </Button>
      </div>
    </div>
  );
}
