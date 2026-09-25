// The whole import, file to review list, with the server replaced by a
// stand-in that answers the way Alfred should (answers.mjs) - or badly, or
// not at all. What is checked is what the user would see: which lines, which
// categories, what was set aside as already in Richy, and what is remembered.
//
//   node tests/statement-import/pipeline.test.mjs
import { app } from "./extract.mjs";
import { ALL } from "./fixtures.mjs";
import { ANSWERS } from "./answers.mjs";
import { section, check, eq, rejects, done } from "./harness.mjs";

const { impRun, impReadDoc, impTotals, impMergeShots, DEFAULT_CATEGORIES } = app;
const CATS = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
const TODAY = "2026-09-24";

// A fixture is recognised from the sample text by a line only it has.
const MARKERS = {
  LEUMI: "משכורת חודש אוגוסט", ISRACARD: "לחיוב בתאריך", CAL_REFUND: "זיכוי זארה", TRAILING_MINUS: "4210.35-",
  CARD_SECTIONS: "BOOKING.COM", ENGLISH: "Grocery Store", MARKED: "TESCO STORES"
};
// How Alfred sorts the shops in these files.
const SORTS = [
  [/משכורת|PAYROLL|Salary/i, "income", "Salary"], [/שופרסל|רמי לוי|Grocery|TESCO/i, "purchase", "Food"],
  [/ישראכרט/, "card_bill", ""], [/פיקדון/, "own_transfer", ""], [/ביט|פייבוקס/, "person", "Other"],
  [/ועד בית|חשמל/, "purchase", "Housing"], [/פנגו|פז|TFL/i, "purchase", "Transport"], [/זיכוי|REFUND/i, "refund", "Shopping"],
  [/נטפליקס|Netflix|BOOKING/i, "purchase", "Entertainment"], [/קפה|ארומה/, "purchase", "Food"], [/AMAZON|איקאה/i, "purchase", "Shopping"],
  [/סינמה/, "purchase", "Entertainment"], [/סופר פארם/, "purchase", "Health"], [/מקס איט/, "purchase", "Shopping"], [/סה"כ/, "not_transaction", ""]
];
function stubServer(opts) {
  opts = opts || {};
  const calls = { importRead: 0, importSort: 0, importDoc: 0, feedback: [], sortLines: 0 };
  const server = (kind, body) => {
    calls[kind]++;
    if (opts.offline) return Promise.reject(Object.assign(new Error("offline"), { impCode: "offline" }));
    if (kind === "importRead") {
      calls.feedback.push(body.feedback);
      if (opts.read) return Promise.resolve(opts.read(body, calls));
      const name = Object.keys(MARKERS).find((n) => body.sample.indexOf(MARKERS[n]) >= 0);
      return Promise.resolve(JSON.parse(JSON.stringify(ANSWERS[name])));
    }
    if (kind === "importSort") {
      calls.sortLines += body.lines.length;
      if (opts.sortFails) return Promise.reject(Object.assign(new Error("x"), { impCode: "server" }));
      return Promise.resolve({ lines: body.lines.map((l) => {
        const hit = SORTS.find(([re]) => re.test(l.text));
        return { id: l.id, kind: hit ? hit[1] : (l.dir === "in" ? "income" : "purchase"), category: hit ? hit[2] : "Other", sure: !!hit };
      }) });
    }
    if (kind === "importDoc") return Promise.resolve(opts.doc(body, calls));
    return Promise.reject(new Error("unknown kind " + kind));
  };
  return { server, calls };
}
function ctxWith(server, extra) {
  return Object.assign({ tx: [], categories: CATS, shopCats: {}, layouts: {}, today: TODAY, server: server }, extra || {});
}
const fileOf = (name) => new File([ALL[name].bytes()], name.toLowerCase() + ".csv");
const byLabel = (res, word) => res.items.filter((it) => it.tx.label.indexOf(word) >= 0);

section("a bank statement, start to finish");
let leumiLearned;
{
  const { server, calls } = stubServer();
  const phases = [];
  const res = await impRun([{ file: fileOf("LEUMI") }], ctxWith(server), (p) => phases.push(p.phase));
  eq("every phase is reported, in order", phases.filter((p, i) => phases.indexOf(p) === i), ["open", "read", "sort", "check"]);
  eq("one reading, one sort", [calls.importRead, calls.importSort], [1, 1]);
  eq("six lines", res.items.length, 6);
  const salary = byLabel(res, "משכורת")[0];
  eq("salary is income, filed as Salary", salary && [salary.tx.type, salary.tx.category, salary.tx.amount], ["income", "Salary", 18500]);
  const shop = byLabel(res, "שופרסל")[0];
  eq("a supermarket is Food, money out", shop && [shop.tx.type, shop.tx.category, shop.tx.amount, shop.tx.date], ["expense", "Food", 342.9, "2026-09-02"]);
  const bit = byLabel(res, "ביט")[0];
  check("a Bit transfer is marked for a look", bit && bit.unsure && bit.kind === "person", bit);
  check("newest first", res.items[0].tx.date >= res.items[res.items.length - 1].tx.date);
  eq("source", res.source, "alfred");
  const fp = Object.keys(res.learned.layouts);
  eq("the reading is handed back to be saved", fp.length, 1);
  check("Alfred's sure answers are handed back per shop", res.learned.shops[byLabel(res, "שופרסל")[0].group].category === "Food", res.learned.shops);
  check("a person is never remembered", !res.learned.shops[bit.group]);
  leumiLearned = res.learned;
  const t = impTotals(res.items.map((i) => i.tx));
  eq("totals", [t.count, t.out, t.inn, t.from, t.to], [6, 1222.85, 18500, "2026-09-01", "2026-09-14"]);
}

section("the same bank again");
{
  const { server, calls } = stubServer();
  const shopCats = {};
  for (const k in leumiLearned.shops) shopCats[k] = leumiLearned.shops[k];
  const res = await impRun([{ file: fileOf("LEUMI") }], ctxWith(server, { layouts: leumiLearned.layouts, shopCats }));
  eq("no reading call - the saved layout is used", calls.importRead, 0);
  eq("source", res.source, "cached");
  check("only the shops not settled before are asked about", calls.sortLines < 6, calls.sortLines);
  eq("same lines", res.items.length, 6);
}
{
  const { server, calls } = stubServer();
  await impRun([{ file: fileOf("LEUMI") }], ctxWith(server, { layouts: leumiLearned.layouts, reread: true, feedback: "The person said this looked wrong." }));
  eq("'read it again' skips the saved layout", calls.importRead, 1);
  eq("and passes the complaint along", calls.feedback[0], "The person said this looked wrong.");
}

section("already in Richy");
{
  const existing = [
    { id: 1, type: "expense", amount: 342.9, label: "Groceries", category: "Food", catId: "c2", date: "2026-09-02" },
    { id: 2, type: "income", amount: 18500, label: "משכורת חודש אוגוסט", category: "Salary", catId: "c8", date: "2026-09-01" },
    { id: 3, type: "expense", amount: 28, label: "Coffee", category: "Food", catId: "c2", date: "2026-09-03" }
  ];
  const { server } = stubServer();
  const res = await impRun([{ file: fileOf("LEUMI") }], ctxWith(server, { tx: existing }));
  const dup = (w) => { const it = byLabel(res, w)[0]; return it && it.dup ? it.dup.id : null; };
  eq("a hand-typed purchase with a distinctive amount on the same day", dup("שופרסל"), 1);
  eq("a line re-imported from an overlapping file", dup("משכורת"), 2);
  eq("a round amount with a different name is NOT assumed to be the same", dup("פנגו"), null);
}
{
  // Two identical lines in the file, one already typed in: one is kept.
  const text = "Date,Description,Amount\n2026-09-10,BUS FARE,-2.90\n2026-09-10,BUS FARE,-2.90";
  const existing = [{ id: 9, type: "expense", amount: 2.9, label: "BUS FARE", category: "Transport", catId: "c3", date: "2026-09-10" }];
  const { server } = stubServer({ read: () => ANSWERS.ENGLISH });
  const res = await impRun([{ text, name: "p" }], ctxWith(server, { tx: existing }));
  eq("each existing line stands in for one line of the file", res.items.map((i) => !!i.dup).sort(), [false, true]);
}

section("transfers and totals");
{
  const { server } = stubServer();
  const res = await impRun([{ file: fileOf("TRAILING_MINUS") }], ctxWith(server));
  const card = byLabel(res, "ישראכרט")[0];
  eq("a card bill is a transfer, not spending", card && [card.tx.transfer, card.tx.catId, card.tx.category], [true, "savings-transfer", "Card bill"]);
  const dep = byLabel(res, "פיקדון")[0];
  eq("a deposit is a move between the user's own accounts", dep && [dep.tx.transfer, dep.tx.category], [true, "Account transfer"]);
  const t = impTotals(res.items.map((i) => i.tx));
  eq("transfers are left out of spending", [t.out, t.moves], [300, 2]);
}
{
  const { server } = stubServer();
  const res = await impRun([{ file: fileOf("CARD_SECTIONS") }], ctxWith(server));
  eq("both blocks of a card statement", res.items.length, 6);
  const amazon = byLabel(res, "AMAZON")[0];
  eq("a foreign purchase keeps its own currency beside the charge", amazon && [amazon.tx.amount, amazon.tx.origCur, amazon.tx.origAmount], [92.75, "$", 25]);
}

section("a reading that does not hold up");
{
  // The first answer reads the card statement backwards and brings no proof
  // lines, so nothing can be repaired locally; the second look is right.
  const { server, calls } = stubServer({
    read: (body, c) => {
      const a = JSON.parse(JSON.stringify(ANSWERS.CAL_REFUND));
      if (c.importRead === 1) { a.tables[0].date = 1; a.examples = []; }
      return a;
    }
  });
  const res = await impRun([{ file: fileOf("CAL_REFUND") }], ctxWith(server));
  eq("Alfred is asked a second time", calls.importRead, 2);
  check("with what went wrong", /column c1|No row/.test(calls.feedback[1] || ""), calls.feedback[1]);
  eq("and the second reading is used", res.items.length, 5);
}
{
  // Never right: the file falls back to the offline reader.
  const { server, calls } = stubServer({ read: () => { const a = JSON.parse(JSON.stringify(ANSWERS.CAL_REFUND)); a.tables[0].date = 1; a.examples = []; return a; } });
  const res = await impRun([{ file: fileOf("CAL_REFUND") }], ctxWith(server));
  eq("two looks, then no more calls", calls.importRead, 2);
  eq("read offline instead", res.source, "offline");
  check("and says so", res.notes.some((n) => n.key === "offline"));
  eq("still every line", res.items.length, 5);
}
{
  const { server } = stubServer({ read: () => ({ statement: "other", currency: "", tables: [], skipRows: [], examples: [], problem: "This is a loan schedule, not a list of transactions." }) });
  await rejects("a file that is not a statement is said to be one", impRun([{ file: fileOf("LEUMI") }], ctxWith(server)), "not-statement");
}

section("no connection");
{
  const { server } = stubServer({ offline: true });
  const res = await impRun([{ file: fileOf("LEUMI") }], ctxWith(server));
  eq("a file with clear titles is still read", res.items.length, 6);
  check("the sorting says it was Richy's own guess", res.notes.some((n) => n.key === "sort-offline"));
  check("every line is marked for a look", res.items.every((i) => i.unsure));
  const bills = byLabel(res, "חשמל")[0];
  eq("the offline guess still files a bill", bills && bills.tx.category, "Housing");
  eq("nothing is remembered from a guess", Object.keys(res.learned.shops).length, 0);
}
{
  const { server } = stubServer({ offline: true });
  await rejects("a file without titles is not guessed at", impRun([{ file: new File([ALL.HEADERLESS.bytes()], "h.csv") }], ctxWith(server)), "offline");
}

section("what the user already said");
{
  const shopCats = {};
  shopCats["שופרסל דיל תל אביב"] = { category: "Shopping", source: "user", label: "שופרסל דיל תל אביב" };
  const history = [
    { id: 1, type: "expense", amount: 30, label: "פנגו חניה", category: "Housing", catId: "c1", date: "2026-07-01" },
    { id: 2, type: "expense", amount: 31, label: "פנגו חניה", category: "Housing", catId: "c1", date: "2026-08-01" }
  ];
  const { server, calls } = stubServer();
  const res = await impRun([{ file: fileOf("LEUMI") }], ctxWith(server, { shopCats, tx: history }));
  eq("a category the user chose for a shop wins", byLabel(res, "שופרסל")[0].tx.category, "Shopping");
  eq("then the user's own history", byLabel(res, "פנגו")[0].tx.category, "Housing");
  eq("neither is sent to Alfred", calls.sortLines, 4);
}
{
  const { server } = stubServer();
  const res = await impRun([{ file: fileOf("CARD_SECTIONS") }], ctxWith(server));
  check("a line Alfred calls a total is dropped", !res.items.some((i) => /סה"כ/.test(i.tx.label)));
}

section("PDFs and screenshots");
{
  const { server, calls } = stubServer({ doc: () => ({ statement: "card", currency: "ILS", rows: [{ d: "2026-09-02", t: "שופרסל דיל", a: -212.4 }, { d: "2026-09-06", t: "זיכוי זארה", a: 149.9 }], problem: "", pages: 2, readPages: 2 }) });
  const res = await impReadDoc({ kind: "doc", mediaType: "application/pdf", data: "JVBERi0=", name: "s.pdf" }, ctxWith(server));
  eq("a PDF becomes lines", res.lines.map((l) => [l.date, l.dir, l.amount]), [["2026-09-02", "out", 212.4], ["2026-09-06", "in", 149.9]]);
  eq("one call", calls.importDoc, 1);
}
{
  // Two overlapping screenshots: the bottom line of the first is the top of
  // the second. A coffee bought twice on one screen is two coffees.
  const shots = [
    [{ d: "2026-09-10", t: "ארומה", a: -18 }, { d: "2026-09-10", t: "ארומה", a: -18 }, { d: "2026-09-11", t: "פז", a: -250 }],
    [{ d: "2026-09-11", t: "פז", a: -250 }, { d: "2026-09-12", t: "שופרסל", a: -99.9 }]
  ];
  let i = 0;
  const { server } = stubServer({ doc: () => ({ statement: "bank", currency: "ILS", rows: shots[i++], problem: "" }) });
  const res = await impReadDoc({ kind: "doc", images: [{ mediaType: "image/jpeg", data: "a" }, { mediaType: "image/jpeg", data: "b" }], name: "2 images" }, ctxWith(server));
  eq("the overlap counts once, the real repeat twice", res.lines.map((l) => l.desc), ["ארומה", "ארומה", "פז", "שופרסל"]);
  eq("merge rule on its own", impMergeShots([[{ d: "a", t: "x", a: 1 }], [{ d: "a", t: "x", a: 1 }, { d: "a", t: "x", a: 1 }]]).length, 2);
}
{
  const { server } = stubServer({ doc: () => ({ statement: "other", currency: "", rows: [], problem: "This looks like a receipt, not a statement." }) });
  let err = null;
  try { await impReadDoc({ kind: "doc", mediaType: "application/pdf", data: "x", name: "r.pdf" }, ctxWith(server)); } catch (e) { err = e; }
  eq("a document that is not a statement says so, in Alfred's words", err && [err.impCode, err.impDetail], ["not-statement", "This looks like a receipt, not a statement."]);
}

section("several files at once");
{
  const { server } = stubServer();
  const res = await impRun([{ file: fileOf("LEUMI") }, { file: fileOf("ISRACARD") }], ctxWith(server));
  eq("lines from both", res.items.length, 12);
  eq("both layouts are learned", Object.keys(res.learned.layouts).length, 2);
}

done("pipeline");
