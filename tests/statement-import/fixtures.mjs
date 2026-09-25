// Statement exports in the shapes Israeli banks and card issuers actually use.
// Invented rows, real formats: the junk lines above the header, the running
// balance sitting next to the amount, the two different "amount" columns on a
// card statement, day-first dates, and windows-1255 bytes.

// cp1255 covers what these fixtures need: ASCII passthrough, the Hebrew block
// (U+05D0-U+05EA maps contiguously onto 0xE0-0xFA) and the shekel sign. A
// character outside that range throws rather than being written as "?" - a
// fixture that silently lost its Hebrew would make the decoder test pass for
// the wrong reason.
export function toCp1255(text) {
  const out = [];
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c >= 0x05d0 && c <= 0x05ea) out.push(0xe0 + (c - 0x05d0));
    else if (c === 0x20aa) out.push(0xa4);            // shekel
    else if (c === 0x201c || c === 0x201d) out.push(0x22);
    else throw new Error("fixture uses a character cp1255 cannot carry: " + ch + " (U+" + c.toString(16) + ")");
  }
  return Uint8Array.from(out);
}

export function toUtf8(text) {
  return new TextEncoder().encode(text);
}

// --- Leumi: current account. Two report lines above the header, a split
// debit/credit pair, and a running balance that is the trap.
export const LEUMI = [
  "דוח תנועות בחשבון",
  "מתאריך 01/09/2026 עד 30/09/2026 חשבון 12-345-67890",
  "תאריך,תיאור,אסמכתא,חובה,זכות,יתרה",
  "01/09/2026,משכורת חודש אוגוסט,1234567,,18500.00,21450.30",
  "02/09/2026,שופרסל דיל תל אביב,8823145,342.90,,21107.40",
  "03/09/2026,פנגו חניה,8823146,28.00,,21079.40",
  "05/09/2026,הוראת קבע חשמל,8823147,412.55,,20666.85",
  "07/09/2026,ביט העברה,8823148,150.00,,20516.85",
  "14/09/2026,רמי לוי שיווק,8823149,289.40,,20227.45"
].join("\r\n");

// --- Isracard: card statement. Three lines above the header, and TWO amount
// columns - the transaction amount and the amount actually charged. Nothing
// in the file is negative, because every line is a charge.
export const ISRACARD = [
  "פירוט חיובים",
  "כרטיס מסתיים בספרות 4471",
  "לחיוב בתאריך 10/10/2026",
  "תאריך עסקה,שם בית העסק,סכום עסקה,סכום חיוב,מטבע",
  "03/09/2026,מקס איט,129.00,129.00,שח",
  "04/09/2026,סינמה סיטי גלילות,94.00,94.00,שח",
  "08/09/2026,ארומה תל אביב,32.00,32.00,שח",
  "11/09/2026,פייבוקס,200.00,200.00,שח",
  "15/09/2026,שופרסל דיל,412.75,412.75,שח",
  "19/09/2026,סופר פארם,88.90,88.90,שח"
].join("\n");

// --- Max: no report lines, one signed amount column, a refund to prove the
// sign convention is read from the rows and not assumed.
export const MAX = [
  "תאריך,שם בית העסק,קטגוריה,סכום חיוב",
  "02/09/2026,רמי לוי,מזון,-312.40",
  "06/09/2026,דלק פז,דלק,-250.00",
  "09/09/2026,זיכוי החזר,אחר,64.90",
  "12/09/2026,קפה ג'ו,מזון,-28.00",
  "20/09/2026,איקאה,בית,-1240.00"
].join("\n");

// --- The English happy path. This one worked before any of this; it is here
// to catch a regression, not to prove anything new.
export const ENGLISH = [
  "Date,Description,Amount",
  "2026-06-01,Grocery Store,-54.20",
  "2026-06-02,Salary,3000.00",
  "2026-06-03,STARBUCKS #1123 SEATTLE,-4.50",
  "2026-06-05,Netflix,-15.99"
].join("\n");

