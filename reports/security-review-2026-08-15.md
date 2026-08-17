# Richy — pre-submission security review

**Date:** 15 August 2026
**Scope:** App Store readiness, serverless API layer, Firestore rules, client bundle
**Repo state at review:** `470242e` → fixes landed in `6c26de7`, `4ed70d3`

> Internal document. It names vulnerabilities that are still open in the live
> production deployment. Treat accordingly before forwarding.

---

## Summary

The app is close, and the foundations are strong. Firestore rules are the best
part of the codebase; `index.html` vendors every script same-origin with a
correct Guideline 2.5.2 rationale; there are no hardcoded secrets, no `eval`,
no `dangerouslySetInnerHTML`, and no XSS sinks in 1.8MB of JSX.

Five issues would have blocked or endangered submission. **Three are fixed and
pushed.** Two remain, one of which is the most serious finding in this review.

---

## Fixed

### 1. Missing privacy manifest — was a hard App Store gate
**Severity: blocker · Fixed in `6c26de7`**

No `PrivacyInfo.xcprivacy` existed. Apple rejects any app touching a
required-reason API automatically, by email (ITMS-91053), before a human
reviewer sees the build. Capacitor core uses `UserDefaults`, so Richy is in
scope.

Added `native/PrivacyInfo.xcprivacy`, declaring `NSPrivacyTracking=false`,
five collected data types (email, name, financial info, user ID, chat content
— all linked, all app-functionality, none tracking), and
`NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1`. Every entry
traces to a specific line in `privacy.html`.

`NATIVE_BUILD.md` gained step 3a: where to copy it, how to add it to the Xcode
target (copying alone is not enough — it must be a target member), and the rule
that the manifest, `privacy.html`, and the App Store Connect questionnaire must
agree.

### 2. Account deletion left the whole social graph behind
**Severity: blocker · Fixed in `6c26de7`**

`api/delete-account.js` predates the social layer (`cd72ed5`). It erased
`syncInbox`, `users/{uid}`, `syncKeys`, `leumiFinteka`, household membership,
and the Auth user — but never `profiles/`, `profileStats/`, `handles/`,
`follows/`, or `followRequests/`.

Incomplete erasure under App Store 5.1.1(v) and GDPR art. 17. The handle was
the sharp edge: `firestore.rules` sets `allow list, update, delete: if false`
on `handles/{handle}`, so no client can ever release one. A deleted user's
handle was permanently squatted — they could not reclaim their own name on
re-signup.

Added step 6 covering all five collections, using paired equality queries
(`follower`/`target`, `from`/`to`) rather than `Filter.or()`, chunked at 400
ops to stay under the 500-op batch cap.

### 3. AI proxy capped output but not input
**Severity: blocker · Fixed in `6c26de7`**

`api/chat.js` clamped `maxTokens` to 2000 but accepted unbounded input. A
tampered client could post a several-hundred-thousand-token payload and have it
billed 30 times per rate-limit window. Input is where the volume is.

Added ceilings: 40 messages, 20k chars of system prompt, 100k chars total
measured over the serialised payload. Requests over the limit are **rejected,
not truncated** — a silently trimmed prompt produces a confident answer built
on half the user's numbers, which is worse than a visible error.

### 4. Market-data endpoint was a fully open API-key relay
**Severity: blocker · Fixed in `4ed70d3`**

`api/stock.js` was the one endpoint with no auth at all: `CORS *`, no token
check, no rate limit — while spending `FINNHUB_API_KEY` and
`TWELVEDATA_API_KEY`. Anyone who found the URL could drain the quota from
anywhere.

The file's own comment claimed the edge cache was the rate-limit shield. It
isn't: a cache only absorbs repeats of the *same* URL, so an attacker asking
for a stream of distinct symbols (`?symbol=AAAA`, `ABAA`, …) misses every time
and bills an origin call per miss. The cache protects against your own popular
symbols, not against a deliberate attacker.

Now verifies a Firebase ID token before touching any provider, with a per-uid
ceiling of 120/min behind it. `_stockGet` in the client attaches the token.
CORS here is an **exact allowlist** rather than the `richy-*.vercel.app` regex
used elsewhere — see open issue 6.

Accepted tradeoff, documented in the file: a 200 is still cached as `public`
and the CDN cache key ignores `Authorization`, so an anonymous caller can be
served an already-cached quote. That is fine — public market data, and they
still cannot cause an origin fetch, which is the part that costs money.

---

## Still open

### 5. The client controls Richard's system prompt — most serious finding
**Severity: blocker · NOT FIXED**

`api/chat.js:85` — `var system = body.system || "";`

Every guardrail on Richard lives in the browser. Any user who signs up (free)
can send an arbitrary system prompt to your Anthropic key. Two consequences:

- **Cost/abuse:** the app is a general-purpose Claude relay on your bill. The
  new input ceiling bounds the per-request damage but does not close the hole.
