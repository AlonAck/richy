// Richy service worker.
//
// 1) OFFLINE SHELL - the app opens with no connection once it has been visited:
//    the shell (index.html, the compiled bundle, the vendored React/Firebase
//    runtime, icons) is precached at install, navigations are network-first
//    with cache fallback (deploys arrive immediately; offline still boots), and
//    static assets are cache-first.
//    NOTE: this file is the web/PWA offline story only. iOS native does NOT run
//    it - Capacitor serves from the capacitor:// scheme, where service workers
//    are unavailable. iOS boots offline because the runtime is bundled into the
//    app, not because of anything here. Don't move assets back off-origin on the
//    assumption that this file will catch them.
//    Data itself comes back offline via Firestore's IndexedDB persistence
//    (enabled in firebase-init.js) - this file only covers the shell.
//
// 2) REMINDER NOTIFICATIONS - the page calls registration.showNotification(),
//    and the click handler below focuses or opens the app. The "push" handler
//    is a stub for a future server-driven Web Push tier (VAPID).
//
// The cache name embeds the build id that build.mjs stamps in at deploy time,
// so every deploy starts a fresh cache and activate() sweeps the old ones.
// On the local dev harness the token is unstamped and the hostname is
// localhost, so ALL caching is skipped - dev never fights a stale cache.
var BUILD = "__RICHY_BUILD__";
var CACHE = "richy-" + BUILD;
var DEV = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1" || BUILD.indexOf("RICHY_BUILD") !== -1;
var SHELL = [
  "/",
  "/index.html",
  "/dist/app.js?v=" + BUILD,
  "/firebase-init.js?v=" + BUILD,
  // The browser runtime. These are same-origin now (build.mjs copies them out of
  // node_modules) - precaching them is what lets the PWA boot with no network.
  "/vendor/react.production.min.js?v=" + BUILD,
  "/vendor/react-dom.production.min.js?v=" + BUILD,
  "/vendor/firebase-app-compat.js?v=" + BUILD,
  "/vendor/firebase-auth-compat.js?v=" + BUILD,
  "/vendor/firebase-firestore-compat.js?v=" + BUILD,
  "/manifest.webmanifest",
  "/icon-180.png",
  "/icon-512.png"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  if (DEV) return;
  event.waitUntil(
    caches.open(CACHE).then(function (c) {
      // Add items individually - one missing file must not brick the install.
      return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) {
        if (n.indexOf("richy-") === 0 && n !== CACHE) return caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (DEV) return;
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;

  // Never touch API calls or Firebase Auth/Firestore traffic - live data must
  // stay live.
  // Everything the shell needs is same-origin now (the CDN script tags are gone),
  // so cross-origin requests are all live data and are left entirely alone.
  if (sameOrigin && url.pathname.indexOf("/api/") === 0) return;
  if (!sameOrigin) return;

  // Navigations: network-first so a new deploy shows immediately; fall back to
  // the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put("/index.html", copy); });
        return r;
      }).catch(function () {
        return caches.match("/index.html").then(function (m) { return m || caches.match("/"); });
      })
    );
    return;
  }

  // The compiled bundle: network-first (deploys win), cache fallback (offline
  // boots). ignoreSearch so any cached ?v= build still serves offline.
  if (sameOrigin && url.pathname === "/dist/app.js") {
    event.respondWith(
      fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return r;
      }).catch(function () { return caches.match(req, { ignoreSearch: true }); })
    );
    return;
  }

  // Everything else (icons, init scripts, the vendored runtime): cache-first,
  // filling the cache from the network on first sight.
  event.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (r) {
        if (r && (r.ok || r.type === "opaque")) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return r;
      });
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ("focus" in list[i]) { return list[i].focus(); }
      }
      if (self.clients.openWindow) { return self.clients.openWindow("/"); }
    })
  );
});

// Future Web Push tier: server sends a push payload, we show the notification.
self.addEventListener("push", function (event) {
  var data = { title: "Richy", body: "You have a reminder." };
  try { if (event.data) { data = event.data.json(); } } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Richy", { body: data.body || "", tag: data.tag })
  );
});
