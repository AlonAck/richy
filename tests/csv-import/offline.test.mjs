// Everything in the CSV import that does not need a model: decoding, the
// column guesser, the privacy skeleton, the fingerprint cache key, and the
// date/sign detection that runs on the rows themselves.
//
//   npm run test:csv
//
// The model leg is tests/csv-import/live-model.mjs, which needs a key.
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
  ok("Isracard: nothing negative, so every line is money out", I.sign.positiveOut === true && I.sign.sure === true, I.sign.why);

  const M = read(ALL.MAX);
  eq("Max: date", M.map.date, 0);
  eq("Max: shop", M.map.desc, 1);
  eq("Max: amount", M.map.amount, 3);
  ok("Max: its charges are the minus lines, so a minus is money out", M.sign.positiveOut === false, M.sign.why);

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
      typeof p.i !== "number" || typeof p.filledPct !== "number" || typeof p.hasNegatives !== "boolean" ||
      !["no numbers", "none", "a few", "some", "most", "all"].includes(p.negatives));
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

// ------------------------------------------------- a date is never money --
// The live bug: a 29-shekel coffee imported as 20,260,923, because a date
// column was taken for the amount. Three ways in, each closed separately, and
// the last check (csvRepairMap) catches whatever picked the column.
group("A date is never read as an amount");
{
  const { csvRepairMap } = app;
  ok("an ISO date is not an amount", isNaN(parseImportAmount("2026-09-23")), String(parseImportAmount("2026-09-23")));
  ok("a day-first date is not an amount", isNaN(parseImportAmount("23/09/2026")));
  ok("a dotted date is not an amount", isNaN(parseImportAmount("23.09.26")));
  eq("an ordinary amount still reads", parseImportAmount("29.00"), 29);
  eq("a thousands amount still reads", parseImportAmount("1,234.50"), 1234.5);
  eq("a European amount still reads", parseImportAmount("1.234,56"), 1234.56);
  eq("a minus amount still reads", parseImportAmount("-29.00"), -29);

  // Isracard/Max: the charge date sits between the two amounts.
  const card = [
    ["תאריך עסקה", "שם בית העסק", "סכום עסקה", "תאריך חיוב", "סכום חיוב"],
    ["2026-09-20", "קפה גרג", "29.00", "2026-10-02", "29.00"],
    ["2026-09-21", "שופרסל דיל", "112.40", "2026-10-02", "112.40"],
    ["2026-09-22", "פז יקום", "250.00", "2026-10-02", "250.00"]
  ];
  const cm = sniffMap(card, true);
  eq("the charge date (תאריך חיוב) is not a money-out column", cm.debit, -1);
  eq("the charged amount (סכום חיוב) is the amount", cm.amount, 4);
  eq("the purchase date is the date", cm.date, 0);

  // No titles, two date columns: the second one used to become the amount.
  const bare = [
    ["2026-09-20", "קפה גרג", "2026-09-23", "29.00"],
    ["2026-09-21", "שופרסל דיל", "2026-09-23", "112.40"],
    ["2026-09-22", "פז יקום", "2026-09-24", "250.00"]
  ];
  const bm = sniffMap(bare, false);
  eq("no titles: the second date column is not the amount", bm.amount, 3);
  eq("no titles: the shop is the words, not the longer dates", bm.desc, 1);

  // Whatever named the columns - the model, a saved layout - the rows win.
  const fallback = sniffMap(card, true);
  let r = csvRepairMap(card, 1, { date: 0, desc: 1, amount: 3, debit: -1, credit: -1 }, fallback);
  eq("a model that names the charge date as the amount is overruled", r.map.amount, 4);
  eq("  and says which role it changed", r.fixed, ["amount"]);
  r = csvRepairMap(card, 1, { date: 0, desc: 1, amount: -1, debit: 3, credit: -1 }, fallback);
  eq("a saved layout with the date as money out is healed", [r.map.amount, r.map.debit], [4, -1]);
  r = csvRepairMap(card, 1, { date: 0, desc: 1, amount: 0, debit: -1, credit: -1 }, fallback);
  eq("the date column cannot also be the amount", r.map.amount, 4);
  r = csvRepairMap(card, 1, { date: 2, desc: 1, amount: 0, debit: -1, credit: -1 }, fallback);
  eq("date and amount swapped both come back", [r.map.date, r.map.amount], [0, 4]);
  r = csvRepairMap(card, 1, { date: 0, desc: 3, amount: 4, debit: -1, credit: -1 }, fallback);
  eq("a shop column that is really dates is replaced", r.map.desc, 1);
  r = csvRepairMap(card, 1, { date: 0, desc: 1, amount: 3, debit: -1, credit: -1 }, { date: 0, desc: 1, amount: -1, debit: -1, credit: -1 });
  eq("with nothing better to offer, the amount is left for the user to pick", r.map.amount, -1);
  r = csvRepairMap(card, 1, { date: 0, desc: 1, amount: 4, debit: -1, credit: -1 }, fallback);
  eq("a sound reading is left exactly as it was", [r.map, r.fixed], [{ date: 0, amount: 4, desc: 1, debit: -1, credit: -1, cat: -1 }, []]);

  // Every real fixture: the checker must not touch a correct reading.
  for (const name of Object.keys(ALL)) {
    const f = read(ALL[name]);
    const rr = csvRepairMap(f.rows, f.first, f.map, f.map);
    eq(name + ": a correct reading passes the check untouched", rr.fixed, []);
  }
}

