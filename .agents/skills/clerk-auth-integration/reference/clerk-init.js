// Clerk configuration for Richy.
//
// HOW TO FILL THIS IN:
//   1. Go to https://dashboard.clerk.com and open (or create) your application.
//   2. In "API keys", copy the "Publishable key" (starts with pk_test_ or pk_live_)
//      into CLERK_PUBLISHABLE_KEY below.
//   3. Under "User & authentication" -> "Email, phone, username", make sure
//      "Email address" + "Password" are enabled, and turn OFF "Verify at
//      sign-up" for email (the app has no verification-code screen - it
//      expects sign-up to complete immediately, same as the old Firebase flow).
//   4. Under "User & authentication" -> "Social connections", enable Google.
//   5. Under "Paths", add this site's origin (and localhost for dev) to
//      allowed redirect URLs, since Google sign-in returns here after
//      Google's consent screen.
//   6. Copy the SECRET key (starts with sk_...) into the Vercel dashboard as
//      the CLERK_SECRET_KEY environment variable - never put it in this file,
//      it is server-only and must not be committed.
//
// The publishable key is NOT secret - like Firebase's config, it only
// identifies your app to the browser. It is safe to commit this file.

var CLERK_PUBLISHABLE_KEY = "pk_test_PASTE_YOUR_CLERK_PUBLISHABLE_KEY_HERE";

(function () {
  window.__RICHY_CLERK_CONFIGURED__ = CLERK_PUBLISHABLE_KEY.indexOf("PASTE") === -1;
  if (typeof window.Clerk === "undefined") return;
  if (!window.__RICHY_CLERK_CONFIGURED__) return;

  // window.__RICHY_CLERK_READY__ is a promise the app awaits before touching
  // Clerk (Clerk.load() is a network call, unlike Firebase's synchronous
  // initializeApp - the app can't assume Clerk is ready on the very first
  // render the way it could with Firebase).
  window.Clerk.publishableKey = CLERK_PUBLISHABLE_KEY;
  window.__RICHY_CLERK_READY__ = window.Clerk.load({}).then(function () {
    // Completes a pending Google-sign-in redirect if the page just navigated
    // back from Google's consent screen. No-op otherwise.
    return window.Clerk.handleRedirectCallback({}).catch(function () {});
  }).then(function () {
    return true;
  });
})();
