---
name: clerk-auth-integration
description: Restore or re-apply Clerk authentication bridged to Firebase/Firestore in Richy. Use when adding Clerk as the auth layer, migrating from Firebase Auth to Clerk, wiring a Clerk session to Firestore security rules via a custom-token bridge, verifying Clerk tokens in serverless API endpoints, or deleting a Clerk user during account deletion.
status: published
---

# Clerk auth, bridged to Firebase (Richy)

Complete, working implementation of Clerk as the user-facing auth layer with
Firestore kept as the database. Extracted from Richy at commit `034ca0a`, where
it ran in production. **Richy has since reverted to plain Firebase Auth** — this
skill exists so the Clerk path can be restored exactly, without re-deriving it.

## When to use

- Re-introducing Clerk to Richy (or any app with the same Firebase-backed shape).
- Any app where Clerk owns identity but Firestore security rules must keep
  working — the rules only trust Firebase's own `request.auth`.
- Verifying Clerk session tokens server-side in Vercel functions.

## The core problem this solves

Firestore security rules authorize on `request.auth`, which **only Firebase Auth
populates**. A Clerk session token is meaningless to Firestore. Naively adopting
Clerk breaks every rule in `firestore.rules`.

The fix is a **custom-token bridge**: after every Clerk sign-in, the client
exchanges its Clerk session for a Firebase custom token minted server-side with
the Clerk user id as the Firebase uid, then signs into Firebase Auth with it.

```
User ──sees──> Clerk UI ──session token──> /api/clerk-firebase-token
                                                   │ verifyToken(secretKey)
                                                   │ createCustomToken(clerkUserId)
                                                   ▼
                          Firebase Auth ◄── signInWithCustomToken
                                   │
                                   ▼  request.auth.uid === Clerk user id
                             Firestore rules pass unchanged
```

The decisive property: **the Firebase uid IS the Clerk user id**, so every
existing document path (`users/{uid}`, `memberUids`, `syncKeys.uid`) keeps
working with no data migration. The user never sees Firebase — Clerk is the only
auth UI they encounter.

## Critical gotchas (each cost real debugging time)

1. **Bridge before the first Firestore write.** `signUp()` must call
   `_bridgeToFirebase()` *inside* its own promise chain, not rely on the
   `onAuth` listener — the listener fires asynchronously, and `finishSignup()`
   writes the new user's doc immediately after signUp resolves. Without the
   inline bridge, that write hits the rules with no `request.auth` and is
   rejected.

2. **Clerk needs `verify at sign-up` OFF.** The app has no verification-code
   screen and expects `signUp.create()` to return `status === "complete"`
   immediately. Turn this off in the Clerk dashboard or every sign-up fails.

3. **Google sign-in is a full-page redirect, not a popup.** Unlike Firebase's
   `signInWithPopup`, `authenticateWithRedirect` navigates away and back. Code
   after the call does not run. `onAuth` picks the session up on return, and
   `clerk-init.js` must call `handleRedirectCallback()` at boot.

4. **`Clerk.load()` is an async network call.** Firebase's `initializeApp` is
   synchronous; Clerk is not. Everything must await a readiness promise
   (`window.__RICHY_CLERK_READY__`) — you cannot assume `window.Clerk` is usable
   on first render.

5. **Email changes are not immediate.** Clerk requires verifying a newly added
   address before it becomes primary. Firebase's `updateEmail` applied instantly.
   Any email-change UI needs a code-entry step — Richy's `EditEmailView` never
   got one, so it only *starts* the flow and tells the user to check their inbox.

6. **`CLERK_SECRET_KEY` gates everything server-side.** Without it in the
   environment, the bridge, chat, and account deletion all return
   `config_error`. This silently broke the whole app once.

7. **Deleting an account means deleting the Clerk user too.** Do it *last*, so a
   failure in the earlier Firestore steps never strands a live sign-in pointing
   at half-erased data.

## Files in this skill

| File | What it is |
|---|---|
| `reference/client-cloud.js` | Client helpers + all Clerk-backed `CLOUD` methods |
| `reference/clerk-init.js` | Publishable-key bootstrap and redirect handling |
| `reference/api-clerk-firebase-token.js` | The bridge endpoint |
| `reference/api-auth-pattern.js` | `uidFromRequest()` for any protected endpoint |
| `reference/api-delete-account.js` | Full account deletion incl. the Clerk user |
| `reference/shell-and-build.md` | Script tags, vendoring, SW cache, package.json |
| `reference/setup-checklist.md` | Clerk dashboard + Vercel env setup |

## Applying it

1. `npm install @clerk/backend @clerk/clerk-js`
2. Copy `reference/clerk-init.js` to the project root; paste the publishable key
   (`pk_...` — non-secret, safe to commit).
3. Copy `reference/api-clerk-firebase-token.js` to `api/clerk-firebase-token.js`.
4. Replace the client's Firebase-Auth `CLOUD` methods with
   `reference/client-cloud.js`. Keep the non-auth methods (`loadUser`,
   `saveUser`, households, sync inbox) exactly as they are — they are
   Firestore-only and unaffected.
5. Update `cloudConfigured()` to require **both** `__RICHY_FB_CONFIGURED__` and
   `__RICHY_CLERK_CONFIGURED__`.
6. Apply `reference/shell-and-build.md` to `index.html`, `build.mjs`, `sw.js`.
7. Swap any `admin.auth().verifyIdToken(...)` in API endpoints for the
   `uidFromRequest()` pattern in `reference/api-auth-pattern.js`.
8. Work through `reference/setup-checklist.md`.

## Call-site changes the migration forces

These are easy to miss because they compile fine and fail at runtime:

- `CLOUD.updatePassword(newPw, oldPw)` — Clerk verifies the old password and
  sets the new one in **one** call. Firebase needed a separate
  `reauthenticate()` first, so `CLOUD.reauthenticate` disappears and every
  caller must drop it.
- `hasPasswordProvider()` reads `clerkUser.passwordEnabled`, not
  `providerData[].providerId === "password"`.
- The auth-state user object is a **Clerk** user: `cu.id` (not `cu.uid`),
  `cu.primaryEmailAddress.emailAddress` (not `cu.email`), `cu.fullName`.
- Auth tokens for your own API come from `window.Clerk.session.getToken()`, not
  `firebase.auth().currentUser.getIdToken()`.
- Errors are Clerk-shaped; `_clerkErr()` normalizes them back to Firebase's
  `auth/...` codes so existing error-message switches keep working. Keep it —
  it is what makes the migration a small diff instead of a large one.
