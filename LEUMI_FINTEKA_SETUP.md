# Connect Richy to Bank Leumi via FinTeka (one-time setup)

Richy can now connect directly to a user's real **Bank Leumi** account through
**FinTeka**, Leumi's Open Banking subsidiary and API marketplace. Once
connected, transactions sync automatically - no phone automation needed (that
older method, plain "Bank Sync", still exists separately for every other
bank).

I've written all the app code (client UI, OAuth2 + PKCE handshake, token
storage, transaction sync) - you only need to register with Leumi and paste
the config, the same way you did for Firebase.

**Important caveat:** FinTeka's exact API is published only inside their own
developer portal (it isn't public), so I built this against the standard
Open Banking / Berlin Group shape their platform is modeled on. The OAuth2
flow itself is standard and should work as-is. Two things will likely need a
small tweak once you're registered and can see real responses:
1. The exact authorize/token/API URLs (you'll get these from the portal).
2. The transaction field names in `mapFinTekaTransaction()` inside
   `api/leumi-fintaka.js` - if Leumi's sandbox returns transactions shaped
   differently than expected, send me one sample transaction JSON object and
   I'll adjust the mapping in a minute.

---

## 1. Register as a FinTeka developer / TPP

1. Go to Bank Leumi's FinTeka developer portal and create an account
   (search "Bank Leumi FinTeka developer portal" if you don't have the link
   handy - I can't sign up on your behalf).
2. Register a new application. You'll need to give them a **redirect URI** -
   use exactly this:
   ```
   https://richy-mgkl.vercel.app/api/leumi-fintaka?flow=callback
   ```
3. Request the **Accounts** and **Transactions** (AISP) scopes.
4. Once approved (sandbox access is usually instant, production may take
   longer), the portal will show you:
   - A **Client ID** and **Client Secret**
   - The **authorization endpoint** URL (where users log in and consent)
   - The **token endpoint** URL (where codes are exchanged for tokens)
   - The **API base URL** (where accounts/transactions are fetched)
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
| `LEUMI_FINTEKA_API_BASE` | the API base URL from the portal (e.g. `https://api.fintaka.leumi.co.il/open-banking/v1`) |
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
