// Exercises the pure helpers in budget-app.jsx that no UI test reaches. The
// file is one big module, so the functions under test are lifted out by name
// and evaluated on their own.
import { readFileSync } from "fs";

const SRC = readFileSync(new URL("../budget-app.jsx", import.meta.url), "utf8");

// Pull a top-level `function NAME(...) { ... }` out by brace matching.
export function lift(name) {
  const start = SRC.indexOf("\nfunction " + name + "(");
  if (start < 0) throw new Error("not found: " + name);
  let i = SRC.indexOf("{", start), depth = 0, inStr = null, esc = false;
  for (let j = i; j < SRC.length; j++) {
    const c = SRC[j];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (!depth) return SRC.slice(start + 1, j + 1); }
  }
  throw new Error("unbalanced: " + name);
}

export function build(names, preamble = "") {
  return new Function(preamble + names.map(lift).join("\n") + "\nreturn {" + names.join(",") + "};")();
}

let pass = 0, fail = 0;
export function ok(label, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         got  " + g + "\n         want " + w); }
}
export function done() {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Retired Bank Leumi demo: the sweep must take every invented row and nothing else.
// ---------------------------------------------------------------------------
const { cleanDemoSyncTx } = build(["isDemoSyncTx", "cleanDemoSyncTx"]);

const demo = (i) => ({ id: "d" + i, amount: 120, label: "Shufersal", syncSource: "leumi_finteka", externalId: "demo-1234-" + i + "-abc" });
const realLeumi = { id: "r1", amount: 88, label: "Rami Levy", syncSource: "leumi_finteka", externalId: "TXN-99812" };
const phoneSync = { id: "p1", amount: 14, label: "Cofix", syncSource: "phone", externalId: "wallet-551" };
const typed = { id: "t1", amount: 42, label: "Lunch" };
const csv = { id: "c1", amount: 300, label: "IKEA", externalId: "demo-looking-but-no-syncSource" };

ok("removes only demo rows",
  cleanDemoSyncTx([demo(0), realLeumi, phoneSync, typed, csv, demo(1)]).tx.map(t => t.id),
  ["r1", "p1", "t1", "c1"]);
ok("counts what it removed", cleanDemoSyncTx([demo(0), demo(1), typed]).removed, 2);
ok("no demo rows is a no-op", cleanDemoSyncTx([realLeumi, typed]).removed, 0);
ok("idempotent", cleanDemoSyncTx(cleanDemoSyncTx([demo(0), typed]).tx).removed, 0);
ok("survives empty/undefined", [cleanDemoSyncTx([]).removed, cleanDemoSyncTx(undefined).removed], [0, 0]);
ok("a real row whose externalId merely contains 'demo-' is kept",
  cleanDemoSyncTx([{ id: "x", syncSource: "leumi_finteka", externalId: "TX-demo-77" }]).removed, 0);

done();
