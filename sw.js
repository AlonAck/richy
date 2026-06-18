// Richy service worker.
// Today it powers reminder notifications: the page calls
// registration.showNotification(), and the click handler below focuses or opens
// the app. The "push" handler is a stub for a future server-driven Web Push tier
// (VAPID), which would deliver reminders even when the app is fully closed.

self.addEventListener("install", function() {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ("focus" in list[i]) { return list[i].focus(); }
      }
      if (self.clients.openWindow) { return self.clients.openWindow("/"); }
    })
  );
});

// Future Web Push tier: server sends a push payload, we show the notification.
self.addEventListener("push", function(event) {
  var data = { title: "Richy", body: "You have a reminder." };
  try { if (event.data) { data = event.data.json(); } } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Richy", { body: data.body || "", tag: data.tag })
  );
});
