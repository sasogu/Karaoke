/* eslint-disable no-restricted-globals */

const APP_CACHE_VERSION = "1.0.11";
const CACHE_PREFIX = "karaoke-pwa";
const STATIC_CACHE = `${CACHE_PREFIX}-static-${APP_CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${APP_CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([cleanupOldCaches(), self.clients.claim()])
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_CACHE_VERSION") {
    event.ports?.[0]?.postMessage({ type: "CACHE_VERSION", version: APP_CACHE_VERSION });
    return;
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "CLEAR_RUNTIME_CACHE") {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function cleanupOldCaches() {
  const keys = await caches.keys();
  const expected = new Set([STATIC_CACHE, RUNTIME_CACHE]);

  await Promise.all(
    keys
      .filter((key) => key.startsWith(`${CACHE_PREFIX}-`) && !expected.has(key))
      .map((key) => caches.delete(key))
  );
}

async function networkFirst(request, fallbackUrl) {
  const runtime = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    runtime.put(request, response.clone());
    return response;
  } catch {
    return (await runtime.match(request)) || (await caches.match(fallbackUrl));
  }
}

async function staleWhileRevalidate(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  const cached = await runtime.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      runtime.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || fetch(request);
}
