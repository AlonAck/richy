// Exercises the pure helpers in budget-app.jsx that no UI test reaches. The
// file is one big module, so the functions under test are lifted out by name
// and evaluated on their own.
import { readFileSync } from "fs";

const SRC = readFileSync(new URL("../budget-app.jsx", import.meta.url), "utf8");

// Pull a top-level `function NAME(...) { ... }` out by brace matching.
export function lift(name) {
  const start = SRC.indexOf("\nfunction " + name + "(");
  if (start < 0) throw new Error("not found: " + name);
  let i = SRC.indexOf("{", start), depth = 0, inStr = null, esc = false, inCmt = null;
  for (let j = i; j < SRC.length; j++) {
    const c = SRC[j], nx = SRC[j + 1];
    // Comments first: an apostrophe in "don't" is not the start of a string.
    if (inCmt === "line") { if (c === "\n") inCmt = null; continue; }
    if (inCmt === "block") { if (c === "*" && nx === "/") { inCmt = null; j++; } continue; }
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === inStr) inStr = null; continue; }
    if (c === "/" && nx === "/") { inCmt = "line"; j++; continue; }
    if (c === "/" && nx === "*") { inCmt = "block"; j++; continue; }
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



// ---------------------------------------------------------------------------
// Recurring materialisation.
// ---------------------------------------------------------------------------
const R = build(
  ["recurPeriodKey", "recurNextDate", "isRecurSource", "materializeRecurring", "pendingRecurring"],
  // Collaborators the lifted functions close over.
  `function isoDay(d){return d.toISOString().slice(0,10);}
   function isOpening(t){return !!t.opening;}
   function isTransfer(t){return !!t.transfer||t.catId==="savings-transfer";}
   function isTrip(t){return !!t.trip;}
   var RECUR_MAX_BACKFILL = 3;\n`);

const rent = { id: 7, type: "expense", amount: 3200, label: "Rent", catId: "c1",
               category: "Housing", date: "2026-06-01", repeat: "monthly", pending: false };

console.log("\n-- period keys --");
ok("monthly key", R.recurPeriodKey("2026-08-14", "monthly"), "2026-08");
ok("weekly key", R.recurPeriodKey("2026-08-20", "weekly"), "2026-W34");
ok("ISO week rolls the year, not week 1 of the wrong year",
  R.recurPeriodKey("2027-01-01", "weekly"), "2026-W53");

console.log("\n-- date stepping --");
ok("monthly steps a month", R.recurNextDate("2026-06-01", "monthly", 1), "2026-07-01");
ok("31st clamps to a short month", R.recurNextDate("2026-01-31", "monthly", 31), "2026-02-28");
ok("...and springs back to 31 the month after", R.recurNextDate("2026-02-28", "monthly", 31), "2026-03-31");
ok("weekly steps 7 days", R.recurNextDate("2026-08-20", "weekly"), "2026-08-27");

console.log("\n-- acceptance: a monthly tx, clock advanced 32 days --");
let r = R.materializeRecurring([rent], "2026-07-03");   // 32 days after 2026-06-01
ok("posts exactly one occurrence", r.added.length, 1);
ok("...dated to the next period", r.added[0].date, "2026-07-01");
ok("...pending, not settled", r.added[0].pending, true);
ok("...linked to its source", r.added[0].recurredFrom, 7);
ok("...carries the period it covers", r.added[0].recurPeriod, "2026-07");
ok("...does not itself recur", r.added[0].repeat, "none");
ok("...keeps amount and category", [r.added[0].amount, r.added[0].catId], [3200, "c1"]);
ok("source is stamped as materialised through", r.tx[0].recurredThrough, "2026-07");

console.log("\n-- idempotency --");
ok("a second boot the same day adds nothing", R.materializeRecurring(r.tx, "2026-07-03").added.length, 0);
ok("...and a third", R.materializeRecurring(R.materializeRecurring(r.tx, "2026-07-03").tx, "2026-07-03").added.length, 0);
ok("deleting a generated row does not resurrect it",
  R.materializeRecurring(r.tx.filter(t => !t.recurredFrom), "2026-07-03").added.length, 0);

