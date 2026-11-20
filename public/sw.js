// One-time cleanup for the former Monetag service worker.
// This file intentionally does not register or load any advertising code.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const registrations = await self.registration.unregister();
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => /monetag|5gvci|quge5/i.test(name))
        .map((name) => caches.delete(name)),
    );
    return registrations;
  })());
});
