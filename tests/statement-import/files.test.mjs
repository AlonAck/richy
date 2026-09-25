// Every kind of file a person might choose, opened into rows - and every kind
// that must be turned away, turned away with a reason instead of being read
// as rows of nonsense. The accepted half does not stop at "it parsed": each
// file's rows are checked cell by cell where it matters.
//
//   node tests/statement-import/files.test.mjs
import { deflateRawSync } from "zlib";
import { app } from "./extract.mjs";
import { ALL, toUtf8, toUtf16leNoBom } from "./fixtures.mjs";
import {
  zipBuild, leumiXlsx, coverThenDataXlsx, ISRACARD_HTML, MAX_XMLSS, oddLayoutXlsx, prefixedXlsx, NOT_A_STATEMENT,
  binaryJunk, zipBombDeclared, zipBombReal, manyEntriesZip, traversalZip, ENTITY_BOMB, HTML_WITH_SCRIPT, buildXlsx
} from "./sheet-fixtures.mjs";
import { xlsBank, xlsBuild, oleNotWorkbook } from "./xls-fixtures.mjs";
import { section, check, eq, rejects, done } from "./harness.mjs";

const { impReadBytes, impSniff } = app;
const read = (bytes, name) => impReadBytes(bytes, name || "statement", "");
const rowsOf = (res, i) => res.sheets[i || 0].rows;

section("xlsx");
{
  const res = await read(leumiXlsx(), "leumi.xlsx");
  eq("format", res.format, "xlsx");
  const rows = rowsOf(res);
  eq("title rows first", rows[0], ["דוח תנועות בחשבון"]);
  eq("titles", rows[2], ["תאריך", "תיאור", "אסמכתא", "חובה", "זכות", "יתרה"]);
  eq("a date cell arrives as a date, a number as a number", rows[3], ["2026-09-01", "משכורת חודש אוגוסט", "1234567", "", "18500", "21450.3"]);
  eq("an empty cell keeps its column", rows[4], ["2026-09-02", "שופרסל דיל תל אביב", "8823145", "342.9", "", "21107.4"]);
}
{
  const res = await read(leumiXlsx({ date1904: true }), "mac.xlsx");
  check("a 1904-dated workbook still gives real dates", /^\d{4}-\d{2}-\d{2}$/.test(rowsOf(res)[3][0]), rowsOf(res)[3]);
}
{
  const res = await read(coverThenDataXlsx(), "print.xlsx");
  eq("a hidden statement sheet behind a cover sheet is read", res.sheets.map((s) => s.name), ["כללי", "תנועות"]);
}
{
  const res = await read(oddLayoutXlsx(), "odd.xlsx");
  eq("the workbook is found through its relationships", rowsOf(res)[1], ["01/09/2026", "Cafe Joe", "-32.5"]);
}
{
  const res = await read(prefixedXlsx(), "prefixed.xlsx");
  eq("namespace-prefixed XML", rowsOf(res)[1], ["2026-09-02", "שופרסל דיל", "-342.9"]);
}
{
  const res = await read(buildXlsx([{ name: "S", rows: [["Date", "Shop", "Amount"], [{ date: "2026-09-03", custom: true }, "Cafe", { n: 12.5 }]] }]), "custom.xlsx");
  eq("a custom dd/mm/yyyy format is a date", rowsOf(res)[1][0], "2026-09-03");
}

section("html .xls");
{
  const res = await read(toUtf8(ISRACARD_HTML), "isracard.xls");
  eq("format", res.format, "html");
  eq("one table - the layout tables around it are dropped", res.sheets.length, 1);
  const rows = rowsOf(res);
  eq("titles", rows[1], ["תאריך עסקה", "שם בית העסק", "סכום עסקה", "סכום חיוב", "מטבע"]);
  eq("unclosed cells", rows[2], ["03/09/2026", "מקס איט", "129.00", "129.00", "ש\"ח"]);
  eq("entities", rows[3][1], "סינמה סיטי גלילות");
  eq("&amp;", rows[7][1], "סופר פארם & בע\"מ");
}
{
  const res = await read(toUtf8(HTML_WITH_SCRIPT), "x.xls");
  const all = JSON.stringify(res.sheets);
  check("a script never becomes a cell", all.indexOf("alert(") < 0 || all.indexOf("<img") >= 0, all);
  check("escaped markup stays text", all.indexOf("<img src=x onerror=alert(1)>") >= 0, all);
}

