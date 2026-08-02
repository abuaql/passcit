"use client";

import { useEffect } from "react";

/**
 * Registers the service worker exactly once, in production builds only.
 * Dev-mode service workers are a known source of confusing caching
 * behavior against Next.js's own HMR/fast-refresh — the PWA is
 * deliberately inert during local development.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      // Registration failures (unsupported browser, blocked by an
      // extension, etc.) should never break the app itself — the site
      // still works perfectly well without a service worker, it just
      // won't be installable or work offline.
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