console.log("\n-- gaps and caps --");
ok("a three-month gap posts three", R.materializeRecurring([rent], "2026-09-05").added.length, 3);
ok("a year away is capped, not a wall of invented charges",
  R.materializeRecurring([rent], "2027-06-05").added.length, 3);
ok("...and keeps the most recent periods",
  R.materializeRecurring([rent], "2027-06-05").added.map(t => t.recurPeriod), ["2027-04", "2027-05", "2027-06"]);
ok("same period, nothing due", R.materializeRecurring([rent], "2026-06-20").added.length, 0);

console.log("\n-- what must never be materialised --");
const no = (patch, why) => ok(why, R.materializeRecurring([Object.assign({}, rent, patch)], "2026-09-05").added.length, 0);
no({ repeat: "none" }, "a one-off");
no({ opening: true }, "an opening balance");
no({ transfer: true }, "a transfer (its pair would go missing)");
no({ trip: true }, "a trip lump sum");
no({ catchUp: true }, "a catch-up estimate");
no({ pending: true }, "an unconfirmed row");
no({ recurredFrom: 1 }, "a generated occurrence (no chaining)");
no({ date: "2027-01-01" }, "a source dated in the future");

console.log("\n-- variable income --");
const salary = { id: 11, type: "income", amount: 9000, label: "Salary", catId: "c8",
                 category: "Salary", date: "2026-06-25", repeat: "monthly", pending: false };
// Salary falls on the 25th; on Aug 5th only July's has actually arrived.
ok("only occurrences whose date has arrived are posted",
  R.materializeRecurring([salary], "2026-08-05").added.map(t => t.date), ["2026-07-25"]);
ok("...and the month is not marked done before its charge exists",
  R.materializeRecurring([salary], "2026-08-05").tx[0].recurredThrough, "2026-07");
{ // the bug this guards: stamping today's period would swallow the 25th
  const afterAug5 = R.materializeRecurring([salary], "2026-08-05").tx;
  ok("...so the 25th still posts later that month",
    R.materializeRecurring(afterAug5, "2026-08-26").added.map(t => t.date), ["2026-08-25"]);
}
ok("someone whose income varies does not",
  R.materializeRecurring([salary], "2026-08-05", { variableIncome: true }).added.length, 0);
ok("...but their rent still recurs",
  R.materializeRecurring([salary, rent], "2026-08-05", { variableIncome: true })
    .added.every(t => t.type === "expense"), true);

console.log("\n-- a stamp that never reached the server --");
// A load that is never followed by a save leaves the source unstamped but the
// generated rows in the list. Re-running must not duplicate them.
const unstamped = r.tx.map(t => { const c = Object.assign({}, t); delete c.recurredThrough; return c; });
ok("no duplicate row when the stamp is missing", R.materializeRecurring(unstamped, "2026-07-03").added.length, 0);
ok("...and ids stay unique",
  new Set(R.materializeRecurring(unstamped, "2026-07-03").tx.map(t => t.id)).size,
  R.materializeRecurring(unstamped, "2026-07-03").tx.length);

console.log("\n-- weekly --");
const gym = Object.assign({}, rent, { id: 9, repeat: "weekly", date: "2026-08-03", amount: 60 });
ok("weekly posts one per week, capped", R.materializeRecurring([gym], "2026-08-25").added.map(t => t.date),
   ["2026-08-10", "2026-08-17", "2026-08-24"]);

console.log("\n-- the confirm card's queue --");
const mixed = R.materializeRecurring([rent, gym], "2026-08-25");
ok("lists every unconfirmed occurrence", R.pendingRecurring(mixed.tx).length, mixed.added.length);
ok("...oldest first", R.pendingRecurring(mixed.tx).map(t => t.date),
   mixed.added.map(t => t.date).sort());
