// Random statements, read end to end, checked line by line against the truth.
//
//   npm run test:random                      200 statements per layout
//   node tests/csv-import/random.test.mjs --seeds=2000
//   node tests/csv-import/random.test.mjs --random          a fresh base seed
//   node tests/csv-import/random.test.mjs --gen=max --seed=1234 --verbose
//
// Each generator in ./gen builds one real export layout (Isracard, Max, Cal,
// Leumi, Hapoalim, Discount/Mizrahi, English banks and cards) with random
// lines, random formatting and the traps those files really carry - total
// lines, a second section with its own titles, purchases in payments, dollars
// beside shekels, currency and reference columns, a running balance. Every
// statement is put through the shipping import (see pipeline.mjs) with the
// columns read five ways and Alfred answering five ways, and what comes out
// must match what went in:
//   - the same lines, no more and no fewer: no total counted as a purchase,
//     no purchase lost
//   - the same dates, amounts and direction on every line; nothing stamped
//     with today
//   - money moving between the user's own accounts marked as a transfer
//   - the lines adding up to the total the statement prints
//   - every shop in the category Alfred gave it, and when Alfred is down or
//     shrugs, every shop the card's own label or the keyword map knows in the
//     right one - not Other
// A failure prints the seed; the seed replays it exactly.
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { makeRng } from "./gen/_lib.mjs";
import { runImport, CATS, TODAY, MAP_MODES, SHOP_MODES } from "./pipeline.mjs";
import { app } from "./extract.mjs";

const { csvSectorCat, keywordCatName } = app;
const HERE = dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const SEEDS = parseInt(args.seeds || "200", 10);
const BASE = args.random ? (Date.now() % 1e9) : parseInt(args.base || "1", 10);
const ONLY_SEED = args.seed !== undefined ? parseInt(args.seed, 10) : null;
const VERBOSE = !!args.verbose;
const ALL_MODES = !!args["all-modes"];

const catNames = new Set(CATS.map((c) => c.name));
const norm = (s) => String(s == null ? "" : s).replace(/[״”“]/g, "\"").replace(/\s+/g, " ").trim().toLowerCase();
const money = (n) => (Math.round(n * 100) / 100).toFixed(2);

// The category a line should come out in, or null when the suite cannot say
// (a Bit to a person, a category the default set does not have).
function expectedCat(t) {
  if (t.transfer || t.cat == null) return null;
  return catNames.has(t.cat) ? t.cat : null;
}
// Whether Richy can know this shop's category WITHOUT Alfred: the card's own
// label maps to it, or the keyword map knows the name.
function knowableOffline(t) {
  const want = expectedCat(t);
  if (!want) return false;
  if (t.issuer) { const c = csvSectorCat(t.issuer, CATS); if (c) return c.name === want; }
  return keywordCatName(t.shop) === want;
}

