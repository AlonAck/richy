// Bank Leumi FinTeka (Open Banking) connect endpoint.
//
// FinTeka is Bank Leumi's Open Banking subsidiary / API marketplace - a real
// OAuth2 connection to a customer's actual Leumi account, unlike the
// phone-automation Bank Sync in api/bank-sync.js. This file is a SCAFFOLD:
// the OAuth2 authorization-code + PKCE flow and the generic Open-Banking-shaped
// transaction mapping below are standard and should work as-is, but Leumi's
// exact endpoint URLs, scope names, and response field names are published
// only inside FinTeka's own developer portal (they aren't public), so you
// must fill in the LEUMI_FINTEKA_* env vars from your own portal registration
// and double check mapFinTekaTransaction() against a real sandbox response
// before trusting this in production. See LEUMI_FINTEKA_SETUP.md.
//
// Same "client owns users/{uid}" invariant as bank-sync.js: this file NEVER
// writes into users/{uid} directly (the running app's next save() would wholesale
// overwrite/erase anything written here, since CLOUD.saveUser does a full
// .set(), not a merge). Tokens and connection state live in the server-only
// leumiFinteka/{uid} collection (not listed in firestore.rules, so the default
// deny-all covers it - the client can never read or write it directly). The
// client only ever learns the SAFE, non-secret status via ?action=status,
// and persists that itself through its own normal save() path.
//
// One-time OAuth handshake, all against this single endpoint:
//   GET  ?action=connect              (auth: Firebase ID token) -> { ok, url }
//        client redirects the whole page to `url`
//   GET  ?flow=callback&code=&state=  (Leumi redirects here)     -> 302 back to the app
//   GET  ?action=status               (auth: Firebase ID token) -> safe status only
//   POST ?action=sync                 (auth: Firebase ID token, or cron secret + cron=1)
//   POST ?action=disconnect           (auth: Firebase ID token)
var admin = require("firebase-admin");
var nodeCrypto = require("crypto");

function initAdmin() {
  if (admin.apps.length) return true;
  var raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return false;
  raw = raw.trim();
  var svc = JSON.parse(raw[0] === "{" ? raw : Buffer.from(raw, "base64").toString("utf8"));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
  return true;
}

function cfg() {
  return {
    clientId: process.env.LEUMI_FINTEKA_CLIENT_ID || "",
    clientSecret: process.env.LEUMI_FINTEKA_CLIENT_SECRET || "",
    authUrl: process.env.LEUMI_FINTEKA_AUTH_URL || "",
    tokenUrl: process.env.LEUMI_FINTEKA_TOKEN_URL || "",
    apiBase: process.env.LEUMI_FINTEKA_API_BASE || "",
    scope: process.env.LEUMI_FINTEKA_SCOPE || "accounts transactions",
    redirectUri: process.env.LEUMI_FINTEKA_REDIRECT_URI || "",
    appUrl: process.env.LEUMI_FINTEKA_APP_URL || "https://richy-mgkl.vercel.app/",
    // Named exactly CRON_SECRET (not a LEUMI_FINTEKA_-prefixed name) because
    // Vercel auto-attaches an env var with this exact name as the cron
    // request's Authorization header - see LEUMI_FINTEKA_SETUP.md.
    cronSecret: process.env.CRON_SECRET || ""
  };
}

function configComplete(c) {
  return !!(c.clientId && c.clientSecret && c.authUrl && c.tokenUrl && c.apiBase && c.redirectUri);
}

// ---- small crypto helpers ----------------------------------------------------
function randomToken(bytes) {
  return nodeCrypto.randomBytes(bytes || 32).toString("hex");
}
function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function pkcePair() {
  var verifier = base64url(nodeCrypto.randomBytes(32));
  var challenge = base64url(nodeCrypto.createHash("sha256").update(verifier).digest());
  return { verifier: verifier, challenge: challenge };
}

// ---- auth: who is calling us -------------------------------------------------
// Every user-triggered action (connect/status/sync/disconnect) is authenticated
// by verifying the caller's own Firebase ID token, so a client can only ever
// act on its own uid - the uid is never trusted from the request body/query.
async function uidFromRequest(req) {
  var hdr = req.headers.authorization || "";
  var m = /^Bearer (.+)$/.exec(hdr);
  if (!m) return null;
  try {
    var decoded = await admin.auth().verifyIdToken(m[1]);
    return decoded.uid || null;
  } catch (e) {
    return null;
  }
}

