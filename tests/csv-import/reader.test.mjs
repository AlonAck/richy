// Alfred reading a statement line by line - everything that does not need a
// real model. The model is a stub here, and a deliberately unreliable one: it
// names wrong cells, gets directions backwards, cuts its answer off, fails
// outright. The point is that the FILE catches every one of those, so a bad
// answer can never reach the user's numbers.
//
//   node tests/csv-import/reader.test.mjs
//
// How well the real model reads real statements is live-reader.mjs.
import { app } from "./extract.mjs";
import { HARD, CATS } from "./hard-fixtures.mjs";

const {
  parseCSV, csvReadMaskCell, csvReadRowText, csvReadParseObjects, csvReadParseLayout, csvReadVerify,
  csvReadEnforceColumns, csvReadCheckBalance, csvReadCheckTotals, csvReadToTx, csvReadLooksReal,
  readStatementWithAI, setClaude, CSV_READ_ROWS_PER_CALL
} = app;

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++; failures.push(name + (detail ? "  -> " + detail : ""));
}
function eq(name, got, want) {
  ok(name, JSON.stringify(got) === JSON.stringify(want), "got " + JSON.stringify(got) + ", wanted " + JSON.stringify(want));
}
function group(t) { console.log("\n" + t); }

const cats = CATS.map((name, i) => ({ id: "c" + i, name }));
const names = CATS.slice();
const layoutOf = (o, rows) => csvReadParseLayout(JSON.stringify(Object.assign({ first_row: 0 }, o)), rows || [["a", "b", "c", "d", "e", "f"]]);

// --------------------------------------------------------------- privacy --
group("WHAT LEAVES THE DEVICE");
eq("an account number inside a description is masked", csvReadMaskCell("העברה מחשבון 12-614-338271"), "העברה מחשבון ##-###-######");
eq("a reference number written as text is masked", csvReadMaskCell("PPD ID: 99201844"), "PPD ID: ########");
eq("a bare nine-digit number is masked", csvReadMaskCell("123456789"), "#########");
eq("an amount is left as it is - it is what is being read", csvReadMaskCell("1,264.18"), "1,264.18");
eq("so is a trailing-minus amount", csvReadMaskCell("342.90-"), "342.90-");
eq("and a date", csvReadMaskCell("25/09/2026"), "25/09/2026");
eq("the last four card digits are not an account number", csvReadMaskCell("כרטיס 4471"), "כרטיס 4471");
eq("a pipe in a cell cannot fake a column", csvReadRowText(["a|c9=1", "", "5"], 3), "r3 | c0=a/c9=1 | c2=5");

// ------------------------------------------------------------- the reply --
group("READING THE REPLY");
eq("a fenced array is read", csvReadParseObjects("```json\n[{\"r\":1,\"t\":\"skip\"},{\"r\":2,\"t\":\"skip\"}]\n```").length, 2);
eq("a reply cut off mid-array keeps every line it finished",
  csvReadParseObjects("[{\"r\":1,\"t\":\"skip\"},{\"r\":2,\"t\":\"buy\",\"a\":3,\"io\":\"o").map((o) => o.r), [1]);
ok("an unescaped Hebrew quote in the layout notes does not lose the layout",
  !!csvReadParseLayout("{\"statement\":\"credit_card\",\"first_row\":4,\"notes\":\"skip סה\"כ lines\"}", [["a"], ["b"], ["c"], ["d"], ["e"]]));
eq("a layout column past the edge of the file is dropped", csvReadParseLayout("{\"first_row\":0,\"amount_column\":9}", [["a", "b"]]).amount, -1);

