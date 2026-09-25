// What a correct reading from Alfred looks like for each fixture, in exactly
// the shape api/_import.js holds him to (READ_SCHEMA). The offline tests feed
// these to the shipping code as if they had come back from the server; the
// live test compares his real answers against the transactions these produce.

const AMOUNT = { mode: "signed", column: -1, fallbackColumn: -1, negativeIs: "out", outColumn: -1, inColumn: -1, markColumn: -1, outMarks: [], inMarks: [] };
const NO_FOREIGN = { originalColumn: -1, currencyColumn: -1 };

export function table(t) {
  return Object.assign({ sheet: 0, headerRow: -1, firstRow: 0, lastRow: -1, date: 0, dateOrder: "DMY", description: 1, details: [], balanceColumn: -1 },
    t, { amount: Object.assign({}, AMOUNT, t.amount || {}), foreign: Object.assign({}, NO_FOREIGN, t.foreign || {}) });
}
export function answer(tables, examples, extra) {
  return Object.assign({ statement: "bank", currency: "ILS", tables: tables.map(table), skipRows: [], examples: examples || [], problem: "" }, extra || {});
}
const ex = (row, date, amount, description, sheet) => ({ sheet: sheet || 0, row, date, amount, description });

export const ANSWERS = {
  LEUMI: answer([{ headerRow: 2, firstRow: 3, amount: { mode: "split", outColumn: 3, inColumn: 4 } }],
    [ex(3, "2026-09-01", 18500, "משכורת חודש אוגוסט"), ex(4, "2026-09-02", -342.9, "שופרסל דיל תל אביב"), ex(8, "2026-09-14", -289.4, "רמי לוי שיווק")]),
  ISRACARD: answer([{ headerRow: 3, firstRow: 4, amount: { column: 3, fallbackColumn: 2, negativeIs: "in" } }],
    [ex(4, "2026-09-03", -129, "מקס איט"), ex(6, "2026-09-08", -32, "ארומה תל אביב"), ex(9, "2026-09-19", -88.9, "סופר פארם")], { statement: "card" }),
  MAX: answer([{ headerRow: 0, firstRow: 1, amount: { column: 3 } }],
    [ex(1, "2026-09-02", -312.4, "רמי לוי"), ex(3, "2026-09-09", 64.9, "זיכוי החזר"), ex(5, "2026-09-20", -1240, "איקאה")], { statement: "card" }),
  ENGLISH: answer([{ headerRow: 0, firstRow: 1, dateOrder: "YMD", amount: { column: 2 } }],
    [ex(1, "2026-06-01", -54.2, "Grocery Store"), ex(2, "2026-06-02", 3000, "Salary"), ex(4, "2026-06-05", -15.99, "Netflix")], { currency: "USD" }),
  US_MDY: answer([{ headerRow: 0, firstRow: 1, dateOrder: "MDY", description: 2, amount: { column: 3 } }],
    [ex(1, "2026-09-13", -82.15, "WHOLE FOODS"), ex(3, "2026-10-02", 3100, "PAYROLL DEPOSIT"), ex(2, "2026-09-21", -61, "SHELL OIL")], { currency: "USD" }),
  HEADERLESS: answer([{ headerRow: -1, firstRow: 0, amount: { column: 2, negativeIs: "in" } }],
    [ex(0, "2026-09-01", -342.9, "שופרסל דיל"), ex(1, "2026-09-02", -28, "פנגו חניה"), ex(2, "2026-09-03", -32, "ארומה")], { statement: "card" }),
  CAL_REFUND: answer([{ headerRow: 1, firstRow: 2, amount: { column: 4, fallbackColumn: 2, negativeIs: "in" } }],
    [ex(2, "2026-09-02", -29, "קפה גרג"), ex(4, "2026-09-06", 149.9, "זיכוי זארה"), ex(6, "2026-09-12", -54.9, "נטפליקס")], { statement: "card" }),
  EURO_SEMI: answer([{ headerRow: 1, firstRow: 2, amount: { column: 2 } }],
    [ex(2, "2026-09-01", 3150, "GEHALT ACME GMBH"), ex(3, "2026-09-03", -82.15, "REWE MARKT BERLIN"), ex(5, "2026-09-09", -1249.99, "AMAZON EU S.A R.L.")], { currency: "EUR" }),
  TRAILING_MINUS: answer([{ headerRow: 0, firstRow: 1, amount: { column: 2 } }],
    [ex(1, "2026-09-01", 12500, "משכורת"), ex(2, "2026-09-02", -4210.35, "כרטיס אשראי ישראכרט"), ex(5, "2026-09-08", -120, "ביט - דנה כהן")]),
  MARKED: answer([{ headerRow: 0, firstRow: 1, dateOrder: "YMD", amount: { mode: "marked", column: 2, markColumn: 3, outMarks: ["dr"], inMarks: ["cr"] } }],
    [ex(1, "2026-09-01", 2800, "PAYROLL ACME INC"), ex(2, "2026-09-02", -54.2, "TESCO STORES 2231"), ex(4, "2026-09-06", 19.99, "REFUND ARGOS")], { currency: "GBP" }),
  CARD_SECTIONS: answer([
    { headerRow: 2, firstRow: 3, details: [4], amount: { column: 3, fallbackColumn: 2, negativeIs: "in" } },
    { headerRow: 9, firstRow: 10, amount: { column: 4, negativeIs: "in" }, foreign: { originalColumn: 2, currencyColumn: 3 } }
  ], [ex(3, "2026-09-02", -212.4, "שופרסל דיל"), ex(6, "2026-09-10", -400, "איקאה נתניה"), ex(10, "2026-09-03", -92.75, "AMAZON.COM")],
  { statement: "card", skipRows: [{ sheet: 0, row: 12 }] })
};

