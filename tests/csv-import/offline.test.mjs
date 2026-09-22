// Everything in the CSV import that does not need a model: decoding, the
// column guesser, the privacy skeleton, the fingerprint cache key, and the
// date/sign detection that runs on the rows themselves.
//
//   npm run test:csv
//
// The model leg is tests/csv-import/live-haiku.mjs, which needs a key.
import { app } from "./extract.mjs";
import { ALL, toCp1255, toUtf8, ISRACARD } from "./fixtures.mjs";
import { leumiXlsx, coverThenDataXlsx, buildXlsx, zipBuild, oddLayoutXlsx, oleXls, odsFile, ISRACARD_HTML, MAX_XMLSS } from "./sheet-fixtures.mjs";

const {
  parseCSV, sniffMap, parseImportDate, parseImportAmount, normalizeMerchant, shopKey,
  csvDecodeBytes, csvSkeleton, csvFingerprint, csvDetectDateFormat, csvDetectSign,
  csvCellKind, csvFirstDataRow
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

// A file, read the way the app reads one: bytes in, rows and a mapping out.
function read(fx) {
  const dec = csvDecodeBytes(fx.bytes().buffer);
  const rows = parseCSV(dec.text);
  const sk = csvSkeleton(rows);
  const headerRow = sk.head.length ? sk.head.length - 1 : -1;
  const map = sniffMap(headerRow >= 0 ? rows.slice(headerRow) : rows, headerRow >= 0);
  const first = headerRow >= 0 ? headerRow + 1 : 0;
  return {
    dec, rows, sk, headerRow, map, first,
    fmt: csvDetectDateFormat(rows, map.date, first),
    sign: csvDetectSign(rows, map, first, "all_rows_are_charges")
  };
}

// ---------------------------------------------------------------- encoding --
group("Encoding");
{
  const r = csvDecodeBytes(toCp1255(ALL.LEUMI.text).buffer);
  eq("windows-1255 is detected", r.encoding, "windows-1255");
  ok("Hebrew survives the cp1255 round trip", r.text.indexOf("שופרסל דיל תל אביב") !== -1,
    "first line read as: " + r.text.split("\n")[0]);

  const u = csvDecodeBytes(toUtf8(ALL.ISRACARD.text).buffer);
  eq("UTF-8 stays UTF-8", u.encoding, "utf-8");
  ok("Hebrew survives UTF-8", u.text.indexOf("סינמה סיטי גלילות") !== -1);

  const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...toUtf8("תאריך,סכום\n01/09/2026,5.00")]);
  ok("a UTF-8 BOM does not become a stray character", csvDecodeBytes(bom.buffer).text.charCodeAt(0) === "ת".charCodeAt(0));

  // Excel's "Save as Unicode Text" writes UTF-16LE, which is byte-wise valid
  // UTF-8 and would otherwise decode to text full of NULs.
  const u16 = [0xff, 0xfe];
  for (const ch of "תאריך,סכום") { const c = ch.charCodeAt(0); u16.push(c & 0xff, c >> 8); }
  eq("UTF-16LE is detected from its BOM", csvDecodeBytes(Uint8Array.from(u16).buffer).encoding, "utf-16le");
}