// --------------------------------------------------------- one line checked --
group("EVERY ANSWER IS CHECKED AGAINST ITS LINE");
{
  const rows = [["תאריך", "תיאור", "סכום", "יתרה"], ["03/09/2026", "רמי לוי", "356.20", "7533.95"]];
  const L = layoutOf({ header_row: 0, first_row: 1, balance_column: 3 }, rows);
  const good = csvReadVerify(rows, { r: 1, t: "buy", d: 0, dt: "2026-09-03", s: [1], a: 2, io: "out", c: "Food", q: "h" }, L, names, {});
  eq("a sound answer is read from the cells", [good.date, good.label, good.amount, good.io, good.cat], ["2026-09-03", "רמי לוי", 356.2, "out", "Food"]);
  eq("the running balance is never accepted as the amount", csvReadVerify(rows, { r: 1, t: "buy", d: 0, s: [1], a: 3, io: "out" }, L, names, {}), null);
  eq("a date is never accepted as the amount", csvReadVerify(rows, { r: 1, t: "buy", d: 0, s: [1], a: 0, io: "out" }, L, names, {}), null);
  eq("nor is a word", csvReadVerify(rows, { r: 1, t: "buy", d: 0, s: [1], a: 1, io: "out" }, L, names, {}), null);
  eq("a row that isn't in the file is refused", csvReadVerify(rows, { r: 7, t: "buy", d: 0, s: [1], a: 2 }, L, names, {}), null);
  eq("a made-up kind is refused", csvReadVerify(rows, { r: 1, t: "purchase", d: 0, s: [1], a: 2 }, L, names, {}), null);
  const cat = csvReadVerify(rows, { r: 1, t: "buy", d: 0, s: [1], a: 2, io: "out", c: "Groceries" }, L, names, {});
  eq("a category outside the user's own is dropped, not invented", cat.cat, "");
  const said = csvReadVerify(rows, { r: 1, t: "buy", d: 0, dt: "2026-03-09", s: [1], a: 2, io: "out" }, L, names, {});
  eq("the date comes from the cell, not from the model's retyping of it", said.date, "2026-09-03");
  const heb = csvReadVerify([["3 בספט׳ 2026", "x", "5"]], { r: 0, t: "buy", d: 0, dt: "2026-09-03", s: [1], a: 2 }, layoutOf({}), names, {});
  eq("a date the parser cannot read falls back to the model's reading of it", heb && heb.date, "2026-09-03");
  const two = csvReadVerify([["04/09/2026", "העברה בביט", "מאת יוסי לוי", "85.00"]], { r: 0, t: "p2p", d: 0, s: [1, 2], a: 3, io: "in" }, layoutOf({}), names, {});
  eq("a name spread over two cells is joined, as the file wrote it", two.label, "העברה בביט - מאת יוסי לוי");
}

// ------------------------------------------------------ the columns check --
group("THE COLUMNS KEEP HIM HONEST");
{
  const mk = (row, col, neg, io) => ({ row, amtCol: col, cellNeg: neg, io, amount: 10, skip: false });
  const signed = [mk(1, 2, true, "out"), mk(2, 2, true, "out"), mk(3, 2, true, "out"), mk(4, 2, true, "in"), mk(5, 2, false, "in")];
  eq("in a signed column, a minus read as money in is put right", csvReadEnforceColumns(signed), 1);
  eq("and it now goes out", signed[3].io, "out");
  const plain = [mk(1, 2, false, "out"), mk(2, 2, false, "out"), mk(3, 2, false, "out"), mk(4, 2, false, "in")];
  eq("an all-positive column is left alone - there only the words and the balance can tell", csvReadEnforceColumns(plain), 0);
  const split = [mk(1, 3, false, "out"), mk(2, 3, false, "out"), mk(3, 3, false, "in"), mk(4, 3, false, "out"), mk(5, 4, false, "in")];
  eq("a line in the money-out column read as money in is put right", csvReadEnforceColumns(split), 1);
}