// ------------------------------------------------------- money in or out --
// The live bug: a card statement with one refund in it imported every charge
// as income, because "any minus in the file" meant "a minus is money out".
group("Money in or money out");
{
  const { csvRowMoney, csvRepairMap, setClaude, mapColumnsWithAI } = app;
  // Read a CSV the way the app does, then sign it with a given model answer.
  function signOf(text, modelSays, userSays) {
    const rows = parseCSV(text);
    const sk = csvSkeleton(rows);
    const h = sk.head.length ? sk.head.length - 1 : -1;
    const map = sniffMap(h >= 0 ? rows.slice(h) : rows, h >= 0);
    const first = h >= 0 ? h + 1 : 0;
    const sign = csvDetectSign(rows, map, first, modelSays || "", userSays || "");
    map.flow = sign.flowCol;
    const types = rows.slice(first).map((r) => {
      const m = csvRowMoney(r, map, sign.splitAmt, sign.positiveOut);
      return m ? m.type[0] : "-";
    }).join("");
    return { sign, types, map };
  }

  const CARD_REFUND = [
    "פירוט עסקאות לכרטיס ישראכרט",
    "תאריך עסקה,שם בית העסק,סכום חיוב",
    "01/09/2026,קפה גרג,29.00",
    "03/09/2026,שופרסל דיל,212.40",
    "05/09/2026,זיכוי - זארה,-149.90",
    "07/09/2026,פז יקום,250.00",
    "11/09/2026,נטפליקס,54.90"
  ].join("\n");
  let s = signOf(CARD_REFUND);
  eq("card statement with a refund: charges are money out, the refund is money in", s.types, "eeiee");
  ok("  and it is sure of it", s.sign.sure === true, s.sign.why);
  s = signOf(CARD_REFUND, "negative_is_expense");
  eq("  even when the model reads it as a bank account", s.types, "eeiee");

  s = signOf(ALL.CAL_REFUND.text);
  eq("Cal (charge date + one refund): the amount is the charged column, not the charge date", s.map.amount, 4);
  eq("  and only the refund is money in", s.types, "eeiee");

  const CARD_PLAIN = [
    "תאריך,בית עסק,סכום",
    "01/09/2026,ארומה,32.00",
    "02/09/2026,רב קו,50.00",
    "04/09/2026,איקאה,640.00"
  ].join("\n");
  eq("no minus anywhere and no model hint at all: every line is money out", signOf(CARD_PLAIN).types, "eee");

  const BANK = [
    "תאריך,תיאור,סכום,יתרה",
    "01/09/2026,משכורת,12500.00,15200.00",
    "02/09/2026,שכר דירה,-4800.00,10400.00",
    "05/09/2026,העברה מאמא,500.00,10900.00",
    "08/09/2026,חברת חשמל,-310.00,10590.00"
  ].join("\n");
  s = signOf(BANK, "positive_is_expense");
  eq("bank account, even a month with more in than out: a minus is money out", s.types, "ieie");
  ok("  and the model's wrong card reading does not flip it", s.sign.positiveOut === false, s.sign.why);

  eq("English bank export, mostly minus: salary is money in", read(ALL.ENGLISH).sign.positiveOut, false);

  const DRCR = [
    "Date,Description,Amount,Type",
    "2026-09-01,ACME PAYROLL,3000.00,CR",
    "2026-09-02,TESCO,54.20,DR",
    "2026-09-03,SHELL,61.00,DR"
  ].join("\n");
  s = signOf(DRCR);
  eq("unsigned amounts with a DR/CR column: the column is found", s.map.flow, 3);
  eq("  and each line follows its own marker", s.types, "iee");

  const HEB_FLOW = [
    "תאריך,תיאור,סכום,סוג",
    "01/09/2026,משכורת,9000,זכות",
    "02/09/2026,רמי לוי,300,חובה"
  ].join("\n");
  eq("the same in Hebrew, חובה/זכות", signOf(HEB_FLOW).types, "ie");

  const UNSIGNED_BANK = [
    "תאריך,תיאור,סכום,יתרה",
    "01/09/2026,משכורת,9000,9000",
    "02/09/2026,רמי לוי,300,8700"
  ].join("\n");
  ok("a bank file with every sign stripped is flagged as unsure, not guessed", signOf(UNSIGNED_BANK).sign.sure === false);

  const NAME_ABOVE = [
    "דוח תנועות - מיכאל כהן",
    "תאריך,תיאור,סכום",
    "01/09/2026,רמי לוי,-300",
    "02/09/2026,ארומה,-32",
    "03/09/2026,משכורת,9000"
  ].join("\n");
  eq("a name like מיכאל in the title is not read as the card company כאל", signOf(NAME_ABOVE).types, "eei");

  eq("the user's own answer for this bank outranks everything", signOf(BANK, "", "positive_out").types, "eiei");

  // Split columns the wrong way round: the titles say which is which.
  const LEUMI_ROWS = parseCSV(ALL.LEUMI.text);
  const lh = csvSkeleton(LEUMI_ROWS).head.length - 1;
  const lfb = sniffMap(LEUMI_ROWS.slice(lh), true);
  const swapped = { date: lfb.date, desc: lfb.desc, amount: -1, debit: lfb.credit, credit: lfb.debit };
  const fixedUp = csvRepairMap(LEUMI_ROWS, lh + 1, swapped, lfb);
  eq("money in and out swapped against their own titles are put back", [fixedUp.map.debit, fixedUp.map.credit], [lfb.debit, lfb.credit]);
  eq("  and it says so", fixedUp.fixed, ["inout"]);

  // The column reading now goes to Sonnet, thinking at medium effort.
  let sent = null;
  setClaude((m, sys, mt, cb, model, to, extra) => { sent = { model, mt, extra }; cb(null, "{}"); });
  mapColumnsWithAI(csvSkeleton(parseCSV(ALL.LEUMI.text)), () => {});
  eq("the column reading is asked of Sonnet 5", sent.model, "claude-sonnet-5");
  eq("  at medium effort", sent.extra, { effort: "medium" });
  ok("  with room to think before it answers", sent.mt >= 4000, "maxTokens " + sent.mt);
}

