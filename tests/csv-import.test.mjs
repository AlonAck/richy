// Regression tests for the CSV import pipeline.
//
// budget-app.jsx is deliberately one file with no exports - the build strips
// imports and the app is served as a single bundle - so there is nothing to
// `import` here. Instead the pure, top-level helpers are lifted out of the
// source by name and evaluated, which keeps the tests honest (they run the
// SHIPPING code, not a copy) without splitting the app up.
//
// Run with:  node --test tests/
import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../budget-app.jsx", import.meta.url), "utf8");

// Lift `function NAME(...) { ... }` and `var NAME = ...;` declared at column 0.
function lift(names) {
  const lines = SRC.split("\n");
  const out = [];
  for (const name of names) {
    const start = lines.findIndex(
      (l) => l.startsWith(`function ${name}(`) || l.startsWith(`var ${name} =`)
    );
    assert.ok(start >= 0, `helper not found in budget-app.jsx: ${name}`);
    if (lines[start].startsWith("var ")) {
      let end = start;
      while (end < lines.length && !/;\s*$/.test(lines[end])) end++;
      out.push(lines.slice(start, end + 1).join("\n"));
    } else {
      let end = start + 1;
      while (end < lines.length && lines[end] !== "}") end++;
      out.push(lines.slice(start, end + 1).join("\n"));
    }
  }
  return out.join("\n\n");
}

const API = new Function(
  lift([
    "pad2", "round2", "delimCount", "parseCSV", "sniffMap", "isoIfReal", "parseImportDate", "parseImportAmount",
    "normalizeMerchant", "labelSimilarity", "labelHasWord", "dayGap", "dupScore",
    "bestDupMatch", "classifyImportRows", "dupKey", "importGapDays",
    "DUP_CERTAIN", "DUP_MAYBE",
  ]) +
  "\nreturn { parseCSV, sniffMap, parseImportDate, parseImportAmount, labelSimilarity, dupScore, classifyImportRows, importGapDays, DUP_CERTAIN, DUP_MAYBE };"
)();

const tx = (o) => Object.assign({ type: "expense", repeat: "none", pending: false }, o);

// ---- parseCSV ---------------------------------------------------------------

test("parseCSV reads a plain comma file", () => {
  assert.deepStrictEqual(API.parseCSV("Date,Desc,Amt\n2025-01-05,Cafe,-12.50\n"), [
    ["Date", "Desc", "Amt"],
    ["2025-01-05", "Cafe", "-12.50"],
  ]);
});

test("parseCSV auto-detects semicolon and tab files", () => {
  assert.deepStrictEqual(API.parseCSV("a;b\n1;2\n"), [["a", "b"], ["1", "2"]]);
  assert.deepStrictEqual(API.parseCSV("a\tb\n1\t2\n"), [["a", "b"], ["1", "2"]]);
});

test("parseCSV keeps a quoted field that spans a newline on one row", () => {
  // Real exports wrap a multi-line merchant address in quotes. Splitting on
  // every newline tore the row apart and dropped the amount entirely.
  const rows = API.parseCSV('Date,Description,Amount\n2025-01-05,"ACME CORP\nBRANCH 12",-12.50\n');
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[1].length, 3);
  assert.strictEqual(rows[1][2], "-12.50");
});

test("parseCSV is not fooled by commas inside quoted header cells", () => {
  // A semicolon file whose headers contain commas used to be counted as a
  // comma file, which collapsed every row into a single cell.
  const rows = API.parseCSV('"Posted, value";"Merchant, full";"Amount"\n"2025-01-05";"SHOP";"-12.50"\n');
  assert.strictEqual(rows[0].length, 3);
  assert.strictEqual(rows[1][2], "-12.50");
});

test("parseCSV handles escaped quotes and a UTF-8 BOM", () => {
  assert.deepStrictEqual(API.parseCSV('a,b\n"say ""hi""",2\n')[1], ['say "hi"', "2"]);
  assert.strictEqual(API.parseCSV("﻿Date,Desc\n1,2\n")[0][0], "Date");
});

// ---- parseImportAmount ------------------------------------------------------

test("parseImportAmount reads the ordinary shapes", () => {
  assert.strictEqual(API.parseImportAmount("42.10"), 42.1);
  assert.strictEqual(API.parseImportAmount("(42.10)"), -42.1);
  assert.strictEqual(API.parseImportAmount("1,234.56"), 1234.56);
  assert.strictEqual(API.parseImportAmount("1.234,56"), 1234.56);
  assert.strictEqual(API.parseImportAmount("-250.00 ₪"), -250);
  assert.strictEqual(API.parseImportAmount("1234.50-"), -1234.5);
  assert.ok(Number.isNaN(API.parseImportAmount("-")));
  assert.ok(Number.isNaN(API.parseImportAmount("")));
});

test("parseImportAmount treats a typographic minus as negative", () => {
  // Israeli and European exports write minus as U+2212 or a fullwidth dash.
  // Reading those as positive turned every expense in the file into income.
  assert.strictEqual(API.parseImportAmount("−250.00"), -250);
  assert.strictEqual(API.parseImportAmount("－250.00"), -250);
  assert.strictEqual(API.parseImportAmount("–250.00"), -250);
});

test("parseImportAmount ignores RTL marks and non-breaking spaces", () => {
  assert.strictEqual(API.parseImportAmount("‏-250.00‏"), -250);
  assert.strictEqual(API.parseImportAmount("1 234,56"), 1234.56);
});

// ---- parseImportDate --------------------------------------------------------

