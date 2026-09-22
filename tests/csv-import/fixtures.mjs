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

export const ALL = {
  LEUMI: { text: LEUMI, encoding: "windows-1255", bytes: () => toCp1255(LEUMI) },
  ISRACARD: { text: ISRACARD, encoding: "utf-8", bytes: () => toUtf8(ISRACARD) },
  MAX: { text: MAX, encoding: "utf-8", bytes: () => toUtf8(MAX) },
  ENGLISH: { text: ENGLISH, encoding: "utf-8", bytes: () => toUtf8(ENGLISH) },
  US_MDY: { text: US_MDY, encoding: "utf-8", bytes: () => toUtf8(US_MDY) },
  HEADERLESS: { text: HEADERLESS, encoding: "utf-8", bytes: () => toUtf8(HEADERLESS) }
};
