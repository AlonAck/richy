# Send Richard Watch alerts over WhatsApp (one-time setup)

Richy can now relay Richard Watch's single most urgent proactive signal (a
budget about to blow, a goal falling behind, a subscription worth cancelling)
to a user's own WhatsApp, in addition to the existing in-app Daily Brief.

I've written all the app code (client opt-in UI, the webhook, the send
endpoint) - it should work as-is once you plug in a Meta developer app. See
below for that registration step.

**Read this before enabling anything - it's the whole point of how this
feature is built:** WhatsApp's Cloud API only lets a business send a message
for free as a *reply inside the 24-hour window* opened by the user's own
message. Sending outside that window requires an approved message *template*,
and Meta bills for template sends. This integration **never sends a template
message - there is no code path for one at all.** Every alert is a plain text
reply, sent only if the linked phone messaged Richy's WhatsApp number within
the last 23 hours, with a hard cap of 3 alerts per user per day on top of
that. If the window is closed, the alert is silently skipped rather than
falling back to anything billable. This is why the in-app screen is honest
that alerts only start flowing once you've texted the number first, and why
you never need to add a payment method to Meta's WhatsApp Business Platform
for this to work.

---

## 1. Create a Meta developer app with WhatsApp

1. Go to https://developers.facebook.com/apps and create an app (type
   "Business").
2. Add the **WhatsApp** product to it. Meta gives you a free **test phone
   number** immediately - good enough for development; add your own WhatsApp
   Business number later if you want a real vanity number.
3. In WhatsApp -> API Setup, note:
   - The **Phone number ID** (not the phone number itself).
   - A **temporary access token** (24h) for quick testing, or better,
     generate a **permanent token**: Business Settings -> Users -> System
     Users -> create one, assign it the WhatsApp app with `whatsapp_business_messaging`
     permission, and generate a token with no expiry.
4. Note the app's **App Secret** (App Settings -> Basic) - used to verify
   that inbound webhook calls really come from Meta.
5. Pick your own random string as a **webhook verify token** (anything you
   want - Meta echoes it back once during setup to prove you control the
   endpoint).

## 2. Set environment variables in Vercel

Vercel dashboard -> your project -> **Settings -> Environment Variables**.

| Variable | Value |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | the permanent (or temporary) access token from step 1 |
| `WHATSAPP_PHONE_NUMBER_ID` | the Phone number ID from step 1 |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | the random string you picked in step 1 |
| `WHATSAPP_APP_SECRET` | the App Secret from step 1 (enables webhook signature verification - strongly recommended) |
| `WHATSAPP_GRAPH_API_VERSION` | optional, defaults to `v21.0` |

`FIREBASE_SERVICE_ACCOUNT` must already be set (see `FIREBASE_SETUP.md`) -
this feature reuses it to read/write Firestore, same as Bank Sync and Leumi
FinTeka.

Redeploy after adding these.

## 3. Point the webhook at Richy

1. In the Meta app, WhatsApp -> Configuration -> Webhook -> Edit.
2. **Callback URL:** `https://richy-mgkl.vercel.app/api/whatsapp`
3. **Verify token:** the same string you put in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
4. Click Verify and Save - Meta will call the URL once with a challenge;
   `api/whatsapp.js` answers it automatically.
5. Subscribe the webhook to the **messages** field.

## 4. Try it

1. Open Richy -> Profile -> Settings -> WhatsApp Alerts.
2. Enter your WhatsApp number (with country code, e.g. `+972501234567`) and
   save.
3. From that phone, message **START** to Richy's WhatsApp test/business
   number. The webhook flips your status to active and records that a free
   window is open.
4. Richy checks in on Richard Watch's top signal once a day while a window is
   open and relays it as a plain WhatsApp message if one is worth surfacing.
   Reply **STOP** at any time to opt back out.

Note: Meta's free test number can only message phone numbers you've added to
an allow-list in the developer console (WhatsApp -> API Setup -> "To"). A
production WhatsApp Business number (after Meta's business verification)
isn't restricted this way.
