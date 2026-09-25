// How a statement is read once it is rows: money and dates in every form
// banks write them, a reading from Alfred applied to every row, the checks
// that catch a wrong one, the repairs, the offline reader, and what is and is
// not sent to the server.
//
//   node tests/statement-import/reading.test.mjs
import { app } from "./extract.mjs";
import { ALL, EXPECT } from "./fixtures.mjs";
import { ANSWERS, HARD_ANSWERS, answer } from "./answers.mjs";
import { HARD } from "./hard-fixtures.mjs";
import { section, check, eq, done } from "./harness.mjs";

const {
  impParseMoney, impParseDate, impParseDelimited, impDecodeBytes, impRecipeFrom, impReadWithRecipe,
  impLocalRecipe, impSample, impMask, impFingerprint, impLayoutFrom, impRecipeFromLayout, impCurrencyCode
} = app;
const TODAY = "2026-09-24";

// The fixture's rows, read the way the app reads a text file.
function sheetsOf(name) {
  const dec = impDecodeBytes(ALL[name].bytes());
  return [{ name: "Sheet 1", rows: impParseDelimited(dec.text) }];
}
const signed = (l) => (l.dir === "out" ? -l.amount : l.amount);
function findLine(lines, date, amount, word) {
  return lines.find((l) => l.date === date && Math.abs(signed(l) - amount) < 0.001 && (l.desc + " " + l.details).indexOf(word) >= 0);
}
function expectLines(label, lines, want) {
  eq(label + ": count", lines.length, want.count);
  want.lines.forEach(([date, amount, word]) => {
    check(label + ": " + date + " " + amount + " " + word, !!findLine(lines, date, amount, word),
      lines.map((l) => l.date + " " + signed(l) + " " + l.desc).join(" | "));
  });
}

section("money");
[
  ["342.90", 342.9], ["-342.90", -342.9], ["342.90-", -342.9], ["(342.90)", -342.9], ["₪-342.90", -342.9], ["342.90 ₪", 342.9],
  ["1,234.50", 1234.5], ["1.234,50", 1234.5], ["1 234,50", 1234.5], ["12,50", 12.5], ["1,234", 1234], ["1.234.567", 1234567],
  ["-1,249.99", -1249.99], ["3.150,00", 3150], ["54.20 DR", -54.2], ["19.99 CR", 19.99], ["USD 25.00", 25], ["ש\"ח 88.90", 88.9],
  ["− 32.00", -32], ["0.5", 0.5], ["18500", 18500]
].forEach(([s, v]) => eq(JSON.stringify(s), impParseMoney(s), v));
[
  "2026-09-23", "23/09/2026", "01.09.2026", "12:30", "5%", "תשלום 2 מתוך 12", "", "-", "abc", "12 50", "12345678901", "Grocery 12"
].forEach((s) => eq("not money: " + JSON.stringify(s), impParseMoney(s), null));

section("dates");
[
  ["01/09/2026", "DMY", "2026-09-01"], ["01/09/2026", "MDY", "2026-01-09"], ["13/09/2026", "DMY", "2026-09-13"],
  ["13/09/2026", "MDY", ""], ["2026-09-01", "DMY", "2026-09-01"], ["2026-09-01T00:00:00", "MDY", "2026-09-01"],
  ["01.09.26", "DMY", "2026-09-01"], ["1/9/2026", "DMY", "2026-09-01"], ["20260901", "DMY", "2026-09-01"],
  ["46266", "DMY", "2026-09-01"], ["01 Sep 2026", "DMY", "2026-09-01"], ["Sep 1, 2026", "MDY", "2026-09-01"],
  ["3 בספטמבר 2026", "DMY", ""], ["03 ספטמבר 2026", "DMY", "2026-09-03"], ["31/02/2026", "DMY", ""], ["שופרסל", "DMY", ""],
  ["01/09/2026 14:32", "DMY", "2026-09-01"]
].forEach(([s, o, want]) => eq(s + " as " + o, impParseDate(s, o), want));

section("currency");
eq("USD", impCurrencyCode("USD"), "USD");
eq("$", impCurrencyCode("$"), "USD");
eq("ש\"ח", impCurrencyCode("ש\"ח"), "ILS");
eq("דולר", impCurrencyCode("דולר"), "USD");
eq("EUR", impCurrencyCode("eur"), "EUR");

