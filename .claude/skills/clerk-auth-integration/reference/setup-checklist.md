# Clerk setup checklist

Nothing works until all of this is done. Item 3 and the `CLERK_SECRET_KEY` env
var are the two that silently break everything if missed.

## 1. Clerk dashboard — https://dashboard.clerk.com

1. Create (or open) the application.
2. **API keys** → copy the **Publishable key** (`pk_test_...` / `pk_live_...`)
   into `CLERK_PUBLISHABLE_KEY` in `clerk-init.js`. This is not a secret — it
   only identifies your app to the browser, exactly like the Firebase web
   config. Safe to commit.
3. **User & authentication → Email, phone, username**: enable **Email address**
   and **Password**, and turn **OFF "Verify at sign-up"** for email.
   The app has no verification-code screen and expects `signUp.create()` to
   return `status === "complete"` immediately. Leave this on and every single
   sign-up fails with `auth/operation-not-allowed`.
4. **User & authentication → Social connections**: enable **Google**.
5. **Paths / allowed redirect URLs**: add the production origin *and*
   `http://localhost:<port>` for dev. Google sign-in is a full-page redirect
   back to these URLs; if they are missing, users bounce to an error.
6. Use a `pk_live_` key for production. A `pk_test_` key works but runs against
   Clerk's test instance.

## 2. Environment variables (Vercel dashboard → Settings → Environment Variables)

| Name | Used by | Notes |
|---|---|---|
| `CLERK_SECRET_KEY` | `api/clerk-firebase-token.js`, `api/chat.js`, `api/delete-account.js`, `api/leumi-fintaka.js` | `sk_...`. **Server only — never commit.** |
| `FIREBASE_SERVICE_ACCOUNT` | all of the above | Service-account JSON, raw or base64 |
| `ANTHROPIC_API_KEY` | `api/chat.js` | |

Vercel snapshots env vars into a deployment at build time — changing a value
takes effect on the **next** deployment, not the current one. Redeploy after
adding them.

Without `CLERK_SECRET_KEY` the bridge returns `config_error`, so sign-in, chat
and account deletion all fail while the app itself still loads and looks fine.
That combination is confusing to debug; check this first.

## 3. Firebase console

1. **Authentication → Sign-in method**: no provider needs enabling for the
   bridge — `signInWithCustomToken` works regardless. (Firebase Auth exists here
   only to satisfy Firestore's rules.)
2. **Project settings → Service accounts → Generate new private key** →
   paste that JSON into `FIREBASE_SERVICE_ACCOUNT`.
3. `firestore.rules` needs **no changes**: the bridge mints the Firebase uid as
   the Clerk user id, so `request.auth.uid == uid` keeps matching the same
   `users/{uid}` documents.

## 4. Verify end to end

- Sign up with a new email → lands in the app, and a `users/{clerkUserId}`
  document appears in Firestore. (If the doc is missing but sign-up succeeded,
  the bridge is not running before the first write — see gotcha 1 in SKILL.md.)
- Sign out, sign back in → data loads.
- Google sign-in → full-page redirect out and back, session restored.
- Reload while signed in → no flash of the sign-in screen.
- `POST /api/chat` with no `Authorization` header → **401**, not 500. A 500 with
  `config_error` means `CLERK_SECRET_KEY` is missing.
- Delete account → Firestore doc gone **and** the user gone from the Clerk
  dashboard.

## 5. Existing users

There is no automatic migration from Firebase Auth to Clerk. Accounts created
under Firebase Auth have Firebase uids; new Clerk accounts have Clerk user ids,
so a returning user signing up through Clerk gets a **new, empty** document and
their old data appears lost.

Options, in order of preference:
1. Import users into Clerk with their existing uid preserved as the Clerk user
   id (Clerk's Backend API supports specifying an id on create).
2. Keep a `legacyUid` field on the new document and copy the old blob across on
   first sign-in.
3. Only acceptable pre-launch: wipe and start clean (`admin/reset-users.js`).
