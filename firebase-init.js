// Firebase project configuration for Richy.
//
// HOW TO FILL THIS IN:
//   1. Go to https://console.firebase.google.com and open (or create) your project.
//   2. Click the gear icon -> "Project settings".
//   3. Scroll to "Your apps". If you have no web app yet, click the "</>" (web)
//      icon, give it a nickname like "Richy web", and register it.
//   4. Firebase shows a "firebaseConfig" object. Copy each value into the
//      placeholders below (keep the quotes).
//
// These web keys are NOT secret - they identify your project to the browser.
// Your data is protected by Firestore security rules (see firestore.rules),
// not by hiding this config. It is safe to commit this file.

var firebaseConfig = {
  apiKey: "AIzaSyAasuLcFFhMMQyFQB5PpCu3lC9IvsOll4s",
  authDomain: "richy-91667.firebaseapp.com",
  projectId: "richy-91667",
  storageBucket: "richy-91667.firebasestorage.app",
  messagingSenderId: "942038586432",
  appId: "1:942038586432:web:aa409665fcb93bd1fb3ba5"
};

// Initialize only when real keys are present and the SDK loaded. This lets the
// app boot (and show a friendly "configure Firebase" message) before setup.
(function () {
  // Set regardless of whether the Firebase SDK scripts above actually loaded,
  // so the app can tell "keys were never filled in" apart from "the SDK failed
  // to load over the network" (ad blocker, flaky connection, CDN hiccup) - the
  // two look identical from cloudReady() alone but need very different error
  // copy for the user.
  window.__RICHY_FB_CONFIGURED__ = firebaseConfig.apiKey.indexOf("PASTE") === -1;
  if (typeof firebase === "undefined") return;
  if (!window.__RICHY_FB_CONFIGURED__) return;
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  // Offline data: Firestore mirrors the user's documents into IndexedDB, so a
  // signed-in user can open the app with no connection - reads come from the
  // local copy and writes queue up and sync when the network returns. Must run
  // before the first Firestore call. Failures (private browsing, unsupported
  // browser, many open tabs) are fine: the app just stays online-only.
  try {
    firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function () {});
  } catch (e) {}
})();
