// Minimal service worker — required by browsers to allow "Add to Home Screen" / install.
// Intentionally does no caching so the app always gets fresh data (orders, tables, payments).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {}); // pass-through, no offline caching