section("xml .xls");
{
  const res = await read(toUtf8(MAX_XMLSS), "max.xls");
  eq("format", res.format, "xml");
  const rows = rowsOf(res);
  eq("a merged title", rows[0], ["פירוט עסקאות MAX"]);
  eq("DateTime and inline markup", rows[2], ["2026-09-02", "קפה ג'ו", "-32.5"]);
  eq("an ss:Index gap", rows[3], ["2026-09-06", "", "-119"]);
}
{
  const res = await read(toUtf8(ENTITY_BOMB), "bomb.xls");
  check("an entity bomb is inert text", JSON.stringify(res.sheets).length < 2000);
}

section("binary .xls");
{
  const res = await read(xlsBank(), "bank.xls");
  eq("format", res.format, "xls");
  const rows = rowsOf(res);
  eq("sheet name", res.sheets[0].name, "תנועות");
  eq("titles from the shared strings", rows[1], ["תאריך", "הפעולה", "פרטים", "אסמכתא", "חובה", "זכות", "יתרה"]);
  eq("a date, a NUMBER and an empty cell", rows[2], ["2026-09-01", "משכורת", "אקמה בע\"מ", "552210", "", "14250", "16310.4"]);
  eq("an RK number with the x100 flag", rows[3][4], "3894.2");
  eq("a small RK", rows[5][4], "6.9");
}
{
  const res = await read(xlsBank({ splitSst: 3 }), "split.xls");
  eq("a string cut across a CONTINUE record", rowsOf(res)[1], ["תאריך", "הפעולה", "פרטים", "אסמכתא", "חובה", "זכות", "יתרה"]);
}
{
  const small = xlsBuild([{ name: "S", rows: [["Date", "Shop", "Amount"], [{ date: "2026-09-02" }, "Cafe", { rk: -12.5 }]] }], { mini: true });
  const res = await read(small, "small.xls");
  eq("a small workbook in the mini stream", rowsOf(res)[1], ["2026-09-02", "Cafe", "-12.5"]);
}
await rejects("an OLE file that is not a workbook", read(oleNotWorkbook(), "doc.xls"), "not-sheet");

section("text");
{
  const res = await read(ALL.LEUMI.bytes(), "leumi.csv");
  eq("encoding", res.encoding, "windows-1255");
  eq("rows", rowsOf(res)[3], ["01/09/2026", "משכורת חודש אוגוסט", "1234567", "", "18500.00", "21450.30"]);
}
{
  const res = await read(toUtf16leNoBom(ALL.MAX.text), "max.csv");
  eq("UTF-16 without its byte-order mark", res.encoding, "utf-16le");
  eq("rows", rowsOf(res)[1], ["02/09/2026", "רמי לוי", "מזון", "-312.40"]);
}
{
  const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...toUtf8(ALL.ENGLISH.text)]);
  const res = await read(bom, "bom.csv");
  eq("a UTF-8 byte-order mark is not part of the first title", rowsOf(res)[0][0], "Date");
}
{
  const res = await read(toUtf8("01/09/2026\tשופרסל\t342.90\n02/09/2026\tפז\t250.00"), "pasted.txt");
  eq("tab-separated (a table copied off a web page)", rowsOf(res)[1], ["02/09/2026", "פז", "250.00"]);
}