// ------------------------------------------------------ the balance check --
group("THE RUNNING BALANCE SETTLES DIRECTION BY ARITHMETIC");
{
  const rows = parseCSV(HARD.UNSIGNED_LEUMI.text);
  // Read every line with the RIGHT cells but a refund going the wrong way:
  // exactly the mistake an all-positive file invites.
  const readings = HARD.UNSIGNED_LEUMI.expect.map((e, k) => ({ row: k + 1, amtCol: 2, cellNeg: false, amount: e[1], io: e[2], skip: false }));
  readings[4].io = "out";
  const b = csvReadCheckBalance(rows, readings, 3);
  eq("a refund read as spending is flipped back by the balance", [readings[4].io, b.fixed], ["in", 1]);
  eq("every other line it can see is confirmed by it", b.confirmed, rows.length - 3);

  const hp = parseCSV(HARD.HAPOALIM.text);
  const hpRead = [];
  for (let r = 4; r < hp.length; r++) {
    const d = hp[r][4], c = hp[r][5];
    hpRead.push({ row: r, amtCol: d ? 4 : 5, cellNeg: false, amount: Number(d || c), io: d ? "out" : "in", skip: false });
  }
  hpRead[2].io = hpRead[2].io === "in" ? "out" : "in";
  const hb = csvReadCheckBalance(hp, hpRead, 6);
  eq("a newest-first file is recognised as one and its wrong line flipped", hb.fixed, 1);
  const noBal = csvReadCheckBalance(rows, readings, -1);
  eq("no balance column, no claims", noBal.pairs, 0);
}

// ------------------------------------------------------- the totals check --
group("THE FILE'S OWN TOTALS PROVE NOTHING WAS DROPPED");
{
  const rows = parseCSV(HARD.ISRACARD_SECTIONS.text);
  const readings = [];
  rows.forEach((r, i) => {
    const e = HARD.ISRACARD_SECTIONS.expect.find((x) => r.some((c) => Math.abs(Math.abs(app.parseImportAmount(c)) - x[1]) < 0.005) && r.some((c) => app.parseImportDate(c, true) === x[0]));
    if (e) readings.push({ row: i, amount: e[1], io: e[2], skip: false });
    else readings.push({ row: i, skip: true });
  });
  const t = csvReadCheckTotals(rows, readings, -1);
  eq("each section's total and the grand total match the lines read", [t.found, t.matched], [3, 3]);
  const dropped = readings.map((x) => (x.row === 7 ? { row: 7, skip: true } : x));
  const t2 = csvReadCheckTotals(rows, dropped, -1);
  ok("drop one purchase and the totals say so", t2.matched < t2.found, JSON.stringify(t2));
  // Isracard's own wording for the month's total - the line that used to be
  // imported as a second copy of the month - is a total here too.
  const isra = parseCSV(["תאריך רכישה,שם בית עסק,סכום עסקה,מטבע עסקה,סכום חיוב,מטבע חיוב", "01/09/2026,שופרסל דיל,1245.30,₪,1245.30,₪", "03/09/2026,ארומה,32.00,₪,32.00,₪", "סך חיוב בש\"ח:,,,,1277.30,₪"].join("\n"));
  const ti = csvReadCheckTotals(isra, [{ row: 0, skip: true }, { row: 1, amount: 1245.3, io: "out", skip: false }, { row: 2, amount: 32, io: "out", skip: false }, { row: 3, skip: true }], -1);
  eq("סך חיוב בש\"ח is checked as the statement's total", [ti.found, ti.matched], [1, 1]);
}

