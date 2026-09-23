// Every file the import is meant to take, and every file it is meant to turn
// away. One table each.
//
//   npm run test:files      (or npm test, which runs this and offline.test.mjs)
//
// The accepted half does not stop at "it parsed". Each file goes through the
// SAME steps the import screen runs - read, skeleton, header row, column guess
// - and the test asserts that a date, a shop and an amount were actually
// found. A file that parses into rows nobody can map is not imported.
//
// The refused half exists because the import takes a file from outside the
// app and reads it on the user's own device. Everything here either cannot be
// a statement (a program, a photo, a database) or is trying to make the phone
// do far too much work (a zip that unpacks into half a gigabyte). Each one
// must come back as a sentence a person can act on, quickly, and never as a
// hang, a crash, or a screen of mojibake imported as money.
import { app } from "./extract.mjs";
import { ALL, toCp1255, toUtf8 } from "./fixtures.mjs";
import {
  leumiXlsx, coverThenDataXlsx, buildXlsx, oddLayoutXlsx, prefixedXlsx, zipBuild,
  oleXls, odsFile, binaryJunk, zipBombDeclared, zipBombReal, manyEntriesZip, traversalZip,
  ISRACARD_HTML, MAX_XMLSS, ENTITY_BOMB, HTML_WITH_SCRIPT, NOT_A_STATEMENT
} from "./sheet-fixtures.mjs";

const { sheetReadBytes, parseCSV, csvSkeleton, sniffMap, csvDetectSign, SHEET_MAX_BYTES } = app;

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; console.log("  ok    " + name); return true; }
  fail++; failures.push(name + (detail ? "  -> " + detail : ""));
  console.log("  FAIL  " + name + (detail ? "  -> " + detail : ""));
  return false;
}

// Nothing here may hang: a file the reader never finishes with is a file the
// user is stuck on.
function read(bytes, name) {
  const buf = bytes.buffer ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ err: "TIMED OUT after 15s" }), 15000);
    try {
      sheetReadBytes(buf, name, (err, out) => {
        clearTimeout(timer);
        resolve(err ? { err: err.message } : out);
      });
    } catch (e) {
      clearTimeout(timer);
      resolve({ err: "THREW: " + e.message });
    }
  });
}

// What the import screen does with whatever came back, to the point where it
// knows which column is which.
function mapped(out) {
  const rows = out.rows || parseCSV(out.text || "");
  let widest = 0;
  for (const r of rows) if (r.length > widest) widest = r.length;
  const sk = csvSkeleton(rows);
  const headerRow = sk.head.length ? sk.titleRow : -1;
  const map = sniffMap(headerRow >= 0 ? rows.slice(headerRow) : rows, headerRow >= 0);
  const sign = csvDetectSign(rows, map, headerRow + 1, "");
  const amount = sign.splitAmt ? (map.debit >= 0 || map.credit >= 0) : map.amount >= 0;
  return { rows, widest, headerRow, map, amount };
}

// ============================================================== ACCEPTED ====
// [name, bytes, filename, expected kind]
const utf8 = (s) => toUtf8(s);

const TITLE_SEMI = [
  "דוח תנועות בחשבון",
  "מתאריך 01/09/2026 עד 30/09/2026",
  "תאריך;תיאור;חובה;זכות;יתרה",
  "01/09/2026;משכורת חודש אוגוסט;;18500,00;21450,30",
  "02/09/2026;שופרסל דיל, תל אביב;342,90;;21107,40",
  "03/09/2026;פנגו חניה;28,00;;21079,40",
  "05/09/2026;הוראת קבע חשמל;412,55;;20666,85"
].join("\r\n");

const TABBED = [
  "תאריך\tשם בית העסק\tסכום",
  "01/09/2026\tארומה תל אביב\t32.00",
  "04/09/2026\tסופר פארם\t88.90",
  "07/09/2026\tפנגו חניה\t28.00"
].join("\n");

const PIPED = [
  "Date|Description|Amount",
  "2026-09-01|Blue Bottle|-5.40",
  "2026-09-02|Metro card|-46.20",
  "2026-09-03|Salary|3000.00"
].join("\n");

const QUOTED = [
  "Date,Description,Amount",
  "2026-09-01,\"SMITH, JOHN — rent\",-4200.00",
  "2026-09-02,\"PAYPAL\n*SPOTIFY\",-19.90",
  "2026-09-03,\"He said \"\"thanks\"\"\",-12.00"
].join("\n");

const utf16le = (s, bom) => {
  const out = [];
  if (bom) out.push(0xff, 0xfe);
  for (const ch of s) { const c = ch.charCodeAt(0); out.push(c & 0xff, c >> 8); }
  return Uint8Array.from(out);
};