// ---------------------------------------------------------- shop categories --
group("Shop categories");
{
  const { keywordCatName, suggestCatId, csvShopHistory, csvPlanShops } = app;
  const CATS = [["c1", "Housing"], ["c2", "Food"], ["c3", "Transport"], ["c4", "Health"], ["c5", "Entertainment"],
    ["c6", "Shopping"], ["c8", "Salary"], ["c9", "Investments"], ["c10", "Savings"], ["c11", "Other"]].map(([id, name]) => ({ id, name }));
  const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || "";

  // The keyword map matched pieces of words.
  eq("STEAM GAMES is not Food (\"tea\" inside \"steam\")", keywordCatName("STEAM GAMES"), "Entertainment");
  ok("Coca-Cola is not Transport (\"ola\")", keywordCatName("COCA COLA ISRAEL") !== "Transport", keywordCatName("COCA COLA ISRAEL"));
  ok("a parent-teacher fee is not Housing (\"rent\")", keywordCatName("PARENT TEACHER ASSOC") !== "Housing");
  ok("a training plan is not Transport (\"train\")", keywordCatName("PERSONAL TRAINING") !== "Transport");
  ok("Microsoft Teams is not Food (\"tea\")", keywordCatName("MICROSOFT TEAMS") !== "Food");
  eq("a whole word still matches, plural too", keywordCatName("WHOLE FOODS MARKET"), "Food");
  eq("a stem matches its forms", keywordCatName("CITY GROCERIES"), "Food");
  eq("the longer keyword wins: uber eats is food", keywordCatName("UBER EATS"), "Food");
  eq("  and a plain uber is a ride", keywordCatName("UBER TRIP"), "Transport");
  // Israeli chains, which the map did not have at all.
  eq("שופרסל is Food", keywordCatName("שופרסל דיל תל אביב"), "Food");
  eq("סופר-פארם is Health, hyphen and all", keywordCatName("סופר-פארם רמת אביב"), "Health");
  eq("פז is fuel", keywordCatName("פז יקום"), "Transport");
  eq("רמי לוי תקשורת is a phone bill, not the supermarket", keywordCatName("רמי לוי תקשורת"), "Housing");
  eq("מחסני חשמל is a store, not the electricity bill", keywordCatName("מחסני חשמל חולון"), "Shopping");
  eq("חברת החשמל is the electricity bill", keywordCatName("חברת החשמל לישראל"), "Housing");
  eq("a Hebrew keyword is not found inside another word (פז / פזגז)", keywordCatName("פזגז"), "Housing");

  // The user's history: a shared city was enough to borrow a category.
  const HIST = [
    { label: "סופר פארם תל אביב", catId: "c4", type: "expense" },
    { label: "סופר פארם תל אביב", catId: "c4", type: "expense" }
  ];
  eq("a shared city is not evidence: ארומה תל אביב is not Health", catName(suggestCatId("ארומה תל אביב", HIST, CATS)), "Food");

  // Who decides. A partial match or a keyword used to settle a shop for
  // certain, so it never reached the model and never showed as a guess.
  const history = csvShopHistory([
    { label: "ארומה רמת החייל", catId: "c2", type: "expense" },
    { label: "ארומה רמת החייל", catId: "c2", type: "expense" },
    { label: "ארומה רמת החייל", catId: "c5", type: "expense" },
    { label: "סופר פארם תל אביב", catId: "c4", type: "expense" },
    { label: "Acme Ltd", catId: "c8", type: "income" },
    { label: "שופרסל", catId: "c2", type: "expense" },
    { label: "שופרסל", catId: "c6", type: "expense" }
  ]);
  const order = [
    { key: "ארומה רמת החייל", label: "ארומה רמת החייל" },   // own history: 2 of 3 Food
    { key: "ארומה תל אביב", label: "ארומה תל אביב" },       // only a partial match -> Alfred
    { key: "zara", label: "ZARA" },                         // saved guess from last time
    { key: "netflix", label: "NETFLIX" },                   // user corrected it
    { key: "שופרסל", label: "שופרסל" },                     // history split 1-1 -> Alfred
    { key: "acme", label: "Acme Ltd" }                      // only income history -> Alfred
  ];
  const saved = {
    zara: { category: "Shopping", source: "ai" },
    netflix: { category: "Entertainment", source: "user" },
    "ארומה רמת החייל": { category: "Health", source: "ai" }  // an old wrong guess
  };
  const plan = csvPlanShops(order, saved, history, CATS);
  eq("the user's own history for the same shop beats an old saved guess", [plan.out["ארומה רמת החייל"].category, plan.out["ארומה רמת החייל"].source], ["Food", "history"]);
  eq("a correction the user made is pinned", [plan.out.netflix.category, plan.out.netflix.source], ["Entertainment", "user"]);
  eq("a saved guess still answers when there's nothing better", plan.out.zara.source, "saved");
  eq("a partial match, a split history and income history all go to Alfred", plan.ask.map((s) => s.key), ["ארומה תל אביב", "שופרסל", "acme"]);

  // A star in front of the real merchant.
  const { normalizeMerchant: nm } = app;
  ok("PAYPAL *NETFLIX and PAYPAL *ALIEXPRESS are two shops, not one \"paypal\"", nm("PAYPAL *NETFLIX") !== nm("PAYPAL *ALIEXPRESS"), nm("PAYPAL *NETFLIX"));
  eq("  and the real merchant is kept", nm("PAYPAL *NETFLIX"), "paypal netflix");
  ok("UBER *TRIP and UBER *EATS are two shops", nm("UBER *TRIP") !== nm("UBER *EATS"));
  eq("a reference code after a star is still dropped", nm("AMZN Mktp US*2K4LL1234"), "amzn mktp us");
  eq("  and so is one glued to the name", nm("AMAZON.COM*MK1RT5"), "amazon");
  eq("a store number after # is still dropped", nm("STARBUCKS #1123 SEATTLE"), "starbucks");
}