// ---- Open Banking transaction mapping ----------------------------------------
// Israel's Open Banking standard (like UK Open Banking / Berlin Group
// NextGenPSD2, which FinTeka's platform is modeled after) typically returns
// transactions shaped roughly like this. Field names below are best-effort
// covering the common variants; confirm against a real FinTeka sandbox
// response and adjust before relying on this.
function mapFinTekaTransaction(raw) {
  raw = raw || {};
  var amtObj = raw.transactionAmount || raw.amount_details || null;
  var amount = amtObj && amtObj.amount != null ? amtObj.amount : (raw.amount != null ? raw.amount : null);
  var currency = amtObj && amtObj.currency ? amtObj.currency : (raw.currency || raw.currencyCode || null);
  var merchant = raw.creditorName || raw.debtorName || raw.merchant || raw.remittanceInformationUnstructured || raw.description || raw.narrative || "Bank Leumi transaction";
  var date = raw.bookingDate || raw.valueDate || raw.date || raw.transactionDate || null;
  var externalId = raw.transactionId || raw.entryReference || raw.id || null;
  var n = parseFloat(amount);
  return {
    externalId: externalId ? String(externalId) : null,
    merchant: String(merchant).slice(0, 80),
    amount: isNaN(n) ? null : Math.round(Math.abs(n) * 100) / 100,
    currency: currency ? String(currency).toUpperCase().slice(0, 3) : null,
    date: date ? String(date).slice(0, 10) : null
  };
}

// ---- token exchange / refresh ------------------------------------------------
async function exchangeCodeForTokens(c, code, codeVerifier) {
  var body = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: c.redirectUri,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    code_verifier: codeVerifier
  });
  var r = await fetch(c.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  var data = await r.json();
  if (!r.ok || !data.access_token) throw new Error((data && (data.error_description || data.error)) || "Token exchange failed");
  return data;
}
async function refreshTokens(c, refreshToken) {
  var body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: c.clientId,
    client_secret: c.clientSecret
  });
  var r = await fetch(c.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  var data = await r.json();
  if (!r.ok || !data.access_token) throw new Error((data && (data.error_description || data.error)) || "Token refresh failed");
  return data;
}