const ACCEPT = [
  ["comma CSV, no report lines", utf8(ALL.MAX.text), "max.csv", "csv"],
  ["comma CSV, three report lines above the header", utf8(ALL.ISRACARD.text), "isracard.csv", "csv"],
  ["semicolon CSV with a title line and decimal commas", utf8(TITLE_SEMI), "leumi.csv", "csv"],
  ["tab-separated, named .csv", utf8(TABBED), "aroma.csv", "csv"],
  ["pipe-separated", utf8(PIPED), "bank.csv", "csv"],
  ["quoted fields: separators, line breaks and doubled quotes inside", utf8(QUOTED), "card.csv", "csv"],
  ["CRLF line endings", utf8(ALL.LEUMI.text), "leumi.csv", "csv"],
  ["UTF-8 with a byte-order mark", Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8(ALL.ISRACARD.text)]), "bom.csv", "csv"],
  ["windows-1255, the older Hebrew encoding", toCp1255(ALL.LEUMI.text), "leumi.csv", "csv"],
  ["UTF-16LE with a byte-order mark", utf16le(ALL.MAX.text, true), "unicode.csv", "csv"],
  ["UTF-16LE with no mark, only its NULs", utf16le(ALL.MAX.text, false), "unicode.txt", "csv"],
  [".txt from a bank that calls CSV a text file", utf8(ALL.MAX.text), "export.txt", "csv"],
  [".xlsx from Excel", leumiXlsx(), "tnuot.xlsx", "xlsx"],
  [".xlsx with an uncompressed part inside", leumiXlsx({ storeStrings: true }), "tnuot.xlsx", "xlsx"],
  [".xlsx whose XML is namespace-prefixed", prefixedXlsx(), "bank.xlsx", "xlsx"],
  [".xlsx laid out somewhere other than xl/", oddLayoutXlsx(), "export.xlsx", "xlsx"],
  [".xlsx with a cover sheet in front of the statement", coverThenDataXlsx(), "workbook.xlsx", "xlsx"],
  [".xlsm, the macro-enabled kind", leumiXlsx(), "tnuot.xlsm", "xlsx"],
  [".xls that is really an HTML table", utf8(ISRACARD_HTML), "isracard.xls", "html"],
  [".xls that is really SpreadsheetML 2003", utf8(MAX_XMLSS), "max.xls", "xmlss"],
  [".xls that is really tab-separated text", utf8(TABBED), "bank.xls", "csv"],
  [".csv that is really an HTML table", utf8(ISRACARD_HTML), "statement.csv", "html"]
];

console.log("\nACCEPTED — every file the import is meant to take");
for (const [name, bytes, file, kind] of ACCEPT) {
  const out = await read(bytes, file);
  if (out.err) { ok(name, false, out.err); continue; }
  if (!ok(name + "  ·  read as " + out.kind, out.kind === kind, "wanted " + kind)) continue;
  const m = mapped(out);
  ok("      ↳ " + m.rows.length + " rows × " + m.widest + " columns, date/shop/amount found",
    m.widest >= 2 && m.map.date >= 0 && m.map.desc >= 0 && m.amount,
    "widest=" + m.widest + " header=" + m.headerRow + " map=" + JSON.stringify(m.map));
}

// An inline-string workbook is built here rather than in the table, because it
// is the one shape whose cells carry their own text instead of pointing at a
// string table - what most exporters that are not Excel produce.
{
  const inline = buildXlsx([{ name: "Sheet1", rows: [
    [{ inline: "Date" }, { inline: "Shop" }, { inline: "Amount" }],
    [{ date: "2026-09-03", custom: true }, { inline: "Cafe Joe" }, { n: -12.5 }],
    [{ date: "2026-09-04", custom: true }, { inline: "Super Pharm" }, { n: -88.9 }]
  ] }]);
  const out = await read(inline, "export.xlsx");
  const m = out.rows ? mapped(out) : null;
  ok(".xlsx whose cells carry their own text (inline strings)",
    !!m && m.map.date === 0 && m.map.desc === 1 && m.map.amount === 2, out.err || JSON.stringify(m && m.map));
}

// =============================================================== REFUSED ====
// [name, bytes, filename, a word that must appear in what Richy says]
const REFUSE = [
  ["an empty file", new Uint8Array(0), "empty.csv", "empty"],
  ["a PDF statement", NOT_A_STATEMENT.pdf(), "statement.pdf", "PDF"],
  ["a screenshot (PNG)", NOT_A_STATEMENT.png(), "shot.png", "picture"],
  ["a photo (JPEG)", NOT_A_STATEMENT.jpeg(), "photo.jpg", "picture"],
  ["a photo from an iPhone (HEIC)", NOT_A_STATEMENT.heic(), "IMG_0001.heic", "picture"],
  ["a GIF", NOT_A_STATEMENT.gif(), "x.gif", "picture"],
  ["a bitmap", NOT_A_STATEMENT.bmp(), "x.bmp", "picture"],
  ["a Windows program", NOT_A_STATEMENT.exe(), "setup.exe", "program"],
  ["a Linux binary", NOT_A_STATEMENT.elf(), "a.out", "program"],
  ["a Mac binary", NOT_A_STATEMENT.macho(), "tool", "program"],
  ["a gzip archive", NOT_A_STATEMENT.gzip(), "x.gz", "archive"],
  ["a RAR archive", NOT_A_STATEMENT.rar(), "x.rar", "archive"],
  ["a 7-Zip archive", NOT_A_STATEMENT.sevenz(), "x.7z", "archive"],
  ["a bzip2 archive", NOT_A_STATEMENT.bzip2(), "x.bz2", "archive"],
  ["an xz archive", NOT_A_STATEMENT.xz(), "x.xz", "archive"],
  ["a SQLite database", NOT_A_STATEMENT.sqlite(), "app.db", "database"],
  ["the 1997 binary .xls", oleXls(), "statement.xls", ".xls"],
  ["a LibreOffice sheet", odsFile(), "sheet.ods", "LibreOffice"],
  ["any other zip", zipBuild([{ name: "notes.txt", data: "hello" }]), "download.zip", "zip file"],
  ["a truncated workbook", leumiXlsx().slice(0, -40), "tnuot.xlsx", "damaged"],
  ["a renamed binary with a .csv name", binaryJunk(), "statement.csv", "text"],
  ["something not a zip, wearing an .xlsx name", toUtf8("just some words"), "book.xlsx", "Excel"],
  ["a zip claiming half a gigabyte inside", zipBombDeclared(), "bomb.xlsx", "stopped reading"],
  ["thousands of parts and no workbook", manyEntriesZip(5000), "many.xlsx", "zip file"]
];

