// Boots the real bundle with a stub Firebase, so the app renders as a
// signed-in user with seeded data. The auth screen gates on cloudReady(), which
// only asks whether window.firebase has an initialised app - so a small stub is
// enough to exercise the actual UI instead of the marketing page.
//
// Usage: node tools/render-app.mjs [fixture]
//   overview   (default) a returning user with a recurring item awaiting confirm
//   onboarding a brand-new user, dropped at the questionnaire
import { createServer } from "http";
import { readFileSync, existsSync, statSync, writeFileSync } from "fs";
import { join, extname } from "path";
import { chromium } from "playwright-core";

const ROOT = new URL("../public/", import.meta.url).pathname.replace(/\/$/, "");
const FIXTURE = process.argv[2] || "overview";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".webmanifest": "application/manifest+json", ".css": "text/css", ".svg": "image/svg+xml" };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end("nf"); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const monthsAgo = (n) => { const d = new Date(today); d.setMonth(d.getMonth() - n); return iso(d); };

const BLOBS = {
  // Rent logged two months ago with repeat:"monthly" and never re-typed since -
  // exactly the case Layer 1 exists for.
  overview: {
    displayName: "Dana", email: "dana@example.com", onboardingDone: true, catchUpDone: true,
    currency: "₪", lang: "en", theme: "blue",
    onboardingData: { lifeStage: "Working", income: "12000", incomeType: "fixed", essentials: "4200" },
    tx: [
      { id: 1, type: "income", amount: 12000, label: "Salary", catId: "c8", category: "Salary", date: monthsAgo(0).slice(0, 8) + "01", repeat: "none", pending: false },
      { id: 2, type: "expense", amount: 3200, label: "Rent", catId: "c1", category: "Housing", date: monthsAgo(2).slice(0, 8) + "01", repeat: "monthly", pending: false },
      { id: 3, type: "expense", amount: 45, label: "Coffee", catId: "c2", category: "Food", date: iso(today), repeat: "none", pending: false },
    ],
    budgets: [], goals: [], trips: [], savings: [], businesses: [], investing: [], debts: [], notes: [],
  },
  onboarding: { displayName: "Noa", email: "noa@example.com", onboardingDone: false, currency: "₪", lang: "en", tx: [] },
};

const stub = `
window.__RICHY_STUB_BLOB__ = ${JSON.stringify(BLOBS[FIXTURE] || BLOBS.overview)};
(function () {
  var blob = window.__RICHY_STUB_BLOB__;
  var user = { uid: "stub-uid", email: blob.email, displayName: blob.displayName,
               providerData: [{ providerId: "password" }],
               metadata: { creationTime: new Date(Date.now() - 90 * 864e5).toUTCString() } };
  function docRef() {
    return { get: function () { return Promise.resolve({ exists: true, data: function () { return blob; }, id: "stub-uid" }); },
             set: function (d) { blob = d; return Promise.resolve(); },
             update: function () { return Promise.resolve(); },
             delete: function () { return Promise.resolve(); },
             onSnapshot: function () { return function () {}; } };
  }
  function collection() {
    return { doc: docRef,
             where: function () { return this; },
             get: function () { return Promise.resolve({ empty: true, docs: [] }); },
             onSnapshot: function () { return function () {}; } };
  }
  window.firebase = {
    apps: [{}],
    auth: function () {
      return { currentUser: user,
               onAuthStateChanged: function (cb) { setTimeout(function () { cb(user); }, 0); return function () {}; },
               signOut: function () { return Promise.resolve(); } };
    },
    firestore: Object.assign(function () { return { collection: collection, enablePersistence: function () { return Promise.resolve(); }, batch: function () { return { delete: function () {}, commit: function () { return Promise.resolve(); } }; } }; }, {}),
  };
  window.firebase.auth.EmailAuthProvider = { credential: function () { return {}; } };
  window.firebase.firestore.FieldValue = { arrayRemove: function () { return {}; }, arrayUnion: function () { return {}; } };
  window.firebase.firestore().enablePersistence = function () { return Promise.resolve(); };
  window.__RICHY_FB_CONFIGURED__ = true;
  // The first-run marketing screen sits in front of the auth screen; skip it.
  try { localStorage.setItem("cb_welcome_seen", "1"); } catch (e) {}
})();
`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
// Firebase is vendored locally, so an init script would just be overwritten by
// the real SDK. Serve the stub in its place instead.
await page.route("**/vendor/firebase-app-compat.js*", r => r.fulfill({ contentType: "text/javascript", body: stub }));
await page.route("**/vendor/firebase-auth-compat.js*", r => r.fulfill({ contentType: "text/javascript", body: "" }));
await page.route("**/vendor/firebase-firestore-compat.js*", r => r.fulfill({ contentType: "text/javascript", body: "" }));
await page.route("**/firebase-init.js*", r => r.fulfill({ contentType: "text/javascript", body: 'window.__RICHY_FB_CONFIGURED__ = true;' }));
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push("console.error: " + m.text()); });
page.on("pageerror", e => errors.push("pageerror: " + (e && e.message)));

await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(3000);

// Walk the questionnaire to the step under test, if one was asked for.
const STEP = parseInt(process.env.STEP || "0", 10);
for (let i = 0; i < STEP; i++) {
  const next = page.locator("button", { hasText: /^(Let's go|Continue|Skip for now)$/ }).first();
  if (await next.count()) { await next.click().catch(() => {}); }
  else {
    // Pick-one steps advance on the option tap itself.
    const opt = page.locator("button").filter({ hasNotText: /^(Back|Skip)/ }).nth(1);
    await opt.click().catch(() => {});
  }
  await page.waitForTimeout(700);
}
await page.waitForTimeout(600);

const text = await page.evaluate(() => document.body.innerText);
const shot = `/tmp/richy-${FIXTURE}.png`;
await page.screenshot({ path: shot, fullPage: true });

const NOISE = /googleapis|gstatic|net::ERR|Failed to load resource|manifest|favicon|Service ?Worker|sw\.js/i;
const real = errors.filter(e => !NOISE.test(e));
if (process.env.ALL_ERRORS) errors.forEach(e => console.log("[all] " + e));
console.log("=== " + FIXTURE + " ===");
console.log(text.replace(/\n{2,}/g, "\n").slice(0, 1600));
console.log("\n--- screenshot: " + shot);
console.log("--- REAL ERRORS: " + real.length);
real.forEach(e => console.log("  " + e));
await browser.close();
server.close();
process.exit(real.length ? 1 : 0);
