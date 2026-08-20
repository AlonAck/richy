// Boot smoke test: serve public/, load in headless Chromium, capture console
// errors and uncaught page errors. Firebase has no keys here, so the app takes
// the cloudReady()===false path and should land on the AuthScreen.
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { chromium } from "playwright-core";

const ROOT = new URL("../public/", import.meta.url).pathname.replace(/\/$/, "");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json",
  ".css": "text/css", ".svg": "image/svg+xml" };

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

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage();
const errors = [];
const warnings = [];
page.on("console", m => {
  const t = m.type();
  if (t === "error") errors.push("console.error: " + m.text());
  else if (t === "warning") warnings.push("console.warn: " + m.text());
});
page.on("pageerror", e => errors.push("pageerror: " + (e && e.message)));

await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(3500);

const info = await page.evaluate(() => ({
  bodyLen: document.body.innerText.length,
  head: document.body.innerText.slice(0, 300).replace(/\s+/g, " "),
  rootChildren: (document.getElementById("root") || {}).childElementCount ?? -1,
}));

// Network failures for firebase/CDN are expected in this sandbox and are not
// app bugs - filter them so real errors stand out.
const NOISE = /firebase|firestore|googleapis|gstatic|net::ERR|Failed to load resource|manifest|favicon|Service ?Worker|sw\.js/i;
const real = errors.filter(e => !NOISE.test(e));

console.log("=== rendered ===");
console.log("root children:", info.rootChildren, "| body chars:", info.bodyLen);
console.log("text:", info.head);
console.log("=== filtered-out (network/env noise):", errors.length - real.length, "===");
console.log("=== REAL ERRORS:", real.length, "===");
real.forEach(e => console.log("  " + e));
await browser.close();
server.close();
process.exit(real.length ? 1 : 0);
