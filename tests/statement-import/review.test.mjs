// What the person can do on the review list beyond picking categories: turn a
// line into money in or money out, turn a whole file the right way round (and
// have that remembered for the bank), and bring in several files at once -
// read side by side, one bad file never sinking the rest, and a line that two
// files both hold counted once.
//
//   node tests/statement-import/review.test.mjs
import { app } from "./extract.mjs";
import { ALL } from "./fixtures.mjs";
import { ANSWERS, HARD_ANSWERS, answer } from "./answers.mjs";
import { HARD } from "./hard-fixtures.mjs";
import { section, check, eq, rejects, done } from "./harness.mjs";

const {
  impRun, impTwins, impSetAside, impSetDir, impFlipLayout, impParseDelimited, impRecipeFrom, impReadWithRecipe,
  impLayoutFrom, impRecipeFromLayout, impTotals, DEFAULT_CATEGORIES
} = app;
// The dashboard's balance with nothing pinning it: every settled line in, minus
// every line out, transfers included. (A bank file that prints its balance
// pins it - balance.test.mjs.)
const balance = (txs) => app.mainSpendBalance(txs);
const CATS = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
const TODAY = "2026-09-24";
const catId = (name) => CATS.find((c) => c.name === name).id;

// Alfred, stood in for: a Leumi file reads the way Leumi reads, a plain
// "Date,Description,Amount" file the simple way, anything else is not a
// statement. Sorting files the obvious shops.
const SIMPLE = answer([{ headerRow: 0, firstRow: 1, dateOrder: "YMD", amount: { column: 2 } }], [], { currency: "USD" });
function stub(opts) {
  opts = opts || {};
  const calls = { importRead: 0, importSort: 0, inFlight: 0, maxInFlight: 0 };
  const server = (kind, body) => {
    calls[kind] = (calls[kind] || 0) + 1;
    if (opts.offline) return Promise.reject(Object.assign(new Error("offline"), { impCode: "offline" }));
    if (kind === "importRead") {
      let a;
      if (body.sample.indexOf("משכורת חודש אוגוסט") >= 0) a = ANSWERS.LEUMI;
      else if (body.sample.indexOf("Merchant") >= 0) a = Object.assign({}, SIMPLE, { statement: "card" });
      else if (body.sample.indexOf("Description") >= 0) a = SIMPLE;
      else a = { statement: "other", currency: "", tables: [], skipRows: [], examples: [], problem: "This is a letter, not a statement." };
      a = JSON.parse(JSON.stringify(a));
      if (!opts.slow) return Promise.resolve(a);
      calls.inFlight++;
      calls.maxInFlight = Math.max(calls.maxInFlight, calls.inFlight);
      return new Promise((res) => setTimeout(() => { calls.inFlight--; res(a); }, 25));
    }
    if (kind === "importSort") {
      return Promise.resolve({ lines: body.lines.map((l) => {
        if (/Isracard|ישראכרט|PAYMENT RECEIVED/i.test(l.text)) return { id: l.id, kind: "card_bill", category: "", sure: true };
        if (/Salary|משכורת/i.test(l.text)) return { id: l.id, kind: "income", category: "Salary", sure: true };
        if (/Refund|זיכוי/i.test(l.text)) return { id: l.id, kind: "refund", category: "Shopping", sure: true };
        if (/Coffee|Grocery|שופרסל|רמי לוי/i.test(l.text)) return { id: l.id, kind: "purchase", category: "Food", sure: true };
        return { id: l.id, kind: l.dir === "in" ? "income" : "purchase", category: "Other", sure: true };
      }) });
    }
    return Promise.reject(new Error("unknown kind " + kind));
  };
  return { server, calls };
}
const ctx = (server, extra) => Object.assign({ tx: [], categories: CATS, shopCats: {}, layouts: {}, today: TODAY, server }, extra || {});
const csv = (rows) => ["Date,Description,Amount"].concat(rows).join("\n");
const leumi = () => new File([ALL.LEUMI.bytes()], "leumi.csv");
const signed = (t) => (t.type === "income" ? t.amount : -t.amount);

