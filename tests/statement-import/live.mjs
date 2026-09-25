// The one leg the offline suites cannot cover: does the REAL model, given the
// shipping prompt, read these files right? Every request is built by
// api/_import.js itself (readPayload / sortPayloads), and every answer is
// checked by the shipping client code (impReadWithRecipe) - so a pass here is
// a statement about what users get, and editing a prompt changes this test.
//
//   node tests/statement-import/live.mjs              via the claude CLI (subscription)
//   node tests/statement-import/live.mjs --api        via ANTHROPIC_API_KEY or .env.local
//   node tests/statement-import/live.mjs --only=LEUMI,MAX --sort
//
// The CLI runs in a scratch folder, so no project notes reach the model; it
// is the same prompt and schema, but not the same transport - the API mode is.
import { createRequire } from "module";
import { execFile } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir, homedir } from "os";
import { join } from "path";
import { app, ROOT } from "./extract.mjs";
import { ALL, EXPECT } from "./fixtures.mjs";
import { leumiXlsx, ISRACARD_HTML } from "./sheet-fixtures.mjs";
import { xlsBank } from "./xls-fixtures.mjs";

const require = createRequire(import.meta.url);
const server = require(join(ROOT, "api", "_import.js"));
const { impReadBytes, impSample, impRecipeFrom, impReadWithRecipe, impDecodeBytes, impParseDelimited, DEFAULT_CATEGORIES } = app;

const API = process.argv.includes("--api");
const SORT = process.argv.includes("--sort");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const TODAY = new Date().toISOString().slice(0, 10);
const CLI = join(homedir(), "AppData", "Roaming", "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
const SCRATCH = mkdtempSync(join(tmpdir(), "richy-import-live-"));

function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const m = /^\s*ANTHROPIC_API_KEY\s*=\s*"?([^"\r\n]+)"?/m.exec(readFileSync(join(ROOT, ".env.local"), "utf8"));
    return m ? m[1].trim() : "";
  } catch (e) { return ""; }
}

// One request, sent the way this run was asked to send it. Resolves to the
// parsed JSON answer and what it cost in time.
function send(payload) {
  const started = Date.now();
  if (API) {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey(), "anthropic-version": "2023-06-01" },
      body: JSON.stringify(payload)
    }).then((r) => r.json()).then((data) => {
      if (data.error) throw new Error(data.error.type + ": " + data.error.message);
      if (data.stop_reason !== "end_turn") throw new Error("stopped: " + data.stop_reason);
      const text = data.content.filter((c) => c.type === "text").map((c) => c.text).join("");
      return { answer: JSON.parse(text), ms: Date.now() - started };
    });
  }
  const sys = join(SCRATCH, "system-" + Math.random().toString(36).slice(2) + ".txt");
  writeFileSync(sys, payload.system, "utf8");
  const user = typeof payload.messages[0].content === "string" ? payload.messages[0].content : payload.messages[0].content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
  const args = ["-p", "--model", payload.model, "--system-prompt-file", sys, "--json-schema", JSON.stringify(payload.output_config.format.schema),
    "--tools", "", "--output-format", "json", "--no-session-persistence", "--strict-mcp-config"];
  if (payload.output_config.effort) args.push("--effort", payload.output_config.effort);
  return new Promise((resolve, reject) => {
    const child = execFile(CLI, args, { cwd: SCRATCH, maxBuffer: 16 * 1024 * 1024, timeout: 240000 }, (err, stdout, stderr) => {
      if (err) {
        let why = String(stderr || "").trim();
        try { const out = JSON.parse(stdout); why = why || String(out.result || out.subtype || ""); } catch (e) { why = why || String(stdout || "").slice(0, 400); }
        reject(new Error("claude CLI exited " + err.code + ": " + (why || "no output").slice(0, 600)));
        return;
      }
      try {
        const out = JSON.parse(stdout);
        if (out.is_error || !out.structured_output) throw new Error("no structured answer: " + String(out.result || "").slice(0, 200));
        resolve({ answer: out.structured_output, ms: Date.now() - started, cost: out.total_cost_usd });
      } catch (e) { reject(e); }
    });
    child.stdin.end(user);
  });
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() { while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// The files: every text fixture, plus the spreadsheet shapes banks hand out.
const FILES = Object.keys(EXPECT).map((name) => ({ name, sheets: () => [{ name: "Sheet 1", rows: impParseDelimited(impDecodeBytes(ALL[name].bytes()).text) }], expect: EXPECT[name] }));
FILES.push({ name: "LEUMI_XLSX", sheets: async () => (await impReadBytes(leumiXlsx(), "leumi.xlsx", "")).sheets, expect: EXPECT.LEUMI });
FILES.push({ name: "ISRACARD_HTML", sheets: async () => (await impReadBytes(new TextEncoder().encode(ISRACARD_HTML), "isracard.xls", "")).sheets, expect: EXPECT.ISRACARD });
FILES.push({ name: "XLS_BANK", sheets: async () => (await impReadBytes(xlsBank(), "bank.xls", "")).sheets,
  expect: { count: 4, lines: [["2026-09-01", 14250, "משכורת"], ["2026-09-02", -3894.2, "ישראכרט"], ["2026-09-09", -6.9, "עמלה"]] } });

const signed = (l) => (l.dir === "out" ? -l.amount : l.amount);
function verdict(lines, want) {
  const missing = want.lines.filter(([d, a, w]) => !lines.some((l) => l.date === d && Math.abs(signed(l) - a) < 0.001 && (l.desc + " " + l.details).indexOf(w) >= 0));
  return { ok: lines.length === want.count && !missing.length, count: lines.length, missing };
}

async function readOne(f) {
  const sheets = await f.sheets();
  const sample = impSample(sheets);
  const sampled = sample.indexOf("not shown") >= 0;
  const log = [];
  let feedback = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const req = server.readPayload({ sample, fileName: f.name.toLowerCase(), feedback });
    const { answer, ms, cost } = await send(req.payload);
    const res = impReadWithRecipe(sheets, impRecipeFrom(answer, sheets, sampled), TODAY);
    log.push({ attempt, ms, cost, ok: res.ok, repaired: res.repaired || null, feedback: res.ok ? "" : res.feedback, answer });
    if (res.ok) return { name: f.name, log, v: verdict(res.lines, f.expect) };
    feedback = res.feedback;
  }
  return { name: f.name, log, v: { ok: false, count: 0, missing: f.expect.lines } };
}