// --------------------------------------------------- a reading made a line --
group("WHO DECIDES THE CATEGORY");
{
  const base = { row: 1, kind: "buy", date: "2026-09-03", label: "רמי לוי שיווק", amount: 356.2, amtCol: 2, cellNeg: false, io: "out", cat: "Shopping", conf: "h" };
  const pinned = csvReadToTx(base, { cats, saved: { [app.shopKey("רמי לוי שיווק")]: { category: "Food", source: "user" } } }, 1);
  eq("the user's own answer for a shop outranks Alfred", pinned.tx.category, "Food");
  const alfred = csvReadToTx(base, { cats, saved: {} }, 1);
  eq("otherwise Alfred's category is used", alfred.tx.category, "Shopping");
  ok("and remembered as his, so a correction counts against him", alfred.shop && alfred.shop.entry.source === "alfred");
  const card = csvReadToTx(Object.assign({}, base, { kind: "card", label: "ישראכרט" }), { cats, saved: {} }, 1);
  eq("a card bill is a transfer, not spending", [card.tx.transfer, card.tx.category], [true, "Card bill"]);
  const flipped = csvReadToTx(Object.assign({}, base, { kind: "income", cat: "Salary", fixedBy: "balance" }), { cats, saved: {} }, 1);
  ok("a 'salary' the balance proved went OUT is not filed as wages", flipped.tx.category !== "Salary" && flipped.tx.flowGuess, JSON.stringify(flipped.tx));
  const low = csvReadToTx(Object.assign({}, base, { conf: "l" }), { cats, saved: {} }, 1);
  ok("a category Alfred called low is marked for a look", low.tx.flowGuess === true || (low.shop && low.shop.entry.confidence === "low"));
}

// --------------------------------------------- end to end, with a bad model --
group("END TO END - A MODEL THAT GETS THINGS WRONG");

// A stub that answers the layout call and the line calls from a table of
// correct readings, then lets each test damage the answers.
function stubModel(truth, opts) {
  opts = opts || {};
  let layoutCalls = 0, rowCalls = 0;
  setClaude(function(messages, system, maxTokens, cb) {
    const msg = messages[0].content;
    setTimeout(() => {
      if (system === app.CSV_LAYOUT_SYSTEM) {
        layoutCalls++;
        if (opts.layoutFails && layoutCalls <= opts.layoutFails) { cb(Object.assign(new Error("down"), { kind: "network" }), null); return; }
        cb(null, JSON.stringify(truth.layout));
        return;
      }
      rowCalls++;
      if (opts.rowsFail) { cb(Object.assign(new Error("down"), { kind: "network" }), null); return; }
      const block = msg.split("answer for every one):\n")[1] || "";
      const rs = [...block.matchAll(/^r(\d+) \|/gm)].map((m) => Number(m[1]));
      let out = rs.map((r) => (truth.rows[r] ? Object.assign({ r }, truth.rows[r]) : { r, t: "skip" }));
      if (opts.damage) out = opts.damage(out, rowCalls);
      let text = JSON.stringify(out);
      if (opts.cutOff && rowCalls === 1) text = text.slice(0, Math.floor(text.length * 0.6));
      cb(null, text);
    }, 1);
  });
  return { calls: () => ({ layoutCalls, rowCalls }) };
}
function run(text) {
  const rows = parseCSV(text);
  return new Promise((res) => readStatementWithAI(rows, { cats, saved: {}, tx: [] }, null, (err, out) => res({ err, out, rows })));
}
// The correct reading of UNSIGNED_LEUMI.
const leumiTruth = {
  layout: { statement: "bank_account", header_row: 0, first_row: 1, date_column: 0, shop_columns: [1], amount_column: 2, balance_column: 3, money_out: "unsigned", date_order: "dmy", notes: "" },
  rows: Object.fromEntries(HARD.UNSIGNED_LEUMI.expect.map((e, k) => [k + 1, {
    t: e[3] === "transfer" ? (k === 1 ? "card" : "own") : e[3] === "income" ? (k === 5 ? "p2p" : "income") : e[2] === "in" ? "refund" : "buy",
    d: 0, dt: e[0], s: [1], a: 2, io: e[2], c: e[4] ? e[4][0] : "Other", q: "h"
  }]))
};
const wantLeumi = HARD.UNSIGNED_LEUMI.expect.map((e) => e[0] + " " + e[1].toFixed(2) + " " + e[2]);
const gotOf = (out) => out.txs.map((t) => t.date + " " + t.amount.toFixed(2) + " " + (t.type === "income" ? "in" : "out"));