// ------------------------------------------------------- the column guesser --
group("Columns, with no model involved (the offline fallback)");
{
  const L = read(ALL.LEUMI);
  eq("Leumi: two report lines sit above the header", L.headerRow, 2);
  eq("Leumi: date", L.map.date, 0);
  eq("Leumi: shop", L.map.desc, 1);
  eq("Leumi: money out", L.map.debit, 3);
  eq("Leumi: money in", L.map.credit, 4);
  ok("Leumi: the running balance is NOT read as the amount", L.map.amount === -1, "amount=" + L.map.amount);
  ok("Leumi: split columns are recognised", L.sign.splitAmt === true);
  ok("Leumi: day-first, proved by the rows", L.fmt.preferDMY === true && L.fmt.sure === true, L.fmt.reason);

  const I = read(ALL.ISRACARD);
  eq("Isracard: three report lines above the header", I.headerRow, 3);
  eq("Isracard: date", I.map.date, 0);
  eq("Isracard: shop", I.map.desc, 1);
  eq("Isracard: the CHARGED amount wins over the transaction amount", I.map.amount, 3);
  ok("Isracard: nothing negative, so every line is money out", I.sign.allExpenses === true, I.sign.reason);

  const M = read(ALL.MAX);
  eq("Max: date", M.map.date, 0);
  eq("Max: shop", M.map.desc, 1);
  eq("Max: amount", M.map.amount, 3);
  ok("Max: a refund means the file is signed, not all-expenses", M.sign.allExpenses === false, M.sign.reason);

  const E = read(ALL.ENGLISH);
  eq("English: date", E.map.date, 0);
  eq("English: shop", E.map.desc, 1);
  eq("English: amount", E.map.amount, 2);

  const U = read(ALL.US_MDY);
  eq("US: transaction date beats value date", U.map.date, 0);
  eq("US: shop", U.map.desc, 2);
  eq("US: amount, not balance", U.map.amount, 3);
  ok("US: month-first, proved by the rows", U.fmt.preferDMY === false && U.fmt.sure === true, U.fmt.reason);

  const H = read(ALL.HEADERLESS);
  eq("Headerless: nothing sits above the data", H.sk.head.length, 0);
  eq("Headerless: data starts at row 0", csvFirstDataRow(H.rows, H.sk.columns), 0);
}

// ------------------------------------------------------------- what is sent --
group("What leaves the device");
{
  const KINDS = ["date", "number", "text", "empty"];
  const VARIETY = ["empty", "one value", "a few values", "mostly different", "many values"];

  for (const [name, fx] of Object.entries(ALL)) {
    const { rows, sk, headerRow } = read(fx);
    const headRows = rows.slice(0, headerRow >= 0 ? headerRow + 1 : 0);
    const dataRows = rows.slice(headerRow >= 0 ? headerRow + 1 : 0);

    // The real invariant, stated structurally: every piece of text in the
    // payload is a masked cell from a row ABOVE the data, and everything else
    // is a kind word, a fixed phrase or a number. Nothing else can get in.
    let stray = null;
    sk.head.forEach((r, ri) => {
      r.forEach((cell, ci) => {
        const want = app.csvMaskCell((headRows[ri] || [])[ci]);
        if (cell !== want && stray === null) stray = "head[" + ri + "][" + ci + "] = " + JSON.stringify(cell);
      });
    });
    ok(name + ": head carries only the masked rows above the data", stray === null, stray);

    const kinds = new Set(sk.shape.flat());
    ok(name + ": the data rows are reduced to kinds", [...kinds].every((k) => KINDS.includes(k)),
      "saw " + JSON.stringify([...kinds]));

    const badProfile = sk.profiles.find((p) =>
      !KINDS.includes(p.kind) || !VARIETY.includes(p.variety) ||
      typeof p.i !== "number" || typeof p.filledPct !== "number" || typeof p.hasNegatives !== "boolean");
    ok(name + ": the column profiles are aggregates, not values", !badProfile, JSON.stringify(badProfile));

    // And the blunt scan on top, for anything the structure check might miss.
    // A value that already appears in the file's own header titles is excluded
    // - "בית" inside "שם בית העסק" is a title we mean to send, not a leak.
    const headText = headRows.map((r) => r.join(" ")).join(" ");
    const sent = JSON.stringify(sk);
    let leaked = null;
    for (const r of dataRows) {
      for (const cell of r) {
        const v = String(cell || "").trim();
        if (v.length < 3 || headText.indexOf(v) !== -1) continue;
        if (sent.indexOf(v) !== -1) { leaked = v; break; }
      }
      if (leaked) break;
    }
    ok(name + ": no value from a purchase row reaches the payload", leaked === null, "leaked " + JSON.stringify(leaked));
  }

  // Account numbers live in the lines above the header, which ARE sent as text.
  const L = read(ALL.LEUMI);
  const sent = JSON.stringify(L.sk);
  ok("Leumi: the account number is masked out of the header lines", sent.indexOf("67890") === -1 && sent.indexOf("12-345") === -1,
    "head: " + JSON.stringify(L.sk.head[1]));
  ok("Leumi: the column titles ARE sent, which is the point", sent.indexOf("תאריך") !== -1 && sent.indexOf("יתרה") !== -1);
}

