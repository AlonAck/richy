// Permanent account deletion (App Store guideline 5.1.1(v) / GDPR erasure).
// POST, auth: Authorization: Bearer <Clerk session token>. The caller can only
// ever delete THEMSELVES - the uid comes from the verified token, never the body.
//
// Erases, in order:
//   1. users/{uid}/syncInbox/*        (pending bank-sync transactions)
//   2. users/{uid}                    (the entire account blob)
//   3. syncKeys where uid == caller   (bank-sync key mapping - revokes the phone key)
//   4. leumiFinteka/{uid}             (bank connection tokens, best-effort revoke first)
//   5. households: removes the caller from memberUids/members of any household
//      they belong to (the household itself survives for the other member)
//   6. Firebase Auth shadow user      (created by the Clerk->Firebase bridge)
//   7. The Clerk user itself          (the real sign-in account)
//
// If a late step fails the earlier deletions stand - the endpoint reports which
// steps failed so the client can tell the user to contact support rather than
// silently pretending everything is gone.
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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: { code: "method_not_allowed" } }); return; }

  var secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) { res.status(500).json({ ok: false, error: { code: "config_error", message: "CLERK_SECRET_KEY is not set." } }); return; }
  try {
    if (!initAdmin()) { res.status(500).json({ ok: false, error: { code: "config_error", message: "FIREBASE_SERVICE_ACCOUNT is not set." } }); return; }
  } catch (e) {
    res.status(500).json({ ok: false, error: { code: "config_error", message: "FIREBASE_SERVICE_ACCOUNT could not be parsed." } });
    return;
  }

  // ---- who is asking (their own account, always) ------------------------------
  var hdr = req.headers.authorization || "";
  var m = /^Bearer (.+)$/.exec(hdr);
  if (!m) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
  var uid;
  try {
    var verified = await clerk.verifyToken(m[1], { secretKey: secretKey });
    uid = verified.sub;
    if (!uid) throw new Error("Token had no subject.");
  } catch (e) {
    res.status(401).json({ ok: false, error: { code: "unauthenticated" } });
    return;
  }

  var db = admin.firestore();
  var failed = [];

  // 1. syncInbox subcollection (must go before the parent doc - deleting a doc
  //    does NOT delete its subcollections in Firestore).
  try {
    var inbox = await db.collection("users").doc(uid).collection("syncInbox").get();
    if (!inbox.empty) {
      var batch = db.batch();
      inbox.docs.forEach(function (d) { batch.delete(d.ref); });
      await batch.commit();
    }
  } catch (e) { failed.push("syncInbox"); }

  // 2. The account blob itself.
  try { await db.collection("users").doc(uid).delete(); } catch (e) { failed.push("userDoc"); }

  // 3. Bank-sync key mapping (revokes the phone automation's key).
  try {
    var keys = await db.collection("syncKeys").where("uid", "==", uid).get();
    if (!keys.empty) {
      var kb = db.batch();
      keys.docs.forEach(function (d) { kb.delete(d.ref); });
      await kb.commit();
    }
  } catch (e) { failed.push("syncKeys"); }

  // 4. Bank connection tokens (best-effort revoke upstream first).
  try {
    var connSnap = await db.collection("leumiFinteka").doc(uid).get();
    if (connSnap.exists) {
      var conn = connSnap.data();
      var tokenUrl = process.env.LEUMI_FINTEKA_TOKEN_URL || "";
      if (conn.accessToken && tokenUrl) {
        try {
          await fetch(tokenUrl.replace(/\/token\b/, "/revoke"), {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              token: conn.accessToken,
              client_id: process.env.LEUMI_FINTEKA_CLIENT_ID || "",
              client_secret: process.env.LEUMI_FINTEKA_CLIENT_SECRET || ""
            }).toString()
          });
        } catch (revokeErr) { /* best-effort */ }
      }
      await connSnap.ref.delete();
    }
  } catch (e) { failed.push("leumiFinteka"); }

  // 5. Household membership: strip the caller out of any household they're in.
  try {
    var FV = admin.firestore.FieldValue;
    var hhs = await db.collection("households").where("memberUids", "array-contains", uid).get();
    for (var i = 0; i < hhs.docs.length; i++) {
      var hh = hhs.docs[i];
      var data = hh.data();
      var members = (data.members || []).filter(function (mm) { return mm && mm.uid !== uid; });
      var memberUids = (data.memberUids || []).filter(function (u) { return u !== uid; });
      if (memberUids.length === 0) {
        await hh.ref.delete(); // last member out closes the household
      } else {
        await hh.ref.update({ memberUids: memberUids, members: members, pendingEmails: data.pendingEmails || [] });
      }
    }
  } catch (e) { failed.push("households"); }

  // 6. Firebase shadow auth user (harmless if it never existed).
  try { await admin.auth().deleteUser(uid); } catch (e) { /* not_found is fine */ }

  // 7. The Clerk account - last, so a failure above never strands a sign-in
  //    that points at half-deleted data without the user knowing.
  try {
    var client = clerk.createClerkClient({ secretKey: secretKey });
    await client.users.deleteUser(uid);
  } catch (e) { failed.push("clerkUser"); }

  if (failed.length) {
    res.status(207).json({ ok: false, partial: true, failed: failed, message: "Some data could not be removed automatically. Email richysupport@gmail.com and we'll finish the deletion manually." });
    return;
  }
  res.status(200).json({ ok: true });
};