{
  stubModel(leumiTruth);
  const { err, out } = await run(HARD.UNSIGNED_LEUMI.text);
  eq("a correct reading comes through line for line", err ? String(err.message) : gotOf(out), wantLeumi);
  eq("its transfers are transfers", out.txs.filter((t) => t.transfer).map((t) => t.category), ["Card bill", "Account transfer"]);
  eq("and the balance confirms every line", [out.stats.balance.confirmed, out.stats.balance.fixed], [9, 0]);
}
{
  stubModel(leumiTruth, { damage: (o) => o.map((x) => (x.r === 3 || x.r === 5 ? Object.assign({}, x, { io: x.io === "in" ? "out" : "in" }) : x)) });
  const { out } = await run(HARD.UNSIGNED_LEUMI.text);
  eq("two lines going the wrong way are both put right by the balance", gotOf(out), wantLeumi);
  eq("and counted", out.stats.balance.fixed, 2);
}
{
  stubModel(leumiTruth, { damage: (o) => o.map((x) => (x.r === 4 ? Object.assign({}, x, { a: 3 }) : x)) });
  const { out } = await run(HARD.UNSIGNED_LEUMI.text);
  eq("a line whose amount was named as the balance is still read right - by the layout", gotOf(out), wantLeumi);
  eq("and it is the one line read that way", out.stats.byLayout, 1);
  ok("and marked for a look", out.txs.find((t) => t.amount === 698).flowGuess === true);
}
{
  stubModel(leumiTruth, { layoutFails: 2 });
  const { err, out } = await run(HARD.UNSIGNED_LEUMI.text);
  eq("a layout call that fails twice does not lose the file", err ? String(err.message) : gotOf(out), wantLeumi);
}
{
  const s = stubModel(leumiTruth, { rowsFail: true });
  const { err } = await run(HARD.UNSIGNED_LEUMI.text);
  ok("when no line can be read, the reader says so - and the screen reads the file by rules", !!err);
  ok("after one retry per block, not a loop", s.calls().rowCalls <= 2, JSON.stringify(s.calls()));
}
{
  // Many lines, so the answer runs over more than one block, and the first
  // answer is cut off part way.
  const lines = ["Date,Description,Amount"];
  const truth = { layout: { header_row: 0, first_row: 1, date_column: 0, shop_columns: [1], amount_column: 2, money_out: "negative", date_order: "ymd" }, rows: {} };
  for (let i = 1; i <= 60; i++) {
    const d = "2026-08-" + String((i % 28) + 1).padStart(2, "0");
    lines.push(d + ",SHOP " + i + ",-" + i + ".00");
    truth.rows[i] = { t: "buy", d: 0, s: [1], a: 2, io: "out", c: "Shopping", q: "h" };
  }
  const s = stubModel(truth, { cutOff: true });
  const { out } = await run(lines.join("\n"));
  eq("an answer cut off mid-way loses no line: the rest are asked again", out.txs.length, 60);
  eq("and every one of them was read by Alfred, none by the layout", out.stats.byLayout, 0);
  ok("in blocks of " + CSV_READ_ROWS_PER_CALL + ", plus the one retry", s.calls().rowCalls === Math.ceil(60 / CSV_READ_ROWS_PER_CALL) + 1, JSON.stringify(s.calls()));
}
{
  // The layout puts the data three lines too low.
  const late = JSON.parse(JSON.stringify(leumiTruth));
  late.layout.header_row = 3; late.layout.first_row = 4;
  stubModel(late);
  const { out } = await run(HARD.UNSIGNED_LEUMI.text);
  eq("a layout that starts the data too late costs no line", gotOf(out), wantLeumi);
}
{
  // A file past the cap: the rest is read with the proven layout, unflagged.
  const lines = ["Date,Description,Amount"];
  const truth = { layout: { header_row: 0, first_row: 1, date_column: 0, shop_columns: [1], amount_column: 2, money_out: "negative", date_order: "ymd" }, rows: {} };
  const N = app.CSV_READ_MAX_ROWS + 30;
  for (let i = 1; i <= N; i++) {
    lines.push("2026-07-" + String((i % 28) + 1).padStart(2, "0") + ",SHOP " + i + "," + (i % 10 === 0 ? "" : "-") + i + ".00");
    truth.rows[i] = { t: i % 10 === 0 ? "income" : "buy", d: 0, s: [1], a: 2, io: i % 10 === 0 ? "in" : "out", c: i % 10 === 0 ? "Salary" : "Shopping", q: "h" };
  }
  stubModel(truth);
  const { out } = await run(lines.join("\n"));
  eq("a file past the cap comes in whole", out.txs.length, N);
  eq("the lines past it are counted as such, not as failures", [out.stats.capped, out.stats.byLayout], [30, 0]);
  const tail = out.txs.filter((t) => Number(t.label.split(" ")[1]) > app.CSV_READ_MAX_ROWS);
  ok("and read the right way round", tail.every((t) => (Number(t.label.split(" ")[1]) % 10 === 0) === (t.type === "income")));
  // Money in from a payer never seen before is marked by the rules on
  // purpose; a purchase read by the proven layout is not.
  ok("without flagging the purchases among them as unsure", tail.filter((t) => t.type === "expense").every((t) => !t.flowGuess));
}
{
  // Alfred calls a real-looking purchase "not a transaction".
  stubModel(leumiTruth, { damage: (o) => o.map((x) => (x.r === 9 ? { r: 9, t: "skip" } : x)) });
  const { out } = await run(HARD.UNSIGNED_LEUMI.text);
  eq("a real-looking line he left out is not silently lost", out.leftOut.map((t) => t.label), ["סלקום תקשורת"]);
  ok("it is not counted in either", !out.txs.some((t) => t.label === "סלקום תקשורת"));
}
{
  stubModel(leumiTruth);
  const rows = parseCSV(HARD.ISRACARD_SECTIONS.text);
  ok("a total line never looks like a purchase to the left-out check", !csvReadLooksReal(rows.find((r) => r.join(" ").includes("סה\"כ לחיוב"))));
}

