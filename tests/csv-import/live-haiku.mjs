// The one leg the offline suite cannot cover: does the real model actually
// read these files correctly from the shape alone?
//
//   ANTHROPIC_API_KEY=sk-... node tests/csv-import/live-haiku.mjs
//   node tests/csv-import/live-haiku.mjs --via-cli        (Claude Code subscription)
//   node tests/csv-import/live-haiku.mjs --shops          (also test phase 2)
//
// It uses the SHIPPING prompt and the SHIPPING payload builder, read straight
// out of budget-app.jsx - not a copy - so a pass here is a statement about the
// code that runs for users, and editing the prompt changes this test too.
import { execFileSync } from "child_process";
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { app } from "./extract.mjs";
import { ALL } from "./fixtures.mjs";

const { parseCSV, csvSkeleton, csvParseJsonBlock, csvCol, csvConf,
  CSV_MAP_SYSTEM, CSV_SHOPS_SYSTEM, AI_MODEL_CSV_MAP, AI_MODEL_CSV_SHOPS } = app;

const VIA_CLI = process.argv.includes("--via-cli");
const DO_SHOPS = process.argv.includes("--shops");
const DRY = process.argv.includes("--dry");
const KEY = process.env.ANTHROPIC_API_KEY;

if (!KEY && !VIA_CLI && !DRY) {
  console.error("No ANTHROPIC_API_KEY. Either set one, pass --via-cli to use the Claude Code\n" +
    "subscription, or pass --dry to print the payloads without calling anything.");
  process.exit(2);
}

async function ask(system, user, model, maxTokens) {
  if (VIA_CLI) {
    // Both halves go through files, not argv: the system prompt is ~2.7k
    // characters of multi-line text with quotes in it, and Windows both caps
    // a command line at 8191 characters and mangles the quoting long before
    // that. The API path below is the faithful one - it is what api/chat.js
    // does - and this is the subscription smoke test.
    const dir = mkdtempSync(join(tmpdir(), "richy-csv-"));
    const sysFile = join(dir, "system.txt");
    const userFile = join(dir, "user.json");
    writeFileSync(sysFile, system, "utf8");
    writeFileSync(userFile, user, "utf8");
    // shell:true because on Windows `claude` is a .cmd shim that spawn cannot
    // execute directly.
    const out = execFileSync("claude",
      ["-p", "--model", model, "--append-system-prompt-file", JSON.stringify(sysFile)],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, shell: true, input: user });
    return out.trim();
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.type + ": " + data.error.message);
  if (data.stop_reason === "max_tokens") throw new Error("cut off at max_tokens");
  return (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
}

// What each file SHOULD come back as. Column numbers are into the whole row.
const EXPECT = {
  LEUMI:    { header: 2, date: 0, shop: 1, amount: null, debit: 3, credit: 4, note: "יתרה (balance) must not be the amount" },
  ISRACARD: { header: 3, date: 0, shop: 1, amount: 3, debit: null, credit: null, note: "סכום חיוב beats סכום עסקה" },
  MAX:      { header: 0, date: 0, shop: 1, amount: 3, debit: null, credit: null, note: "" },
  ENGLISH:  { header: 0, date: 0, shop: 1, amount: 2, debit: null, credit: null, note: "" },
  US_MDY:   { header: 0, date: 0, shop: 2, amount: 3, debit: null, credit: null, note: "transaction date, not value date; not balance" }
};

const n = (v) => (v === null || v === undefined || v < 0 ? null : v);

function payloadFor(name) {
  const sk = csvSkeleton(parseCSV(ALL[name].text));
  return { sk, payload: { columns: sk.columns, head: sk.head, shape: sk.shape, profiles: sk.profiles } };
}

// --dry: print exactly what would be sent, and call nothing. This is the
// screen to read before trusting any of it - if a purchase of yours is
// visible here, the privacy promise on the import screen is wrong.
if (DRY) {
  console.log("What would be sent for each file. No call is made.\n");
  for (const name of Object.keys(ALL)) {
    const { payload } = payloadFor(name);
    console.log("=".repeat(64));
    console.log(name + "   (" + ALL[name].encoding + ")");
    console.log("=".repeat(64));
    console.log(JSON.stringify(payload, null, 1));
    console.log();
  }
  console.log("System prompt: " + CSV_MAP_SYSTEM.length + " characters, unchanged from budget-app.jsx.");
  process.exit(0);
}

