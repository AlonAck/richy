// Spreadsheet exports in the shapes banks and card issuers actually hand out,
// built here rather than committed as binaries: a .xlsx is a zip, and a zip in
// the repo is a file nobody can read a diff of. Everything below writes the
// real bytes - real DEFLATE, real CRCs, real central directory - so the reader
// under test is doing the same work it does on a file from Bank Leumi.
import { deflateRawSync } from "zlib";

// ------------------------------------------------------------------- zip ----
const CRC = (function () {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const enc = (s) => new TextEncoder().encode(s);

// files: [{ name, data: string|Uint8Array, store?: true }]. `store` writes the
// entry uncompressed, which is legal, which Excel does for tiny parts, and
// which the reader has to handle without an inflate at all.
export function zipBuild(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc(f.name);
    const data = typeof f.data === "string" ? enc(f.data) : f.data;
    const comp = f.store ? data : new Uint8Array(deflateRawSync(Buffer.from(data)));
    const sum = crc32(data);

    const lh = new Uint8Array(30 + name.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, f.store ? 0 : 8, true);
    lv.setUint32(14, sum, true);
    lv.setUint32(18, comp.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lh.set(name, 30);

    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, f.store ? 0 : 8, true);
    cv.setUint32(16, sum, true);
    cv.setUint32(20, comp.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cd.set(name, 46);

    chunks.push(lh, comp);
    central.push(cd);
    offset += lh.length + comp.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, central.length, true);
  ev.setUint16(10, central.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  const all = [...chunks, ...central, eocd];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) { out.set(p, at); at += p.length; }
  return out;
}

// ------------------------------------------------------------------ xlsx ----
const xmlEsc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = (i) => {
  let s = "";
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};
// ISO date -> Excel serial, the 1900 way, leap-year bug and all.
export function serial1900(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}

// A cell is one of:
//   "text"            a shared string (what Excel writes for almost every word)
//   { n: 412.75 }     a number, written as its own digits
//   { date: "2026-09-03" }        a serial with a BUILT-IN date format on it
//   { date: "...", custom: true } a serial with a CUSTOM "dd/mm/yyyy" format
//   { inline: "text" } an inline string - what most exporters that are not
//                      Excel write, because it needs no string table
//   null / ""         nothing, written as a gap in the cell references
function sheetXml(rows, shared) {
  const out = ["<?xml version=\"1.0\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData>"];
  rows.forEach((row, r) => {
    out.push("<row r=\"" + (r + 1) + "\">");
    row.forEach((cell, c) => {
      const ref = colName(c) + (r + 1);
      if (cell === null || cell === undefined || cell === "") return;   // a real gap, not an empty <c>
      if (typeof cell === "string") {
        let idx = shared.indexOf(cell);
        if (idx < 0) { shared.push(cell); idx = shared.length - 1; }
        out.push("<c r=\"" + ref + "\" t=\"s\"><v>" + idx + "</v></c>");
      } else if (cell.inline !== undefined) {
        out.push("<c r=\"" + ref + "\" t=\"inlineStr\"><is><t>" + xmlEsc(cell.inline) + "</t></is></c>");
      } else if (cell.date !== undefined) {
        out.push("<c r=\"" + ref + "\" s=\"" + (cell.custom ? 2 : 1) + "\"><v>" + serial1900(cell.date) + "</v></c>");
      } else if (cell.formula !== undefined) {
        out.push("<c r=\"" + ref + "\"><f>" + xmlEsc(cell.formula) + "</f><v>" + cell.n + "</v></c>");
      } else {
        out.push("<c r=\"" + ref + "\"><v>" + cell.n + "</v></c>");
      }
    });
    out.push("</row>");
  });
  out.push("</sheetData></worksheet>");
  return out.join("");
}

// sheets: [{ name, rows, hidden }]. The first sheet is rId1, and so on.
export function buildXlsx(sheets, opts) {
  opts = opts || {};
  const shared = [];
  const sheetFiles = sheets.map((s, i) => ({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: sheetXml(s.rows, shared) }));

  const wb = "<?xml version=\"1.0\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
    + (opts.date1904 ? "<workbookPr date1904=\"1\"/>" : "<workbookPr/>")
    + "<sheets>"
    + sheets.map((s, i) => "<sheet name=\"" + xmlEsc(s.name) + "\" sheetId=\"" + (i + 1) + "\""
      + (s.hidden ? " state=\"hidden\"" : "") + " r:id=\"rId" + (i + 1) + "\"/>").join("")
    + "</sheets></workbook>";

  const rels = "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
    + sheets.map((s, i) => "<Relationship Id=\"rId" + (i + 1) + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet" + (i + 1) + ".xml\"/>").join("")
    + "</Relationships>";

  // cellStyleXfs comes first on purpose: it is the list a reader that mixes the
  // two up would take its formats from, and it says everything is General.
  const styles = "<?xml version=\"1.0\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
    + "<numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"dd/mm/yyyy;@\"/></numFmts>"
    + "<cellStyleXfs count=\"3\"><xf numFmtId=\"0\"/><xf numFmtId=\"0\"/><xf numFmtId=\"0\"/></cellStyleXfs>"
    + "<cellXfs count=\"3\"><xf numFmtId=\"0\" xfId=\"0\"/><xf numFmtId=\"14\" xfId=\"0\" applyNumberFormat=\"1\"/>"
    + "<xf numFmtId=\"164\" xfId=\"0\" applyNumberFormat=\"1\"/></cellXfs></styleSheet>";

  const sst = "<?xml version=\"1.0\"?><sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" count=\"" + shared.length + "\" uniqueCount=\"" + shared.length + "\">"
    + shared.map((s) => "<si><t>" + xmlEsc(s) + "</t></si>").join("") + "</sst>";

  const files = [
    { name: "[Content_Types].xml", data: "<?xml version=\"1.0\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"/>", store: true },
    { name: "_rels/.rels", data: "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>" },
    { name: "xl/workbook.xml", data: wb },
    { name: "xl/_rels/workbook.xml.rels", data: rels },
    { name: "xl/styles.xml", data: styles },
    ...sheetFiles
  ];
  // One part stored rather than deflated, because Excel does that to small
  // parts and a reader that assumes DEFLATE everywhere breaks on real files.
  if (shared.length) files.push({ name: "xl/sharedStrings.xml", data: sst, store: !!opts.storeStrings });
  return zipBuild(files);
}

// --- Bank Leumi, exported as Excel. Two report lines above the header, split
// debit/credit, the running balance next to them, dates as real date cells and
// amounts as real numbers - which is the whole difference from the CSV: none
// of it arrives as text.
export const LEUMI_XLSX_ROWS = [
  ["דוח תנועות בחשבון"],
  ["מתאריך 01/09/2026 עד 30/09/2026 חשבון 12-345-67890"],
  ["תאריך", "תיאור", "אסמכתא", "חובה", "זכות", "יתרה"],
  [{ date: "2026-09-01" }, "משכורת חודש אוגוסט", { n: 1234567 }, null, { n: 18500 }, { n: 21450.3 }],
  [{ date: "2026-09-02" }, "שופרסל דיל תל אביב", { n: 8823145 }, { n: 342.9 }, null, { n: 21107.4 }],
  [{ date: "2026-09-03" }, "פנגו חניה", { n: 8823146 }, { n: 28 }, null, { n: 21079.4 }],
  [{ date: "2026-09-05" }, "הוראת קבע חשמל", { n: 8823147 }, { n: 412.55 }, null, { n: 20666.85 }],
  [{ date: "2026-09-07" }, "ביט העברה", { n: 8823148 }, { n: 150 }, null, { n: 20516.85 }],
  [{ date: "2026-09-14" }, "רמי לוי שיווק", { n: 8823149 }, { n: 289.4 }, null, { n: 20227.45 }]
];

export function leumiXlsx(opts) {
  return buildXlsx([{ name: "תנועות", rows: LEUMI_XLSX_ROWS }], opts);
}

// A cover sheet in front of the statement, and the statement itself hidden -
// which is how a bank's "print" workbook is often put together.
export function coverThenDataXlsx() {
  return buildXlsx([
    { name: "כללי", rows: [["בנק לאומי"], ["הופק ב-22/09/2026"]] },
    { name: "תנועות", rows: LEUMI_XLSX_ROWS, hidden: true }
  ]);
}

// --- Isracard hands out an .xls that is an HTML page: layout tables around
// the real one, a missing </td> here and there, &nbsp; padding, and a colspan
// on the title row.
export const ISRACARD_HTML = [
  "<html><head><meta charset=\"utf-8\"><title>פירוט חיובים</title></head><body>",
  "<table width=\"100%\"><tr><td>",
  "  <table border=\"1\">",
  "    <tr><td colspan=\"5\">פירוט חיובים - כרטיס מסתיים בספרות 4471</td></tr>",
  "    <tr><th>תאריך עסקה</th><th>שם בית העסק</th><th>סכום עסקה</th><th>סכום חיוב</th><th>מטבע</th></tr>",
  "    <tr><td>03/09/2026<td>מקס איט<td>129.00<td>129.00<td>ש&quot;ח</tr>",
  "    <tr><td>04/09/2026</td><td>סינמה סיטי&nbsp;גלילות</td><td>94.00</td><td>94.00</td><td>ש\"ח</td></tr>",
  "    <tr><td>08/09/2026</td><td>ארומה תל אביב</td><td>32.00</td><td>32.00</td><td>ש\"ח</td></tr>",
  "    <tr><td>11/09/2026</td><td>פייבוקס</td><td>200.00</td><td>200.00</td><td>ש\"ח</td></tr>",
  "    <tr><td>15/09/2026</td><td>שופרסל דיל</td><td>412.75</td><td>412.75</td><td>ש\"ח</td></tr>",
  "    <tr><td>19/09/2026</td><td>סופר פארם &amp; בע\"מ</td><td>88.90</td><td>88.90</td><td>ש\"ח</td></tr>",
  "  </table>",
  "</td></tr><tr><td>הודפס מאתר ישראכרט</td></tr></table>",
  "</body></html>"
].join("\n");

// --- SpreadsheetML 2003: the other thing that arrives named .xls. Note the
// ss:Index gap, the DateTime values, and the merged title cell.
export const MAX_XMLSS = [
  "<?xml version=\"1.0\"?>",
  "<?mso-application progid=\"Excel.Sheet\"?>",
  "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">",
  "<Worksheet ss:Name=\"עסקאות\"><Table>",
  "<Row><Cell ss:MergeAcross=\"2\"><Data ss:Type=\"String\">פירוט עסקאות MAX</Data></Cell></Row>",
  "<Row><Cell><Data ss:Type=\"String\">תאריך</Data></Cell><Cell><Data ss:Type=\"String\">בית עסק</Data></Cell><Cell><Data ss:Type=\"String\">סכום</Data></Cell></Row>",
  "<Row><Cell><Data ss:Type=\"DateTime\">2026-09-02T00:00:00.000</Data></Cell><Cell><Data ss:Type=\"String\"><B>קפה</B> ג'ו</Data></Cell><Cell><Data ss:Type=\"Number\">-32.5</Data></Cell></Row>",
  "<Row><Cell><Data ss:Type=\"DateTime\">2026-09-06T00:00:00.000</Data></Cell><Cell ss:Index=\"3\"><Data ss:Type=\"Number\">-119</Data></Cell></Row>",
  "<Row><Cell><Data ss:Type=\"DateTime\">2026-09-09T00:00:00.000</Data></Cell><Cell><Data ss:Type=\"String\">זיכוי החזר</Data></Cell><Cell><Data ss:Type=\"Number\">45.9</Data></Cell></Row>",
  "</Table></Worksheet></Workbook>"
].join("\n");

// The 1997 binary. Only its signature matters: the point of the test is that
// Richy names the format instead of reading eight bytes of it as a shop name.
export function oleXls() {
  const b = new Uint8Array(2048);
  b.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 0);
  return b;
}

// A workbook that keeps nothing where Excel keeps it: the package points at
// /book/wb.xml, the sheet lives under book/pages/ and the strings under
// book/. Every path in the OPC package is declared in a .rels file rather
// than fixed by the format, and an exporter that is not Excel is free to do
// this - so the reader has to follow the relationships, not guess "xl/".
export function oddLayoutXlsx() {
  const ns = "xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"";
  const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return zipBuild([
    { name: "_rels/.rels", data: "<Relationships><Relationship Id=\"rIdW\" Type=\"" + rel + "/officeDocument\" Target=\"/book/wb.xml\"/></Relationships>" },
    { name: "book/wb.xml", data: "<workbook " + ns + "><sheets><sheet name=\"Statement\" sheetId=\"1\" r:id=\"rId9\"/></sheets></workbook>" },
    { name: "book/_rels/wb.xml.rels", data: "<Relationships>"
      + "<Relationship Id=\"rId9\" Type=\"" + rel + "/worksheet\" Target=\"pages/p1.xml\"/>"
      + "<Relationship Id=\"rIdS\" Type=\"" + rel + "/sharedStrings\" Target=\"strings.xml\"/>"
      + "</Relationships>" },
    { name: "book/strings.xml", data: "<sst><si><t>Date</t></si><si><t>Shop</t></si><si><t>Amount</t></si><si><t>Cafe Joe</t></si></sst>" },
    { name: "book/pages/p1.xml", data: "<worksheet><sheetData>"
      + "<row r=\"1\"><c r=\"A1\" t=\"s\"><v>0</v></c><c r=\"B1\" t=\"s\"><v>1</v></c><c r=\"C1\" t=\"s\"><v>2</v></c></row>"
      + "<row r=\"2\"><c r=\"A2\" t=\"inlineStr\"><is><t>01/09/2026</t></is></c><c r=\"B2\" t=\"s\"><v>3</v></c><c r=\"C2\"><v>-32.5</v></c></row>"
      + "</sheetData></worksheet>" }
  ]);
}

// A LibreOffice sheet: also a zip, also full of XML, and not Excel.
export function odsFile() {
  return zipBuild([
    { name: "mimetype", data: "application/vnd.oasis.opendocument.spreadsheet", store: true },
    { name: "content.xml", data: "<?xml version=\"1.0\"?><office:document-content/>" }
  ]);
}
