// The balance an import leaves behind. A bank file prints what the account held
// after every line; the import pins Richy's balance to the figure after the
// newest one, so the statement's history - already inside that figure - can
// never pile on top of it again. The -3,000 a bank file and a card file read,
// where the bank said +3,000, came from exactly that pile-up.
//
//   node tests/statement-import/balance.test.mjs
import { app } from "./extract.mjs";
import { HARD } from "./hard-fixtures.mjs";
import { HARD_ANSWERS } from "./answers.mjs";
import { section, check, eq, done } from "./harness.mjs";

const {
  impRun, impSetAside, impBankBalance, impBalancePlan, impAnchorBalance, impClosing, impParseDelimited, impRecipeFrom,
  impReadWithRecipe, impLayoutFrom, impRecipeFromLayout, impFlipLayout, balanceAt, balanceAsOf, mainSpendBalance, DEFAULT_CATEGORIES
} = app;
const CATS = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));

// The balance math reads the clock; every test here runs on one fixed day.
const TODAY = "2026-09-30";
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...a) { if (a.length) super(...a); else super(TODAY + "T12:00:00Z"); }
  static now() { return new RealDate(TODAY + "T12:00:00Z").getTime(); }
};

// The dashboard's balance before any of this: every settled row in, minus
// every row out, the opening balance included.
const oldWay = (txs) => Math.round(txs.filter((t) => !t.pending && !t.catchUp && t.date <= TODAY)
  .reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0) * 100) / 100;

let nextId = 1;
const row = (date, amount, extra) => Object.assign({ id: nextId++, type: amount < 0 ? "expense" : "income", amount: Math.abs(amount), label: "row", date, repeat: "none", pending: false, catId: "c1", category: "Food" }, extra || {});
const opening = (date, amount, extra) => Object.assign({ id: nextId++, type: "income", amount, label: "Opening balance", catId: "opening", category: "Opening balance", opening: true, date, repeat: "none", pending: false }, extra || {});
const sheetsOf = (name) => [{ name: "Sheet 1", rows: impParseDelimited(HARD[name].text) }];
const readHard = (name, answer) => impReadWithRecipe(sheetsOf(name), impRecipeFrom(JSON.parse(JSON.stringify(answer || HARD_ANSWERS[name])), sheetsOf(name), false), TODAY);

// ---------------------------------------------------------------------------
section("the balance a bank file ends on");
{
  const hap = readHard("HAPOALIM");
  check("Hapoalim reads", hap.ok, hap.feedback);
  // Newest first: the first line's balance is the newest. 8,120.35 before the
  // month, and every line of it after.
  eq("Hapoalim, newest first: the balance after its newest line", hap.closing, { date: "2026-09-25", balance: 15818.6 });
  const disc = readHard("DISCOUNT_TRAILING");
  eq("Discount, oldest first: the balance after its last line", disc.closing, { date: "2026-09-09", balance: 7138.35 });
  const us = readHard("US_CHECKING");
  eq("a US checking file", us.closing, { date: "2026-09-28", balance: 2554.8 });
  const card = readHard("ISRACARD_SECTIONS");
  check("a card file keeps no balance", card.ok && card.closing == null, card.closing);
  // A balance column that does not add up is no balance at all.
  const wrong = JSON.parse(JSON.stringify(HARD_ANSWERS.HAPOALIM));
  wrong.tables[0].balanceColumn = 3;   // the reference number column
  const w = readHard("HAPOALIM", wrong);
  check("a column that is not a running balance gives none", w.ok && w.closing == null, w.closing);
  // A bank's file the person turned the other way round: its balance runs as
  // a card's does, what is owed - never money the person has.
  const layout = impLayoutFrom(hap.recipe, sheetsOf("HAPOALIM"));
  const flipped = impReadWithRecipe(sheetsOf("HAPOALIM"), impRecipeFromLayout(impFlipLayout(layout), sheetsOf("HAPOALIM")), TODAY);
  check("a reading turned upside down keeps no balance", flipped.ok && flipped.closing == null, flipped.closing);
  const same = impReadWithRecipe(sheetsOf("HAPOALIM"), impRecipeFromLayout(layout, sheetsOf("HAPOALIM")), TODAY);
  eq("next month's file read from the saved layout keeps it", same.closing, hap.closing);
  eq("of two tables, the one that ends later", impClosing([{ closing: { date: "2026-08-31", balance: 1 } }, { closing: { date: "2026-09-30", balance: 2 } }, {}]), { date: "2026-09-30", balance: 2 });
}

