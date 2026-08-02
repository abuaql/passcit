// Passcit service worker — hand-written, no external library.
//
// Deliberate choice: PWA libraries like next-pwa inject a webpack plugin,
// which conflicts with Next.js 16's Turbopack-by-default dev setup, and
// this project's sandbox has no way to install and verify a new
// dependency actually works. A small, fully-understood vanilla worker
// avoids both problems and keeps every caching decision explicit and
// auditable in one file.

const CACHE_VERSION = "v1";
const STATIC_CACHE = `passcit-static-${CACHE_VERSION}`;
const PAGES_CACHE = `passcit-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// Precached on install so the offline fallback is available even on a
// visitor's very first, never-been-online visit.
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC_CACHE && key !== PAGES_CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// The app sends this on sign-out, so a second person on a shared device
// never sees a previous user's cached, authenticated page while offline.
// This is the one piece of active cache-clearing this worker does beyond
// its own version-bump cleanup in `activate` above.
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_USER_CACHE") {
    event.waitUntil(caches.delete(PAGES_CACHE));
  }
});

const STATIC_ASSET_PATTERN = /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|svg|ico|webp|avif)$/;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API routes, under any circumstances — not even with
  // cache-aware logic. This is the one rule the spec is most explicit
  // about, and the safest way to honor it is to never let this worker
  // touch these requests at all, rather than trust a more clever
  // "network-first but don't persist" branch not to have a bug in it.
  if (url.pathname.startsWith("/api/")) return;

  // Never intercept non-GET requests — form submissions, mutations, etc.
  // always go straight to the network untouched.
  if (request.method !== "GET") return;

  // Page navigations: network-first, so a signed-in user always gets
  // current, correctly-authenticated content whenever online. Cache is
  // consulted only as a fallback when the network genuinely fails,
  // which is what "previously visited pages continue to work" means
  // here — not "always prefer the cache."
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets, fonts, images, and the manifest itself: cache-first.
  // Next.js content-hashes its static bundle filenames, so a cache hit
  // for one of these URLs is always the correct, current content — no
  // revalidation needed.
  const isStaticPath =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    STATIC_ASSET_PATTERN.test(url.pathname);

  if (isStaticPath) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else (anything not explicitly matched above) is left
  // completely untouched — straight to the network, no interception.
});
