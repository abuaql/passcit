"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/i18n";

const DISMISSED_KEY = "passcit-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own non-standard flag - matchMedia alone doesn't
    // reliably report standalone state on iOS.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  // Excludes Chrome/Firefox-on-iOS (which are still WebKit under the
  // hood, but neither supports beforeinstallprompt OR has the same
  // Add-to-Home-Screen entry point Safari does) — this check is
  // specifically "is this the one browser where the manual-guidance
  // path applies," not "is this iOS."
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

/**
 * Shows at most one of: the Android/desktop install banner (triggered by
 * a real captured `beforeinstallprompt` event), or iOS's manual
 * Add-to-Home-Screen guidance — never both, and never anything at all if
 * already installed or previously dismissed. Rendered only inside the
 * authenticated app layout, and only after a short delay, so it never
 * greets a brand-new visitor before they've done anything.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuidance, setShowIOSGuidance] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (typeof window === "undefined" || localStorage.getItem(DISMISSED_KEY)) return;

    // Both pieces of "the prompt may appear now" state are set together in
    // the timeout rather than synchronously during the effect. Nothing
    // renders until `visible` flips anyway, so this is observably identical
    // while avoiding an extra render pass immediately after mount.
    const timer = window.setTimeout(() => {
      if (isIOSSafari()) setShowIOSGuidance(true);
      setVisible(true);
    }, 3000);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    // A captured beforeinstallprompt event can only be used once, so
    // there's nothing left to show regardless of what the user chose —
    // dismiss unconditionally rather than branch on an outcome value
    // that's always a truthy string either way.
    dismiss();
  }

  if (!visible || (!deferredPrompt && !showIOSGuidance)) return null;

  return (
    <div
      role="region"
      aria-label={strings.pwa.installTitle}
      className="mx-auto mb-4 flex max-w-6xl items-start gap-3 rounded-2xl border-2 border-primary bg-primary/10 p-4"
    >
      {showIOSGuidance && !deferredPrompt ? (
        <>
          <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <p className="font-heading font-bold text-foreground">{strings.pwa.iosTitle}</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-muted-foreground">
              <li>{strings.pwa.iosStep1}</li>
              <li>{strings.pwa.iosStep2}</li>
            </ol>
          </div>
          <Button variant="outline" size="sm" onClick={dismiss}>
            {strings.pwa.iosGotIt}
          </Button>
        </>
      ) : (
        <>
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <p className="font-heading font-bold text-foreground">{strings.pwa.installTitle}</p>
            <p className="mt-0.5 text-muted-foreground">{strings.pwa.installDescriptionGeneric}</p>
          </div>
          <Button size="sm" onClick={handleInstall}>
            {strings.pwa.installButton}
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label={strings.pwa.dismissAriaLabel}
        className="rounded-lg p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
