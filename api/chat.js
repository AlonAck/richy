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

  // ---- custom voice: trait check ---------------------------------------------
  // "Create your own" voice. Before the client may keep a trait, Sonnet judges
  // whether it stays inside Richard's rules (TRAIT_JUDGE in api/_prompts.js).
  // The obvious cases are refused by the regex rules first, so they cost no
  // API call. Fails CLOSED: if the judge cannot be reached or does not answer
  // in the agreed shape, the trait is not accepted - the client shows a retry,
  // never a pass. Shares the auth, rate limit and CORS above on purpose.
  if (body.kind === "voiceCheck") {
    var trait = typeof body.trait === "string" ? body.trait.replace(/\s+/g, " ").trim() : "";
    var pre = prompts.checkTraitLocally(trait);
    if (pre) { res.status(200).json({ ok: false, reason: pre }); return; }
    var judge = await callAnthropic(apiKey, {
      model: "claude-sonnet-5",
      max_tokens: 200,
      thinking: { type: "disabled" },
      system: prompts.TRAIT_JUDGE,
      messages: [{ role: "user", content: "Proposed trait:\n" + trait }]
    }, 20000);
    var verdict = (judge.error || judge.status !== 200) ? null : parseVerdict(judge.text);
    if (!verdict) {
      res.status(502).json({ error: { type: "judge_unavailable", message: "Richy couldn't check that trait just now. Try again in a moment." } });
      return;
    }
    res.status(200).json({ ok: verdict.ok === true, reason: verdict.ok === true ? "" : String(verdict.reason || "").slice(0, 240) });
    return;
  }

  var messages = body.messages || [];
  var system = body.system || "";
  // The user's chosen voice, as structured data. Rendered server-side and
  // placed between the client text and GUARDRAIL - it can shape delivery,
  // never override the rules that follow it.
  var voice = prompts.voiceBlock(body.voice);

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
  // Launch routing: Sonnet 5 is the quality tier and Haiku 4.5 handles short,
  // tightly-scoped work. Legacy model names are mapped down here as well, so an
  // older cached client cannot keep invoking the expensive launch models.
  var ALLOWED_MODELS = { "claude-sonnet-5": 1, "claude-haiku-4-5": 1 };
  var LEGACY_MODEL_MAP = {
    "claude-sonnet-4-6": "claude-sonnet-5",
    "claude-opus-4-8": "claude-sonnet-5"
  };
  var requestedModel = LEGACY_MODEL_MAP[body.model] || body.model;
  var model = (requestedModel && ALLOWED_MODELS[requestedModel]) ? requestedModel : "claude-sonnet-5";

  // Deadline cascade, innermost first: this abort (45s) < the client's own
  // timeout in callClaude (55s) < maxDuration in vercel.json (60s). Ordered that
  // way, a slow upstream always loses to THIS timer, so the caller gets clean
  // JSON it can parse. Widen any one of them without the others and either the
  // platform kills the function mid-flight (browser gets an HTML error page and
  // JSON.parse throws) or the client gives up on a reply that was already coming.
  var anthropicBody = {
    model: model,
    max_tokens: maxTokens,
    // The server-owned guardrail rides after the client text AND after the
    // voice block so it has the last word. Client prompts are unchanged; this
    // line is the one a tampered client cannot remove.
    system: system + voice + prompts.GUARDRAIL,
    messages: messages
  };
  // Sonnet 5 enables adaptive thinking by default. Richard's existing calls
  // were non-thinking calls, so keep that behavior for predictable latency,
  // output shape and launch cost. Haiku 4.5 is non-thinking by default.
  if (model === "claude-sonnet-5") anthropicBody.thinking = { type: "disabled" };

  var result = await callAnthropic(apiKey, anthropicBody, 45000);
  if (result.error) { res.status(result.status).json({ error: result.error }); return; }
  res.status(result.status).json(result.data);
};

// One bounded call to the Messages API. Resolves to { status, data, text } on
// any HTTP answer (including Anthropic's own error payloads, passed through
// with their status), or { status, error } when the call itself failed - it
// never throws, so every caller maps failures the same way.
async function callAnthropic(apiKey, payload, timeoutMs) {
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
  try {
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    var data = await response.json();
    var text = "";
    if (data && Array.isArray(data.content)) {
      data.content.forEach(function (c) { if (c && c.type === "text" && typeof c.text === "string") text += c.text; });
    }
    return { status: response.status, data: data, text: text };
  } catch (err) {
    if (err && err.name === "AbortError") {
      return { status: 504, error: { type: "timeout", message: "Richard took too long to answer. Please try again." } };
    }
    return { status: 500, error: { type: "proxy_error", message: err.message || "Unknown error" } };
  } finally {
    clearTimeout(timer);
  }
}

// The judge must answer {"ok": boolean, "reason": string}. Anything else -
// prose, a fenced block with no object, a missing boolean - is "no verdict",
// which the caller treats as unavailable, not as a pass.
function parseVerdict(text) {
  var m = /\{[\s\S]*\}/.exec(text || "");
  if (!m) return null;
  try {
    var v = JSON.parse(m[0]);
    return (v && typeof v.ok === "boolean") ? v : null;
  } catch (e) {
    return null;
  }
}
