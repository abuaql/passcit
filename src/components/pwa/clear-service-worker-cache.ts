/**
 * Tells the active service worker to purge its page cache — called on
 * sign-out so a second person on a shared device never sees a previous
 * user's cached, authenticated page if they go offline afterward. A
 * no-op wherever there's no controlling service worker (unsupported
 * browser, or the PWA registration never completed), which is exactly
 * the situation where there's no such cache to clear anyway.
 */
export function clearServiceWorkerCache() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: "CLEAR_USER_CACHE" });
}