// ---------------------------------------------------------------- transfers --
group("Transfers");
{
  // Found on the way: a Hebrew abbreviation's quote mark opened a quoted field
  // and swallowed the lines after it.
  const q = parseCSV('תנועות בחשבון עו"ש\nתאריך,תיאור,סכום\n01/09/2026,שופרסל בע"מ,-3\n02/09/2026,ארומה,-4');
  eq("a quote inside עו\"ש / בע\"מ is a character, not the start of a quoted field", q.length, 4);
  eq("  and the shop keeps its name", q[2][1], 'שופרסל בע"מ');
  eq("a real quoted field still carries its line break and doubled quote", parseCSV('01/09/2026,"PAYPAL\n*SPOTIFY",-5\n02/09/2026,"Joe""s",-6').map((r) => r[1]), ["PAYPAL *SPOTIFY", 'Joe"s']);

  const { csvRowCategory, csvShopHistory } = app;
  const CATS = [["c1", "Housing"], ["c2", "Food"], ["c3", "Transport"], ["c4", "Health"], ["c5", "Entertainment"],
    ["c6", "Shopping"], ["c8", "Salary"], ["c9", "Investments"], ["c10", "Savings"], ["c11", "Other"]].map(([id, name]) => ({ id, name }));
  const ctx = (extra) => Object.assign({ cats: CATS, shops: {}, saved: {}, tx: [], incomeHist: {} }, extra || {});
  // [description, type, positiveOut] -> what it should become
  const on = (d, type, card, x) => csvRowCategory(d, type, !!card, ctx(x));
  const what = (r) => r.transfer ? "transfer:" + r.category : r.category + (r.guess ? "?" : "");

  // A bank account (positiveOut false).
  eq("the card bill on the bank account is a transfer, not spending", what(on("ישראכרט - חיוב חודשי", "expense")), "transfer:Card bill");
  eq("  Max's too", what(on("מקס איט פיננסים", "expense")), "transfer:Card bill");
  eq("  and Cal's (but not a man named מיכאל)", [what(on("כאל", "expense")), on("מיכאל כהן", "expense").transfer], ["transfer:Card bill", false]);
  eq("Max Stock the shop is not a card bill", on("מקס סטוק", "expense").transfer, false);
  eq("a UK \"CARD PAYMENT TO\" purchase is not a card bill", on("CARD PAYMENT TO TESCO", "expense").transfer, false);
  eq("a savings deposit is a transfer, Hebrew prefix and all (לפיקדון)", what(on("הפקדה לפיקדון", "expense")), "transfer:Account transfer");
  eq("a shop called שביט is not a Bit transfer", on("שביט אופטיקה", "expense").transfer || on("שביט אופטיקה", "expense").guess, false);
  eq("a prefixed chain name still matches (בשופרסל)", app.keywordCatName("קנייה בשופרסל"), "Food");
  eq("  so is money moved to savings by name", what(on("העברה לחשבון חיסכון", "expense")), "transfer:Account transfer");
  eq("  and a pension-fund top-up", what(on("קרן השתלמות", "expense")), "transfer:Account transfer");
  eq("  and the deposit coming back", what(on("פדיון פיקדון", "income")), "transfer:Account transfer");
  eq("a Bit to a person gets no invented category - Other, unsure", what(on("ביט העברה לדני", "expense")), "Other?");
  eq("a PayBox the same", what(on("PAYBOX", "expense")), "Other?");
  eq("a friend paying back is not Salary", what(on("העברה מיוסי לוי", "income")), "Other?");
  eq("a Bit coming in is not Salary", what(on("ביט מדנה", "income")), "Other?");
  eq("a salary is Salary", what(on("משכורת חודש אוגוסט", "income")), "Salary");
  eq("  even when the bank calls it a transfer", what(on("העברת משכורת", "income")), "Salary");
  eq("interest is Investments, even on a deposit", what(on("ריבית על פיקדון", "income")), "Investments");
  eq("a benefit is Other, not Salary", what(on("ביטוח לאומי קצבת ילדים", "income")), "Other");
  eq("an unknown payer is shown as a guess, not a certain Salary", what(on("ACME LTD", "income")), "Salary?");
  eq("an ATM withdrawal is Other and is not a shop", what(on("משיכת מזומן כספומט", "expense")), "Other");

  // A card statement (positiveOut true).
  eq("on a card statement a charge from the card company is not its own bill", on("דמי כרטיס ישראכרט", "expense", true).transfer, false);
  eq("a \"payment received\" line on a card statement is the bill being paid", what(on("PAYMENT THANK YOU", "income", true)), "transfer:Card bill");

  // What the user said wins, and money in is remembered apart from shops.
  const hist = csvShopHistory([{ label: "ACME LTD", catId: "c8", type: "income" }, { label: "ACME LTD", catId: "c8", type: "income" }], true);
  eq("a payer seen before keeps the user's category", what(on("ACME LTD", "income", false, { incomeHist: hist })), "Salary");
  eq("the user's answer for a person is remembered", what(on("ביט העברה לדני", "expense", false, { saved: { "ביט העברה לדני": { category: "Food", source: "user" } } })), "Food");
  eq("  and money in is remembered under its own key", on("העברה מיוסי לוי", "income").shopK, "in:העברה מיוסי לוי");
  eq("a purchase history never files income", Object.keys(csvShopHistory([{ label: "ACME LTD", catId: "c8", type: "income" }])).length, 0);
}