section("money in or money out, one line at a time");
{
  const item = (tx, extra) => Object.assign({ id: 1, kind: "purchase", unsure: true, tx: Object.assign({ id: 1, amount: 50, label: "x", date: "2026-09-01" }, tx) }, extra || {});
  let n = item({ type: "expense", category: "Shopping", catId: catId("Shopping") });
  eq("money out turned into money in", impSetDir(n, "in", CATS), true);
  eq("is money back from that shop: same category, a refund", [n.tx.type, n.tx.category, n.kind], ["income", "Shopping", "refund"]);
  check("the person has looked at it now", n.unsure === false && n.flipped === true);
  eq("turning it back undoes the mark", [impSetDir(n, "out", CATS), n.tx.type, n.flipped], [true, "expense", false]);

  n = item({ type: "income", category: "Salary", catId: catId("Salary") }, { kind: "income" });
  impSetDir(n, "out", CATS);
  eq("a salary turned into money out is not left filed as a salary", [n.tx.type, n.tx.category, n.tx.catId, n.kind], ["expense", "Other", catId("Other"), "purchase"]);

  n = item({ type: "expense", category: "Other", catId: catId("Other") });
  impSetDir(n, "in", CATS);
  eq("money in with no shop category is income", [n.tx.type, n.kind], ["income", "income"]);

  n = item({ type: "expense", transfer: true, catId: "savings-transfer", category: "Account transfer" }, { kind: "own_transfer" });
  impSetDir(n, "in", CATS);
  eq("a move between the person's own accounts stays one", [n.tx.type, n.tx.transfer, n.tx.category, n.kind], ["income", true, "Account transfer", "own_transfer"]);

  n = item({ type: "expense", category: "Food", catId: catId("Food") });
  eq("the same direction again changes nothing", [impSetDir(n, "out", CATS), n.tx.type, !!n.flipped], [false, "expense", false]);
}

section("a whole file turned the right way round, and remembered");
{
  const flipAll = (layout) => impFlipLayout(layout).tables.map((t) => [t.amount.mode, t.amount.negativeIs, t.amount.outColumn, t.amount.inColumn, t.amount.outMarks.join(), t.amount.inMarks.join(), !!t.balanceFlip]);
  const base = { mode: "signed", column: 2, fallbackColumn: -1, negativeIs: "out", outColumn: -1, inColumn: -1, markColumn: -1, outMarks: [], inMarks: [] };
  eq("signed: the sign means the other thing", flipAll({ tables: [{ amount: base, balanceColumn: -1 }] }), [["signed", "in", -1, -1, "", "", false]]);
  eq("split: the two columns swap", flipAll({ tables: [{ amount: Object.assign({}, base, { mode: "split", outColumn: 3, inColumn: 4 }), balanceColumn: -1 }] }), [["split", "out", 4, 3, "", "", false]]);
  eq("marked: the two word lists swap", flipAll({ tables: [{ amount: Object.assign({}, base, { mode: "marked", outMarks: ["dr"], inMarks: ["cr"] }), balanceColumn: -1 }] }), [["marked", "out", -1, -1, "cr", "dr", false]]);
  eq("a running balance is read the other way too", flipAll({ tables: [{ amount: base, balanceColumn: 5 }] }), [["signed", "in", -1, -1, "", "", true]]);
  const twice = impFlipLayout(impFlipLayout({ tables: [{ amount: base, balanceColumn: 5 }] })).tables[0];
  eq("flipping twice is the original", [twice.amount.negativeIs, !!twice.balanceFlip], ["out", false]);
  const orig = { tables: [{ amount: base, balanceColumn: 5 }] };
  impFlipLayout(orig);
  eq("the saved layout it was given is left alone", orig.tables[0].amount.negativeIs, "out");

  // Read a real file, save its layout the way the import does, flip it, and
  // read the file again from the flipped layout: every line turns around -
  // including the lines a running balance settles.
  for (const name of ["DISCOUNT_TRAILING", "HAPOALIM", "US_CHECKING"]) {
    const sheets = [{ name: "Sheet 1", rows: impParseDelimited(HARD[name].text) }];
    const first = impReadWithRecipe(sheets, impRecipeFrom(JSON.parse(JSON.stringify(HARD_ANSWERS[name])), sheets, false), TODAY);
    check(name + ": read right the first time", first.ok, first.feedback);
    if (!first.ok) continue;
    const layout = impLayoutFrom(first.recipe, sheets);
    const again = impReadWithRecipe(sheets, impRecipeFromLayout(impFlipLayout(layout), sheets), TODAY);
    check(name + ": the flipped layout still reads", again.ok, again.feedback);
    if (!again.ok) continue;
    const before = {};
    first.lines.forEach((l) => { before[l.key] = l.dir; });
    eq(name + ": same lines", again.lines.length, first.lines.length);
    const turned = again.lines.filter((l) => before[l.key] && before[l.key] !== l.dir).length;
    eq(name + ": every line turned around", turned, first.lines.length);
    const back = impReadWithRecipe(sheets, impRecipeFromLayout(impFlipLayout(impLayoutFrom(again.recipe, sheets)), sheets), TODAY);
    eq(name + ": and flipped back, reads as it first did", back.lines.every((l) => before[l.key] === l.dir), true);
  }
}

