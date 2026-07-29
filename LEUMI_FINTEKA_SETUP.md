# Connect Richy to Bank Leumi via Open Banking (one-time setup)

Richy can now connect directly to a user's real **Bank Leumi** account through
Leumi's **Open Banking Portal** (the platform originally launched under the
"FinTeka" name; the live portal today is at leumiopenbanking.co.il). Once
connected, transactions sync automatically - no phone automation needed (that
older method, plain "Bank Sync", still exists separately for every other
bank).

I've written all the app code (client UI, OAuth2 + PKCE handshake, token
storage, transaction sync) - the plumbing should work as-is. But registration
here is a bigger step than Firebase's "paste your config" - see below.

**The portal, verified live:** https://www.leumiopenbanking.co.il
- API catalog (viewable without registration): https://www.leumiopenbanking.co.il/apis
- How to start: https://www.leumiopenbanking.co.il/how-to-start
- Registration form: https://www.leumiopenbanking.co.il/register
- Real base URLs from the catalog: sandbox `https://api.sbxleumiob.co.il/dev/sandbox`,
  production `https://leumiopenbanking.co.il/prd` (separate gateways per
  product: Accounts, Consents, Cards, Savings, Loans, Securities, Payments,
  RTP, Mandates).
- Downloadable implementation guides (no login needed): "How-To" info
  services guide, payments guide, mandates guide, and RTP guide are all
  linked from the API catalog page.

**Important caveat - registration is not self-serve for a hobby app.** The
"How to start" page and the registration form both confirm this requires
being a licensed Third-Party Provider: you need an Israeli company
registration number (ח״פ), and before you can even submit the registration
form you must already hold **two eIDAS-standard regulatory certificates**
issued by an approved regulator CA:
- **QWAC** (Qualified Website Authentication Certificate) - proves your
  fintech's identity and sets up mTLS.
- **QSEAL** (Qualified Electronic Seal) - signs your API request headers.

Without both certificates you cannot register, cannot touch the sandbox, and
cannot reach production. This is the same eIDAS/PSD2-style TPP licensing
model used across EU Open Banking - it's a formal regulatory step (usually
via a qualified trust service provider), not a developer signup form. If
Richy is a personal/hobby project rather than a licensed fintech entity,
getting a real Bank Leumi connection working end-to-end will depend on
clearing that certification first - worth confirming that's a step you
actually want to take before investing more time here.

Everything below assumes you've cleared that and have real values to plug
in. If you'd rather not pursue the formal TPP route, the phone-automation
Bank Sync (already shipped) remains the practical option for every bank
including Leumi.

---

## 1. Register as a licensed TPP on the Open Banking Portal

1. Obtain your QWAC + QSEAL certificates from an approved eIDAS regulator CA
   (see "How to start" on the portal for the current process/list).
2. Go to https://www.leumiopenbanking.co.il/register and fill in the company
   details, upload your public QSEAL certificate, and set a username/password
   (one login covers all your applications).
3. You'll need a **redirect URI** on file for the OAuth flow - use exactly
   this:
   ```
   https://richy-mgkl.vercel.app/api/leumi-fintaka?flow=callback
   ```
4. Request the **Accounts** (AISP) scope/product at minimum.
5. Once approved, pull from the portal / your developer area:
   - A **Client ID** and **Client Secret**
   - The **authorization endpoint** URL (where users log in and consent)
   - The **token endpoint** URL (where codes are exchanged for tokens)
   - The **API base URL** for your target environment (sandbox or production,
     see the real base URLs above)
   - The exact **scope** string they expect

## 2. Set environment variables in Vercel

Vercel dashboard -> your project -> **Settings -> Environment Variables**.
Add each of these (Production, and Preview if you test there too):

| Variable | Value |
|---|---|
| `LEUMI_FINTEKA_CLIENT_ID` | from the portal |
| `LEUMI_FINTEKA_CLIENT_SECRET` | from the portal |
| `LEUMI_FINTEKA_AUTH_URL` | the authorization endpoint from the portal |
| `LEUMI_FINTEKA_TOKEN_URL` | the token endpoint from the portal |
| `LEUMI_FINTEKA_API_BASE` | sandbox `https://api.sbxleumiob.co.il/dev/sandbox`, or production `https://leumiopenbanking.co.il/prd` - confirm the exact path suffix for the Accounts product against your portal login |
| `LEUMI_FINTEKA_SCOPE` | the scope string the portal expects (defaults to `accounts transactions` if unset) |
| `LEUMI_FINTEKA_REDIRECT_URI` | `https://richy-mgkl.vercel.app/api/leumi-fintaka?flow=callback` (must match step 1 exactly) |
| `LEUMI_FINTEKA_APP_URL` | `https://richy-mgkl.vercel.app/` (defaults to this if unset) |
| `CRON_SECRET` | a random 16+ character string (only needed if you want the daily automatic sync below) |

`FIREBASE_SERVICE_ACCOUNT` must already be set (see `FIREBASE_SETUP.md`) -
this feature reuses it to read/write Firestore, same as Bank Sync.

Redeploy after adding these - env vars only take effect on the next
deployment.

## 3. Try it

1. Open Richy -> Profile -> Bank Sync.
2. Under "Connect a bank directly", tap **Connect Bank Leumi**.
3. You'll be redirected to Bank Leumi's own login/consent page (not
   Richy - your Leumi password never touches Richy).
4. After you approve, you're redirected back into Richy showing "Connected".
5. Tap **Sync now** to pull transactions immediately, or wait for the daily
   automatic sync (see below).

## 4. Optional: daily automatic sync

`vercel.json` already includes a Vercel Cron entry that hits the sync
endpoint once a day at 6am UTC for every connected user:
```json
{ "path": "/api/leumi-fintaka?action=sync&cron=1", "schedule": "0 6 * * *" }
```
This only works once `CRON_SECRET` is set (Vercel automatically sends it as
the request's Authorization header - that's why the env var must be named
exactly `CRON_SECRET`, not a Leumi-prefixed name). Without it, direct connect
still works fine via the manual **Sync now** button - the cron is a
convenience, not a requirement. Vercel Cron on the free (Hobby) plan is
limited to once per day; paid plans allow more frequent schedules if you
want faster syncing later.

## Notes on how this was built (for your own review)

- Tokens are stored **server-side only**, in a Firestore collection
  (`leumiFinteka/{uid}`) that isn't listed in `firestore.rules` at all - the
  default deny-all rule blocks every client read/write to it. The running
  app only ever sees safe fields (connected/accountLabel/lastSyncAt/count)
  through a dedicated status endpoint, and persists those into its own
  `users/{uid}.leumiFinteka` exactly the way it already does for the
  phone-based Bank Sync key - the server never writes into `users/{uid}`
  directly, since the client owns and overwrites that whole document.
- Synced transactions land in the same `users/{uid}/syncInbox` subcollection
  the phone-automation Bank Sync already uses, tagged
  `source: "leumi_finteka"` with the bank's own transaction id attached, so
  duplicate-proofing is stronger than the phone method's amount/date/label
  heuristic.
- The OAuth flow uses PKCE (`code_challenge`/`code_verifier`), which most
  Open Banking implementations require or at least accept.
- Each product on https://www.leumiopenbanking.co.il/apis (Accounts, Consents,
  Cards, etc.) has a "Download Yaml" button on its spec page giving the exact
  OpenAPI/Swagger definition - once you're in, pull the Accounts one and send
  it to me (or paste the transaction schema) so I can line up
  `mapFinTekaTransaction()` in `api/leumi-fintaka.js` with the real field
  names instead of the generic Berlin-Group-style guess it uses now.