const chosen = process.argv.includes("--hard-only") ? [] : FILES.filter((f) => !ONLY.length || ONLY.includes(f.name));
console.log("Reading " + chosen.length + " files " + (API ? "through the API" : "through the claude CLI") + " with the shipping prompt...\n");
const results = await pool(chosen, 4, (f) => readOne(f).catch((e) => ({ name: f.name, error: e.message, log: [] })));
let bad = 0;
for (const r of results) {
  if (r.error) { bad++; console.log("ERROR  " + r.name + ": " + r.error); continue; }
  const last = r.log[r.log.length - 1];
  const how = r.log.length > 1 ? "second look" : last.repaired ? "repaired: " + last.repaired.join(", ") : "first look";
  const secs = r.log.map((l) => (l.ms / 1000).toFixed(1) + "s").join(" + ");
  if (r.v.ok) console.log("PASS   " + r.name.padEnd(15) + " " + String(r.v.count).padStart(2) + " lines  " + how.padEnd(26) + secs);
  else {
    bad++;
    console.log("FAIL   " + r.name.padEnd(15) + " " + r.v.count + " lines  " + how + "  " + secs);
    r.v.missing.forEach((m) => console.log("         missing " + m.join(" ")));
    r.log.forEach((l) => { if (l.feedback) console.log("         attempt " + l.attempt + ": " + l.feedback.replace(/\n/g, "\n                    ")); });
    console.log("         last answer: " + JSON.stringify(last.answer).slice(0, 1500));
  }
}