// --- A US-style export: month-first dates, which only the rows can reveal.
export const US_MDY = [
  "Transaction Date,Value Date,Merchant,Amount,Balance",
  "09/13/2026,09/14/2026,WHOLE FOODS,-82.15,4210.55",
  "09/21/2026,09/22/2026,SHELL OIL,-61.00,4149.55",
  "10/02/2026,10/03/2026,PAYROLL DEPOSIT,3100.00,7249.55"
].join("\n");

// --- No titles at all. There is nothing for a model to read here, and the
// pipeline is supposed to notice that and not spend a call.
export const HEADERLESS = [
  "01/09/2026,שופרסל דיל,342.90",
  "02/09/2026,פנגו חניה,28.00",
  "03/09/2026,ארומה,32.00"
].join("\n");

// --- Cal: a card statement carrying BOTH traps that shipped as bugs on
// 2026-09-23. A charge DATE sits between the two amounts (it was read as
// money, turning 29 shekels into 20 million), and one refund is the only
// minus in the file (it made every charge read as income).
export const CAL_REFUND = [
  "פירוט עסקאות בכרטיס",
  "תאריך עסקה,שם בית העסק,סכום עסקה,תאריך חיוב,סכום חיוב",
  "02/09/2026,קפה גרג,29.00,02/10/2026,29.00",
  "04/09/2026,שופרסל דיל,212.40,02/10/2026,212.40",
  "06/09/2026,זיכוי זארה,-149.90,02/10/2026,-149.90",
  "09/09/2026,פז יקום,250.00,02/10/2026,250.00",
  "12/09/2026,נטפליקס,54.90,02/10/2026,54.90"
].join("\n");

// --- Excel on a machine whose decimal mark is a comma: semicolons between the
// fields, "1.234,50" for the money, and a title line with no separator in it.
export const EURO_SEMI = [
  "Kontoauszug September 2026",
  "Buchungstag;Verwendungszweck;Betrag;Saldo",
  "01.09.2026;GEHALT ACME GMBH;3.150,00;4.210,55",
  "03.09.2026;REWE MARKT BERLIN;-82,15;4.128,40",
  "05.09.2026;DB VERTRIEB GMBH;-61,00;4.067,40",
  "09.09.2026;AMAZON EU S.A R.L.;-1.249,99;2.817,41"
].join("\r\n");

// --- The Israeli bank export that writes a minus AFTER the number, and keeps a
// running balance beside it.
export const TRAILING_MINUS = [
  "תאריך,תיאור התנועה,סכום,יתרה",
  "01/09/2026,משכורת,12500.00,15230.10",
  "02/09/2026,כרטיס אשראי ישראכרט,4210.35-,11019.75",
  "04/09/2026,העברה לפיקדון,2000.00-,9019.75",
  "06/09/2026,הוראת קבע ועד בית,180.00-,8839.75",
  "08/09/2026,ביט - דנה כהן,120.00-,8719.75"
].join("\n");

// --- Plain numbers, and the direction as a word in a column of its own.
export const MARKED = [
  "Date,Details,Amount,Type,Balance",
  "2026-09-01,PAYROLL ACME INC,2800.00,CR,5120.40",
  "2026-09-02,TESCO STORES 2231,54.20,DR,5066.20",
  "2026-09-04,TFL TRAVEL CHARGE,7.80,DR,5058.40",
  "2026-09-06,REFUND ARGOS,19.99,CR,5078.39"
].join("\n");

// --- A card statement in two blocks, each with its own titles: purchases in
// Israel, then purchases abroad with the original currency beside the amount
// charged in shekels. Totals under each block carry an amount; one carries a
// date too.
export const CARD_SECTIONS = [
  "פירוט עסקאות לכרטיס 4471",
  "עסקאות בארץ",
  "תאריך עסקה,שם בית העסק,סכום עסקה,סכום חיוב,פירוט נוסף",
  "02/09/2026,שופרסל דיל,212.40,212.40,",
  "05/09/2026,פז יקום,250.00,250.00,",
  "07/09/2026,נטפליקס,54.90,54.90,הוראת קבע",
  "10/09/2026,איקאה נתניה,1200.00,400.00,תשלום 1 מתוך 3",
  "סה\"כ עסקאות בארץ,,,917.30,",
  "עסקאות בחו\"ל",
  "תאריך עסקה,שם בית העסק,סכום מקורי,מטבע,סכום חיוב",
  "03/09/2026,AMAZON.COM,25.00,USD,92.75",
  "12/09/2026,BOOKING.COM,180.00,EUR,741.60",
  "15/09/2026,סה\"כ חיוב חו\"ל,,,834.35"
].join("\n");