// ------------------------------------------- duplicates: only against Richy --
group("DUPLICATES ARE LOOKED FOR IN RICHY, NEVER INSIDE THE FILE");
{
  const { classifyImportRows } = app;
  const bus = (id) => ({ id, type: "expense", date: "2026-09-03", amount: 5.9, label: "רב קו", catId: "c3" });
  const twoFares = classifyImportRows([bus(1), bus(2)], []);
  eq("two identical lines in one file both come in", twoFares.fresh.length, 2);
  eq("and nobody is asked about them", twoFares.maybes.length + twoFares.dupes.length, 0);
  const alike = classifyImportRows([
    { id: 1, type: "expense", date: "2026-09-03", amount: 32, label: "AROMA TLV", catId: "c1" },
    { id: 2, type: "expense", date: "2026-09-03", amount: 32, label: "ארומה תל אביב", catId: "c1" }
  ], []);
  eq("two look-alike lines in one file are not questioned against each other", [alike.fresh.length, alike.maybes.length], [2, 0]);
  const have = [{ id: 9, type: "expense", date: "2026-09-03", amount: 5.9, label: "רב קו", catId: "c3" }];
  const again = classifyImportRows([bus(1)], have);
  eq("a line that is already in Richy is still caught", again.dupes.length, 1);
  const hand = [{ id: 9, type: "expense", date: "2026-09-03", amount: 32, label: "Coffee", catId: "c1" }];
  const maybe = classifyImportRows([{ id: 1, type: "expense", date: "2026-09-03", amount: 32, label: "ARОMA TLV", catId: "c1" }], hand);
  eq("and one that only looks like something typed by hand is asked about", maybe.maybes.length, 1);
}

console.log("\n" + "-".repeat(64));
if (fail) {
  console.log(fail + " FAILED, " + pass + " passed\n");
  failures.forEach((f) => console.log("  FAIL  " + f));
  process.exit(1);
}
console.log("all " + pass + " checks passed");