section("wrapped and other formats");
{
  const zip = zipBuild([{ name: "export/statement.csv", data: ALL.ENGLISH.text }, { name: "__MACOSX/._statement.csv", data: "junk" }]);
  const res = await read(zip, "export.zip");
  eq("a zip holding one statement is opened", rowsOf(res)[1], ["2026-06-01", "Grocery Store", "-54.20"]);
}
{
  const ods = zipBuild([
    { name: "mimetype", data: "application/vnd.oasis.opendocument.spreadsheet", store: true },
    { name: "content.xml", data: "<?xml version=\"1.0\"?><office:document-content xmlns:office=\"o\" xmlns:table=\"t\" xmlns:text=\"x\"><office:body><office:spreadsheet>"
      + "<table:table table:name=\"Statement\">"
      + "<table:table-row><table:table-cell office:value-type=\"string\"><text:p>Date</text:p></table:table-cell><table:table-cell office:value-type=\"string\"><text:p>Shop</text:p></table:table-cell><table:table-cell office:value-type=\"string\"><text:p>Amount</text:p></table:table-cell></table:table-row>"
      + "<table:table-row><table:table-cell office:value-type=\"date\" office:date-value=\"2026-09-02\"><text:p>02/09/26</text:p></table:table-cell><table:table-cell office:value-type=\"string\"><text:p>Cafe<text:s/>Joe</text:p></table:table-cell><table:table-cell office:value-type=\"float\" office:value=\"-32.5\"><text:p>-32.50</text:p></table:table-cell></table:table-row>"
      + "<table:table-row table:number-rows-repeated=\"1000\"><table:table-cell table:number-columns-repeated=\"1024\"/></table:table-row>"
      + "</table:table></office:spreadsheet></office:body></office:document-content>" }
  ]);
  const res = await read(ods, "sheet.ods");
  eq("an OpenDocument sheet", rowsOf(res), [["Date", "Shop", "Amount"], ["2026-09-02", "Cafe Joe", "-32.5"]]);
}
{
  const pdf = NOT_A_STATEMENT.pdf();
  const res = await read(pdf, "statement.pdf");
  eq("a PDF goes to Alfred whole", [res.kind, res.mediaType, typeof res.data], ["doc", "application/pdf", "string"]);
}
eq("a photo is recognised as one", impSniff(NOT_A_STATEMENT.jpeg()), "image");
eq("so is a HEIC", impSniff(NOT_A_STATEMENT.heic()), "image");
eq("and a PNG", impSniff(NOT_A_STATEMENT.png()), "image");

section("turned away");
await rejects("an empty file", read(new Uint8Array(0)), "empty");
await rejects("a video", read(NOT_A_STATEMENT.mp4()), "not-statement");
await rejects("a program", read(NOT_A_STATEMENT.exe()), "program");
await rejects("a Linux program", read(NOT_A_STATEMENT.elf()), "program");
await rejects("a compressed archive", read(NOT_A_STATEMENT.gzip()), "archive");
await rejects("a RAR", read(NOT_A_STATEMENT.rar()), "archive");
await rejects("a database", read(NOT_A_STATEMENT.sqlite()), "database");
await rejects("random bytes named .csv", read(binaryJunk()), "not-statement");
await rejects("a Word document", read(zipBuild([{ name: "word/document.xml", data: "<w:document/>" }])), "not-sheet");
await rejects("a Numbers file", read(zipBuild([{ name: "Index/Document.iwa", data: "x", store: true }])), "numbers");
await rejects("a zip of photos", read(zipBuild([{ name: "a.jpg", data: "x", store: true }])), "archive");
await rejects("a zip bomb that lies about its size", read(zipBombReal(70)), "too-big");
{
  let ok = true;
  try { await read(zipBombDeclared()); } catch (e) { ok = !!e.impCode; }
  check("a declared-huge entry does not allocate what it claims", ok);
}
await rejects("thousands of parts", read(manyEntriesZip(5000)), "too-big");
{
  let code = "";
  try { await read(traversalZip()); } catch (e) { code = e.impCode; }
  check("entry names that climb out of the folder are just names", code === "empty" || code === "", code);
}
{
  const big = new Uint8Array(4 * 1024 * 1024);
  big.set([0x25, 0x50, 0x44, 0x46], 0);
  await rejects("a PDF too large to send", read(big, "huge.pdf"), "pdf-too-big");
}

done("files");