section("what the bank says, across files");
{
  const f = (fingerprint, date, balance, statement) => ({ fingerprint, statement: statement || "bank", closing: date ? { date, balance } : null });
  eq("one file", impBankBalance([f("a", "2026-09-25", 1500)]), { amount: 1500, date: "2026-09-25" });
  eq("two months of one account: the newest", impBankBalance([f("a", "2026-08-31", 900), f("a", "2026-09-25", 1500)]), { amount: 1500, date: "2026-09-25" });
  eq("two accounts: what both hold", impBankBalance([f("a", "2026-09-25", 1500), f("b", "2026-09-20", 250.5)]), { amount: 1750.5, date: "2026-09-25" });
  eq("a card's balance is what it owes, not money", impBankBalance([f("c", "2026-09-25", 4200, "card")]), null);
  eq("no file keeps one", impBankBalance([f("a", "", 0)]), null);
  eq("an overdraft is kept as one", impBankBalance([f("a", "2026-09-25", -812.4)]), { amount: -812.4, date: "2026-09-25" });
}

// ---------------------------------------------------------------------------
section("the -3,000: a bank file and a card file, read together");
await (async () => {
  const server = (kind, body) => {
    if (kind === "importRead") {
      const name = body.sample.indexOf("בנק הפועלים") >= 0 ? "HAPOALIM" : body.sample.indexOf("ישראכרט - פירוט") >= 0 ? "ISRACARD_SECTIONS" : null;
      return Promise.resolve(JSON.parse(JSON.stringify(HARD_ANSWERS[name])));
    }
    return Promise.resolve({ lines: body.lines.map((l) => {
      if (/ישראכרט/.test(l.text)) return { id: l.id, kind: "card_bill", category: "", sure: true };
      if (/פיקדון/.test(l.text)) return { id: l.id, kind: "own_transfer", category: "", sure: true };
      if (/משכורת/.test(l.text)) return { id: l.id, kind: "income", category: "Salary", sure: true };
      return { id: l.id, kind: l.dir === "in" ? "income" : "purchase", category: "Other", sure: true };
    }) });
  };
  const ctx = (tx) => ({ tx, categories: CATS, shopCats: {}, layouts: {}, today: TODAY, server });
  const files = [{ text: HARD.HAPOALIM.text, name: "hapoalim.csv" }, { text: HARD.ISRACARD_SECTIONS.text, name: "isracard.csv" }];
  const res = await impRun(files, ctx([]));
  const aside = impSetAside(res.items, [0, 1]);
  const adding = res.items.filter((it) => !aside[it.id]).map((it) => it.tx);
  const bank = impBankBalance(res.files);
  eq("the bank's own balance comes through with its file", bank, { amount: 15818.6, date: "2026-09-25" });
  eq("the card's file brings none", res.files[1].closing, null);

  // A new account, nothing typed in: before, the dashboard read the month's
  // flow as if it were the balance.
  const fresh = impAnchorBalance([], adding, bank, TODAY);
  eq("Richy's balance is what the bank says", mainSpendBalance(fresh), 15818.6);
  check("where before it was the month's flow", oldWay(adding) !== 15818.6, oldWay(adding));
  eq("pinned to the bank's day", balanceAsOf(fresh), "2026-09-25");
  eq("one opening balance, the bank's", fresh.filter((t) => t.opening).map((t) => [t.amount, t.date]), [[15818.6, "2026-09-25"]]);

  // The account in the report: a balance typed in at sign-up, then a bank and
  // a card file of the weeks before. That history is inside the balance - so
  // it no longer drags it negative.
  const typed = [opening("2026-09-26", 3000)];
  eq("typed at sign-up: the history before it no longer piles on", mainSpendBalance(impAnchorBalance(typed, adding, null, TODAY)), 3000);
  check("where before it did", oldWay(typed.concat(adding)) !== 3000, oldWay(typed.concat(adding)));
  // Typed on the file's last day, it is what the person had as that day
  // began, so that day's own line (-108, Maccabi) still moves it.
  const typedDay = [opening("2026-09-25", 3000)];
  eq("typed on the file's last day: that day's line still counts", mainSpendBalance(impAnchorBalance(typedDay, adding, null, TODAY)), 2892);
  eq("and with the bank's figure for that day, the bank's figure wins the tie", mainSpendBalance(impAnchorBalance(typedDay, adding, bank, TODAY)), 15818.6);

  // The same two files brought in again - every line already in Richy - still
  // puts right a balance an older import got wrong, whatever it left behind.
  const bill = { id: 999, type: "expense", amount: 6380.4, label: "ישראכרט", date: "2026-09-02", transfer: true, catId: "savings-transfer", category: "Card bill", repeat: "none", pending: false };
  const messy = [opening("2026-08-01", 3000)].concat(adding, [bill]);
  const again = await impRun(files, ctx(messy));
  const againAside = impSetAside(again.items, [0, 1]);
  const againAdding = again.items.filter((it) => !againAside[it.id]).map((it) => it.tx);
  eq("nothing new to add", againAdding.length, 0);
  eq("but the balance is the bank's", mainSpendBalance(impAnchorBalance(messy, againAdding, impBankBalance(again.files), TODAY)), 15818.6);
  check("where before the old card bill kept it off", oldWay(messy) !== 15818.6, oldWay(messy));
})();