console.log("\nREFUSED — and what it says instead");
for (const [name, bytes, file, word] of REFUSE) {
  const out = await read(bytes, file);
  ok(name, !!out.err && out.err.indexOf(word) !== -1,
    out.err ? "said: " + out.err : "was READ as " + out.kind + " with " + (out.rows || []).length + " rows");
}

// A bomb that really does unpack past the limit, with a directory that says it
// is small. The declared-size check cannot catch this one - only counting the
// bytes as they arrive does.
{
  const started = Date.now();
  const out = await read(zipBombReal(70), "bomb.xlsx");
  ok("a zip that really does unpack past the limit is stopped part-way",
    !!out.err && out.err.indexOf("stopped reading") !== -1, out.err || "READ");
  ok("      ↳ and stopped in reasonable time (" + (Date.now() - started) + "ms)", Date.now() - started < 15000);
}

// Richy reads parts by name out of memory and never writes one to disk, so a
// zip full of ../.. names is just a zip with no workbook in it.
{
  const out = await read(traversalZip(), "trav.xlsx");
  ok("entry names that climb out of the folder go nowhere",
    !!out.err || (out.rows || []).length === 0, out.err || JSON.stringify(out.rows));
}

// A file over the size cap never gets read at all - the cap is checked before
// anything is decoded.
{
  const big = new Uint8Array(SHEET_MAX_BYTES + 1024);
  big.set(toUtf8("Date,Shop,Amount\n"), 0);
  const started = Date.now();
  const out = await read(big, "huge.csv");
  ok("a file past the size cap is turned away before it is read",
    !!out.err && out.err.indexOf("MB") !== -1, out.err || "READ");
  ok("      ↳ immediately (" + (Date.now() - started) + "ms)", Date.now() - started < 2000);
}

// ======================================================= WHAT IT DOES NOT DO ==
console.log("\nCONTENT — what survives being read, and what must not");
{
  // The entity bomb: nothing expands entities it was not born knowing, so this
  // is inert text rather than gigabytes of "lol".
  const started = Date.now();
  const out = await read(toUtf8(ENTITY_BOMB), "bomb.xls");
  const text = JSON.stringify(out.rows || out.err || "");
  ok("an XML entity bomb expands to nothing", text.length < 4000 && Date.now() - started < 3000,
    "produced " + text.length + " chars in " + (Date.now() - started) + "ms");
  ok("      ↳ and its entity is left as the literal it is",
    !/lollollollol/.test(text), text.slice(0, 120));
}
{
  const out = await read(toUtf8(HTML_WITH_SCRIPT), "bank.xls");
  const flat = JSON.stringify(out.rows || []);
  ok("a script in the bank's HTML is not part of any cell",
    flat.indexOf("document.cookie") === -1 && flat.indexOf("window.alert") === -1
    && (out.rows || [])[1] && out.rows[1][1] === "ארומה", flat.slice(0, 160));
  ok("      ↳ while the rows it wrapped are read normally",
    (out.rows || []).length === 3 && out.rows[1][1] === "ארומה", flat.slice(0, 160));
  ok("      ↳ and an escaped tag stays text, not markup",
    (out.rows || []).length === 3 && out.rows[2][1] === "<img src=x onerror=alert(1)>", flat.slice(0, 200));
}
{
  // One column is one column: the import says so rather than inventing a split.
  const out = await read(toUtf8("Total\n100\n200\n300"), "totals.csv");
  const m = mapped(out);
  ok("a genuinely single-column file is not split into columns that aren't there",
    m.widest === 1, "widest=" + m.widest);
}

console.log("\n" + "-".repeat(64));
if (fail) {
  console.log(fail + " FAILED, " + pass + " passed\n");
  failures.forEach((f) => console.log("  FAIL  " + f));
  process.exit(1);
}
console.log("all " + pass + " checks passed");