async function mapOne(name) {
  const { sk, payload } = payloadFor(name);
  const reply = await ask(CSV_MAP_SYSTEM, JSON.stringify(payload), AI_MODEL_CSV_MAP, 600);
  const v = csvParseJsonBlock(reply, "{", "}");
  if (!v) return { name, ok: false, why: "unreadable reply", reply: reply.slice(0, 220) };

  const got = {
    header: typeof v.header_row_index === "number" ? v.header_row_index : null,
    date: n(csvCol(v.date_column, sk.columns)),
    shop: n(csvCol(v.shop_column, sk.columns)),
    amount: n(csvCol(v.amount_column, sk.columns)),
    debit: n(csvCol(v.debit_column, sk.columns)),
    credit: n(csvCol(v.credit_column, sk.columns))
  };
  const want = EXPECT[name];
  const wrong = ["header", "date", "shop", "amount", "debit", "credit"].filter((k) => got[k] !== want[k]);
  const conf = v.confidence || {};
  return {
    name, ok: wrong.length === 0, wrong, got, want,
    fenced: reply.trim()[0] !== "{",
    confidence: ["date_column", "shop_column", "amount_column"].map((k) => k.replace("_column", "") + ":" + csvConf(conf[k])).join(" "),
    sign: v.amount_sign_convention, fmt: v.date_format, note: want.note
  };
}

async function shopsOne() {
  const cats = [{ name: "Food" }, { name: "Transport" }, { name: "Housing" }, { name: "Health" },
    { name: "Entertainment" }, { name: "Shopping" }, { name: "Travel" }, { name: "Salary" }, { name: "Other" }];
  const shops = ["שופרסל דיל תל אביב", "מקס איט", "סינמה סיטי גלילות", "ארומה תל אביב",
    "פייבוקס", "סופר פארם", "פנגו חניה", "דלק פז", "רמי לוי שיווק", "STARBUCKS #1123 SEATTLE"];
  const body = { categories: cats.map((c) => c.name), shops };
  const reply = await ask(CSV_SHOPS_SYSTEM, JSON.stringify(body), AI_MODEL_CSV_SHOPS, 1800);
  const arr = csvParseJsonBlock(reply, "[", "]");
  if (!Array.isArray(arr)) { console.log("  unreadable reply: " + reply.slice(0, 200)); return false; }
  const names = cats.map((c) => c.name);
  let bad = 0;
  for (const s of shops) {
    const hit = arr.find((r) => r && r.shop === s);
    const inSet = hit && names.includes(hit.category);
    if (!hit || !inSet) bad++;
    console.log("  " + (hit && inSet ? "ok  " : "MISS") + "  " + s.padEnd(26) +
      (hit ? hit.category + "  (" + (hit.confidence || "?") + ")" : "- no answer"));
  }
  console.log("  every name answered, every category inside the closed set: " + (bad === 0 ? "yes" : "NO (" + bad + " bad)"));
  return bad === 0;
}

const files = Object.keys(EXPECT);
console.log("Model: " + AI_MODEL_CSV_MAP + (VIA_CLI ? "  (via the Claude Code CLI)" : "  (via the Messages API)"));
console.log("Sending the SHAPE of each file only - no amounts, no dates, no shop names.\n");

let failed = 0;
for (const f of files) {
  let r;
  try { r = await mapOne(f); }
  catch (e) { console.log("FAIL  " + f + "  -> " + e.message); failed++; continue; }
  if (!r.ok) failed++;
  console.log((r.ok ? "ok  " : "FAIL") + "  " + f.padEnd(10) +
    "header:" + r.got.header + " date:" + r.got.date + " shop:" + r.got.shop +
    " amount:" + r.got.amount + " debit:" + r.got.debit + " credit:" + r.got.credit);
  console.log("        " + (r.confidence || "") + "   sign:" + r.sign + "   fmt:" + r.fmt + (r.fenced ? "   [answer was fenced]" : ""));
  if (r.note) console.log("        the trap: " + r.note);
  if (!r.ok) console.log("        WRONG: " + r.wrong.join(", ") + "  wanted " + JSON.stringify(r.want));
}

if (DO_SHOPS) {
  console.log("\nPhase 2 - " + AI_MODEL_CSV_SHOPS + " sorting shop names:");
  try { if (!await shopsOne()) failed++; }
  catch (e) { console.log("  FAILED: " + e.message); failed++; }
}

console.log("\n" + (failed ? failed + " of " + files.length + " files misread" : "every file read correctly"));
process.exit(failed ? 1 : 0);
