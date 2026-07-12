// Bank Sync ingestion endpoint. An iOS Shortcuts "Transaction" automation on the
// user's iPhone POSTs every Apple Pay tap here ({ key, merchant, amount, ... }).
// The key is a per-user random token created when Bank Sync is enabled in the
// app; syncKeys/{key} maps it to a uid, and deleting that doc (disable) revokes
// access. We never write into users/{uid} itself - the client owns that blob and
// overwrites it wholesale - only into the users/{uid}/syncInbox subcollection,
// which the running app drains into real transactions.
var admin = require("firebase-admin");
var nodeCrypto = require("crypto");

// Initialized once per warm instance. FIREBASE_SERVICE_ACCOUNT holds the service
// account JSON (raw or base64) generated in the Firebase console.
function initAdmin() {
  if (admin.apps.length) return true;
  var raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return false;
  raw = raw.trim();
  var svc = JSON.parse(raw[0] === "{" ? raw : Buffer.from(raw, "base64").toString("utf8"));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
  return true;
}

var KEY_RE = /^rk_[0-9a-f]{32}$/;

// Shortcuts renders the Amount variable however the card formats it ("$4.50",
// "4,50", "USD 4.50") - keep digits and separators, treat a lone comma as the
// decimal mark.
function parseAmount(v) {
  var s = String(v == null ? "" : v).replace(/[^0-9.,\-]/g, "");
  if (s.indexOf(",") !== -1 && s.indexOf(".") === -1) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  var n = parseFloat(s);
  return isNaN(n) ? NaN : Math.round(Math.abs(n) * 100) / 100;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: { code: "method_not_allowed" } }); return; }

  try {
    if (!initAdmin()) {
      res.status(500).json({ ok: false, error: { code: "config_error", message: "FIREBASE_SERVICE_ACCOUNT is not set in environment variables." } });
      return;
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: { code: "config_error", message: "FIREBASE_SERVICE_ACCOUNT could not be parsed." } });
    return;
  }

  var body = req.body || {};
  var key = String(body.key || "").trim();
  if (!KEY_RE.test(key)) { res.status(400).json({ ok: false, error: { code: "bad_key" } }); return; }

  var merchant = String(body.merchant || body.name || "").trim().slice(0, 80) || "Card purchase";
  var amount = parseAmount(body.amount);
  if (isNaN(amount) || amount <= 0 || amount >= 1000000) {
    res.status(400).json({ ok: false, error: { code: "bad_amount" } });
    return;
  }
  var currency = String(body.currency || "").trim().toUpperCase();
  currency = /^[A-Z]{3}$/.test(currency) ? currency : null;
  var card = String(body.card || "").trim().slice(0, 40) || null;
  var date = String(body.date || "").trim();
  date = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

  try {
    var db = admin.firestore();
    // Only the SHA-256 of the key is ever stored (the doc id), so nothing in the
    // database is a usable credential - the raw key exists only on the user's
    // phone and in their own account blob.
    var keyHash = nodeCrypto.createHash("sha256").update(key).digest("hex");
    var keySnap = await db.doc("syncKeys/" + keyHash).get();
    var uid = keySnap.exists ? keySnap.data().uid : null;
    if (!uid) { res.status(404).json({ ok: false, error: { code: "unknown_key" } }); return; }

    var inbox = db.collection("users").doc(uid).collection("syncInbox");
    // Flood guard: if the app hasn't drained the inbox in a long while, stop
    // accepting rather than growing unboundedly.
    var count = await inbox.count().get();
    if (count.data().count >= 200) { res.status(429).json({ ok: false, error: { code: "inbox_full" } }); return; }

    await inbox.add({
      merchant: merchant,
      amount: amount,
      currency: currency,
      card: card,
      date: date,
      receivedAt: Date.now(),
      test: body.test === true
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: { code: "server_error", message: err.message || "Unknown error" } });
  }
};