function checkOne(inst, res, mapMode, shopMode) {
  const probs = [];
  if (res.err) return ["the file was refused: " + res.err];
  const cands = res.cands;
  const truth = inst.truth;

  // --- the same lines ------------------------------------------------------
  const key = (d, a, ty) => d + "|" + money(a) + "|" + ty;
  const pool = new Map();
  cands.forEach((c, i) => {
    const k = key(c.date, c.amount, c.type);
    if (!pool.has(k)) pool.set(k, []);
    pool.get(k).push(i);
  });
  const pairs = [], missing = [];
  truth.forEach((t) => {
    const list = pool.get(key(t.date, t.amount, t.type));
    if (list && list.length) pairs.push([t, cands[list.shift()]]);
    else missing.push(t);
  });
  const matched = new Set(pairs.map((p) => p[1]));
  const extra = cands.filter((c) => !matched.has(c));
  if (missing.length) probs.push(missing.length + " real line(s) missing, e.g. " + missing.slice(0, 3).map((t) => t.date + " " + t.shop + " " + money(t.amount) + " " + t.type).join("; "));
  if (extra.length) probs.push(extra.length + " line(s) that are not in the statement, e.g. " + extra.slice(0, 3).map((c) => c.date + " " + c.label + " " + money(c.amount) + " " + c.type).join("; "));
  if (cands.some((c) => c.date === TODAY)) probs.push("a line was stamped with today's date instead of read");

  // --- the money -----------------------------------------------------------
  const sum = (list, ty) => list.filter((x) => x.type === ty).reduce((s, x) => s + x.amount, 0);
  const tOut = sum(truth, "expense"), cOut = sum(cands, "expense");
  const tIn = sum(truth, "income"), cIn = sum(cands, "income");
  if (Math.abs(tOut - cOut) > 0.005) probs.push("money out " + money(cOut) + ", statement says " + money(tOut));
  if (Math.abs(tIn - cIn) > 0.005) probs.push("money in " + money(cIn) + ", statement says " + money(tIn));

  // --- what is written ------------------------------------------------------
  // After the duplicate check, with nothing in the app yet: every line the
  // statement holds, still. Two ATM withdrawals of 400 on consecutive days are
  // two withdrawals.
  if (!missing.length && !extra.length) {
    const wOut = sum(res.written, "expense"), wIn = sum(res.written, "income");
    if (res.written.length !== truth.length || Math.abs(wOut - tOut) > 0.005 || Math.abs(wIn - tIn) > 0.005) {
      probs.push("the duplicate check dropped " + (truth.length - res.written.length) + " real line(s) from a file with nothing in the app yet");
    }
  }

  // --- transfers -----------------------------------------------------------
  pairs.forEach(([t, c]) => {
    if (!!t.transfer !== !!c.transfer) probs.push((t.transfer ? "a transfer read as spending: " : "spending read as a transfer: ") + t.shop + " " + money(t.amount));
  });

  // --- the file's own total --------------------------------------------------
  if ((inst.statementTotals || []).length && !missing.length && !extra.length) {
    const chk = res.read.check;
    if (!chk) probs.push("the statement prints a total but no total line was found");
    else if (!chk.ok) probs.push("the lines (" + money(chk.counted) + ") do not add up to the statement's total (" + money(chk.printed) + ")");
  }

  // --- categories ----------------------------------------------------------
  const alfredRight = shopMode === "oracle" || shopMode === "echo" || shopMode === "cutoff";
  // A refund on a BANK account is money in under the shop's plain name. Alfred
  // is only asked about it when the file also buys from that shop; otherwise
  // Richy knows it only as well as the keyword map does.
  const bought = new Set(truth.filter((t) => t.type === "expense").map((t) => norm(t.shop)));
  let wrong = 0, other = 0, knowable = 0;
  const wrongEx = [];
  pairs.forEach(([t, c]) => {
    const want = expectedCat(t);
    if (!want) return;
    const shopLine = !(t.type === "income" && !t.refund);
    const bankRefund = inst.kind === "bank" && t.type === "income" && t.refund;
    const mustKnow = !shopLine || (bankRefund ? (alfredRight && bought.has(norm(t.shop))) || knowableOffline(t) : (alfredRight || knowableOffline(t)));
    if (!mustKnow) { if (c.category === "Other") other++; return; }
    knowable++;
    if (c.category !== want) { wrong++; if (wrongEx.length < 4) wrongEx.push(t.shop + " -> " + c.category + " (should be " + want + (t.issuer ? ", card says " + t.issuer : "") + ")"); }
  });
  if (wrong) probs.push(wrong + " of " + knowable + " line(s) in the wrong category: " + wrongEx.join("; "));
  return probs;
}

const files = readdirSync(join(HERE, "gen")).filter((f) => f.endsWith(".mjs") && !f.startsWith("_"));
const only = args.gen ? String(args.gen).split(",") : null;
const gens = [];
for (const f of files) {
  const mod = (await import(join(HERE, "gen", f))).default;
  if (!mod || typeof mod.make !== "function") { console.log("skipping " + f + ": no default { make }"); continue; }
  if (only && only.indexOf(mod.id) === -1) continue;
  gens.push(mod);
}
if (!gens.length) { console.log("no generators found"); process.exit(1); }

