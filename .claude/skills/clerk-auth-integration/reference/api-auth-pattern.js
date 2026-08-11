// Authenticating a Vercel serverless endpoint with a Clerk session token.
//
// Drop-in replacement for the Firebase equivalent:
//     var decoded = await admin.auth().verifyIdToken(token);
//     var uid = decoded.uid;
//
// The uid is ALWAYS derived from the verified token, never read from the
// request body or query - a caller must not be able to assert whose data it is
// acting on. Because the bridge mints Firebase custom tokens keyed to the Clerk
// user id, the uid returned here indexes the same users/{uid} documents.
var clerk = require("@clerk/backend");

async function uidFromRequest(req) {
  var hdr = req.headers.authorization || "";
  var m = /^Bearer (.+)$/.exec(hdr);
  if (!m) return null;
  var secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  try {
    var verified = await clerk.verifyToken(m[1], { secretKey: secretKey });
    return verified.sub || null;          // `sub` is the Clerk user id
  } catch (e) {
    return null;
  }
}

// Usage in a handler:
//
//   var uid = await uidFromRequest(req);
//   if (!uid) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
//
// Client side, the token comes from Clerk (NOT firebase.auth()):
//
//   window.Clerk.session.getToken().then(function (token) {
//     return fetch("/api/whatever", { headers: { Authorization: "Bearer " + token } });
//   });
//
// Deleting a Clerk user (account deletion) needs a client, not the bare module:
//
//   var client = clerk.createClerkClient({ secretKey: secretKey });
//   await client.users.deleteUser(uid);