section("several files at once");
{
  const { server, calls } = stub({ slow: true });
  const files = [
    { text: csv(["2026-06-01,Grocery Store,-54.20", "2026-06-02,Salary,3000.00"]), name: "june.csv" },
    { text: csv(["2026-07-01,Grocery Store,-61.10", "2026-07-02,Salary,3000.00"]), name: "july.csv" },
    { text: csv(["2026-08-01,Grocery Store,-48.90", "2026-08-02,Salary,3000.00"]), name: "august.csv" }
  ];
  const phases = [];
  const res = await impRun(files, ctx(server), (p) => phases.push(p));
  eq("the files are read side by side, not one after another", calls.maxInFlight, 3);
  eq("one sort for all of them", calls.importSort, 1);
  eq("every line of every file", res.items.length, 6);
  eq("each file is named, with its line count", res.files.map((f) => [f.name, f.count]), [["june.csv", 2], ["july.csv", 2], ["august.csv", 2]]);
  const done = phases.filter((p) => p.phase === "read" && p.filesTotal === 3).map((p) => p.filesDone);
  eq("progress counts the files as they finish", done, [0, 1, 2, 3]);
  check("each line knows its file", res.items.every((it) => it.file >= 0 && it.file < 3 && res.files[it.file].name === ["june.csv", "july.csv", "august.csv"][Number(it.tx.date.slice(5, 7)) - 6]));
}
{
  const { server } = stub();
  const res = await impRun([{ file: leumi() }, { file: new File([], "empty.csv") }, { text: "Dear Dana,\nSee you on Sunday.", name: "letter.txt" }], ctx(server));
  eq("a file that can't be read does not sink the rest", res.items.length, 6);
  eq("each one is named, and why", res.notes.filter((n) => n.key === "file-failed").map((n) => [n.name, n.code]), [["empty.csv", "empty"], ["letter.txt", "not-statement"]]);
  eq("only the file that was read is listed", res.files.map((f) => f.name), ["leumi.csv"]);
}
{
  const { server } = stub({ offline: true });
  const headerless = new File([ALL.HEADERLESS.bytes()], "h.csv");
  await rejects("when nothing can be read, the error a retry can fix wins", impRun([{ file: new File([], "empty.csv") }, { file: headerless }], ctx(server)), "offline");
  const { server: s2 } = stub();
  await rejects("and a single bad file fails the way it always did", impRun([{ text: "Dear Dana,\nSee you on Sunday.", name: "letter.txt" }], ctx(s2)), "not-statement");
}
section("a line two files both hold");
{
  const { server } = stub();
  const res = await impRun([
    { text: csv(["2026-06-01,Grocery Store,-54.20", "2026-06-02,Salary,3000.00", "2026-06-03,Coffee,-4.50", "2026-06-05,Netflix,-15.99"]), name: "a.csv" },
    { text: csv(["2026-06-03,Coffee,-4.50", "2026-06-05,Netflix,-15.99", "2026-06-07,Gas Station,-40.00"]), name: "b.csv" }
  ], ctx(server));
  const tw = impTwins(res.items, [0, 1]);
  const twinLabels = res.items.filter((it) => tw[it.id] != null).map((it) => it.tx.label).sort();
  eq("the overlap of two months is counted once", twinLabels, ["Coffee", "Netflix"]);
  check("and it is the later file's copy that is set aside", res.items.filter((it) => tw[it.id] != null).every((it) => it.file === 1 && tw[it.id] === 0));
  const kept = res.items.filter((it) => tw[it.id] == null).map((it) => it.tx);
  eq("what is left adds up once", [kept.length, impTotals(kept).out], [5, 114.69]);
}
{
  const { server } = stub();
  const res = await impRun([{ file: leumi() }, { file: leumi() }], ctx(server));
  const tw = impTwins(res.items, [0, 1]);
  eq("the same file chosen twice: every line of the second copy", Object.keys(tw).length, 6);
}
{
  // Two real coffees on one day inside one file are two coffees. Against a
  // second file holding one of them, one is set aside and one stays.
  const { server } = stub();
  const res = await impRun([
    { text: csv(["2026-06-03,Coffee,-4.50", "2026-06-03,Coffee,-4.50"]), name: "a.csv" },
    { text: csv(["2026-06-03,Coffee,-4.50", "2026-06-04,Coffee,-4.50"]), name: "b.csv" }
  ], ctx(server));
  const tw = impTwins(res.items, [0, 1]);
  eq("inside one file, repeats are real", res.items.filter((it) => it.file === 0 && tw[it.id] != null).length, 0);
  eq("across files, each line stands in for one twin", res.items.filter((it) => it.file === 1 && tw[it.id] != null).length, 1);
  const alone = impTwins(res.items.filter((it) => it.file === 0), [0]);
  eq("a single file never has twins", Object.keys(alone).length, 0);
}
{
  // Twins follow what the file said, not what the person has since turned:
  // flipping one copy does not bring the other back in.
  const { server } = stub();
  const res = await impRun([
    { text: csv(["2026-06-05,Refund Zara,-49.90"]), name: "a.csv" },
    { text: csv(["2026-06-05,Refund Zara,-49.90"]), name: "b.csv" }
  ], ctx(server));
  const first = res.items.find((it) => it.file === 0);
  impSetDir(first, first.tx.type === "income" ? "out" : "in", CATS);
  eq("still counted once after the person turns one around", Object.keys(impTwins(res.items, [0, 1])).length, 1);
  eq("the order of the files decides which copy is the twin", Object.values(impTwins(res.items, [1, 0])), [1]);
}