// -------------------------------------------- the statement's own totals --
// Reported 2026-09-23: "I have spent more than 4,900. Somehow, it added more
// than 10,000", and most of it in Other. Every Israeli card export ends its
// sections with a total line; the import read it as one more purchase, dated
// it today (it has no date) and filed it under Other (it has no shop). These
// are that file and its relatives, read through the shipping steps.
group("Totals, balances and sections are not purchases");
{
  const { csvSummaryText, csvReadRows, csvSettleReading, csvLocalReading, csvFirstDataRow, csvTitleRow, classifyImportRows, csvMergeModelMap } = app;
  eq("סה\"כ is a total", csvSummaryText("סה\"כ לחיוב"), "total");
  eq("סה״כ with gershayim too", csvSummaryText("סה״כ"), "total");
  eq("סך חיוב בש\"ח: is a total", csvSummaryText("סך חיוב בש\"ח:"), "total");
  eq("סך הכל is a total", csvSummaryText("סך הכל"), "total");
  eq("יתרת סגירה is a balance", csvSummaryText("יתרת סגירה"), "balance");
  eq("TOTAL is a total", csvSummaryText("TOTAL:"), "total");
  eq("Total for 10/2026 is a total", csvSummaryText("Total for 10/2026"), "total");
  eq("Opening balance is a balance", csvSummaryText("Opening Balance"), "balance");
  eq("TOTAL ENERGIES is a petrol station, not a total", csvSummaryText("TOTAL ENERGIES HERZLIYA"), "");
  eq("interest on a balance is money in, not a balance line", csvSummaryText("ריבית על יתרה"), "");
  eq("a shop is not a total", csvSummaryText("שופרסל דיל"), "");

  // The user's month: 4,912.40 of purchases on a card, and the card's own
  // total line under them.
  const month = [
    "פירוט עסקאות", "כרטיס אמריקן אקספרס המסתיים ב-1234", "עסקאות למועד חיוב 02/10/2026",
    "תאריך רכישה,שם בית עסק,סכום עסקה,מטבע עסקה,סכום חיוב,מטבע חיוב,מס' שובר,פירוט נוסף",
    "01/09/2026,שופרסל דיל,1245.30,₪,1245.30,₪,123456,",
    "03/09/2026,ארומה תל אביב,32.00,₪,32.00,₪,123457,",
    "05/09/2026,KSP,3000.00,₪,300.00,₪,123458,תשלום 1 מתוך 10",
    "09/09/2026,פז יקום,310.10,₪,310.10,₪,123459,",
    "14/09/2026,סופר פארם,425.00,₪,425.00,₪,123460,",
    "20/09/2026,זארה,2600.00,₪,2600.00,₪,123461,",
    "סך חיוב בש\"ח:,,,,4912.40,₪,,"
  ].join("\n");
  const rows = parseCSV(month);
  const sk = csvSkeleton(rows);
  const hRow = sk.rowsAboveData - 1;
  const st = csvSettleReading(rows, hRow, csvLocalReading(rows, hRow), "", null);
  eq("the amount is the charge, not the currency column after it", [st.map.amount, st.map.debit, st.sign.splitAmt], [4, -1, false]);
  ok("a card: plain amounts are money spent", st.sign.positiveOut === true);
  const read = csvReadRows(rows.slice(hRow + 1), rows[hRow], st.map, st.sign.splitAmt, st.sign.positiveOut, st.fmt.preferDMY, "2031-01-01");
  const spent = read.items.reduce((s, it) => s + it.money.amount, 0);
  eq("the month comes to 4,912.40 - not 9,824.80", spent.toFixed(2), "4912.40");
  eq("six purchases, and the total is not a seventh", read.items.length, 6);
  eq("the total line is kept aside as the statement's total", read.totals.map((x) => [x.amount, x.why, x.matched]), [[4912.4, "total", true]]);
  ok("and the preview can say the lines add up to it", !!read.check && read.check.ok && read.check.printed === 4912.4);
  ok("nothing is dated today", read.items.every((it) => it.date !== "2031-01-01"));
  ok("the laptop in ten payments counts this month's 300, not 3,000", read.items.some((it) => it.desc === "KSP" && it.money.amount === 300));

  // A model that read the columns right must not be handed a money-out column
  // by the local reading: the old merge filled every hole, so a single-amount
  // reading picked up a debit column and the file split into nothing.
  const merged = csvMergeModelMap({ date: 0, desc: 1, amount: 4, debit: -1, credit: -1, cat: -1 }, { date: 0, desc: 1, amount: 4, debit: 5, credit: -1, cat: -1 });
  eq("a single-amount reading gets no money-out column filled in", [merged.amount, merged.debit, merged.credit], [4, -1, -1]);

  // A total with no words: a dated line with no shop whose figure is the sum.
  const quiet = parseCSV(["Date,Description,Amount", "01/09/2026,Cafe,10.00", "02/09/2026,Books,20.50", "03/09/2026,Cinema,30.00", "30/09/2026,,60.50"].join("\n"));
  const qr = csvReadRows(quiet.slice(1), quiet[0], { date: 0, desc: 1, amount: 2, debit: -1, credit: -1, cat: -1, flow: -1 }, false, true, true, "2031-01-01");
  eq("a nameless line equal to the lines above is a total", [qr.items.length, qr.totals.length], [3, 1]);

  // An empty date cell under a dated line, WITH a shop and not a sum, is the
  // same day's next purchase - not a total, and not today.
  const cont = parseCSV(["Date,Description,Amount", "01/09/2026,Cafe,10.00", ",Bakery,7.00", "02/09/2026,Books,20.50"].join("\n"));
  const cr = csvReadRows(cont.slice(1), cont[0], { date: 0, desc: 1, amount: 2, debit: -1, credit: -1, cat: -1, flow: -1 }, false, true, true, "2031-01-01");
  eq("a shop under an empty date takes the date above it", cr.items.map((it) => [it.desc, it.date, it.dateGuess]), [["Cafe", "2026-09-01", false], ["Bakery", "2026-09-01", true], ["Books", "2026-09-02", false]]);
  const orphan = parseCSV(["Date,Description,Amount", ",,99.00", "01/09/2026,Cafe,10.00"].join("\n"));
  const or = csvReadRows(orphan.slice(1), orphan[0], { date: 0, desc: 1, amount: 2, debit: -1, credit: -1, cat: -1, flow: -1 }, false, true, true, "2031-01-01");
  eq("an amount with no date and no shop is left out and said so", [or.items.length, or.left.length, or.left[0] && or.left[0].why], [1, 1, "nodate"]);

  // Isracard's abroad section: its own titles, in another order.
  const two = parseCSV([
    "תאריך רכישה,שם בית עסק,סכום עסקה,מטבע עסקה,סכום חיוב,מטבע חיוב",
    "01/09/2026,שופרסל דיל,100.00,₪,100.00,₪",
    "02/09/2026,ארומה,20.00,₪,20.00,₪",
    "סך חיוב בש\"ח:,,,,120.00,₪",
    "עסקאות בחו\"ל",
    "תאריך רכישה,תאריך חיוב,שם בית עסק,מטבע מקור,סכום מקורי,סכום חיוב",
    "05/09/2026,02/10/2026,NETFLIX.COM,USD,15.49,57.30",
    "06/09/2026,02/10/2026,BOOKING.COM,EUR,200.00,812.40",
    "TOTAL FOR DATE 02/10/2026,,,,,869.70"
  ].join("\n"));
  const tst = csvSettleReading(two, 0, csvLocalReading(two, 0), "", null);
  const tr2 = csvReadRows(two.slice(1), two[0], tst.map, tst.sign.splitAmt, tst.sign.positiveOut, tst.fmt.preferDMY, "2031-01-01");
  eq("the abroad lines are read by THEIR titles: the shop, and the shekel charge", tr2.items.slice(2).map((it) => [it.desc, it.money.amount, it.date]), [["NETFLIX.COM", 57.3, "2026-09-05"], ["BOOKING.COM", 812.4, "2026-09-06"]]);
  eq("both totals are left out, and both add up", tr2.totals.map((x) => [x.amount, x.matched]), [[120, true], [869.7, true]]);
  const shopCol = csvSettleReading(two, 0, { date: 0, desc: 1, amount: 4, debit: -1, credit: -1, cat: -1 }, "", null);
  eq("the domestic shop column is kept although the abroad section has dates in it", shopCol.map.desc, 1);

  // The first card in a file of two can have ONE purchase: data starts right
  // under the titles, not two sections further down.
  const oneLine = parseCSV([
    "לחיוב בתאריך 10/02/2026", "אמריקן אקספרס 3263",
    "תאריך רכישה,שם בית עסק,סכום עסקה,מטבע עסקה,סכום חיוב,מטבע חיוב",
    "26/01/2026,סינמה סיטי,131.91,₪,131.91,₪",
    "סה\"כ,,,,131.91,₪",
    "תאריך רכישה,שם בית עסק,סכום עסקה,מטבע עסקה,סכום חיוב,מטבע חיוב",
    "10/01/2026,KSP,4391.00,₪,731.83,₪",
    "16/01/2026,ישראייר,121.75,₪,121.75,₪"
  ].join("\n"));
  eq("a one-purchase first section still starts the data", csvSkeleton(oneLine).rowsAboveData, 3);
  const leumiBal = parseCSV(["תנועות בחשבון", "תאריך,תאריך ערך,תיאור,בחובה,בזכות,יתרה", ",,יתרת סגירה,,,8530.64", "31/03/2025,31/03/2025,יס פלאנט,114.96,,7990.28", "30/03/2025,30/03/2025,SPOTIFY,25.52,,8105.24"].join("\n"));
  eq("a balance line between the titles and the first purchase is not the titles", csvSkeleton(leumiBal).rowsAboveData, 2);
  ok("a line of column titles is recognised", csvTitleRow(["תאריך", "תיאור", "סכום"]) && !csvTitleRow(["01/09/2026", "תאריך", "5.00"]));

  // A notes column that says "זיכוי" on the refunds only is not a column that
  // marks money in and out - taking it for one turned every charge into income.
  const maxNotes = parseCSV([
    "תאריך עסקה,שם בית העסק,סכום חיוב,הערות",
    "01/09/2026,רמי לוי,312.40,", "02/09/2026,פז,250.00,", "03/09/2026,זארה,-149.90,זיכוי",
    "04/09/2026,קפה גרג,28.00,", "05/09/2026,איקאה,1240.00,", "06/09/2026,KSP,-99.00,זיכוי"
  ].join("\n"));
  const ms = csvSettleReading(maxNotes, 0, csvLocalReading(maxNotes, 0), "", null);
  ok("a sparse זיכוי note is not a direction column", ms.sign.flowCol === -1 && ms.sign.positiveOut === true, JSON.stringify(ms.sign));

  // A tab-separated bank file whose balance column carries a thousands comma
  // on every line: the comma must not win the separator vote.
  const tabs = ["תאריך\tתיאור\tזכות/חובה\tיתרה\tאסמכתא", "28/02/2025\tשופרסל\t515.32-\t13,459.99\t1234", "27/02/2025\tפז\t241.08-\t13,975.31\t1235",
    "26/02/2025\tמשכורת\t14,081.73\t14,216.39\t1236", "25/02/2025\tוולט\t47.21-\t134.66\t1237"].join("\n");
  eq("a tab file with thousands commas is read by its tabs", parseCSV(tabs).map((r) => r.length), [5, 5, 5, 5, 5]);

  // Two ATM withdrawals of 400 on consecutive days are two withdrawals.
  const atm = (d) => ({ type: "expense", amount: 400, label: "משיכת מזומן כספומט", date: d, catId: "c11", catSure: false });
  const cls = classifyImportRows([atm("2026-09-03"), atm("2026-09-04")], []);
  eq("the same charge on the next day is not dropped as a duplicate", [cls.fresh.length, cls.dupes.length], [2, 0]);
  const again = classifyImportRows([atm("2026-09-03"), atm("2026-09-04")], [atm("2026-09-03"), atm("2026-09-04")]);
  eq("but importing the same two again adds neither", [again.fresh.length, again.dupes.length], [0, 2]);
}