test("parseImportDate reads ISO, d/m/y and m/d/y", () => {
  assert.strictEqual(API.parseImportDate("2025-03-05", true), "2025-03-05");
  assert.strictEqual(API.parseImportDate("05/03/2025", true), "2025-03-05");
  assert.strictEqual(API.parseImportDate("03/05/2025", false), "2025-03-05");
  assert.strictEqual(API.parseImportDate("5.3.25", true), "2025-03-05");
  assert.strictEqual(API.parseImportDate("5 Jan 2025", true), "2025-01-05");
});

test("parseImportDate rejects a date that does not exist", () => {
  assert.strictEqual(API.parseImportDate("2025-13-05", true), "");
  assert.strictEqual(API.parseImportDate("30/02/2025", true), "");
});

test("parseImportDate refuses to invent a date out of non-date text", () => {
  // Date.parse turns "ABC 5" into 2001-05-01 and "12" into 2001-12-01. Letting
  // it near an arbitrary cell stamped real purchases with fictional dates.
  for (const junk of ["ABC 5", "12", "2025", "אפריל 5", "not a date", ""]) {
    assert.strictEqual(API.parseImportDate(junk, true), "", `should reject ${JSON.stringify(junk)}`);
  }
});

// ---- sniffMap ---------------------------------------------------------------

test("sniffMap gives each column exactly one role on a dual-date bank header", () => {
  const rows = [
    ["Transaction Date", "Value Date", "Description", "Debit", "Credit", "Balance"],
    ["05/01/2025", "06/01/2025", "STARBUCKS", "4.50", "", "100.00"],
  ];
  const m = API.sniffMap(rows, true);
  assert.strictEqual(m.date, 0);
  assert.strictEqual(m.desc, 2);
  assert.strictEqual(m.debit, 3);
  assert.strictEqual(m.credit, 4);
  assert.strictEqual(m.amount, -1, '"Value Date" must not be read as the amount');
});

test("sniffMap finds the columns of a headerless file by their content", () => {
  const m = API.sniffMap(
    [["2025-01-05", "STARBUCKS", "-4.50"], ["2025-01-06", "SHELL", "-40.00"]],
    false
  );
  assert.strictEqual(m.date, 0);
  assert.strictEqual(m.amount, 2);
  assert.strictEqual(m.desc, 1);
});

// ---- duplicate classification ----------------------------------------------

test("re-importing the same file brings in nothing new", () => {
  const file = [
    tx({ date: "2025-01-05", amount: 4.5, label: "STARBUCKS #1123", catId: "c1", catSure: true }),
    tx({ date: "2025-01-05", amount: 4.5, label: "STARBUCKS #1123", catId: "c1", catSure: true }),
    tx({ date: "2025-01-06", amount: 40, label: "SHELL FUEL", catId: "c2", catSure: true }),
  ];
  const first = API.classifyImportRows(file, []);
  assert.strictEqual(first.fresh.length, 3, "an exact repeat line is a real second purchase");
  assert.strictEqual(first.twins, 1);

  const second = API.classifyImportRows(file, first.fresh);
  assert.strictEqual(second.fresh.length, 0, "the same file must not land twice");
  assert.strictEqual(second.maybes.length, 0, "and must not re-ask about rows it already filed");
});

test("two look-alikes claiming one transaction are both asked about, never merged", () => {
  // One hand-typed "Coffee 4.50" against a statement holding two different
  // 4.50 coffees that day: silently skipping both would delete a real purchase.
  const res = API.classifyImportRows(
    [
      tx({ date: "2025-01-05", amount: 4.5, label: "STARBUCKS STORE #1123", catId: "c1", catSure: true }),
      tx({ date: "2025-01-05", amount: 4.5, label: "COSTA COFFEE 118", catId: "c1", catSure: true }),
    ],
    [tx({ date: "2025-01-05", amount: 4.5, label: "Coffee", catId: "c1" })]
  );
  assert.strictEqual(res.dupes.length, 0);
  assert.strictEqual(res.maybes.length, 2);
  assert.ok(res.maybes.every((m) => m.contended));
});

test("money moving opposite ways is never the same event", () => {
  const a = tx({ date: "2025-01-05", amount: 100, label: "X" });
  const b = Object.assign(tx({ date: "2025-01-05", amount: 100, label: "X" }), { type: "income" });
  assert.strictEqual(API.dupScore(a, b), 0);
});

test("same amount and day but nothing else in common stays out of the queue", () => {
  // Rent and a laptop can both be 1,200 on the 1st.
  const score = API.dupScore(
    tx({ date: "2025-01-01", amount: 1200, label: "MACBOOK APPLE STORE", catId: "shop", catSure: true }),
    tx({ date: "2025-01-01", amount: 1200, label: "Rent", catId: "house" })
  );
  assert.ok(score < API.DUP_MAYBE, `expected < ${API.DUP_MAYBE}, got ${score}`);
});

// ---- the gap report ---------------------------------------------------------

test("importGapDays counts missing days the same way in every timezone", () => {
  // The old loop built day strings with toISOString(), so east of UTC+12 every
  // day of a complete file read as a gap.
  assert.strictEqual(API.importGapDays("2025-01-05", "2025-01-07", { "2025-01-05": 1, "2025-01-06": 1, "2025-01-07": 1 }), 0);
  assert.strictEqual(API.importGapDays("2025-01-05", "2025-01-07", { "2025-01-05": 1, "2025-01-07": 1 }), 1);
  assert.strictEqual(API.importGapDays("2025-02-27", "2025-03-02", { "2025-02-27": 1, "2025-03-02": 1 }), 2);
});