// ---- one connection's worth of sync work -------------------------------------
async function syncOneConnection(db, c, uid, conn) {
  var accessToken = conn.accessToken;
  // Refresh proactively if within 2 minutes of expiry (or no expiry known).
  if (conn.refreshToken && (!conn.expiresAt || conn.expiresAt < Date.now() + 120000)) {
    var refreshed = await refreshTokens(c, conn.refreshToken);
    accessToken = refreshed.access_token;
    await db.collection("leumiFinteka").doc(uid).set({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || conn.refreshToken,
      expiresAt: refreshed.expires_in ? Date.now() + refreshed.expires_in * 1000 : null
    }, { merge: true });
  }

  var fromDate = conn.lastSyncAt ? new Date(conn.lastSyncAt).toISOString().slice(0, 10) : new Date(conn.connectedAt || Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  var url = c.apiBase.replace(/\/$/, "") + "/accounts/" + encodeURIComponent(conn.accountId || "") + "/transactions?dateFrom=" + fromDate;
  var r = await fetch(url, { headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" } });
  if (!r.ok) {
    var errBody = await r.text();
    throw new Error("FinTeka transactions request failed (" + r.status + "): " + errBody.slice(0, 200));
  }
  var data = await r.json();
  var rawTxs = data.transactions && (data.transactions.booked || data.transactions) || data.items || (Array.isArray(data) ? data : []);
  var mapped = (rawTxs || []).map(mapFinTekaTransaction).filter(function(t) { return t.amount != null && t.date; });

  // Defensive dedup against the connection's remembered recent external ids
  // (the client-side syncInbox drain also dedups by amount/date/label, but a
  // stable id here avoids ever re-importing across cron runs).
  var seenIds = {};
  (conn.recentExternalIds || []).forEach(function(id) { seenIds[id] = true; });
  var fresh = mapped.filter(function(t) { return !t.externalId || !seenIds[t.externalId]; });

  if (fresh.length) {
    var inbox = db.collection("users").doc(uid).collection("syncInbox");
    var batch = db.batch();
    fresh.forEach(function(t) {
      var ref = inbox.doc();
      batch.set(ref, {
        merchant: t.merchant,
        amount: t.amount,
        currency: t.currency,
        card: null,
        date: t.date,
        source: "leumi_finteka",
        externalId: t.externalId,
        receivedAt: Date.now()
      });
    });
    await batch.commit();
  }

  var nextIds = fresh.map(function(t) { return t.externalId; }).filter(Boolean).concat(conn.recentExternalIds || []).slice(0, 500);
  await db.collection("leumiFinteka").doc(uid).set({
    status: "connected",
    lastSyncAt: Date.now(),
    syncedCount: (conn.syncedCount || 0) + fresh.length,
    recentExternalIds: nextIds,
    lastError: null
  }, { merge: true });

  return fresh.length;
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

  // LEGAL GATE - do not remove on a "just add the credentials" impulse. A real
  // OAuth connection to customer bank accounts is licensed activity under
  // Israeli law (s.2(a) of the financial-information-service law; unlicensed
  // practice is an offence under s.57(a)(1)). This endpoint stays dark until
  // the licence exists and this flag is deliberately set alongside it.
  if (process.env.LEUMI_FINTEKA_LICENSED_GO_LIVE !== "yes") {
    res.status(503).json({ error: { type: "not_live", message: "Direct bank connection is not available. The in-app Leumi experience is a demo." } });
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

  var db = admin.firestore();
  var c = cfg();
  var q = req.query || {};

  // ---- OAuth redirect target: Leumi lands here with ?flow=callback ----------
  if (q.flow === "callback") {
    var code = q.code, state = q.state, oauthErr = q.error;
    if (oauthErr) { res.writeHead(302, { Location: c.appUrl + "?leumiFinteka=error&reason=" + encodeURIComponent(oauthErr) }); res.end(); return; }
    if (!code || !state) { res.writeHead(302, { Location: c.appUrl + "?leumiFinteka=error&reason=missing_code" }); res.end(); return; }
    try {
      var stateSnap = await db.collection("leumiOAuthState").doc(String(state)).get();
      if (!stateSnap.exists) { res.writeHead(302, { Location: c.appUrl + "?leumiFinteka=error&reason=bad_state" }); res.end(); return; }
      var stateData = stateSnap.data();
      await stateSnap.ref.delete(); // one-time use
      if (Date.now() - (stateData.createdAt || 0) > 15 * 60000) { res.writeHead(302, { Location: c.appUrl + "?leumiFinteka=error&reason=expired" }); res.end(); return; }

      var tokens = await exchangeCodeForTokens(c, code, stateData.codeVerifier);

      // Best-effort account lookup so the UI can show something like "Leumi
      // checking ...1234" instead of a bare "Connected". Non-fatal if it fails -
      // exact response shape depends on FinTeka's real accounts endpoint.
      var accountId = null, accountLabel = "Bank Leumi account";
      try {
        var accR = await fetch(c.apiBase.replace(/\/$/, "") + "/accounts", { headers: { Authorization: "Bearer " + tokens.access_token, Accept: "application/json" } });
        if (accR.ok) {
          var accData = await accR.json();
          var accList = accData.accounts || accData.items || (Array.isArray(accData) ? accData : []);
          var acc0 = accList[0];
          if (acc0) {
            accountId = acc0.accountId || acc0.resourceId || acc0.id || null;
            var iban = acc0.iban || acc0.accountNumber || "";
            accountLabel = "Bank Leumi" + (iban ? " ...".concat(String(iban).slice(-4)) : " account");
          }
        }
      } catch (accErr) { /* account lookup is best-effort; connection still succeeds */ }

      await db.collection("leumiFinteka").doc(stateData.uid).set({
        status: "connected",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
        accountId: accountId,
        accountLabel: accountLabel,
        connectedAt: Date.now(),
        lastSyncAt: null,
        syncedCount: 0,
        recentExternalIds: [],
        lastError: null
      }, { merge: true });

      res.writeHead(302, { Location: c.appUrl + "?leumiFinteka=connected" });
      res.end();
    } catch (e) {
      res.writeHead(302, { Location: c.appUrl + "?leumiFinteka=error&reason=" + encodeURIComponent((e && e.message) || "unknown") });
      res.end();
    }
    return;
  }

  var action = q.action;

  // ---- start the connect flow -----------------------------------------------
  if (action === "connect" && req.method === "GET") {
    if (!configComplete(c)) { res.status(500).json({ ok: false, error: { code: "config_error", message: "Leumi FinTeka env vars are not fully set. See LEUMI_FINTEKA_SETUP.md." } }); return; }
    var uid = await uidFromRequest(req);
    if (!uid) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
    var state = randomToken(16);
    var pkce = pkcePair();
    await db.collection("leumiOAuthState").doc(state).set({ uid: uid, codeVerifier: pkce.verifier, createdAt: Date.now() });
    var authorizeUrl = c.authUrl
      + (c.authUrl.indexOf("?") === -1 ? "?" : "&")
      + "response_type=code"
      + "&client_id=" + encodeURIComponent(c.clientId)
      + "&redirect_uri=" + encodeURIComponent(c.redirectUri)
      + "&scope=" + encodeURIComponent(c.scope)
      + "&state=" + encodeURIComponent(state)
      + "&code_challenge=" + encodeURIComponent(pkce.challenge)
      + "&code_challenge_method=S256";
    res.status(200).json({ ok: true, url: authorizeUrl });
    return;
  }

  // ---- safe status read for the client's own save() path ---------------------
  if (action === "status" && req.method === "GET") {
    var uid2 = await uidFromRequest(req);
    if (!uid2) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
    var snap = await db.collection("leumiFinteka").doc(uid2).get();
    if (!snap.exists) { res.status(200).json({ ok: true, connected: false }); return; }
    var d = snap.data();
    res.status(200).json({
      ok: true,
      connected: d.status === "connected",
      status: d.status || "disconnected",
      accountLabel: d.accountLabel || null,
      connectedAt: d.connectedAt || null,
      lastSyncAt: d.lastSyncAt || null,
      count: d.syncedCount || 0,
      error: d.lastError || null
    });
    return;
  }

  // ---- sync: manual (user's own ID token, POST) or cron (Vercel Cron invokes
  // with GET + the CRON_SECRET auto-attached as Bearer auth - see vercel.json) -
  var isCron = q.cron === "1";
  if (action === "sync" && (req.method === "POST" || (isCron && req.method === "GET"))) {
    if (!configComplete(c)) { res.status(500).json({ ok: false, error: { code: "config_error", message: "Leumi FinTeka env vars are not fully set." } }); return; }
    if (isCron) {
      var authHeader = req.headers.authorization || "";
      if (!c.cronSecret || authHeader !== "Bearer " + c.cronSecret) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
      var connSnap = await db.collection("leumiFinteka").where("status", "==", "connected").get();
      var results = [];
      for (var i = 0; i < connSnap.docs.length; i++) {
        var docSnap = connSnap.docs[i];
        try {
          var n = await syncOneConnection(db, c, docSnap.id, docSnap.data());
          results.push({ uid: docSnap.id, ok: true, synced: n });
        } catch (e) {
          await docSnap.ref.set({ status: "error", lastError: (e && e.message) || "sync failed" }, { merge: true });
          results.push({ uid: docSnap.id, ok: false, error: (e && e.message) || "sync failed" });
        }
      }
      res.status(200).json({ ok: true, results: results });
      return;
    }
    var uid3 = await uidFromRequest(req);
    if (!uid3) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
    var connSnap3 = await db.collection("leumiFinteka").doc(uid3).get();
    if (!connSnap3.exists || connSnap3.data().status !== "connected") { res.status(400).json({ ok: false, error: { code: "not_connected" } }); return; }
    try {
      var synced = await syncOneConnection(db, c, uid3, connSnap3.data());
      res.status(200).json({ ok: true, synced: synced });
    } catch (e) {
      await connSnap3.ref.set({ status: "error", lastError: (e && e.message) || "sync failed" }, { merge: true });
      res.status(502).json({ ok: false, error: { code: "sync_failed", message: (e && e.message) || "Unknown error" } });
    }
    return;
  }

  // ---- disconnect --------------------------------------------------------------
  if (action === "disconnect" && req.method === "POST") {
    var uid4 = await uidFromRequest(req);
    if (!uid4) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
    try {
      var connSnap4 = await db.collection("leumiFinteka").doc(uid4).get();
      var conn4 = connSnap4.exists ? connSnap4.data() : null;
      // Best-effort token revocation - FinTeka's real revoke endpoint/shape is
      // unconfirmed, so failures here must never block the local disconnect.
      if (conn4 && conn4.accessToken && c.tokenUrl) {
        try {
          await fetch(c.tokenUrl.replace(/\/token\b/, "/revoke"), {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: conn4.accessToken, client_id: c.clientId, client_secret: c.clientSecret }).toString()
          });
        } catch (revokeErr) { /* best-effort */ }
      }
    } finally {
      await db.collection("leumiFinteka").doc(uid4).delete();
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(400).json({ ok: false, error: { code: "bad_request", message: "Unknown action." } });
};
