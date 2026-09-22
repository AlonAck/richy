// WhatsApp Alerts — DECOMMISSIONED 2026-09-10, per Alon's decision.
//
// This feature (Alfred Watch alerts delivered over WhatsApp) is being removed
// entirely rather than fixed, because it was flagged as a launch blocker twice
// over: account deletion never erased the whatsappPhones/{phone} -> uid mapping
// (making privacy.html's erasure claim false), and the feature sent data to
// Meta without disclosing that in privacy.html or terms.html. Removing it beats
// fixing the disclosure/deletion gap because it also drops the ongoing Meta
// data-sharing exposure entirely, not just the launch-blocking part of it.
//
// This file is left as an inert stub — returning 410 Gone for every request,
// touching neither Firestore nor any external API — because this session
// could not reach git on this machine to delete the file outright (and delete
// WHATSAPP_SETUP.md alongside it). Next time a session has shell/git access
// here: delete this file and WHATSAPP_SETUP.md, and also purge any existing
// whatsappOptIn/{uid} and whatsappPhones/{phone} documents left over in
// Firestore from before this change (the Admin SDK is required for that; the
// client never had access to these collections, so nothing in budget-app.jsx
// needs to change to make that safe).
module.exports = function handler(req, res) {
  res.status(410).json({ ok: false, error: { message: "WhatsApp Alerts has been discontinued." } });
};
