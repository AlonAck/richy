// Does Alfred actually read real statements right? Runs the SHIPPING reader -
// readStatementWithAI and every check behind it, pulled straight out of
// budget-app.jsx - against a real model, over statements in the shapes banks
// really hand out (hard-fixtures.mjs), and scores every line: its date, its
// amount, which way the money went, whether it is a transfer, its category.
//
//   ANTHROPIC_API_KEY=sk-... node tests/csv-import/live-reader.mjs
//   node tests/csv-import/live-reader.mjs --via-cli      (Claude Code login)
//   node tests/csv-import/live-reader.mjs --only HAPOALIM --verbose
//
// A category outside a line's defensible set is reported but scored apart:
// "wrong direction" and "a total imported as a purchase" are failures;
// "Wolt filed as Shopping" is a miss worth seeing, not a broken import.
import { execFile } from "child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { app, ROOT } from "./extract.mjs";
import { HARD, CATS } from "./hard-fixtures.mjs";

const VIA_CLI = process.argv.includes("--via-cli");
const VERBOSE = process.argv.includes("--verbose");
const onlyAt = process.argv.indexOf("--only");
const ONLY = onlyAt > 0 ? process.argv[onlyAt + 1] : "";

function keyFromEnvFile() {
  try {
    const m = /^\s*ANTHROPIC_API_KEY\s*=\s*"?([^"\r\n]+)"?/m.exec(readFileSync(join(ROOT, ".env.local"), "utf8"));
    return m ? m[1].trim() : "";
  } catch (e) { return ""; }
}
const KEY = process.env.ANTHROPIC_API_KEY || keyFromEnvFile();
if (!KEY && !VIA_CLI) {
  console.error("No API key. Set ANTHROPIC_API_KEY, `vercel env pull .env.local`, or pass --via-cli.");
  process.exit(2);
}

// What api/chat.js does with a request, minus the network hop to it.
async function ask(system, user, model, maxTokens, effort) {
  if (VIA_CLI) {
    const dir = mkdtempSync(join(tmpdir(), "richy-read-"));
    const sysFile = join(dir, "system.txt");
    writeFileSync(sysFile, system, "utf8");
    const args = ["-p", "--model", model, "--system-prompt-file", sysFile, "--tools", ""];
    if (effort) args.push("--effort", effort);
    return await new Promise((resolve, reject) => {
      const child = execFile("claude", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, shell: process.platform === "win32", timeout: 180000 },
        (err, out) => (err ? reject(err) : resolve(String(out).trim())));
      child.stdin.end(user);
    });
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(Object.assign({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] },
      effort ? { thinking: { type: "adaptive" }, output_config: { effort } } : { thinking: { type: "disabled" } }))
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.type + ": " + data.error.message);
  return (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
}

let calls = 0;
app.setClaude(function(messages, system, maxTokens, callback, model, timeoutMs, extra) {
  calls++;
  const user = messages.map((m) => m.content).join("\n\n");
  ask(system, user, model, maxTokens, extra && extra.effort)
    .then((text) => callback(null, text))
    .catch((e) => callback(Object.assign(new Error(e.message), { kind: "network" }), null));
});

const cats = CATS.map((name, i) => ({ id: "c" + i, name }));

function readOne(name) {
  const rows = app.parseCSV(HARD[name].text);
  return new Promise((resolve) => {
    app.readStatementWithAI(rows, { cats, examples: [], saved: {}, tx: [] }, null, (err, res) => resolve({ err, res, rows }));
  });
}

function score(name, res) {
  const want = HARD[name].expect;
  const txs = res.txs.slice();
  const problems = [], catMisses = [];
  const used = new Set();
  for (const [date, amount, dir, kind, okCats] of want) {
    const i = txs.findIndex((t, k) => !used.has(k) && t.date === date && Math.abs(t.amount - amount) < 0.005);
    if (i < 0) { problems.push("MISSING   " + date + "  " + amount.toFixed(2)); continue; }
    used.add(i);
    const t = txs[i];
    const gotDir = t.type === "income" ? "in" : "out";
    if (gotDir !== dir) problems.push("DIRECTION " + date + "  " + t.label + "  " + amount.toFixed(2) + "  read " + gotDir + ", is " + dir);
    const isT = !!t.transfer;
    if (isT !== (kind === "transfer")) problems.push("TRANSFER  " + date + "  " + t.label + "  read " + (isT ? "transfer" : "not a transfer") + ", is " + (kind === "transfer" ? "a transfer" : "not"));
    else if (!isT && okCats && !okCats.includes(t.category)) catMisses.push(t.label + " -> " + t.category + " (want " + okCats.join("/") + ")");
    if (VERBOSE) console.log("      " + date + "  " + (gotDir === "in" ? "+" : "-") + t.amount.toFixed(2).padStart(9) + "  " + (t.transfer ? "[" + t.category + "]" : t.category).padEnd(16) + (t.flowGuess ? "? " : "  ") + t.label);
  }
  txs.forEach((t, k) => { if (!used.has(k)) problems.push("EXTRA     " + t.date + "  " + t.label + "  " + t.amount.toFixed(2)); });
  return { problems, catMisses };
}

const names = Object.keys(HARD).filter((n) => !ONLY || n === ONLY);
console.log("Reading " + names.length + " statements with " + app.AI_MODEL_CSV_READ + (VIA_CLI ? " (via the Claude Code CLI)" : " (via the Messages API)") + "\n");
let failedFiles = 0, totalLines = 0, badLines = 0, totalCatMiss = 0;
const t0 = Date.now();
await Promise.all(names.map(async (name) => {
  const s = Date.now();
  const { err, res } = await readOne(name);
  const out = [];
  if (err || !res) {
    failedFiles++;
    out.push("FAIL  " + name + "  -> the reader gave up: " + (err && err.message));
  } else {
    const { problems, catMisses } = score(name, res);
    totalLines += HARD[name].expect.length; badLines += problems.length; totalCatMiss += catMisses.length;
    if (problems.length) failedFiles++;
    const st = res.stats;
    out.push((problems.length ? "FAIL  " : "ok    ") + name.padEnd(18) + HARD[name].expect.length + " lines, " + ((Date.now() - s) / 1000).toFixed(0) + "s"
      + "   calls " + st.calls + (st.failedCalls ? " (" + st.failedCalls + " failed)" : "")
      + "   by-layout " + st.byLayout + "   column-fixed " + st.columnFixed
      + (st.balance && st.balance.pairs ? "   balance " + st.balance.confirmed + "/" + st.balance.pairs + (st.balance.fixed ? " fixed " + st.balance.fixed : "") : "")
      + (st.totals && st.totals.found ? "   totals " + st.totals.matched + "/" + st.totals.found : "")
      + (res.leftOut.length ? "   left-out " + res.leftOut.length : ""));
    problems.forEach((p) => out.push("        " + p));
    catMisses.forEach((c) => out.push("        category: " + c));
  }
  console.log(out.join("\n"));
}));
console.log("\n" + (failedFiles ? failedFiles + " of " + names.length + " statements had a wrong line" : "all " + names.length + " statements read correctly")
  + "  -  " + badLines + " wrong of " + totalLines + " lines, " + totalCatMiss + " debatable categories, " + calls + " model calls, " + ((Date.now() - t0) / 1000).toFixed(0) + "s");
process.exit(failedFiles ? 1 : 0);
