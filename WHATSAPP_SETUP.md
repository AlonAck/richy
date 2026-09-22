# WhatsApp Alerts — REMOVED 2026-09-10

This feature was removed entirely (not just fixed), per Alon's decision. It
was flagged as a launch blocker on two grounds: account deletion never erased
the `whatsappPhones/{phone} -> uid` mapping in Firestore, and the feature sent
Alfred Watch data to Meta without disclosing that in `privacy.html` or
`terms.html`.

What changed:
- `budget-app.jsx`: removed the Settings row, the `WhatsAppAlertsView` screen,
  the client-side API helpers (`whatsappFetch`, `onLinkWhatsapp`,
  `onUnlinkWhatsapp`, `refreshWhatsapp`), the daily-alert `useEffect`, and every
  translation string across all four languages (en/he/ar/ru), including the
  two places Alfred's own system prompt described the feature to himself.
- `api/whatsapp.js`: left in place but gutted to an inert stub returning
  `410 Gone` — could not delete the file outright this session (no git/shell
  access to this machine). **Delete this file for real next time git access
  works, along with this one.**
- `firestore.rules`: removed the now-stale comment describing the
  `whatsappOptIn`/`whatsappPhones` collections (they were already outside the
  rules, denied by the catch-all — nothing else to change there).

Still outstanding: any `whatsappOptIn/{uid}` or `whatsappPhones/{phone}`
documents that already exist in Firestore from before this change need a
one-time Admin-SDK purge — the client-side removal above doesn't touch them.
Low risk pre-launch (few if any real users linked a number yet), but worth
doing before submission so there's nothing left to disclose or fail to erase.

This file itself, and `api/whatsapp.js`, should both be deleted for real once
a session has shell/git access to this repo again.
