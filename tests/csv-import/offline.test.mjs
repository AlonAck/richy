// Everything in the CSV import that does not need a model: decoding, the
// column guesser, the privacy skeleton, the fingerprint cache key, and the
// date/sign detection that runs on the rows themselves.
//
//   npm run test:csv
//
// The model leg is tests/csv-import/live-haiku.mjs, which needs a key.
import { app } from "./extract.mjs";
import { ALL, toCp1255, toUtf8, ISRACARD } from "./fixtures.mjs";

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

// ------------------------------------------------------------------- report --
console.log("\n" + "-".repeat(64));
if (fail) {
  console.log(fail + " FAILED, " + pass + " passed\n");
  failures.forEach((f) => console.log("  FAIL  " + f));
  process.exit(1);
}
console.log("all " + pass + " checks passed");