// ------------------------------------------------------------ the cache key --
group("The format fingerprint");
{
  const sep = read(ALL.LEUMI);
  // Same bank, next month: different dates, different balances, different
  // account line. The fingerprint has to survive all of it or the cache never
  // hits and every import pays for a model call.
  const october = ALL.LEUMI.text
    .replace("מתאריך 01/09/2026 עד 30/09/2026", "מתאריך 01/10/2026 עד 31/10/2026")
    .replace(/\/09\/2026/g, "/10/2026")
    .replace("18500.00", "19250.00");
  const oct = csvSkeleton(parseCSV(october));
  eq("the same bank next month is the same format", csvFingerprint(oct), csvFingerprint(sep.sk));

  const other = csvSkeleton(parseCSV(ALL.ISRACARD.text));
  ok("a different issuer is a different format", csvFingerprint(other) !== csvFingerprint(sep.sk));
}

// ------------------------------------------------- the rows a user would see --
group("The rows that would land in Activity");
{
  // Mirrors what buildTxs does with the mapping: date through parseImportDate,
  // amount through parseImportAmount, label from the shop column.
  const L = read(ALL.LEUMI);
  const salary = L.rows[L.first];
  eq("Leumi: the salary date", parseImportDate(salary[L.map.date], L.fmt.preferDMY), "2026-09-01");
  eq("Leumi: the salary is money in", parseImportAmount(salary[L.map.credit]), 18500);
  const shufersal = L.rows[L.first + 1];
  eq("Leumi: a purchase date", parseImportDate(shufersal[L.map.date], L.fmt.preferDMY), "2026-09-02");
  eq("Leumi: a purchase amount", parseImportAmount(shufersal[L.map.debit]), 342.9);
  eq("Leumi: the shop name", shufersal[L.map.desc], "שופרסל דיל תל אביב");

  const I = read(ALL.ISRACARD);
  const cinema = I.rows[I.first + 1];
  eq("Isracard: the date is read day-first", parseImportDate(cinema[I.map.date], I.fmt.preferDMY), "2026-09-04");
  eq("Isracard: the charged amount", parseImportAmount(cinema[I.map.amount]), 94);

  const U = read(ALL.US_MDY);
  eq("US: the date is read month-first", parseImportDate(U.rows[U.first][U.map.date], U.fmt.preferDMY), "2026-09-13");
}

// ----------------------------------------------------- Hebrew shop identity --
group("Hebrew merchants");
{
  eq("a Hebrew shop keeps an identity", normalizeMerchant("מקס איט"), "מקס איט");
  eq("a branch number is not an identity on its own", normalizeMerchant("4471"), "");
  ok("two different Hebrew shops do not collide", shopKey("שופרסל 4") !== shopKey("רמי לוי 4"));
  eq("an English shop is unchanged", normalizeMerchant("STARBUCKS #1123 SEATTLE"), "starbucks");
  ok("a shop key is never empty", shopKey("12345").length > 0);
}

// ------------------------------------------------------------ random shuffle --
group("Randomised column order (50 shuffles of the Isracard file)");
{
  // A deterministic RNG, so a failure can be reproduced from the seed printed
  // with it rather than being a story about a run nobody kept.
  let seed = 20260922;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  const base = parseCSV(ISRACARD);
  const TITLES = ["תאריך עסקה", "שם בית העסק", "סכום עסקה", "סכום חיוב", "מטבע"];
  let bad = 0, firstBad = null;
  for (let n = 0; n < 50; n++) {
    const perm = TITLES.map((_, i) => i);
    for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const rows = base.map((r, ri) => (ri < 3 ? r : perm.map((p) => r[p])));
    const sk = csvSkeleton(rows);
    const hRow = sk.head.length ? sk.head.length - 1 : -1;
    const map = sniffMap(rows.slice(hRow), true);
    const want = {
      date: perm.indexOf(0), desc: perm.indexOf(1), amount: perm.indexOf(3)
    };
    const got = { date: map.date, desc: map.desc, amount: map.amount };
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      bad++;
      if (!firstBad) firstBad = { order: perm.map((p) => TITLES[p]), got, want };
    }
  }
  ok("column order never matters - titles decide", bad === 0,
    bad + "/50 shuffles misread. First: " + JSON.stringify(firstBad));
}