ok("...and ignores a hand-marked pending row",
   R.pendingRecurring([{ id: 1, pending: true, date: "2026-08-01" }]).length, 0);

// ---------------------------------------------------------------------------
// Onboarding fixed-cost chips -> real repeating transactions.
// ---------------------------------------------------------------------------
const F = build(["fixedCostTxs"], `
  var FIXED_COST_PRESETS = [
    { id: "rent",  tKey: "obFixedRent",  icon: "home",   catId: "c1",  picks: [2500, 3500, 4500, 6000] },
    { id: "gym",   tKey: "obFixedGym",   icon: "star",   catId: "c4",  picks: [100, 150, 250, 350] },
    { id: "other", tKey: "obFixedOther", icon: "box",    catId: "c11", picks: [100, 250, 500, 1000] }
  ];
  function isoDay(d){return d.toISOString().slice(0,10);}
  function round2(n){return Math.round(n*100)/100;}
  function tr(k){return {obFixedRent:"Rent",obFixedGym:"Gym",obFixedOther:"Something else"}[k]||k;}
  function catById(cs,id){return (cs||[]).filter(function(c){return c.id===id;})[0]||null;}
  function catByName(cs,n){return (cs||[]).filter(function(c){return c.name===n;})[0]||null;}\n`);

const CATS = [{ id: "c1", name: "Housing" }, { id: "c4", name: "Health" }, { id: "c11", name: "Other" }];
const built = F.fixedCostTxs([{ id: "rent", amount: 3800 }, { id: "gym", amount: 150 }], CATS, "2026-08-20");

console.log("\n-- onboarding fixed costs --");
ok("one transaction per picked chip", built.length, 2);
ok("every one repeats monthly", built.every(t => t.repeat === "monthly"), true);
ok("...settled, not pending - the user just told us these are real",
  built.every(t => t.pending === false), true);
ok("dated to the 1st, where standing orders actually land",
  built.map(t => t.date), ["2026-08-01", "2026-08-01"]);
ok("mapped to sensible categories", built.map(t => t.catId), ["c1", "c4"]);
ok("labelled from the chip", built.map(t => t.label), ["Rent", "Gym"]);
ok("a chip left at zero is not a cost", F.fixedCostTxs([{ id: "rent", amount: 0 }], CATS, "2026-08-20").length, 0);
ok("nothing picked, nothing created", F.fixedCostTxs([], CATS, "2026-08-20").length, 0);

// The whole point: next month they show up on their own.
const nextMonth = R.materializeRecurring(built, "2026-09-02");
ok("next month they post themselves", nextMonth.added.length, 2);
ok("...as pending, so the balance does not move first",
  nextMonth.added.every(t => t.pending === true), true);
ok("...and land in the confirm card", R.pendingRecurring(nextMonth.tx).length, 2);

// ---------------------------------------------------------------------------
// Daily safe-to-spend.
// ---------------------------------------------------------------------------
const S2S = build(["safeToSpendToday"], `
  function isoDay(d){return d.toISOString().slice(0,10);}
  function round2(n){return Math.round(n*100)/100;}
  function isOpening(t){return !!t.opening;}
  function isTransfer(t){return !!t.transfer||t.catId==="savings-transfer";}
  function isTrip(t){return !!t.trip;}
  function daysBetweenISO(a,b){return Math.round((new Date(b+"T00:00:00Z")-new Date(a+"T00:00:00Z"))/86400000);}\n`);

const P = { periodStart: "2026-08-01", periodEnd: "2026-08-31" };
const s2s = (tx, extra) => S2S.safeToSpendToday(Object.assign({ tx, todayIso: "2026-08-21" }, P, extra));

console.log("\n-- safe to spend --");
// 10,000 in, 1,000 spent, 11 days left (21st..31st inclusive) -> 9000/11
ok("income minus spending over the days left",
  s2s([{ id: 1, type: "income", amount: 10000, date: "2026-08-01" },
       { id: 2, type: "expense", amount: 1000, date: "2026-08-05" }]).amount, round(9000 / 11));