group("Shops Alfred can't place are not simply Other");
{
  const { csvRowCategory, csvSectorCat, csvShopHistory, csvPlanShops, suggestCatId, sniffMap } = app;
  const cats = [{ id: "c1", name: "Housing" }, { id: "c2", name: "Food" }, { id: "c3", name: "Transport" }, { id: "c4", name: "Health" },
    { id: "c5", name: "Entertainment" }, { id: "c6", name: "Shopping" }, { id: "c8", name: "Salary" }, { id: "c9", name: "Investments" }, { id: "c11", name: "Other" }];
  const sector = (x) => { const c = csvSectorCat(x, cats); return c ? c.name : null; };
  eq("Max's sectors", ["מזון וצריכה", "מסעדות, קפה וברים", "תחבורה ורכבים", "שירותי תקשורת", "רפואה ובתי מרקחת", "אופנה", "חשמל ומחשבים", "עיצוב הבית", "פנאי, בידור וספורט"].map(sector),
    ["Food", "Food", "Transport", "Housing", "Health", "Shopping", "Shopping", "Shopping", "Entertainment"]);
  eq("Cal's and Isracard's", ["מזון ומשקאות", "דלק", "ביגוד", "פארמה", "מכולת/סופר", "ריהוט", "קניות כללי"].map(sector), ["Food", "Transport", "Shopping", "Health", "Food", "Shopping", "Shopping"]);
  eq("a label that could be two things maps to nothing", ["דלק, חשמל וגז", "ביטוח ופיננסים", "שונות", "העברת כספים", "עירייה וממשלה", "מנויים", "Travel/ Entertainment"].map(sector), [null, null, null, null, null, null, null]);
  eq("the order matters: electronics before electricity, transport before sport", ["מוצרי חשמל", "Transportation-Fuel", "Sporting Goods", "Gas & Electric"].map(sector), ["Shopping", "Transport", "Shopping", "Housing"]);
  eq("English card categories", ["Groceries", "Food & Drink", "Gas", "Health & Wellness", "Bills & Utilities", "Shopping", "Personal"].map(sector),
    ["Food", "Food", "Transport", "Health", "Housing", "Shopping", null]);
  eq("tickets are not flights", sector("כרטיסים והופעות"), "Entertainment");
  const { keywordCatName } = app;
  eq("a real maqaf, geresh or gershayim no longer glues a name shut", ["סופר־פארם", "ג׳ירף", "חצי חינם"].map(keywordCatName), ["Health", "Food", "Food"]);
  eq("Diesel is a clothing store, and Delta Galil is not an airline", [keywordCatName("DIESEL"), keywordCatName("DELTA GALIL")], ["", "Shopping"]);

  const { shopKey } = app;
  const ctx = (name, cat) => ({ cats, shops: { [shopKey(name)]: { category: cat, source: "alfred" } }, saved: {}, tx: [], incomeHist: {} });
  eq("Alfred's Other does not beat the card's own label", csvRowCategory("ג'פניקה", "expense", true, ctx("ג'פניקה", "Other"), "מסעדות, קפה וברים").category, "Food");
  eq("nor the keyword map", csvRowCategory("שופרסל דיל", "expense", true, ctx("שופרסל דיל", "Other"), "").category, "Food");
  eq("Alfred's real answer still comes first", csvRowCategory("ג'פניקה", "expense", true, ctx("ג'פניקה", "Shopping"), "מסעדות, קפה וברים").category, "Shopping");

  // One bad import used to teach every later one: the shop sat in Other in the
  // history, and the history answered "Other" before Alfred was asked.
  const hist = [{ label: "ג'פניקה", catId: "c11", category: "Other", type: "expense" }, { label: "ג'פניקה", catId: "c11", category: "Other", type: "expense" }];
  ok("Other in the history is not evidence", Object.keys(csvShopHistory(hist, false, cats)).length === 0);
  const jk = shopKey("ג'פניקה");
  const plan = csvPlanShops([{ key: jk, label: "ג'פניקה" }], { [jk]: { category: "Other", source: "ai" } }, csvShopHistory(hist, false, cats), cats);
  eq("a shop Alfred shrugged at last time is asked again", plan.ask.length, 1);
  const barber = [{ label: "מספרת שרון", catId: "c11", category: "Other", type: "expense" }];
  eq("and a suggestion is never Other", suggestCatId("מספרת שרון", barber, cats), "");

  // A column called "Transaction Type" is not the shop.
  const uk = sniffMap([["Date", "Transaction Type", "Description", "Paid out", "Paid in", "Balance"], ["01/09/2026", "DEB", "TESCO STORES 3297", "12.50", "", "900.00"]], true);
  eq("the Description beats a Transaction Type column", uk.desc, 2);
  const mz = sniffMap([["תאריך", "סוג תנועה", "זכות", "חובה", "יתרה", "אסמכתא"], ["01/09/2026", "שופרסל דיל", "", "120.00", "5000.00", "12345678"]], true);
  eq("Mizrahi's description lives in סוג תנועה, and זכות comes first", [mz.desc, mz.credit, mz.debit, mz.amount], [1, 2, 3, -1]);
  const disc = sniffMap([["תאריך", "יום ערך", "תיאור התנועה", "₪ זכות/חובה", "₪ יתרה", "אסמכתא", "עמלה"], ["01/09/2026", "01/09/2026", "שופרסל", "-120.00", "5000.00", "12345678", ""]], true);
  eq("Discount's one signed column is the amount, not half a pair", [disc.amount, disc.debit, disc.credit], [3, -1, -1]);
  const maxHead = sniffMap([["תאריך עסקה", "שם בית העסק", "קטגוריה", "4 ספרות אחרונות של כרטיס האשראי", "סוג עסקה", "סכום חיוב", "מטבע חיוב", "סכום עסקה מקורי", "מטבע עסקה מקורי", "תאריך חיוב"], ["01/09/2026", "רמי לוי", "מזון וצריכה", "1234", "רגילה", "312.40", "₪", "312.40", "₪", "02/10/2026"]], true);
  eq("Max: the charge, the shop, and the card company's category column", [maxHead.amount, maxHead.desc, maxHead.cat, maxHead.debit], [5, 1, 2, -1]);
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
  // The answer names each shop by its number. The old answer was keyed by the
  // name "copied exactly", and a name that came back one quote mark different
  // lost its category - every one of those shops fell to Other.
  const cats = [{ name: "Food" }, { name: "Transport" }, { name: "Other" }];
  let out, meta, sent;
  const said = { "שופרסל דיל בע\"מ": "Food", "פנגו חניה": "transport", "מקס איט": "Groceries" };
  setClaude((m, s, mt, cb) => {
    const body = JSON.parse(m[0].content);
    if (!sent) sent = body;
    cb(null, JSON.stringify(body.shops.map((x) => ({ i: x.i, category: said[x.name], confidence: "high" }))));
  });
  categorizeShopsWithAI(["שופרסל דיל בע\"מ", "פנגו חניה", "מקס איט"], cats, [], (e, o, m) => { out = o; meta = m; });
  eq("shops go out numbered", sent.shops.map((x) => x.i), [0, 1, 2]);
  eq("a shop is sorted by its number, whatever its name", out["שופרסל דיל בע\"מ"] && out["שופרסל דיל בע\"מ"].category, "Food");
  eq("a category in the wrong case is still that category", out["פנגו חניה"] && out["פנגו חניה"].category, "Transport");
  ok("a category outside the closed set is dropped, not coerced", out["מקס איט"] === undefined, JSON.stringify(out["מקס איט"]));
  eq("the one left unanswered is asked once more, and only once", meta.calls, 2);
  eq("and it is counted as missing", meta.missing, 1);

  // The card's own label goes out with the shop.
  setClaude((m, s, mt, cb) => { sent = JSON.parse(m[0].content); cb(null, "[]"); });
  sent = null;
  categorizeShopsWithAI([{ name: "רמי לוי", hint: "מזון וצריכה" }], cats, [], () => {});
  eq("the card company's label travels as a hint", sent.shops[0].card_category, "מזון וצריכה");

  // An old-style answer that names the shop instead of its number still counts.
  reply(JSON.stringify([{ shop: "פנגו חניה", category: "Transport", confidence: "high" }]));
  categorizeShopsWithAI(["פנגו חניה"], cats, [], (e, o) => { out = o; });
  eq("an answer that echoes the name is still read", out["פנגו חניה"] && out["פנגו חניה"].category, "Transport");

  // Cut off mid-array: the entries that arrived are kept, and only the tail is
  // asked again. The old parser threw the whole chunk away.
  const forty = Array.from({ length: 30 }, (_, i) => "חנות " + i);
  let round = 0;
  setClaude((m, s, mt, cb) => {
    round++;
    const shops = JSON.parse(m[0].content).shops;
    const all = JSON.stringify(shops.map((x) => ({ i: x.i, category: "Food", confidence: "high" })));
    cb(null, round === 1 ? "```json\n" + all.slice(0, Math.floor(all.length * 0.6)) : all);
  });
  categorizeShopsWithAI(forty, cats, [], (e, o, m) => { out = o; meta = m; });
  ok("a cut-off answer keeps every entry that arrived, and the rest are asked again",
    Object.keys(out).length === 30 && meta.calls === 2 && meta.missing === 0, Object.keys(out).length + " kept, " + meta.calls + " calls");

  // Over the per-call size, so it chunks - and one chunk failing must not lose
  // the other: it is asked again at the end.
  const many = Array.from({ length: 60 }, (_, i) => "shop " + i);
  let nth = 0;
  setClaude((m, s, mt, cb) => {
    nth++;
    if (nth === 1) { cb(new Error("network"), null); return; }
    const shops = JSON.parse(m[0].content).shops;
    cb(null, JSON.stringify(shops.map((x) => ({ i: x.i, category: "Food", confidence: "high" }))));
  });
  let partialErr = "unset";
  categorizeShopsWithAI(many, cats, [], (e, o, m) => { partialErr = e; out = o; meta = m; });
  eq("a long list is split across calls, and the failed chunk asked again", meta.calls, 3);
  eq("one chunk failing is counted", meta.failed, 1);
  ok("every shop is sorted in the end", Object.keys(out).length === 60, Object.keys(out).length + " kept");
  ok("a partial answer is not reported as a failure", partialErr === null, "err was " + partialErr);

  // A timeout means the next call would wait out the same forty seconds: the
  // rest fall straight through to the keyword map instead.
  nth = 0;
  setClaude((m, s, mt, cb) => { nth++; const e = new Error("timeout"); e.kind = "timeout"; cb(e, null); });
  categorizeShopsWithAI(many, cats, [], (e, o, m) => { sErr = e; meta = m; });
  eq("after a timeout nothing more is asked", nth, 1);

  nth = 0;
  setClaude((m, s, mt, cb) => cb(new Error("network"), null));
  var sErr;
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

  // Max puts purchases abroad on a sheet of their own. Reading only the first
  // sheet lost every one of them; reading EVERY sheet would count a summary
  // or a second view of the same lines as more spending. Only a sheet that is
  // more of the same statement joins it.
  const MAXH = ["תאריך עסקה", "שם בית העסק", "קטגוריה", "סכום חיוב", "מטבע חיוב"];
  const home = [["עסקאות במועד החיוב"], MAXH,
    [{ date: "2026-09-02" }, "רמי לוי", "מזון וצריכה", { n: 312.4 }, "₪"],
    [{ date: "2026-09-06" }, "פז יקום", "תחבורה ורכבים", { n: 250 }, "₪"],
    ["סך הכל", null, null, { n: 562.4 }, null]];
  const abroad = [["עסקאות חו\"ל ומט\"ח"], MAXH,
    [{ date: "2026-09-05" }, "NETFLIX.COM", "פנאי, בידור וספורט", { n: 57.3 }, "₪"],
    ["סך הכל", null, null, { n: 57.3 }, null]];
  const summary = [["סיכום לפי קטגוריה"], ["קטגוריה", "סכום"], ["מזון וצריכה", { n: 312.4 }], ["תחבורה ורכבים", { n: 250 }]];
  const both = await read(buildXlsx([{ name: "עסקאות במועד החיוב", rows: home }, { name: "עסקאות חו\"ל ומט\"ח", rows: abroad }, { name: "סיכום", rows: summary }]), "max.xlsx");
  ok("a second sheet of purchases (abroad) is read with the first", both.rows.some((r) => r[1] === "NETFLIX.COM") && both.rows.some((r) => r[1] === "רמי לוי"),
    both.err || JSON.stringify(both.sheets));
  ok("a summary sheet is not read as purchases", !both.rows.some((r) => r[0] === "מזון וצריכה"));
  eq("the note names both sheets", sheetReadNote({ name: "max.xlsx" }, both), "max.xlsx — " + both.rows.length + " lines read from the sheets “עסקאות במועד החיוב” and “עסקאות חו\"ל ומט\"ח”.");
  const view = await read(buildXlsx([{ name: "כרטיס 1234", rows: home }, { name: "כל הכרטיסים", rows: home }]), "max.xlsx");
  eq("a sheet repeating the same lines is a view, not more purchases", view.rows.length, home.length);

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