// ------------------------------------------------- reading a model's answer --
// The real mapColumnsWithAI and categorizeShopsWithAI, with the network
// stubbed. judgeLookalikes measured this same model fencing its JSON in 7 of 9
// live calls, so the fenced case is the normal case, not the edge one.
group("Reading what the model sends back");
{
  const { setClaude, mapColumnsWithAI, categorizeShopsWithAI } = app;
  const sk = csvSkeleton(parseCSV(ALL.LEUMI.text));
  const reply = (text) => setClaude((m, s, mt, cb) => cb(null, text));
  const boom = (err) => setClaude((m, s, mt, cb) => cb(err || new Error("network"), null));

  const GOOD = JSON.stringify({
    header_row_index: 2, date_column: 0, shop_column: 1, amount_column: null,
    debit_column: 3, credit_column: 4, date_format: "dd/mm/yyyy",
    amount_sign_convention: "split_columns",
    confidence: { header_row_index: "high", date_column: "high", shop_column: "high", amount_column: "high" }
  });

  let got;
  reply(GOOD); mapColumnsWithAI(sk, (e, r) => { got = r; });
  eq("a clean answer is read", [got.headerRowIndex, got.date, got.desc, got.debit, got.credit], [2, 0, 1, 3, 4]);
  eq("a null column becomes -1", got.amount, -1);

  reply("```json\n" + GOOD + "\n```");
  mapColumnsWithAI(sk, (e, r) => { got = r; });
  eq("a fenced answer is read - the usual case, not the edge case", got.date, 0);

  reply("Here is the mapping you asked for:\n" + GOOD + "\nHope that helps!");
  mapColumnsWithAI(sk, (e, r) => { got = r; });
  eq("prose either side is stripped", got.desc, 1);

  reply(JSON.stringify({ date_column: 99, shop_column: -3, amount_column: "two", confidence: { date_column: "certain" } }));
  mapColumnsWithAI(sk, (e, r) => { got = r; });
  eq("a column outside the file is refused", [got.date, got.desc, got.amount], [-1, -1, -1]);
  eq("a confidence word we did not offer reads as low", got.confidence.date, "low");

  let err;
  reply("I'm not sure what you mean.");
  mapColumnsWithAI(sk, (e, r) => { err = e; got = r; });
  ok("an unreadable answer is an error, never a guess", !!err && got === null);

  boom();
  mapColumnsWithAI(sk, (e, r) => { err = e; got = r; });
  ok("a failed call is an error, never a guess", !!err && got === null);

  // --- phase 2 ---
  const cats = [{ name: "Food" }, { name: "Transport" }, { name: "Other" }];
  let out, meta;
  reply(JSON.stringify([
    { shop: "שופרסל דיל", category: "Food", confidence: "high" },
    { shop: "פנגו חניה", category: "Transport", confidence: "medium" },
    { shop: "מקס איט", category: "Groceries", confidence: "high" }
  ]));
  categorizeShopsWithAI(["שופרסל דיל", "פנגו חניה", "מקס איט"], cats, [], (e, o, m) => { out = o; meta = m; });
  eq("a shop is sorted", out["שופרסל דיל"].category, "Food");
  ok("a category outside the closed set is dropped, not coerced", out["מקס איט"] === undefined,
    JSON.stringify(out["מקס איט"]));
  eq("one call for a small list", meta.calls, 1);

  // Over the per-call size, so it chunks - and one chunk failing must not lose
  // the other.
  const many = Array.from({ length: 60 }, (_, i) => "shop " + i);
  let nth = 0;
  setClaude((m, s, mt, cb) => {
    nth++;
    if (nth === 1) { cb(new Error("network"), null); return; }
    const sent = JSON.parse(m[0].content).shops;
    cb(null, JSON.stringify(sent.map((x) => ({ shop: x, category: "Food", confidence: "high" }))));
  });
  nth = 0;
  let partialErr = "unset";
  categorizeShopsWithAI(many, cats, [], (e, o, m) => { partialErr = e; out = o; meta = m; });
  eq("a long list is split across calls", meta.calls, 2);
  eq("one chunk failing loses only that chunk", meta.failed, 1);
  ok("the surviving chunk is kept", Object.keys(out).length === 10, Object.keys(out).length + " kept");
  ok("a partial answer is not reported as a failure", partialErr === null, "err was " + partialErr);

  nth = 0;
  setClaude((m, s, mt, cb) => cb(new Error("network"), null));
  let sErr;
  categorizeShopsWithAI(["a", "b"], cats, [], (e, o, m) => { sErr = e; out = o; });
  ok("every chunk failing IS an error", !!sErr && Object.keys(out).length === 0);

  setClaude(null);
}

