// Bank Sync ingestion endpoint. Two phone automations POST every tap-to-pay
// purchase here: an iOS Shortcuts "Transaction" automation sends clean fields
// ({ key, merchant, amount, ... }), while Android (MacroDroid watching Google
// Wallet notifications) sends the raw notification ({ key, title, text, ... })
// which we parse into merchant + amount below.
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

// Google Wallet phrases its tap notification differently across versions and
// locales - "$4.50 with Visa ••••1234" / "Starbucks", "You paid $4.50 to
// Starbucks", "$4.50 at Starbucks" - so instead of one format we clean out the
// card fragment, grab the first money-looking number, and take the merchant
// from an "at/to X" phrase or whichever line is left holding only words.
var CARD_FRAG_RE = /(?:[•*xX]{2,}\s*\d{2,6}|\b(?:ending|ends)\s+(?:in\s+)?\d{2,6})/g;
var WITH_CARD_RE = /\bwith\s+(?:your\s+)?(?:visa|mastercard|amex|american express|discover|maestro|card\b)[^\n]*/gi;
var NOISE_RE = /\b(?:google (?:wallet|pay)|payment|purchase|transaction|you paid|paid)\b/gi;

function parseNotification(title, text) {
  var clean = function(s) {
    return String(s == null ? "" : s).replace(CARD_FRAG_RE, " ").replace(WITH_CARD_RE, " ").trim();
  };
  var t1 = clean(title);
  var t2 = clean(text);
  var combined = t1 + "\n" + t2;

  // Amount: prefer a number touching a currency mark or 3-letter code, then a
  // decimal-bearing number, then any number at all.
  var m = combined.match(/(?:[$€£₪¥₹]|\b[A-Z]{3}\b)\s*(\d[\d.,]*)/) ||
          combined.match(/(\d[\d.,]*)\s*(?:[$€£₪¥₹]|\b[A-Z]{3}\b)/) ||
          combined.match(/(\d+[.,]\d{1,2})\b/) ||
          combined.match(/(\d[\d.,]*)/);
  var amount = m ? m[1] : "";

  var merchant = "";
  var at = combined.match(/\b(?:at|to)\s+([^\n]{2,60})/i);
  if (at) merchant = at[1];
  else {
    // The line that isn't carrying the amount is usually the merchant.
    var lines = [t1, t2].map(function(s) { return s.replace(NOISE_RE, " ").trim(); });
    var noAmt = lines.filter(function(s) { return s && !/\d/.test(s); });
    merchant = noAmt[0] || lines.filter(Boolean)[0] || "";
  }
  merchant = merchant.replace(NOISE_RE, " ").replace(/[\s\-–—:,.]+$/g, "").replace(/\s{2,}/g, " ").trim();
  return { merchant: merchant, amount: amount };
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

  var merchant = String(body.merchant || body.name || "").trim();
  var amount = parseAmount(body.amount);
  // Android path: no clean fields, just the forwarded Google Wallet
  // notification - fill whichever of merchant/amount the body didn't carry.
  if ((!merchant || isNaN(amount)) && (body.title || body.text)) {
    var notif = parseNotification(body.title, body.text);
    if (!merchant) merchant = notif.merchant;
    if (isNaN(amount)) amount = parseAmount(notif.amount);
  }
  merchant = merchant.slice(0, 80) || "Card purchase";
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
