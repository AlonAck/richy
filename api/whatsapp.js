// WhatsApp delivery for Richard Watch alerts (proactive money-leak / budget-risk
// signals that already exist in-app - see richardWatch() in budget-app.jsx).
//
// COST SAFETY - the whole point of this file's shape, read before changing it:
// WhatsApp's Cloud API is free for messages sent as a reply inside the 24-hour
// "customer service window" that opens when a user messages the business
// number, and billed per message the moment you step outside that window
// (which requires an approved message *template*). This file NEVER calls the
// template-message code path - there isn't one - and NEVER sends unless the
// linked phone messaged us inside the last WINDOW_HOURS. If the window is
// closed, the alert is silently skipped rather than falling back to a
// template. A daily send cap is a second, independent backstop. Do not add a
// template fallback "to make alerts more reliable" - that is exactly the
// change that would start charging money.
//
// Firestore: whatsappOptIn/{uid} (phone, status, session/rate-limit state) and
// whatsappPhones/{phone} -> uid (webhook lookup). Both are server-only - not
// listed in firestore.rules on purpose, same as leumiFinteka/{uid} - so the
// client never touches them directly and only ever sees safe status via
// ?action=status. See WHATSAPP_SETUP.md.
//
//   GET  /api/whatsapp                          (Meta webhook verification handshake)
//   POST /api/whatsapp                          (Meta webhook: inbound messages)
//   POST ?action=link     { phone }             (auth: Firebase ID token)
//   GET  ?action=status                         (auth: Firebase ID token)
//   POST ?action=unlink                         (auth: Firebase ID token)
//   POST ?action=send-alert { id, title, subtitle, severity } (auth: Firebase ID token)
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
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
    apiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0"
  };
}
function configComplete(c) {
  return !!(c.accessToken && c.phoneNumberId && c.verifyToken);
}

// Cost-safety constants - deliberately not environment variables, so a
// misconfigured deploy can't widen them into "always send" or "send more".
var WINDOW_HOURS = 23; // < Meta's 24h service window, leaving a safety margin
var MAX_ALERTS_PER_DAY = 3;
var MAX_REMEMBERED_ALERT_IDS = 50;

function graphUrl(c, path) {
  return "https://graph.facebook.com/" + c.apiVersion + "/" + path;
}

// ---- phone normalization ----------------------------------------------------
// E.164: leading +, country code, subscriber number, digits only after that.
function normalizePhone(raw) {
  var digits = String(raw || "").replace(/[^\d+]/g, "");
  if (digits[0] !== "+") digits = "+" + digits.replace(/^\+*/, "");
  if (!/^\+[1-9]\d{6,14}$/.test(digits)) return null;
  return digits;
}
// Meta's webhook sends the sender as digits only, no "+".
function phoneFromWebhook(raw) {
  return normalizePhone("+" + String(raw || "").replace(/[^\d]/g, ""));
}
function maskPhone(phone) {
  if (!phone) return null;
  return phone.slice(0, phone.length > 6 ? 4 : 2) + "***" + phone.slice(-2);
}

// ---- auth: who is calling us -------------------------------------------------
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

// ---- webhook signature check (X-Hub-Signature-256) --------------------------
// Best-effort: only enforced when WHATSAPP_APP_SECRET is set, so local/manual
// testing against the webhook still works before that's configured.
function verifyWebhookSignature(req, rawBody, appSecret) {
  if (!appSecret) return true;
  var sig = req.headers["x-hub-signature-256"] || "";
  var m = /^sha256=(.+)$/.exec(sig);
  if (!m) return false;
  var expected = nodeCrypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return nodeCrypto.timingSafeEqual(Buffer.from(m[1], "hex"), Buffer.from(expected, "hex"));
  } catch (e) {
    return false;
  }
}
// bodyParser is disabled below (see module.exports.config) so the webhook
// handler can verify Meta's signature against the exact raw bytes - every POST
// branch therefore reads and parses the body itself via this helper.
function readRawBody(req) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    req.on("data", function(c) { chunks.push(c); });
    req.on("end", function() { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}
function readJsonBody(req) {
  return readRawBody(req).then(function(raw) {
    if (!raw || !raw.length) return {};
    try { return JSON.parse(raw.toString("utf8")); } catch (e) { return {}; }
  });
}

// ---- one free-form text message, nothing else ever leaves this function -----
async function sendTextMessage(c, toPhone, body) {
  var r = await fetch(graphUrl(c, c.phoneNumberId + "/messages"), {
    method: "POST",
    headers: { Authorization: "Bearer " + c.accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone.replace(/^\+/, ""),
      type: "text",
      text: { body: body.slice(0, 4096) }
    })
  });
  if (!r.ok) {
    var errBody = await r.text();
    throw new Error("WhatsApp send failed (" + r.status + "): " + errBody.slice(0, 200));
  }
  return r.json();
}