section("text files");
{
  const dec = impDecodeBytes(ALL.LEUMI.bytes());
  eq("windows-1255 is recognised", dec.encoding, "windows-1255");
  check("Hebrew survives", dec.text.indexOf("משכורת") >= 0);
  const euro = impParseDelimited(ALL.EURO_SEMI.text);
  eq("semicolons are the separator, and 3.150,00 stays one cell", euro[2], ["01.09.2026", "GEHALT ACME GMBH", "3.150,00", "4.210,55"]);
  const quoted = impParseDelimited("Date,Shop,Amount\n01/09/2026,\"Cafe, Bar\",12.00\n02/09/2026,\"Line\nbreak\",3.00\n03/09/2026,סה\"כ בע\"מ,4.00");
  eq("a quoted comma stays in its cell", quoted[1][1], "Cafe, Bar");
  eq("a quoted line break joins the row", quoted[2][1], "Line break");
  eq("a quote inside a Hebrew word is punctuation", quoted[3][1], "סה\"כ בע\"מ");
  const open = impParseDelimited("a,b,c\n1,\"never closed,2\n3,4,5");
  eq("a quote that never closes does not eat the file", open.length, 3);
}

section("readings applied");
for (const name of Object.keys(EXPECT)) {
  const sheets = sheetsOf(name);
  const res = impReadWithRecipe(sheets, impRecipeFrom(ANSWERS[name], sheets, false), TODAY);
  if (!check(name + " reads", res.ok, res.feedback)) continue;
  expectLines(name, res.lines, EXPECT[name]);
}
{
  const sheets = sheetsOf("CARD_SECTIONS");
  const res = impReadWithRecipe(sheets, impRecipeFrom(ANSWERS.CARD_SECTIONS, sheets, false), TODAY);
  const amazon = res.lines.find((l) => l.desc === "AMAZON.COM");
  eq("the foreign amount rides along", amazon && [amazon.origAmount, amazon.origCur], [25, "USD"]);
  const netflix = res.lines.find((l) => l.desc === "נטפליקס");
  eq("the details column is appended", netflix && netflix.details, "הוראת קבע");
  check("the totals line with a date is not a purchase", !res.lines.some((l) => /סה"כ/.test(l.desc)));
}

section("a wrong reading is caught");
{
  // The 23 Sep bug: a charge date read as the price.
  const sheets = sheetsOf("CAL_REFUND");
  const bad = JSON.parse(JSON.stringify(ANSWERS.CAL_REFUND));
  bad.tables[0].amount.column = 3;
  bad.tables[0].amount.fallbackColumn = -1;
  const res = impReadWithRecipe(sheets, impRecipeFrom(bad, sheets, false), TODAY);
  check("a date column taken for money is repaired from the proof lines", res.ok && res.repaired && res.repaired.indexOf("amount column") >= 0, res);
  if (res.ok) expectLines("repaired CAL", res.lines, EXPECT.CAL_REFUND);
}
{
  // A card statement read as a bank account: every charge would be income.
  const sheets = sheetsOf("ISRACARD");
  const bad = JSON.parse(JSON.stringify(ANSWERS.ISRACARD));
  bad.tables[0].amount.negativeIs = "out";
  const res = impReadWithRecipe(sheets, impRecipeFrom(bad, sheets, false), TODAY);
  check("money in and out reversed is put right", res.ok && res.repaired && res.repaired.indexOf("direction") >= 0, res);
  if (res.ok) expectLines("repaired ISRACARD", res.lines, EXPECT.ISRACARD);
}
{
  // Day and month swapped.
  const sheets = sheetsOf("LEUMI");
  const bad = JSON.parse(JSON.stringify(ANSWERS.LEUMI));
  bad.tables[0].dateOrder = "MDY";
  const res = impReadWithRecipe(sheets, impRecipeFrom(bad, sheets, false), TODAY);
  check("day and month swapped is put right", res.ok && res.repaired && res.repaired.indexOf("date order") >= 0, res);
  if (res.ok) expectLines("repaired LEUMI", res.lines, EXPECT.LEUMI);
}
{
  // The date column one off.
  const sheets = sheetsOf("US_MDY");
  const bad = JSON.parse(JSON.stringify(ANSWERS.US_MDY));
  bad.tables[0].date = 1;
  const res = impReadWithRecipe(sheets, impRecipeFrom(bad, sheets, false), TODAY);
  check("a value date taken for the purchase date is put right", res.ok && res.lines.some((l) => l.date === "2026-09-13"), res);
}
{
  // A reading with nothing the proof lines can explain goes back to Alfred
  // with a plain account of what failed.
  const sheets = sheetsOf("LEUMI");
  const bad = JSON.parse(JSON.stringify(ANSWERS.LEUMI));
  bad.tables[0].date = 1;
  bad.examples = [];
  const res = impReadWithRecipe(sheets, impRecipeFrom(bad, sheets, false), TODAY);
  check("an unrepairable reading fails", !res.ok);
  check("and says what went wrong in rows and columns", /No row produced a transaction|column c1/.test(res.feedback || ""), res.feedback);
}
{
  const sheets = sheetsOf("ENGLISH");
  const bad = JSON.parse(JSON.stringify(ANSWERS.ENGLISH));
  bad.examples[1].amount = 2999;
  const res = impReadWithRecipe(sheets, impRecipeFrom(bad, sheets, false), TODAY);
  check("a proof line that does not match is never waved through", !res.ok, res);
}

section("the offline reader");
for (const name of ["LEUMI", "ISRACARD", "MAX", "ENGLISH", "US_MDY", "CAL_REFUND", "TRAILING_MINUS"]) {
  const res = impLocalRecipe(sheetsOf(name), TODAY);
  if (!check(name + " reads without Alfred", !!res && res.ok)) continue;
  expectLines("offline " + name, res.lines, EXPECT[name]);
}
check("a file with no titles is refused offline rather than guessed", impLocalRecipe(sheetsOf("HEADERLESS"), TODAY) === null);

section("what Alfred is sent");
{
  const leumi = impSample(sheetsOf("LEUMI"));
  check("the account number above the table is masked", leumi.indexOf("67890") < 0 && leumi.indexOf("12-345-#####") >= 0, leumi);
  check("amounts are sent", leumi.indexOf("342.90") >= 0);
  check("cells carry their column", /r4 \| c0: 02\/09\/2026 \| c1: /.test(leumi), leumi);
  eq("card number", impMask("4580 1234 5678 9012"), "####-####-####-9012");
  eq("long id", impMask("ת.ז. 123456789"), "ת.ז. #######89");
  eq("a date survives the preamble mask", impMask("20260901", true), "20260901");
  const big = [{ name: "S", rows: [["Date", "Shop", "Amount"]] }];
  for (let i = 0; i < 900; i++) big[0].rows.push(["0" + ((i % 9) + 1) + "/09/2026", "Shop " + (i % 37), "-" + (i + 1) + ".00"]);
  big[0].rows.splice(500, 0, ["Purchases abroad"], ["Date", "Shop", "Original", "Currency", "Charged"]);
  const s = impSample(big);
  const shown = s.split("\n").filter((l) => /^r\d+ /.test(l)).length;
  check("a large file is sampled", shown <= 340 && shown >= 90, shown);
  check("a new section in the middle is always shown", s.indexOf("c0: Purchases abroad") >= 0 && s.indexOf("c4: Charged") >= 0);
  check("and says what was left out", /\.\.\. rows \d+-\d+ not shown \.\.\./.test(s));
}

section("the same bank next month");
{
  const sheets = sheetsOf("CARD_SECTIONS");
  const res = impReadWithRecipe(sheets, impRecipeFrom(ANSWERS.CARD_SECTIONS, sheets, false), TODAY);
  const layout = impLayoutFrom(res.recipe, sheets);
  const fp = impFingerprint(sheets);
  check("a fingerprint", /^f2_/.test(fp), fp);
  // Next month: two more lines, a longer preamble, different amounts.
  const next = ALL.CARD_SECTIONS.text.replace("פירוט עסקאות לכרטיס 4471", "פירוט עסקאות לכרטיס 4471\nתקופה: אוקטובר")
    .replace("02/09/2026,שופרסל דיל,212.40,212.40,", "02/10/2026,שופרסל דיל,99.10,99.10,\n03/10/2026,רמי לוי,45.00,45.00,");
  const sheets2 = [{ name: "Sheet 1", rows: impParseDelimited(next) }];
  eq("same format, same fingerprint", impFingerprint(sheets2), fp);
  const rec2 = impRecipeFromLayout(JSON.parse(JSON.stringify(layout)), sheets2);
  const res2 = impReadWithRecipe(sheets2, rec2, TODAY);
  check("the saved reading reads next month's file", res2.ok, res2.feedback);
  if (res2.ok) {
    check("including its new lines", res2.lines.some((l) => l.desc === "רמי לוי" && l.amount === 45));
    check("and the second block", res2.lines.some((l) => l.desc === "BOOKING.COM"));
  }
  check("a different bank is a different fingerprint", impFingerprint(sheetsOf("LEUMI")) !== fp);
}

section("the hard seven");
{
  for (const name of Object.keys(HARD)) {
    const sheets = [{ name: "S", rows: impParseDelimited(HARD[name].text) }];
    const res = impReadWithRecipe(sheets, impRecipeFrom(HARD_ANSWERS[name], sheets, false), TODAY);
    if (!check(name + " reads", res.ok, res.feedback)) continue;
    const want = HARD[name].expect;
    eq(name + ": every line and nothing else", res.lines.length, want.length);
    const wrong = want.filter(([date, amount, dir]) => !res.lines.some((l) => l.date === date && Math.abs(l.amount - amount) < 0.001 && l.dir === dir));
    check(name + ": every date, amount and direction", !wrong.length, wrong.map((w) => w.slice(0, 3).join(" ")).join(" | "));
    // Lines the file cannot give a direction for are left to what the line
    // is; here, only the unsigned statement has any, and only where the
    // balance has nothing before it.
    const guessed = res.lines.filter((l) => l.dirGuess).length;
    check(name + ": direction guessed only where nothing can settle it", guessed === 0, guessed);
  }
}
{
  // Alfred calls the unsigned statement a plain signed one: every line would
  // read as money out. The running balance puts every line right but the
  // first, which his own proof line then settles.
  const sheets = [{ name: "S", rows: impParseDelimited(HARD.UNSIGNED_LEUMI.text) }];
  const bad = JSON.parse(JSON.stringify(HARD_ANSWERS.UNSIGNED_LEUMI));
  bad.tables[0].amount.mode = "signed"; bad.tables[0].amount.negativeIs = "in";
  const res = impReadWithRecipe(sheets, impRecipeFrom(bad, sheets, false), TODAY);
  check("the balance overrules a wrong direction", res.ok, res.feedback);
  if (res.ok) {
    const wrong = HARD.UNSIGNED_LEUMI.expect.filter(([date, amount, dir]) => !res.lines.some((l) => l.date === date && Math.abs(l.amount - amount) < 0.001 && l.dir === dir));
    eq("every line right", wrong.length, 0);
  }
}
{
  // Newest-first, debit and credit swapped by the reading: the arithmetic
  // settles every line it can reach, and the oldest line is left to what it is.
  const sheets = [{ name: "S", rows: impParseDelimited(HARD.HAPOALIM.text) }];
  const bad = JSON.parse(JSON.stringify(HARD_ANSWERS.HAPOALIM));
  bad.tables[0].amount.outColumn = 5; bad.tables[0].amount.inColumn = 4;
  bad.examples = [];
  const res = impReadWithRecipe(sheets, impRecipeFrom(bad, sheets, false), TODAY);
  check("swapped columns on a balance file", res.ok, res.feedback);
  if (res.ok) {
    const edge = res.lines.find((l) => l.row === 15);
    check("the oldest line, which no balance comes before, is left to what it is", edge && edge.dirGuess, edge);
    eq("every other line by arithmetic", res.lines.filter((l) => l.dirFrom === "balance").length, 12);
  }
}
{
  // A column called balance that does not behave like one is ignored.
  const sheets = [{ name: "S", rows: impParseDelimited("Date,Shop,Amount,Balance\n2026-09-01,A,-10.00,500\n2026-09-02,B,-20.00,17\n2026-09-03,C,-5.00,900\n2026-09-04,D,-7.00,3") }];
  const ans = answer([{ headerRow: 0, firstRow: 1, dateOrder: "YMD", balanceColumn: 3, amount: { column: 2 } }], []);
  const res = impReadWithRecipe(sheets, impRecipeFrom(ans, sheets, false), TODAY);
  check("a balance column that does not add up changes nothing", res.ok && res.lines.every((l) => l.dir === "out" && !l.dirFrom), res.lines);
}

section("repeated sections");
{
  // One title row per card, the same titles each time. Alfred described the
  // first; the second is read the same way.
  const text = [
    "כרטיס 1111", "תאריך עסקה,שם בית העסק,סכום חיוב", "01/09/2026,ארומה,32.00", "02/09/2026,פז,250.00",
    "כרטיס 2222", "תאריך עסקה,שם בית העסק,סכום חיוב", "03/09/2026,שופרסל,120.00"
  ].join("\n");
  const sheets = [{ name: "S", rows: impParseDelimited(text) }];
  const ans = answer([{ headerRow: 1, firstRow: 2, amount: { column: 2, negativeIs: "in" } }], [], { statement: "card" });
  const res = impReadWithRecipe(sheets, impRecipeFrom(ans, sheets, false), TODAY);
  eq("both cards are read", res.ok && res.lines.map((l) => l.desc), ["ארומה", "פז", "שופרסל"]);
}

done("reading");