section("a bank file and a card file: the card bill is not counted twice");
{
  // Alon's report, 25 Sep 2026: a bank CSV and a card CSV brought in
  // together, and the dashboard read -3,000 where the truth was +3,000. The
  // bank's card bill came in as a transfer - not spending, but the balance
  // takes every line - and the card's purchases came in too: the same 6,000
  // off the balance twice.
  const { server } = stub();
  const res = await impRun([
    { text: csv(["2026-06-01,Salary,12000.00", "2026-06-03,Rent,-3000.00", "2026-06-10,Isracard bill,-6000.00"]), name: "bank.csv" },
    { text: ["Date,Merchant,Amount", "2026-05-12,Supermarket,-2500.00", "2026-05-20,Fuel,-1500.00", "2026-05-28,Electronics,-2000.00"].join("\n"), name: "card.csv" }
  ], ctx(server));
  eq("the files say what they are", res.files.map((f) => f.statement), ["bank", "card"]);
  const aside = impSetAside(res.items, [0, 1]);
  const bill = res.items.find((it) => /Isracard/.test(it.tx.label));
  eq("the bill is read as a card bill", bill && bill.kind, "card_bill");
  eq("and set aside", bill && aside[bill.id] && aside[bill.id].why, "card");
  const added = res.items.filter((it) => !aside[it.id]).map((it) => it.tx);
  eq("the balance comes out right", balance(added), 3000);
  eq("which is what went wrong before: everything added", balance(res.items.map((it) => it.tx)), -3000);
  eq("spending is the card's purchases and the rent, once", impTotals(added).out, 9000);
}
{
  // Whichever file comes first: the bank file alone never puts the bill in,
  // so the card file brought in next week cannot double it.
  const { server } = stub();
  const res = await impRun([{ text: csv(["2026-06-01,Salary,12000.00", "2026-06-10,Isracard bill,-6000.00"]), name: "bank.csv" }], ctx(server));
  const aside = impSetAside(res.items, [0]);
  eq("a bank file on its own leaves the bill out too", Object.values(aside).map((a) => a.why), ["card"]);
}
{
  // A card file that lists the bank's payment as a line of its own.
  const { server } = stub();
  const res = await impRun([{ text: ["Date,Merchant,Amount", "2026-06-02,PAYMENT RECEIVED THANK YOU,6000.00", "2026-06-05,Supermarket,-80.00"].join("\n"), name: "card.csv" }], ctx(server));
  const aside = impSetAside(res.items, [0]);
  const pay = res.items.find((it) => /PAYMENT/.test(it.tx.label));
  eq("the card's own payment line is set aside the same way", pay && aside[pay.id] && aside[pay.id].why, "card");
  eq("the purchase is not", res.items.filter((it) => !aside[it.id]).map((it) => it.tx.label), ["Supermarket"]);
}
{
  // Already in Richy wins over the other reasons, so the row says the most
  // useful thing.
  const { server } = stub();
  const existing = [{ id: 7, type: "expense", amount: 6000, label: "Isracard bill", category: "Card bill", catId: "savings-transfer", transfer: true, date: "2026-06-10" }];
  const res = await impRun([{ text: csv(["2026-06-10,Isracard bill,-6000.00"]), name: "bank.csv" }], ctx(server, { tx: existing }));
  const aside = impSetAside(res.items, [0]);
  eq("a bill Richy already holds says so", Object.values(aside).map((a) => a.why), ["richy"]);
}

section("a line's direction and its money");
{
  const { server } = stub();
  const res = await impRun([{ text: csv(["2026-06-01,Grocery Store,-54.20", "2026-06-02,Refund Zara,-49.90"]), name: "a.csv" }], ctx(server));
  const refund = res.items.find((it) => /Zara/.test(it.tx.label));
  eq("read as money out", [refund.tx.type, refund.dirRead], ["expense", "out"]);
  const before = impTotals(res.items.map((it) => it.tx));
  impSetDir(refund, "in", CATS);
  const after = impTotals(res.items.map((it) => it.tx));
  eq("turned into money in, the totals follow", [before.out, before.inn, after.out, after.inn], [104.1, 0, 54.2, 49.9]);
  eq("and the line keeps what it was read as", refund.dirRead, "out");
  eq("its amount never changes sign in the ledger", [refund.tx.amount, signed(refund.tx)], [49.9, 49.9]);
}

done("review");
