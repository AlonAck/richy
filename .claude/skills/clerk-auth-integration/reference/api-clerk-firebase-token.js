// Bridges a signed-in Clerk user to a Firebase custom token, purely so
// Firestore's security rules (which only trust Firebase's own request.auth)
// keep working after the switch from Firebase Auth to Clerk. The client calls
// this right after every Clerk sign-in (see _bridgeToFirebase() in
// budget-app.jsx) and then signs in to Firebase Auth with the returned token -
// invisible to the user, who only ever sees Clerk's own sign-in UI.
//
// The Firebase uid minted here is always the Clerk user id, so Firestore
// docs stay keyed the same way they always were (users/{uid}, memberUids, etc.)
// - just with uid now meaning "Clerk user id" instead of "Firebase user id".
//
// GET/POST, auth: Authorization: Bearer <Clerk session token> -> { ok, token }
var admin = require("firebase-admin");
var clerk = require("@clerk/backend");

function initAdmin() {
  if (admin.apps.length) return true;
  var raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return false;
  raw = raw.trim();
  var svc = JSON.parse(raw[0] === "{" ? raw : Buffer.from(raw, "base64").toString("utf8"));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
  return true;
}

// CORS: reflect only trusted origins (prod, Vercel previews, local dev harness).
var PROD_ORIGIN = "https://richy-mgkl.vercel.app";
function corsOrigin(req) {
  var o = req.headers.origin || "";
  if (o === PROD_ORIGIN) return o;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
  if (/^https:\/\/richy-[a-z0-9]+(-[a-z0-9-]+)?\.vercel\.app$/.test(o)) return o;
  return PROD_ORIGIN;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", corsOrigin(req));
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  var secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ ok: false, error: { code: "config_error", message: "CLERK_SECRET_KEY is not set." } });
    return;
  }
  try {
    if (!initAdmin()) {
      res.status(500).json({ ok: false, error: { code: "config_error", message: "FIREBASE_SERVICE_ACCOUNT is not set." } });
      return;
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: { code: "config_error", message: "FIREBASE_SERVICE_ACCOUNT could not be parsed." } });
    return;
  }

  var hdr = req.headers.authorization || "";
  var m = /^Bearer (.+)$/.exec(hdr);
  if (!m) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }

  try {
    var verified = await clerk.verifyToken(m[1], { secretKey: secretKey });
    var clerkUserId = verified.sub;
    if (!clerkUserId) throw new Error("Token had no subject.");
    var customToken = await admin.auth().createCustomToken(clerkUserId);
    res.status(200).json({ ok: true, token: customToken });
  } catch (e) {
    res.status(401).json({ ok: false, error: { code: "unauthenticated", message: (e && e.message) || "Invalid session." } });
  }
};