if (SORT) {
  // The sorting prompt, on the distinct lines of the bank fixtures, with the
  // categories every new account starts with.
  const want = [
    ["משכורת חודש אוגוסט", "in", "income", "Salary"], ["שופרסל דיל תל אביב", "out", "purchase", "Food"], ["פנגו חניה", "out", "purchase", "Transport"],
    ["הוראת קבע חשמל", "out", "purchase", "Housing"], ["ביט העברה", "out", "person", null], ["כרטיס אשראי ישראכרט", "out", "card_bill", ""],
    ["העברה לפיקדון", "out", "own_transfer", ""], ["סופר פארם", "out", "purchase", "Health"], ["פז יקום", "out", "purchase", "Transport"],
    ["נטפליקס", "out", "purchase", "Entertainment"], ["זיכוי זארה", "in", "refund", "Shopping"], ["סינמה סיטי גלילות", "out", "purchase", "Entertainment"],
    ["רמי לוי תקשורת", "out", "purchase", "Housing"], ["PAYPAL *NETFLIX", "out", "purchase", "Entertainment"], ["WOLT", "out", "purchase", "Food"],
    ["משיכת מזומן כספומט", "out", "cash", null], ["עמלת פעולה בערוץ ישיר", "out", "fee", null], ["ביטוח לאומי קצבת ילדים", "in", "income", null],
    ["סה\"כ לחיוב", "out", "not_transaction", ""], ["ארנונה עיריית תל אביב", "out", "purchase", "Housing"], ["מכבי שירותי בריאות", "out", "purchase", "Health"]
  ];
  const req = server.sortPayloads({
    lines: want.map((w, i) => ({ id: i, text: w[0], dir: w[1], n: 1, amount: 100 })),
    categories: DEFAULT_CATEGORIES.map((c) => c.name), statement: "bank", currency: "ILS", examples: []
  });
  const got = {};
  for (const chunk of req.chunks) {
    const { answer, ms } = await send(chunk.payload);
    (server.sortKeep(answer, chunk.ids, req.cats) || []).forEach((x) => { got[x.id] = x; });
    console.log("\nSorted " + chunk.ids.length + " lines in " + (ms / 1000).toFixed(1) + "s");
  }
  want.forEach((w, i) => {
    const x = got[i];
    const ok = x && x.kind === w[2] && (w[3] === null || x.category === w[3]);
    if (!ok) bad++;
    console.log((ok ? "PASS   " : "FAIL   ") + w[0].padEnd(26) + " -> " + (x ? x.kind + " / " + (x.category || "-") + (x.sure ? "" : " (unsure)") : "missing") + (ok ? "" : "   wanted " + w[2] + " / " + (w[3] === null ? "any" : w[3] || "-")));
  });
}

if (process.argv.includes("--hard") || process.argv.includes("--hard-only")) {
  // The whole import, end to end, on the seven hard statements - reading,
  // sorting, direction, transfers and categories - through the server's own
  // handler (api/_import.js handle) with the real model behind it. Scored line
  // by line against each statement's right answer (hard-fixtures.mjs).
  const { HARD } = await import("./hard-fixtures.mjs");
  const { impRun } = app;
  const cats = DEFAULT_CATEGORIES.map((c, i) => Object.assign({}, c));
  const call = (payload) => send(payload).then(
    (r) => ({ status: 200, data: { stop_reason: "end_turn" }, text: JSON.stringify(r.answer) }),
    (e) => ({ status: 500, error: { type: "proxy_error", message: e.message } }));
  const serverFn = (kind, body) => server.handle(Object.assign({ kind }, body), call).then((r) => {
    if (r.status !== 200) throw Object.assign(new Error(r.body.error.message), { impCode: "server" });
    return r.body;
  });
  const names = Object.keys(HARD).filter((n) => !ONLY.length || ONLY.includes(n));
  let right = 0, total = 0;
  for (const name of names) {
    const started = Date.now();
    const res = await impRun([{ file: new File([HARD[name].text], name.toLowerCase() + ".csv") }],
      { tx: [], categories: cats, shopCats: {}, layouts: {}, today: TODAY, server: serverFn }, () => {});
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const want = HARD[name].expect;
    const misses = [];
    const used = new Set();
    want.forEach(([date, amount, dir, kind, catsOk]) => {
      const it = res.items.find((x) => !used.has(x.id) && x.tx.date === date && Math.abs(x.tx.amount - amount) < 0.001);
      if (!it) { misses.push(date + " " + amount + ": missing"); return; }
      used.add(it.id);
      const gotDir = it.tx.type === "income" ? "in" : "out";
      const moving = !!it.tx.transfer;
      const why = [];
      if (gotDir !== dir) why.push("direction " + gotDir);
      if ((kind === "transfer") !== moving) why.push(moving ? "read as a transfer" : "not read as a transfer");
      if (!moving && catsOk && catsOk.indexOf(it.tx.category) < 0) why.push("category " + it.tx.category + " (wanted " + catsOk.join("/") + ")");
      if (why.length) misses.push(date + " " + amount + " " + it.tx.label + ": " + why.join(", "));
    });
    const extra = res.items.filter((x) => !used.has(x.id));
    extra.forEach((x) => misses.push("extra line: " + x.tx.date + " " + x.tx.amount + " " + x.tx.label));
    const ok = want.length - misses.filter((m) => !/^extra/.test(m)).length;
    right += ok; total += want.length;
    if (misses.length) bad++;
    console.log((misses.length ? "FAIL   " : "PASS   ") + name.padEnd(18) + " " + ok + "/" + want.length + " lines right  " + secs + "s  (" + res.source + ")");
    misses.forEach((m) => console.log("         " + m));
  }
  console.log("\nHard statements: " + right + " of " + total + " lines right.");
}

console.log("\n" + (bad ? bad + " problem(s)." : "All good."));
if (bad) process.exitCode = 1;