export const ALL = {
  LEUMI: { text: LEUMI, encoding: "windows-1255", bytes: () => toCp1255(LEUMI) },
  ISRACARD: { text: ISRACARD, encoding: "utf-8", bytes: () => toUtf8(ISRACARD) },
  MAX: { text: MAX, encoding: "utf-8", bytes: () => toUtf8(MAX) },
  ENGLISH: { text: ENGLISH, encoding: "utf-8", bytes: () => toUtf8(ENGLISH) },
  US_MDY: { text: US_MDY, encoding: "utf-8", bytes: () => toUtf8(US_MDY) },
  HEADERLESS: { text: HEADERLESS, encoding: "utf-8", bytes: () => toUtf8(HEADERLESS) },
  CAL_REFUND: { text: CAL_REFUND, encoding: "utf-8", bytes: () => toUtf8(CAL_REFUND) },
  EURO_SEMI: { text: EURO_SEMI, encoding: "utf-8", bytes: () => toUtf8(EURO_SEMI) },
  TRAILING_MINUS: { text: TRAILING_MINUS, encoding: "utf-8", bytes: () => toUtf8(TRAILING_MINUS) },
  MARKED: { text: MARKED, encoding: "utf-8", bytes: () => toUtf8(MARKED) },
  CARD_SECTIONS: { text: CARD_SECTIONS, encoding: "utf-8", bytes: () => toUtf8(CARD_SECTIONS) }
};

// UTF-16 little-endian with the byte-order mark stripped - Hebrew in it has
// 0x05 as every other byte, which a NUL-counting sniff misses.
export function toUtf16leNoBom(text) {
  const out = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); out[i * 2] = c & 0xff; out[i * 2 + 1] = c >> 8; }
  return out;
}

// What each file must come out as once read right: count of transactions,
// and a few lines checked in full (signed: negative is money out).
export const EXPECT = {
  LEUMI: { count: 6, lines: [["2026-09-01", 18500, "משכורת"], ["2026-09-02", -342.9, "שופרסל"], ["2026-09-14", -289.4, "רמי לוי"]] },
  ISRACARD: { count: 6, lines: [["2026-09-03", -129, "מקס איט"], ["2026-09-19", -88.9, "סופר פארם"]] },
  MAX: { count: 5, lines: [["2026-09-02", -312.4, "רמי לוי"], ["2026-09-09", 64.9, "זיכוי"]] },
  ENGLISH: { count: 4, lines: [["2026-06-01", -54.2, "Grocery"], ["2026-06-02", 3000, "Salary"]] },
  US_MDY: { count: 3, lines: [["2026-09-13", -82.15, "WHOLE FOODS"], ["2026-10-02", 3100, "PAYROLL"]] },
  HEADERLESS: { count: 3, lines: [["2026-09-01", -342.9, "שופרסל"]] },
  CAL_REFUND: { count: 5, lines: [["2026-09-02", -29, "קפה גרג"], ["2026-09-06", 149.9, "זיכוי"]] },
  EURO_SEMI: { count: 4, lines: [["2026-09-01", 3150, "GEHALT"], ["2026-09-09", -1249.99, "AMAZON"]] },
  TRAILING_MINUS: { count: 5, lines: [["2026-09-01", 12500, "משכורת"], ["2026-09-02", -4210.35, "ישראכרט"]] },
  MARKED: { count: 4, lines: [["2026-09-01", 2800, "PAYROLL"], ["2026-09-02", -54.2, "TESCO"], ["2026-09-06", 19.99, "REFUND"]] },
  CARD_SECTIONS: { count: 6, lines: [["2026-09-10", -400, "איקאה"], ["2026-09-03", -92.75, "AMAZON"], ["2026-09-12", -741.6, "BOOKING"]] }
};
