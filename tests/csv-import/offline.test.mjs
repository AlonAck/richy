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
  eq("a sound reading is left exactly as it was", [r.map, r.fixed], [{ date: 0, amount: 4, desc: 1, debit: -1, credit: -1 }, []]);

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