ok("today is one of the days left", s2s([]).daysLeft, 11);
ok("on the last day you get the whole remainder",
  S2S.safeToSpendToday({ tx: [{ id: 1, type: "income", amount: 300, date: "2026-08-01" }],
    todayIso: "2026-08-31", periodStart: "2026-08-01", periodEnd: "2026-08-31" }).amount, 300);

console.log("\n-- what it refuses to count --");
ok("pending rows are not income",
  s2s([{ id: 1, type: "income", amount: 10000, date: "2026-08-01", pending: true }]).income, 0);
ok("an opening balance is not this month's income",
  s2s([{ id: 1, type: "income", amount: 9000, date: "2026-08-01", opening: true }]).income, 0);
ok("a transfer to savings is not spending",
  s2s([{ id: 1, type: "expense", amount: 500, date: "2026-08-02", catId: "savings-transfer" }]).spent, 0);
ok("last month's spending is not this month's",
  s2s([{ id: 1, type: "expense", amount: 800, date: "2026-07-15" }]).spent, 0);
ok("a future-dated row does not count yet",
  s2s([{ id: 1, type: "expense", amount: 800, date: "2026-08-30" }]).spent, 0);

console.log("\n-- steady vs variable income --");
const salaryLate = [{ id: 1, type: "expense", amount: 200, date: "2026-08-03" }];
ok("a steady earner's month is worth their monthly figure from day one",
  s2s(salaryLate, { expectedIncome: 12000 }).income, 12000);
ok("...but a bigger real month beats the estimate",
  s2s(salaryLate.concat([{ id: 2, type: "income", amount: 15000, date: "2026-08-10" }]), { expectedIncome: 12000 }).income, 15000);
ok("someone whose income varies gets no assumption",
  s2s(salaryLate, { expectedIncome: 12000, variableIncome: true }).income, 0);

console.log("\n-- commitments still to come --");
const rentPending = { id: "rec_9_2026-08", type: "expense", amount: 3200, date: "2026-08-25", pending: true, recurredFrom: 9 };
ok("a posted-but-unconfirmed rent is not spendable money",
  s2s([{ id: 1, type: "income", amount: 10000, date: "2026-08-01" }, rentPending]).fixed, 3200);
ok("...and it is not counted as spent as well (no double hit)",
  s2s([{ id: 1, type: "income", amount: 10000, date: "2026-08-01" }, rentPending]).spent, 0);
ok("a monthly source with nothing posted this period is still owed",
  s2s([{ id: 9, type: "expense", amount: 3200, date: "2026-06-01", repeat: "monthly" }]).fixed, 3200);
ok("...but not once this period's occurrence is confirmed",
  s2s([{ id: 9, type: "expense", amount: 3200, date: "2026-06-01", repeat: "monthly" },
       { id: "rec_9_2026-08", type: "expense", amount: 3200, date: "2026-08-01", recurredFrom: 9 }]).fixed, 0);
ok("...and that confirmed one does count as spent",
  s2s([{ id: 9, type: "expense", amount: 3200, date: "2026-06-01", repeat: "monthly" },
       { id: "rec_9_2026-08", type: "expense", amount: 3200, date: "2026-08-01", recurredFrom: 9 }]).spent, 3200);

console.log("\n-- goals --");
ok("a goal with a deadline claims its share of the month",
  s2s([], { goals: [{ target: 6000, saved: 0, deadline: "2026-11-19" }] }).goals, 2000);
ok("an open-ended goal claims nothing", s2s([], { goals: [{ target: 6000, saved: 0 }] }).goals, 0);
ok("a goal already past its deadline claims nothing",
  s2s([], { goals: [{ target: 6000, saved: 0, deadline: "2026-07-01" }] }).goals, 0);
ok("progress already made reduces the claim",
  s2s([], { goals: [{ target: 6000, saved: 3000, deadline: "2026-11-19" }] }).goals, 1000);