// CORS: reflect only trusted origins (prod, Vercel previews, local dev harness).
// The webhook path (GET verification, POST from Meta) never carries an Origin
// header from a browser, so this only matters for the ?action= endpoints.
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

  var c = cfg();
  var q = req.query || {};

  // ---- Meta webhook verification handshake (public, no auth) -----------------
  if (req.method === "GET" && q["hub.mode"] !== undefined) {
    if (q["hub.mode"] === "subscribe" && c.verifyToken && q["hub.verify_token"] === c.verifyToken) {
      res.status(200).send(String(q["hub.challenge"] || ""));
    } else {
      res.status(403).send("Verification failed");
    }
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

  // ---- Meta webhook: inbound messages (public, verified by signature) --------
  // This is the ONLY thing that opens or extends a free 24h session window, and
  // it never sends anything back itself - it just records that the window is
  // open (and, for START/STOP, flips opt-in state) for send-alert to use later.
  if (req.method === "POST" && q.action === undefined) {
    var rawBody = await readRawBody(req);
    if (!verifyWebhookSignature(req, rawBody, c.appSecret)) {
      res.status(401).json({ ok: false, error: { code: "bad_signature" } });
      return;
    }
    var payload;
    try { payload = JSON.parse(rawBody.toString("utf8") || "{}") || {}; } catch (e) { payload = {}; }
    try {
      var entries = payload.entry || [];
      for (var i = 0; i < entries.length; i++) {
        var changes = entries[i].changes || [];
        for (var j = 0; j < changes.length; j++) {
          var value = (changes[j].value) || {};
          var messages = value.messages || [];
          for (var k = 0; k < messages.length; k++) {
            var msg = messages[k];
            var fromPhone = phoneFromWebhook(msg.from);
            if (!fromPhone) continue;
            var text = (msg.text && msg.text.body ? String(msg.text.body) : "").trim().toUpperCase();
            var mapSnap = await db.collection("whatsappPhones").doc(fromPhone).get();
            if (!mapSnap.exists) continue; // message from a number we don't have linked to any user
            var uid = mapSnap.data().uid;
            var updates = { lastInboundAt: Date.now() };
            if (text === "START" || text === "התחל" || text === "כן") {
              updates.status = "active";
              updates.activatedAt = Date.now();
            } else if (text === "STOP" || text === "בטל" || text === "עצור") {
              updates.status = "revoked";
            }
            await db.collection("whatsappOptIn").doc(uid).set(updates, { merge: true });
          }
        }
      }
    } catch (e) { /* webhook must always 200 back to Meta, even on a malformed payload */ }
    res.status(200).json({ ok: true });
    return;
  }

  var action = q.action;

  // ---- link: user enters a phone number in Settings --------------------------
  // Creates the mapping in "pending" state. No message is ever sent from here -
  // sending only ever happens in response to the user messaging in first (see
  // the webhook above), which is what keeps every send inside the free window.
  if (action === "link" && req.method === "POST") {
    var uid1 = await uidFromRequest(req);
    if (!uid1) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
    var body1 = await readJsonBody(req);
    var phone1 = normalizePhone(body1.phone);
    if (!phone1) { res.status(400).json({ ok: false, error: { code: "bad_phone", message: "Enter your WhatsApp number with country code, e.g. +972501234567." } }); return; }

    // A phone number maps to exactly one uid - reassigning it revokes the old owner.
    var existingMap = await db.collection("whatsappPhones").doc(phone1).get();
    if (existingMap.exists && existingMap.data().uid !== uid1) {
      await db.collection("whatsappOptIn").doc(existingMap.data().uid).set({ status: "revoked" }, { merge: true });
    }
    var prevSnap = await db.collection("whatsappOptIn").doc(uid1).get();
    var prevPhone = prevSnap.exists ? prevSnap.data().phone : null;
    if (prevPhone && prevPhone !== phone1) {
      await db.collection("whatsappPhones").doc(prevPhone).delete();
    }
    await db.collection("whatsappPhones").doc(phone1).set({ uid: uid1, linkedAt: Date.now() });
    await db.collection("whatsappOptIn").doc(uid1).set({
      phone: phone1, status: "pending", linkedAt: Date.now(), lastInboundAt: null, lastAlertAt: null,
      alertsSentDate: null, alertsSentCount: 0, sentAlertIds: []
    }, { merge: true });
    res.status(200).json(await statusPayload(db, uid1));
    return;
  }

  // ---- status: safe fields only ----------------------------------------------
  if (action === "status" && req.method === "GET") {
    var uid2 = await uidFromRequest(req);
    if (!uid2) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
    res.status(200).json(await statusPayload(db, uid2));
    return;
  }

  // ---- unlink -------------------------------------------------------------
  if (action === "unlink" && req.method === "POST") {
    var uid3 = await uidFromRequest(req);
    if (!uid3) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
    var snap3 = await db.collection("whatsappOptIn").doc(uid3).get();
    if (snap3.exists && snap3.data().phone) {
      await db.collection("whatsappPhones").doc(snap3.data().phone).delete();
    }
    await db.collection("whatsappOptIn").doc(uid3).delete();
    res.status(200).json(await statusPayload(db, uid3));
    return;
  }

  // ---- send-alert: relay one Richard Watch signal, if and only if it's free --
  if (action === "send-alert" && req.method === "POST") {
    var uid4 = await uidFromRequest(req);
    if (!uid4) { res.status(401).json({ ok: false, error: { code: "unauthenticated" } }); return; }
    if (!configComplete(c)) { res.status(200).json({ ok: true, sent: false, reason: "not_configured" }); return; }
    var body4 = await readJsonBody(req);
    var alertId = String(body4.id || "").slice(0, 120);
    var title = String(body4.title || "").slice(0, 200);
    var subtitle = String(body4.subtitle || "").slice(0, 400);
    if (!alertId || !title) { res.status(400).json({ ok: false, error: { code: "bad_request", message: "id and title are required." } }); return; }

    var ref4 = db.collection("whatsappOptIn").doc(uid4);
    var snap4 = await ref4.get();
    var d4 = snap4.exists ? snap4.data() : null;
    if (!d4 || d4.status !== "active" || !d4.phone) { res.status(200).json({ ok: true, sent: false, reason: "not_opted_in" }); return; }

    // The free-window check. No template fallback exists to reach for here.
    var windowOpen = d4.lastInboundAt && (Date.now() - d4.lastInboundAt) < WINDOW_HOURS * 3600000;
    if (!windowOpen) { res.status(200).json({ ok: true, sent: false, reason: "window_closed" }); return; }

    if ((d4.sentAlertIds || []).indexOf(alertId) !== -1) { res.status(200).json({ ok: true, sent: false, reason: "already_sent" }); return; }

    var todayKey = new Date().toISOString().slice(0, 10);
    var sentToday = d4.alertsSentDate === todayKey ? (d4.alertsSentCount || 0) : 0;
    if (sentToday >= MAX_ALERTS_PER_DAY) { res.status(200).json({ ok: true, sent: false, reason: "daily_cap" }); return; }

    var text = "Richard Watch: " + title + (subtitle ? "\n" + subtitle : "") + "\n\nReply STOP to turn off WhatsApp alerts.";
    try {
      await sendTextMessage(c, d4.phone, text);
    } catch (e) {
      res.status(502).json({ ok: false, error: { code: "send_failed", message: (e && e.message) || "Unknown error" } });
      return;
    }
    var nextIds = [alertId].concat(d4.sentAlertIds || []).slice(0, MAX_REMEMBERED_ALERT_IDS);
    await ref4.set({
      lastAlertAt: Date.now(), sentAlertIds: nextIds,
      alertsSentDate: todayKey, alertsSentCount: sentToday + 1
    }, { merge: true });
    res.status(200).json({ ok: true, sent: true });
    return;
  }

  res.status(400).json({ ok: false, error: { code: "bad_request", message: "Unknown action." } });
};

// Disabled so the webhook branch can verify Meta's signature against the exact
// raw request bytes - every POST branch reads/parses the body itself instead.
module.exports.config = { api: { bodyParser: false } };

async function statusPayload(db, uid) {
  var snap = await db.collection("whatsappOptIn").doc(uid).get();
  if (!snap.exists) return { ok: true, linked: false, status: "not_linked" };
  var d = snap.data();
  var windowOpen = !!(d.lastInboundAt && (Date.now() - d.lastInboundAt) < WINDOW_HOURS * 3600000);
  return {
    ok: true,
    linked: true,
    status: d.status || "pending",
    phone: maskPhone(d.phone),
    windowOpen: windowOpen,
    lastInboundAt: d.lastInboundAt || null,
    lastAlertAt: d.lastAlertAt || null
  };
}