// ---------------------------------------------------------------------------
section("which figure the balance counts from");
{
  const bank = { amount: 2000, date: "2026-09-20" };
  eq("nothing known", impBalancePlan([], [row("2026-09-10", -50)], null, TODAY).kind, "none");
  eq("the bank's figure", impBalancePlan([], [row("2026-09-10", -50)], bank, TODAY), { kind: "bank", pin: "2026-09-20", amount: 2000, date: "2026-09-20" });
  // Typed in at sign-up with nothing older on file: what the person had as
  // that day began.
  eq("a balance typed in at sign-up", impBalancePlan([opening("2026-09-25", 3000)], [row("2026-09-10", -50)], null, TODAY), { kind: "typed", pin: "2026-09-24", amount: 3000 });
  eq("typed later than the bank's last day: the person's own, newer figure", impBalancePlan([opening("2026-09-25", 3000)], [], bank, TODAY).kind, "typed");
  eq("typed the day after the file ends: the bank's figure (a tie)", impBalancePlan([opening("2026-09-21", 3000)], [], bank, TODAY).kind, "bank");
  // An opening with older rows under it was set afterwards and means "what I
  // had before all of this" - pinning it would drop every row since.
  const later = [row("2026-06-01", -40), opening("2026-09-25", 3000)];
  eq("an opening set after months of use is not pinned", impBalancePlan(later, [row("2026-09-10", -50)], null, TODAY).kind, "none");
  eq("...and the ledger is left exactly as it was", mainSpendBalance(impAnchorBalance(later, [row("2026-09-10", -50)], null, TODAY)), 3000 - 40 - 50);
  const pinned = [opening("2026-09-22", 1800, { asOf: "2026-09-22" })];
  eq("a newer pin from an earlier import stays", impBalancePlan(pinned, [], bank, TODAY).kind, "kept");
  eq("an older file's figure does not replace it", mainSpendBalance(impAnchorBalance(pinned, [row("2026-09-05", -99)], bank, TODAY)), 1800);
  eq("the next month's file does", impBalancePlan(pinned, [], { amount: 2500, date: "2026-09-28" }, TODAY).kind, "bank");
}