console.log("\n-- overspending --");
const over = s2s([{ id: 1, type: "income", amount: 1000, date: "2026-08-01" },
                  { id: 2, type: "expense", amount: 3000, date: "2026-08-05" }]);
ok("goes negative rather than pretending", over.amount < 0, true);
ok("...and says how negative", over.pot, -2000);

function round(n) { return Math.round(n * 100) / 100; }

// ---------------------------------------------------------------------------
// Quick add: which picks surface, and what one tap actually writes.
// ---------------------------------------------------------------------------
const Q = build(["quickPicksOf", "quickPickTx"], `
  function isTransfer(t){return !!t.transfer||t.catId==="savings-transfer";}
  function isTrip(t){return !!t.trip;}
  function isOpening(t){return !!t.opening;}
  function isoDay(d){return d.toISOString().slice(0,10);}
  function round2(n){return Math.round(n*100)/100;}
  function suggestCatId(){return "c11";}
  function catById(cs,id){return (cs||[]).filter(function(c){return c.id===id;})[0]||null;}
  function catByName(cs,n){return (cs||[]).filter(function(c){return c.name===n;})[0]||null;}\n`);

const e = (id, label, amount, date, extra) =>
  Object.assign({ id, type: "expense", label, amount, date, catId: "c2" }, extra || {});
const HIST = [
  e(1, "Coffee", 14, "2026-08-01"), e(2, "Coffee", 16, "2026-08-10"), e(3, "Coffee", 15, "2026-08-18"),
  e(4, "Lunch", 48, "2026-08-05"), e(5, "Lunch", 52, "2026-08-19"),
  e(6, "Haircut", 90, "2026-08-02"),
];

console.log("\n-- quick picks --");
ok("most-used first", Q.quickPicksOf(HIST).map(p => p.label), ["Coffee", "Lunch", "Haircut"]);
ok("carries the most recent amount", Q.quickPicksOf(HIST)[0].amount, 15);
ok("caps at six", Q.quickPicksOf(HIST.concat(
  ["A","B","C","D","E"].map((l, i) => e(20 + i, l, 5, "2026-08-2" + i)))).length, 6);
ok("income is not a quick pick",
  Q.quickPicksOf([{ id: 9, type: "income", label: "Salary", amount: 9000, date: "2026-08-01" }]).length, 0);
ok("a pending recurring row is not a habit",
  Q.quickPicksOf([e(9, "Rent", 3200, "2026-08-01", { pending: true, recurredFrom: 1 })]).length, 0);
ok("a fixed cost on a repeat is not a quick pick - the materialiser posts it, and\n       a chip would invite logging it twice",
  Q.quickPicksOf([e(9, "Rent", 3200, "2026-08-01", { repeat: "monthly" })]).length, 0);
ok("nor a settled occurrence of one",
  Q.quickPicksOf([e(9, "Rent", 3200, "2026-08-01", { recurredFrom: 2 })]).length, 0);
ok("nor a transfer, trip lump sum, or catch-up estimate",
  Q.quickPicksOf([e(9, "To savings", 500, "2026-08-01", { catId: "savings-transfer" }),
                  e(10, "Tokyo", 5000, "2026-08-01", { trip: true }),
                  e(11, "Earlier this month", 700, "2026-08-01", { catchUp: true })]).length, 0);

console.log("\n-- one tap --");
const QCATS = [{ id: "c2", name: "Food" }, { id: "c11", name: "Other" }];
const logged = Q.quickPickTx(Q.quickPicksOf(HIST)[0], QCATS, HIST, "2026-08-21");
ok("dated today", logged.date, "2026-08-21");
ok("settled, not pending", logged.pending, false);
ok("an expense with the remembered amount", [logged.type, logged.amount], ["expense", 15]);
ok("keeps the category it was last filed under", [logged.catId, logged.category], ["c2", "Food"]);
ok("does not recur", logged.repeat, "none");
ok("falls back to suggestCatId when the pick has no category",
  Q.quickPickTx({ label: "Something new", amount: 20 }, QCATS, HIST, "2026-08-21").catId, "c11");

done();