// The seven hard statements in hard-fixtures.mjs (built by the session that
// shipped the line-by-line reader on 24 Sep 2026, kept as the benchmark this
// rebuild has to meet): sections, installments, foreign charges, totals,
// newest-first, unsigned amounts read only by the running balance, a trailing
// minus, US debit/credit.
export const HARD_ANSWERS = {
  HAPOALIM: answer([{ headerRow: 2, firstRow: 3, details: [2], balanceColumn: 6, amount: { mode: "split", outColumn: 4, inColumn: 5 } }],
    [ex(15, "2026-09-01", 14250, "משכורת"), ex(13, "2026-09-02", -6380.4, "ישראכרט"), ex(4, "2026-09-20", 3004.1, "פדיון פיקדון")]),
  ISRACARD_SECTIONS: answer([
    { headerRow: 4, firstRow: 5, details: [5], amount: { column: 3, fallbackColumn: 2, negativeIs: "in" } },
    { headerRow: 15, firstRow: 16, description: 2, amount: { column: 5, negativeIs: "in" }, foreign: { originalColumn: 3, currencyColumn: 4 } }
  ], [ex(5, "2026-09-01", -412.75, "שופרסל דיל רמת אביב"), ex(9, "2026-09-09", 149.9, "זארה דיזנגוף"), ex(18, "2026-09-20", -1264.18, "BOOKING.COM HOTEL")], { statement: "card" }),
  US_CHECKING: answer([{ headerRow: 1, firstRow: 2, dateOrder: "MDY", balanceColumn: 5, amount: { mode: "split", outColumn: 3, inColumn: 4 } }],
    [ex(2, "2026-09-01", 3450, "ACME CORP PAYROLL PPD ID: 9920"), ex(3, "2026-09-02", -1840.22, "CHASE CREDIT CRD AUTOPAY"), ex(10, "2026-09-21", 23.99, "AMAZON.COM REFUND")], { currency: "USD" }),
  UNSIGNED_LEUMI: answer([{ headerRow: 0, firstRow: 1, balanceColumn: 3, amount: { mode: "unsigned", column: 2 } }],
    [ex(1, "2026-09-01", 9800, "משכורת - משרד החינוך"), ex(3, "2026-09-03", -356.2, "רמי לוי שיווק השקמה"), ex(5, "2026-09-06", 42, "זיכוי - רמי לוי")]),
  MAX_CARD: answer([{ headerRow: 0, firstRow: 1, amount: { column: 5, negativeIs: "in" } }],
    [ex(1, "2026-09-01", -64, "WOLT"), ex(7, "2026-09-15", 32, "זיכוי WOLT"), ex(4, "2026-09-07", -433.3, "איקאה נתניה")], { statement: "card" }),
  DISCOUNT_TRAILING: answer([{ headerRow: 1, firstRow: 2, balanceColumn: 3, amount: { column: 2 } }],
    [ex(2, "2026-09-01", -342.9, "שופרסל בע\"מ"), ex(4, "2026-09-05", 7300, "משכורת"), ex(7, "2026-09-09", -2150.75, "מקס איט פיננסים")]),
  LONG_LEUMI: answer([{ headerRow: 1, firstRow: 2, balanceColumn: 3, amount: { column: 2 } }],
    [ex(2, "2026-09-28", -178.51, "פז דלק"), ex(85, "2026-07-01", 16310, "משכורת - אינטל ישראל"), ex(3, "2026-09-28", -137.18, "סינמה סיטי")])
};