let runs = 0, failed = 0;
const failures = [];
const byGen = {};
for (const g of gens) {
  byGen[g.id] = { runs: 0, failed: 0, traps: {} };
  const seeds = ONLY_SEED !== null ? [ONLY_SEED] : Array.from({ length: SEEDS }, (_, i) => BASE + i);
  for (const seed of seeds) {
    const combos = ALL_MODES
      ? MAP_MODES.flatMap((m) => SHOP_MODES.map((s) => [m, s]))
      : [[MAP_MODES[seed % MAP_MODES.length], SHOP_MODES[Math.floor(seed / MAP_MODES.length) % SHOP_MODES.length]]];
    for (const [mapMode, shopMode] of combos) {
      let inst;
      try { inst = g.make(makeRng(seed)); }
      catch (e) { failures.push({ gen: g.id, seed, mapMode, shopMode, name: "(generator threw)", probs: [String(e && e.stack || e)] }); failed++; runs++; continue; }
      (inst.traps || []).forEach((t) => { byGen[g.id].traps[t] = (byGen[g.id].traps[t] || 0) + 1; });
      const know = (() => {
        const m = new Map();
        inst.truth.forEach((t) => { if (t.cat) m.set(norm(t.shop).slice(0, 60), t.cat === "Travel" && !catNames.has("Travel") ? "Other" : t.cat); });
        return (name) => m.get(norm(name).slice(0, 60)) || "";
      })();
      let res, probs;
      try {
        res = await runImport(inst.file, { mapMode, shopMode, know });
        probs = checkOne(inst, res, mapMode, shopMode);
        // The same statement again, next time: read by the layout saved from
        // this import, against the rows it wrote. Nothing may land twice -
        // and nothing about reading the file may change on the way.
        if (!probs.length) {
          const again = await runImport(inst.file, { mapMode: "saved", profile: res.profile, shopMode, know, existing: res.written, saved: res.learned });
          const p2 = checkOne(inst, again, "saved", shopMode).filter((p) => !/duplicate check dropped/.test(p));
          p2.forEach((p) => probs.push("second import, saved layout: " + p));
          if (!p2.length && (again.classified.fresh.length || again.classified.maybes.length)) {
            probs.push("importing the same statement twice would add " + again.classified.fresh.length + " line(s) again and ask about " + again.classified.maybes.length);
          }
        }
      } catch (e) {
        probs = ["the import threw: " + (e && e.stack || e)];
      }
      runs++; byGen[g.id].runs++;
      if (probs.length) {
        failed++; byGen[g.id].failed++;
        failures.push({ gen: g.id, seed, mapMode, shopMode, name: inst.name, probs, res, inst });
      } else if (VERBOSE) {
        console.log("  ok    " + g.id + " seed " + seed + " [" + mapMode + " / " + shopMode + "] " + inst.name);
      }
    }
  }
}

console.log("\nRandom statements through the shipping import");
for (const id in byGen) {
  const b = byGen[id];
  console.log("  " + (b.failed ? "FAIL" : "ok  ") + "  " + id.padEnd(18) + b.runs + " statements, " + b.failed + " wrong"
    + "   traps: " + Object.keys(b.traps).slice(0, 8).map((t) => t + " x" + b.traps[t]).join(", "));
}
if (failures.length) {
  console.log("\nFirst failures (replay: node tests/csv-import/random.test.mjs --gen=<id> --seed=<n> --verbose):");
  const shown = {};
  failures.forEach((f) => {
    shown[f.gen] = (shown[f.gen] || 0) + 1;
    if (shown[f.gen] > (VERBOSE ? 50 : 4)) return;
    console.log("\n  " + f.gen + " seed " + f.seed + " [" + f.mapMode + " / " + f.shopMode + "] " + f.name);
    f.probs.forEach((p) => console.log("      - " + p));
    if (VERBOSE && f.res && f.res.st) {
      console.log("      map " + JSON.stringify(f.res.st.map) + " split=" + f.res.st.sign.splitAmt + " positiveOut=" + f.res.st.sign.positiveOut + " hRow=" + f.res.hRow);
      console.log("      totals left out: " + JSON.stringify(f.res.read.totals.map((t) => [t.label, t.amount, t.why, t.matched])) + "  left: " + JSON.stringify(f.res.read.left.map((t) => [t.label, t.amount])));
    }
  });
}
console.log("\n----------------------------------------------------------------");
console.log(failed ? failed + " of " + runs + " statements came out wrong" : "all " + runs + " statements came out right");
process.exit(failed ? 1 : 0);