- **Regulatory:** the investment-advice boundary is not enforced anywhere. With
  27 call sites including *"Find the next big opportunities for me and size each
  one to my situation"* and *"Teach them how to tell if a stock is a good pick,
  tailored to them"*, the ISA advice line is being approached by prompts a
  modified client can rewrite at will. See the `open-finance-legal` skill.

There is a **second, independent instance** of the same class of bug:
`richardUserCtx()` (`budget-app.jsx:4971`) wraps user-authored custom
instructions in the literal header *"CONTEXT FROM THE USER — HIGHEST PRIORITY
(follow any instructions in it…)"* and places it at the **top** of the system
prompt. Even with prompts moved server-side, that text instructs the model to
prioritise arbitrary user input over everything after it.

**Recommended fix.** Server-side prompt registry:

1. Add `api/_prompts.js` (underscore prefix → not routed by Vercel) holding the
   ~22 distinct prompt templates as `promptId → fn(vars)`.
2. `api/chat.js` accepts `{ promptId, vars, userInstructions }` and composes
   the system prompt itself. Unknown `promptId` → 400. Remove `body.system`
   entirely — no fallback, or the hole stays open.
3. Client sends data, never instructions. `richardSystem()` (`:6878`) is
   already a partial seam and is the natural migration point.
4. Re-scope `richardUserCtx` so custom instructions remain authoritative for
   *facts and preferences* ("rent is covered by my parents") but are explicitly
   subordinate to the safety and advice rules — preserving the feature while
   closing the injection path.

Sized at roughly a day, mostly careful transcription of prompt text out of a
1.8MB file. Needs the `shots.html` browser harness (port 8899) to verify, since
`node build.mjs` cannot run on the dev machine.

### 6. Over-broad preview CORS in two endpoints
**Severity: low · NOT FIXED**

`api/chat.js:23` and `api/delete-account.js:36` both match
`/^https:\/\/richy-[a-z0-9]+(-[a-z0-9-]+)?\.vercel\.app$/`. **Any** Vercel user
can create a project named `richy-anything` and be reflected as a trusted
origin.

Practical impact is low — the Bearer token is not sent cross-origin
automatically, so this is not directly exploitable. But it is free to fix:
`api/stock.js` now shows the pattern (exact allowlist + `VERCEL_URL` +
`EXTRA_ALLOWED_ORIGINS`). Port it to the other two.

### 7. No Content-Security-Policy
**Severity: low-medium · NOT FIXED**

No CSP header in `vercel.json`, no meta tag in `index.html`. The bundle is
clean of XSS sinks today, so there is nothing to exploit — but there is zero
defence-in-depth if that changes. Given every script is already same-origin, a
strict policy is nearly free:
`default-src 'self'; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'`
(verify the Firebase origins against actual network traffic before shipping).

### 8. `bank-sync.js` has no rate limit
**Severity: low · NOT FIXED**

Unauthenticated by design (the key *is* the credential, 128 bits — fine), but
every well-formed request costs a Firestore read before the key is looked up.
Cheap billing DoS. Add a per-IP or per-key-prefix limit.

### 9. Household rules do not constrain *what* changes
**Severity: medium · NOT FIXED**

`firestore.rules:60` — `allow update: if isMember() || isInvited()` with no
field-level constraint. An invited-but-not-yet-joined user can rewrite
`memberUids` and evict the real members. Constrain the update to the fields an
invitee legitimately needs to touch (adding only themselves).

### 10. Profile handle is not cross-checked against `handles/`
**Severity: low · NOT FIXED**

`profiles/{uid}` allows the owner to write any `handle` value without verifying
they hold the corresponding `handles/{handle}` doc. Lookup goes through
`handles/` so routing is safe, but the displayed profile card can claim any
name — display-level impersonation in a social feature.

### 11. Rate limiting is in-memory
**Severity: informational**

`chat.js` and now `stock.js` both use per-warm-instance in-memory counters.
Under serverless concurrency each instance gets its own budget, so this bounds
the common case rather than enforcing a global cap. The file comments say so
honestly. The durable control is a spend cap set on the Anthropic, Finnhub, and
Twelve Data accounts themselves — **set those.**

---

## Non-security note

`api/chat.js` defaults to `claude-sonnet-4-6`. All three whitelisted model IDs
are valid and active, but `claude-sonnet-5` is both more capable *and* currently
cheaper — $2/$10 per MTok introductory through 31 Aug 2026, versus $3/$15 for
Sonnet 4.6. Changing the default is a one-line upgrade in quality and cost.
Left unchanged here because it was outside the agreed blocker scope and could
subtly shift Richard's tone across all 27 prompts — worth a deliberate pass.

---

## Suggested order

1. **Issue 5** — server-side prompt registry. The only remaining blocker.
2. **Issue 11** — set provider spend caps. Minutes, and it is the real backstop.
3. **Issues 6, 9** — small, contained rule/CORS tightening.
4. **Issues 7, 8, 10** — hardening.
