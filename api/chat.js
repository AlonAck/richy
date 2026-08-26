// Anthropic proxy for Richard (the AI advisor). Locked down: every request must
// carry a valid Firebase ID token, so only signed-in Richy users can spend the
// API key - an anonymous caller who finds this URL gets a 401, not a free relay.
var admin = require("firebase-admin");
var prompts = require("./_prompts.js");

function initAdmin() {
  if (admin.apps.length) return true;
  var raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return false;
  raw = raw.trim();
  var svc = JSON.parse(raw[0] === "{" ? raw : Buffer.from(raw, "base64").toString("utf8"));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
  return true;
}

// CORS: reflect only trusted origins. Production + Vercel previews + the local
// dev harness (which calls the deployed API cross-origin - see callClaude()).
var PROD_ORIGIN = "https://richy-mgkl.vercel.app";
function corsOrigin(req) {
  var o = req.headers.origin || "";
  if (o === PROD_ORIGIN) return o;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
  if (/^https:\/\/richy-[a-z0-9]+(-[a-z0-9-]+)?\.vercel\.app$/.test(o)) return o;
  return PROD_ORIGIN;
}

// Best-effort per-user rate limit. In-memory, so it resets per warm serverless
// instance - not a hard guarantee, but it turns "unlimited" into "bounded" for
// the common single-instance case. 30 requests per 5 minutes per user.
var RATE_MAX = 30;
var RATE_WINDOW_MS = 5 * 60 * 1000;
var hits = {};
function rateLimited(uid) {
  var now = Date.now();
  var arr = (hits[uid] || []).filter(function (t) { return now - t < RATE_WINDOW_MS; });
  arr.push(now);
  hits[uid] = arr;
  return arr.length > RATE_MAX;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", corsOrigin(req));
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: { type: "method_not_allowed", message: "Method not allowed" } }); return; }

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { type: "config_error", message: "ANTHROPIC_API_KEY is not set in environment variables." } });
    return;
  }
  try {
    if (!initAdmin()) {
      res.status(500).json({ error: { type: "config_error", message: "FIREBASE_SERVICE_ACCOUNT is not set." } });
      return;
    }
  } catch (e) {
    res.status(500).json({ error: { type: "config_error", message: "FIREBASE_SERVICE_ACCOUNT could not be parsed." } });
    return;
  }

  // ---- who is calling ---------------------------------------------------------
  var hdr = req.headers.authorization || "";
  var m = /^Bearer (.+)$/.exec(hdr);
  if (!m) { res.status(401).json({ error: { type: "unauthenticated", message: "Sign in to talk to Richard." } }); return; }
  var uid;
  try {
    var decoded = await admin.auth().verifyIdToken(m[1]);
    uid = decoded.uid;
    if (!uid) throw new Error("Token had no subject.");
  } catch (e) {
    res.status(401).json({ error: { type: "unauthenticated", message: "Your session expired. Sign in again." } });
    return;
  }
  if (rateLimited(uid)) {
    res.status(429).json({ error: { type: "rate_limited", message: "Richard needs a short breather - try again in a few minutes." } });
    return;
  }

  var body = req.body || {};
  var messages = body.messages || [];
  var system = body.system || "";

  // ---- input ceiling ----------------------------------------------------------
  // maxTokens below bounds the OUTPUT only. Input was previously unbounded, so a
  // tampered client could post a multi-hundred-thousand-token payload and be
  // billed for it 30 times per 5-minute window - output caps do nothing about
  // that, because input is where the volume is. These limits sit well above any
  // real Richard conversation (the largest genuine prompt is a portfolio
  // snapshot plus a short history) and well below anything that costs real
  // money. Reject rather than truncate: silently trimming a prompt produces a
  // confidently wrong answer built on half the user's numbers, which is worse
  // than a visible error.
  var MAX_MESSAGES = 40;
  var MAX_SYSTEM_CHARS = 20000;
  var MAX_TOTAL_CHARS = 100000;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: { type: "invalid_request", message: "No messages provided." } });
    return;
  }
  if (messages.length > MAX_MESSAGES) {
    res.status(413).json({ error: { type: "request_too_large", message: "That conversation is too long for Richard to take in one go." } });
    return;
  }
  if (typeof system !== "string" || system.length > MAX_SYSTEM_CHARS) {
    res.status(413).json({ error: { type: "request_too_large", message: "That request is too large." } });
    return;
  }
  // Measure what we will actually send, so nested content blocks are counted too.
  var totalChars = system.length;
  try {
    totalChars += JSON.stringify(messages).length;
  } catch (e) {
    res.status(400).json({ error: { type: "invalid_request", message: "Messages could not be read." } });
    return;
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    res.status(413).json({ error: { type: "request_too_large", message: "That request is too large for Richard to take in one go." } });
    return;
  }

  // Hard cap so a tampered client can't request unbounded output on our bill.
  var maxTokens = Math.min(Math.max(parseInt(body.maxTokens, 10) || 800, 1), 2000);
  // Callers may request a specific model (e.g. Opus for the deep stock scout,
  // Sonnet for everything else). Whitelist to keep the proxy from being turned
  // into an open relay for arbitrary model strings.
  var ALLOWED_MODELS = { "claude-sonnet-4-6": 1, "claude-opus-4-8": 1, "claude-sonnet-5": 1 };
  var model = (body.model && ALLOWED_MODELS[body.model]) ? body.model : "claude-sonnet-4-6";

  // Deadline cascade, innermost first: this abort (45s) < the client's own
  // timeout in callClaude (55s) < maxDuration in vercel.json (60s). Ordered that
  // way, a slow upstream always loses to THIS timer, so the caller gets clean
  // JSON it can parse. Widen any one of them without the others and either the
  // platform kills the function mid-flight (browser gets an HTML error page and
  // JSON.parse throws) or the client gives up on a reply that was already coming.
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 45000);
  try {
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        // The server-owned guardrail rides after the client text so it has the
        // last word. Client prompts are unchanged; this line is the one a
        // tampered client cannot remove.
        system: system + prompts.GUARDRAIL,
        messages: messages
      }),
      signal: ctrl.signal
    });

    var data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    if (err && err.name === "AbortError") {
      res.status(504).json({ error: { type: "timeout", message: "Richard took too long to answer. Please try again." } });
      return;
    }
    res.status(500).json({ error: { type: "proxy_error", message: err.message || "Unknown error" } });
  } finally {
    clearTimeout(timer);
  }
};