section("a day that has not ended is not pinned");
{
  // The file's last line is today: pin yesterday, less what today already
  // moved - so a coffee typed in tonight still counts.
  const today = [row(TODAY, -30), row(TODAY, 100)];
  const plan = impBalancePlan([], today, { amount: 1000, date: TODAY }, TODAY);
  eq("yesterday, less today's lines", [plan.pin, plan.amount], ["2026-09-29", 930]);
  const after = impAnchorBalance([], today, { amount: 1000, date: TODAY }, TODAY);
  eq("today's balance is the bank's", mainSpendBalance(after), 1000);
  eq("a purchase typed in later today moves it", mainSpendBalance(after.concat([row(TODAY, -12.5)])), 987.5);
  // What the person typed on the import's last screen: the same rule.
  const typed = impAnchorBalance([row("2026-09-02", -400), row(TODAY, -20)], [], { amount: 5000, date: TODAY }, TODAY);
  eq("a balance typed in for today", mainSpendBalance(typed), 5000);
  eq("...and the next purchase moves it", mainSpendBalance(typed.concat([row(TODAY, -8)])), 4992);
}

section("once pinned, the past cannot move it");
{
  const pin = opening("2026-09-20", 3000, { asOf: "2026-09-20" });
  const hist = [row("2026-09-15", -100), row("2026-09-18", 250), row("2026-09-20", -40)];
  const later = [row("2026-09-22", -50), row("2026-09-29", 20)];
  const all = [pin].concat(hist, later);
  eq("the pin, then only what came after", mainSpendBalance(all), 3000 - 50 + 20);
  eq("deleting a line from before it changes nothing", mainSpendBalance(all.filter((t) => t !== hist[0])), 2970);
  eq("nor does editing one", mainSpendBalance(all.map((t) => t === hist[1] ? Object.assign({}, t, { amount: 9999 }) : t)), 2970);
  eq("nor bringing in more history", mainSpendBalance(all.concat([row("2026-08-01", -5000)])), 2970);
  eq("a line after it does", mainSpendBalance(all.concat([row("2026-09-25", -70)])), 2900);
  eq("pending and future lines never count", mainSpendBalance(all.concat([row("2026-09-25", -70, { pending: true }), row("2026-10-05", -70)])), 2970);
  // The chart walks back from the pin: before the 100 went, there was 100 more.
  eq("the evening of the 14th", balanceAt(all, "2026-09-14"), 3000 - (-100 + 250 - 40));
  eq("the evening of the 20th", balanceAt(all, "2026-09-20"), 3000);
  eq("the evening of the 22nd", balanceAt(all, "2026-09-22"), 2950);
  let steady = true;
  for (let d = new RealDate("2026-09-10T00:00:00Z"); d <= new RealDate(TODAY + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const prev = new RealDate(d.getTime() - 86400000).toISOString().slice(0, 10);
    const moved = all.filter((t) => !t.opening && t.date === iso).reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
    if (Math.abs(balanceAt(all, iso) - balanceAt(all, prev) - moved) > 0.001) steady = false;
  }
  check("each day moves the line by exactly that day's rows, so the chart lands on today's number", steady);
  // An overdraft: the bank's figure below zero is kept below zero.
  const od = impAnchorBalance([], [row("2026-09-10", -300)], { amount: -812.4, date: "2026-09-20" }, TODAY);
  eq("an overdraft stays one", mainSpendBalance(od), -812.4);
}

section("nothing pinned: the balance is what it always was");
{
  const list = [opening("2026-06-01", 1000), row("2026-06-05", -200), row("2026-09-10", 50), row("2026-09-12", -5, { catchUp: true }), row("2026-10-01", -80)];
  eq("the opening and every settled row", mainSpendBalance(list), 850);
  eq("same as the dashboard's old sum", mainSpendBalance(list), oldWay(list));
  eq("a day in the past", balanceAt(list, "2026-06-04"), 1000);
  eq("before the opening", balanceAt(list, "2026-05-31"), 0);
}

done("balance");
