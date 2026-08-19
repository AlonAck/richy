// Landing-page waitlist capture (landing.html). Public and unauthenticated by
// design - anyone who hasn't signed up yet is exactly who this is for - so it
// writes through the Admin SDK (bypasses firestore.rules, same pattern as the
// bank-sync inbox) rather than opening a client-writable collection to the
// whole internet.
var admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length) return true;
  var raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return false;
  raw = raw.trim();
  var svc = JSON.parse(raw[0] === "{" ? raw : Buffer.from(raw, "base64").toString("utf8"));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
  return true;
}

var PROD_ORIGIN = "https://richy-mgkl.vercel.app";
function corsOrigin(req) {
  var o = req.headers.origin || "";
  if (o === PROD_ORIGIN) return o;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
  if (/^https:\/\/richy-[a-z0-9]+(-[a-z0-9-]+)?\.vercel\.app$/.test(o)) return o;
  return PROD_ORIGIN;
}

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort per-IP rate limit. In-memory, resets per warm serverless
// instance - not a hard guarantee, but bounds a single bad actor's burst.
var RATE_MAX = 5;
var RATE_WINDOW_MS = 10 * 60 * 1000;
var hits = {};
function rateLimited(key) {
  var now = Date.now();
  var arr = (hits[key] || []).filter(function (t) { return now - t < RATE_WINDOW_MS; });
  arr.push(now);
  hits[key] = arr;
  return arr.length > RATE_MAX;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", corsOrigin(req));
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: { type: "method_not_allowed", message: "Method not allowed" } }); return; }

  var ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  if (rateLimited(ip)) {
    res.status(429).json({ error: { type: "rate_limited", message: "Too many requests. Try again later." } });
    return;
  }

  var email = req.body && typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    res.status(400).json({ error: { type: "invalid_email", message: "Enter a valid email address." } });
    return;
  }

  try {
    if (!initAdmin()) {
      res.status(500).json({ error: { type: "config_error", message: "FIREBASE_SERVICE_ACCOUNT is not set." } });
      return;
    }
    var db = admin.firestore();
    var id = email.replace(/[^a-z0-9@._-]/g, "_");
    await db.collection("waitlist").doc(id).set({
      email: email,
      source: "landing",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: { type: "server_error", message: "Could not save your email. Try again." } });
  }
};