// ------------------------------------------------- spreadsheets, not text --
// A .xlsx is a zip of XML and a bank's .xls is usually an HTML page, so none
// of this can be checked by reading a string: the fixtures build the real
// bytes - real DEFLATE, real CRCs - and the reader does the same work it does
// on a file downloaded from Bank Leumi.
group("Excel files, read on the device");
{
  const {
    sheetReadBytes, sheetReadNote, sheetSerialToDate, sheetFmtIsDate, xlsxDateStyles,
    xlsxSharedStrings, sheetMarkupKind, sheetColFromRef, htmlSheetRows, sniffMap, csvSkeleton
  } = app;

  const read = (bytes, name) => new Promise((res) =>
    sheetReadBytes(bytes.buffer ? bytes.buffer : bytes, name, (err, out) => res(err ? { err: err.message } : out)));
  const bytesOf = (text) => toUtf8(text);
  const mapOf = (rows) => {
    const sk = csvSkeleton(rows);
    const headerRow = sk.head.length ? sk.head.length - 1 : -1;
    return { headerRow, map: sniffMap(headerRow >= 0 ? rows.slice(headerRow) : rows, headerRow >= 0) };
  };

  // --- the date/number line, which is the whole reason a sheet is not a CSV --
  eq("serial 1 is 1 January 1900", sheetSerialToDate(1, false), "1900-01-01");
  eq("serial 59 is 28 February 1900", sheetSerialToDate(59, false), "1900-02-28");
  eq("serial 61 is 1 March 1900 - Excel's phantom leap day is taken back off",
    sheetSerialToDate(61, false), "1900-03-01");
  eq("a 2026 serial lands on the right day", sheetSerialToDate(46266, false), "2026-09-01");
  eq("the Mac 1904 calendar has its own epoch", sheetSerialToDate(1, true), "1904-01-02");
  eq("a serial with no date part is a clock time, not 1899", sheetSerialToDate(0.5, false), "12:00");

  ok("General is not a date format", !sheetFmtIsDate("General"));
  ok("a money format is not a date format", !sheetFmtIsDate("#,##0.00"));
  ok("an accounting format with a shekel in quotes is not a date format",
    !sheetFmtIsDate("_-* #,##0.00\\ \"₪\"_-;-* #,##0.00\\ \"₪\"_-"));
  ok("a locale-prefixed date format is a date format", sheetFmtIsDate("[$-409]dd/mm/yyyy;@"));
  ok("a bare dd/mm/yy is a date format", sheetFmtIsDate("dd/mm/yy"));

  // styles.xml holds TWO lists of <xf>. Cells point at the second one, and a
  // reader that takes the first reads every date as a number.
  const styles = "<styleSheet><numFmts><numFmt numFmtId=\"164\" formatCode=\"dd/mm/yyyy;@\"/></numFmts>"
    + "<cellStyleXfs count=\"3\"><xf numFmtId=\"0\"/><xf numFmtId=\"0\"/><xf numFmtId=\"0\"/></cellStyleXfs>"
    + "<cellXfs count=\"3\"><xf numFmtId=\"0\"/><xf numFmtId=\"14\"/><xf numFmtId=\"164\"/></cellXfs></styleSheet>";
  eq("cellXfs is read, not cellStyleXfs", xlsxDateStyles(styles), [false, true, true]);

  eq("rich text split across runs is one string",
    xlsxSharedStrings("<sst><si><r><t>שופרסל</t></r><r><t xml:space=\"preserve\"> דיל</t></r></si><si><t>פנגו</t></si></sst>"),
    ["שופרסל דיל", "פנגו"]);
  eq("&amp; in a shop name comes back as an ampersand",
    xlsxSharedStrings("<sst><si><t>סופר פארם &amp; בע\"מ</t></si></sst>"), ["סופר פארם & בע\"מ"]);
  eq("AB is the 28th column", sheetColFromRef("AB12"), 27);

  // --- a real workbook ------------------------------------------------------
  const leumi = await read(leumiXlsx(), "tnuot.xlsx");
  eq("a .xlsx is read without ever becoming text", leumi.kind, "xlsx");
  eq("the sheet is named, so a user can see WHICH tab was read", leumi.sheet, "תנועות");
  eq("every line arrives", leumi.rows.length, 9);
  eq("a date cell arrives as a date and not as 46266", leumi.rows[3][0], "2026-09-01");
  eq("the column guesser agrees it is a date", app.csvCellKind(leumi.rows[3][0]), "date");
  eq("a reference number that is NOT date-formatted stays a number", leumi.rows[3][2], "1234567");
  eq("an amount keeps its own digits, with no float dust", leumi.rows[6][3], "412.55");
  eq("a running balance keeps its own digits too", leumi.rows[3][5], "21450.3");
  ok("an empty cell holds its place, so the columns still line up",
    leumi.rows[3][3] === "" && leumi.rows[3][4] === "18500", JSON.stringify(leumi.rows[3]));

  // The invariant that makes this worth doing at all: the same statement, as a
  // CSV and as a workbook, reaches the mapping screen as the same thing.
  const asCsv = mapOf(parseCSV(ALL.LEUMI.text));
  const asXlsx = mapOf(leumi.rows);
  eq("the same statement maps the same whether it arrives as CSV or as Excel",
    [asXlsx.headerRow, asXlsx.map.date, asXlsx.map.desc, asXlsx.map.debit, asXlsx.map.credit],
    [asCsv.headerRow, asCsv.map.date, asCsv.map.desc, asCsv.map.debit, asCsv.map.credit]);
  ok("the running balance is not read as the amount here either", asXlsx.map.amount === -1);

  const note = sheetReadNote({ name: "tnuot.xlsx" }, leumi);
  ok("the screen says which file, which sheet and how many lines",
    note.indexOf("tnuot.xlsx") !== -1 && note.indexOf("תנועות") !== -1 && note.indexOf("9 lines") !== -1, note);

  const stored = await read(leumiXlsx({ storeStrings: true }), "tnuot.xlsx");
  eq("an uncompressed part inside the zip is read too", stored.rows.length, 9);
  eq("and its strings survive", stored.rows[4][1], "שופרסל דיל תל אביב");

  const cover = await read(coverThenDataXlsx(), "workbook.xlsx");
  eq("a cover sheet is skipped for the tab that actually holds the table", cover.sheet, "תנועות");
  eq("even when that tab is hidden", cover.rows.length, 9);

  const inline = buildXlsx([{ name: "Sheet1", rows: [
    [{ inline: "Date" }, { inline: "Shop" }, { inline: "Amount" }],
    [{ date: "2026-09-03", custom: true }, { inline: "Cafe Joe" }, { n: -12.5 }]
  ] }]);
  const inl = await read(inline, "export.xlsx");
  eq("inline strings - what exporters that are not Excel write - are read",
    inl.rows[1][1], "Cafe Joe");
  eq("a custom dd/mm/yyyy format is still a date", inl.rows[1][0], "2026-09-03");

  // Nothing in a .xlsx has to live at xl/: the package says where the workbook
  // is, the workbook says where its sheets and strings are, and an exporter
  // that is not Excel is free to lay it out differently.
  const odd = await read(oddLayoutXlsx(), "export.xlsx");
  eq("a workbook laid out somewhere other than xl/ is still found", odd.sheet, "Statement");
  eq("and its strings are found with it", odd.rows[1][1], "Cafe Joe");
  // --- files that are not what their name says -------------------------------
  const old = await read(oleXls(), "statement.xls");
  ok("the 1997 binary .xls is named, not read as eight bytes of shop name",
    old.err && old.err.indexOf(".xls") !== -1, old.err);
  const ods = await read(odsFile(), "sheet.ods");
  ok("a LibreOffice sheet says so, rather than failing as a broken Excel file",
    ods.err && /LibreOffice/.test(ods.err), ods.err);
  const zip = await read(zipBuild([{ name: "notes.txt", data: "hello" }]), "download.zip");
  ok("any other zip says to unzip it first", zip.err && /zip file/.test(zip.err), zip.err);

  const hurt = leumiXlsx().slice(0, -40);
  const broken = await read(hurt, "tnuot.xlsx");
  ok("a truncated workbook is an error, never half an import", !!broken.err, JSON.stringify(broken).slice(0, 80));
  ok("an .xlsx name on something that is not a zip is refused rather than read as text",
    (await read(bytesOf("just some words"), "book.xlsx")).err !== undefined);
  eq("an empty file is an empty file", (await read(new Uint8Array(0), "x.csv")).err, "That file was empty.");

  // --- the .xls that is really an HTML page ---------------------------------
  const card = await read(bytesOf(ISRACARD_HTML), "isracard.xls");
  eq("an HTML page named .xls is read as the table it is", card.kind, "html");
  eq("the statement table wins, not the layout table wrapped around it", card.rows.length, 8);
  eq("a row with no closing tags is still five cells",
    card.rows[2], ["03/09/2026", "מקס איט", "129.00", "129.00", "ש\"ח"]);
  eq("&nbsp; is a space, not a word", card.rows[3][1], "סינמה סיטי גלילות");
  eq("&amp; and &quot; come back as themselves", card.rows[7][1], "סופר פארם & בע\"מ");
  eq("a colspan title row keeps the table's width", card.rows[0].length, 5);
  const cardMap = mapOf(card.rows);
  eq("the columns of a card statement are found in it", [cardMap.headerRow, cardMap.map.date, cardMap.map.desc], [1, 0, 1]);
  eq("and the charged amount is preferred over the transaction amount", cardMap.map.amount, 3);
  eq("a shop name with a < in it is not an HTML file", sheetMarkupKind("date,shop\n01/09/2026,A < B"), "");
  eq("a table with no rows in it is not a table", htmlSheetRows("<html><table></table></html>"), []);

  // --- SpreadsheetML 2003 ----------------------------------------------------
  const max = await read(bytesOf(MAX_XMLSS), "max.xls");
  eq("the 2003 XML format is read", max.kind, "xmlss");
  eq("a DateTime is a date", max.rows[2][0], "2026-09-02");
  eq("bold markup inside a cell is not part of the shop name", max.rows[2][1], "קפה ג'ו");
  eq("ss:Index leaves the gap it says it leaves", max.rows[3], ["2026-09-06", "", "-119"]);
  eq("a merged title cell keeps the width", max.rows[0].length, 3);

  // --- text is still text ----------------------------------------------------
  const csv = await read(toCp1255(ALL.LEUMI.text), "tnuot.csv");
  eq("a CSV still comes back as text", csv.kind, "csv");
  eq("with its encoding sniffed exactly as before", csv.encoding, "windows-1255");
  const tsv = await read(bytesOf("תאריך\tשם בית העסק\tסכום\n01/09/2026\tארומה\t32.00"), "bank.xls");
  eq("a tab-separated file named .xls goes down the text path, where the delimiter is sniffed", tsv.kind, "csv");
}

// ------------------------------------------------------------------- report --
console.log("\n" + "-".repeat(64));
if (fail) {
  console.log(fail + " FAILED, " + pass + " passed\n");
  failures.forEach((f) => console.log("  FAIL  " + f));
  process.exit(1);
}
console.log("all " + pass + " checks passed");
