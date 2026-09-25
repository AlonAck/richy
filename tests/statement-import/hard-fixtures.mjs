// Statements the way banks actually hand them out - not the tidy five-line
// files in fixtures.mjs. Every trap here is one a real export carries:
// sections with their own column titles, total lines, installments, a foreign
// currency next to the shekel charge, a running balance, newest-first order,
// unsigned amounts whose direction only the balance or the words reveal, a
// trailing minus, a loan repayment that reads like money back, a card bill
// that is not spending, Bit both ways, a deposit going out and coming back.
//
// Each fixture carries its right answer, line by line:
//   [date, amount, dir, kind, categories]
//     dir         "out" | "in"
//     kind        "spend" | "income" | "transfer"
//     categories  the category names a careful person could defend (any one
//                 passes); null for a transfer, which has none
// Anything in the file that is NOT in the list - titles, totals, footers,
// section headers - must not come in as a ticked line.

export const CATS = ["Housing", "Food", "Transport", "Health", "Entertainment", "Shopping", "Salary", "Investments", "Savings", "Other"];

function money(n) { return n.toFixed(2); }
function csvCell(s) { s = String(s); return /[",\n]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s; }
function csvLine(cells) { return cells.map(csvCell).join(","); }

// ---------------------------------------------------------------------------
// Hapoalim current account. Newest first, split חובה/זכות, running balance,
// value date beside the date, a details column that holds the person's name
// on a transfer, and עו"ש with its quote mark in the title.
function hapoalim() {
  // Oldest first here; written newest first below, as the bank does.
  const lines = [
    ["01/09/2026", "משכורת", "אלביט מערכות בע\"מ", "", 14250.00, "Salary"],
    ["02/09/2026", "הו\"ק חברת החשמל", "חשבון 7/26", 412.55, "", "Housing"],
    ["02/09/2026", "ישראכרט", "חיוב כרטיס 4471", 6380.40, "", null],
    ["03/09/2026", "העברה בביט", "לדנה כהן", 150.00, "", "Other"],
    ["04/09/2026", "העברה בביט", "מאת יוסי לוי", "", 85.00, "Other"],
    ["05/09/2026", "משיכת מזומן", "בנקט סניף 614", 500.00, "", "Other"],
    ["07/09/2026", "העברה לפיקדון", "פיקדון קצר מועד", 3000.00, "", null],
    ["08/09/2026", "החזר הלוואה", "הלוואה 88", 1250.00, "", "Other"],
    ["10/09/2026", "ביטוח לאומי", "קצבת ילדים", "", 173.00, "Other"],
    ["12/09/2026", "עמלת פעולה", "עמלה", 12.90, "", "Other"],
    ["15/09/2026", "העברה מאת", "אבי כהן", "", 2000.00, "Other"],
    ["20/09/2026", "פדיון פיקדון", "פיקדון קצר מועד", "", 3004.10, null],
    ["25/09/2026", "מכבי שירותי בריאות", "הוראת קבע", 108.00, "", "Health"]
  ];
  let bal = 8120.35;
  const rows = lines.map((l) => {
    bal = bal - (l[3] || 0) + (l[4] || 0);
    return [l[0], l[1], l[2], "0" + (4410000 + Math.round((l[3] || l[4]) * 7) % 99999), l[3] === "" ? "" : money(l[3]), l[4] === "" ? "" : money(l[4]), money(bal), l[0]];
  });
  const text = [
    "בנק הפועלים - תנועות בחשבון עו\"ש",
    "חשבון: 12-614-338271   תאריך הפקה: 30/09/2026",
    "",
    csvLine(["תאריך", "הפעולה", "פרטים", "אסמכתא", "חובה", "זכות", "יתרה בש\"ח", "תאריך ערך"]),
    ...rows.reverse().map(csvLine)
  ].join("\r\n");
  const kind = (l) => (l[5] === null ? "transfer" : l[4] !== "" ? "income" : "spend");
  const expect = lines.map((l) => [iso(l[0]), l[3] || l[4], l[4] !== "" ? "in" : "out", kind(l), l[5] === null ? null : [l[5]].concat(l[5] === "Other" && l[4] !== "" ? ["Salary"] : [])]);
  // A person paying back and a benefit could defensibly be Other; a Bit to a
  // friend could be Food or Entertainment too - nobody can tell from the line.
  expect[3][4] = null; expect[4][4] = null; expect[10][4] = null;
  expect[7][4] = ["Other", "Housing"];
  return { text, expect };
}

// ---------------------------------------------------------------------------
// Isracard: two sections, each with its own titles; installments where the
// transaction amount is the whole purchase and only the charge is this
// month's; a refund; a foreign section where the original is in dollars and
// the charge in shekels; total lines; a footer.
function isracard() {
  const text = [
    "ישראכרט - פירוט עסקאות",
    "כרטיס מסטרקארד המסתיים ב-4471",
    "מועד חיוב: 02/10/2026",
    "",
    "עסקאות בארץ",
    csvLine(["תאריך רכישה", "שם בית עסק", "סכום עסקה", "סכום חיוב", "סוג עסקה", "פירוט נוסף"]),
    csvLine(["01/09/2026", "שופרסל דיל רמת אביב", "412.75", "412.75", "רגילה", ""]),
    csvLine(["03/09/2026", "פז יקום", "250.00", "250.00", "רגילה", ""]),
    csvLine(["04/08/2026", "מחסני חשמל", "1,200.00", "200.00", "תשלומים", "תשלום 2 מתוך 6"]),
    csvLine(["06/09/2026", "ארומה תל אביב", "38.00", "38.00", "רגילה", ""]),
    csvLine(["09/09/2026", "זארה דיזנגוף", "-149.90", "-149.90", "זיכוי", "החזר"]),
    csvLine(["11/09/2026", "סופר פארם", "88.90", "88.90", "רגילה", ""]),
    csvLine(["14/09/2026", "וולט", "96.00", "96.00", "רגילה", ""]),
    csvLine(["18/09/2026", "סינמה סיטי גלילות", "94.00", "94.00", "רגילה", ""]),
    csvLine(["", "סה\"כ עסקאות בארץ", "", "1,029.75", "", ""]),
    "",
    "עסקאות בחו\"ל",
    csvLine(["תאריך רכישה", "תאריך חיוב", "שם בית עסק", "סכום מקורי", "מטבע מקור", "סכום חיוב ₪"]),
    csvLine(["05/09/2026", "02/10/2026", "NETFLIX.COM", "15.49", "USD", "58.40"]),
    csvLine(["12/09/2026", "02/10/2026", "AMAZON MKTPLACE PMTS", "42.10", "USD", "158.72"]),
    csvLine(["20/09/2026", "02/10/2026", "BOOKING.COM HOTEL", "310.00", "EUR", "1,264.18"]),
    csvLine(["", "", "סה\"כ עסקאות בחו\"ל", "", "", "1,481.30"]),
    "",
    csvLine(["סה\"כ לחיוב", "", "2,511.05"]),
    "המידע בדוח זה אינו מהווה אישור רשמי"
  ].join("\n");
  const expect = [
    ["2026-09-01", 412.75, "out", "spend", ["Food"]],
    ["2026-09-03", 250.00, "out", "spend", ["Transport"]],
    ["2026-08-04", 200.00, "out", "spend", ["Shopping"]],
    ["2026-09-06", 38.00, "out", "spend", ["Food"]],
    ["2026-09-09", 149.90, "in", "spend", ["Shopping"]],
    ["2026-09-11", 88.90, "out", "spend", ["Health", "Shopping"]],
    ["2026-09-14", 96.00, "out", "spend", ["Food"]],
    ["2026-09-18", 94.00, "out", "spend", ["Entertainment"]],
    ["2026-09-05", 58.40, "out", "spend", ["Entertainment"]],
    ["2026-09-12", 158.72, "out", "spend", ["Shopping"]],
    ["2026-09-20", 1264.18, "out", "spend", ["Housing", "Other", "Entertainment"]]
  ];
  return { text, expect };
}

// ---------------------------------------------------------------------------
// A US checking account: separate Debit and Credit columns, unsigned, with a
// Type column; Zelle both ways, a card autopay, a savings transfer, an ATM.
function usChecking() {
  const text = [
    "Account Activity - CHECKING ...8812",
    "Date,Description,Type,Debit,Credit,Balance",
    "09/01/2026,ACME CORP PAYROLL PPD ID: 9920,ACH_CREDIT,,3450.00,5120.44",
    "09/02/2026,CHASE CREDIT CRD AUTOPAY,ACH_DEBIT,1840.22,,3280.22",
    "09/03/2026,ZELLE PAYMENT TO JOHN SMITH,QUICKPAY,60.00,,3220.22",
    "09/05/2026,TRADER JOE'S #552,DEBIT_CARD,74.31,,3145.91",
    "09/08/2026,ONLINE TRANSFER TO SAV ...4410,ACCT_XFER,500.00,,2645.91",
    "09/09/2026,ATM WITHDRAWAL 0042 MAIN ST,ATM,100.00,,2545.91",
    "09/13/2026,ZELLE PAYMENT FROM MARIA LOPEZ,QUICKPAY,,45.00,2590.91",
    "09/15/2026,SHELL OIL 57442,DEBIT_CARD,48.10,,2542.81",
    "09/21/2026,AMAZON.COM REFUND,DEBIT_CARD,,23.99,2566.80",
    "09/28/2026,MONTHLY SERVICE FEE,FEE,12.00,,2554.80"
  ].join("\n");
  const expect = [
    ["2026-09-01", 3450.00, "in", "income", ["Salary"]],
    ["2026-09-02", 1840.22, "out", "transfer", null],
    ["2026-09-03", 60.00, "out", "spend", null],
    ["2026-09-05", 74.31, "out", "spend", ["Food"]],
    ["2026-09-08", 500.00, "out", "transfer", null],
    ["2026-09-09", 100.00, "out", "spend", ["Other"]],
    ["2026-09-13", 45.00, "in", "income", null],
    ["2026-09-15", 48.10, "out", "spend", ["Transport"]],
    ["2026-09-21", 23.99, "in", "spend", ["Shopping"]],
    ["2026-09-28", 12.00, "out", "spend", ["Other", "Housing"]]
  ];
  return { text, expect };
}

// ---------------------------------------------------------------------------
// The hardest shape there is: one amount column, every number positive, no
// direction column. Only the running balance - and the words - say which way
// each line went. Semicolons, because Excel on a Hebrew machine writes them.
function unsignedLeumi() {
  const lines = [
    ["01/09/2026", "משכורת - משרד החינוך", 9800.00, "in", "income", ["Salary"]],
    ["02/09/2026", "כאל חיוב חודשי", 4120.60, "out", "transfer", null],
    ["03/09/2026", "רמי לוי שיווק השקמה", 356.20, "out", "spend", ["Food"]],
    ["05/09/2026", "ארנונה עיריית חיפה", 698.00, "out", "spend", ["Housing"]],
    ["06/09/2026", "זיכוי - רמי לוי", 42.00, "in", "spend", ["Food"]],
    ["09/09/2026", "ביט מאת נועה", 120.00, "in", "income", null],
    ["11/09/2026", "הפקדה לקרן השתלמות", 1000.00, "out", "transfer", null],
    ["14/09/2026", "ריבית זכות", 3.40, "in", "income", ["Investments", "Savings", "Other"]],
    ["19/09/2026", "סלקום תקשורת", 89.90, "out", "spend", ["Housing"]],
    ["22/09/2026", "גולף אנד קו קניון", 219.00, "out", "spend", ["Shopping"]]
  ];
  let bal = 2210.75;
  const body = lines.map((l) => {
    bal += l[3] === "in" ? l[2] : -l[2];
    return [l[0], l[1], money(l[2]), money(bal)].join(";");
  });
  const text = ["תאריך;תיאור;סכום;יתרה", ...body].join("\n");
  const expect = lines.map((l) => [iso(l[0]), l[2], l[3], l[4], l[5]]);
  return { text, expect };
}

// ---------------------------------------------------------------------------
// Max: a single signed column where money out is plain and a refund and the
// card's own payment are minus; the issuer's own category column (a hint, not
// the user's categories); dashes in the dates; a trailing total; an
// installment line.
function maxCard() {
  const text = [
    "תאריך עסקה,שם בית העסק,קטגוריה,4 ספרות אחרונות,סוג עסקה,סכום חיוב,מטבע חיוב,הערות",
    "01-09-2026,WOLT,מסעדות,5521,רגילה,64.00,₪,",
    "02-09-2026,PAYPAL *SPOTIFY,שירותים,5521,רגילה,23.90,₪,",
    "04-09-2026,דור אלון נתניה,רכב ותחבורה,5521,רגילה,210.00,₪,",
    "07-09-2026,איקאה נתניה,ריהוט,5521,תשלומים,433.30,₪,תשלום 1 מתוך 3",
    "10-09-2026,גוד פארם,פארם,5521,רגילה,57.80,₪,",
    "12-09-2026,בזק,תקשורת,5521,הוראת קבע,99.00,₪,",
    "15-09-2026,זיכוי WOLT,מסעדות,5521,זיכוי,-32.00,₪,",
    "21-09-2026,רב קו,רכב ותחבורה,5521,רגילה,50.00,₪,",
    ",,,,,,,",
    "סה\"כ,,,,,906.00,,"
  ].join("\n");
  const expect = [
    ["2026-09-01", 64.00, "out", "spend", ["Food"]],
    ["2026-09-02", 23.90, "out", "spend", ["Entertainment"]],
    ["2026-09-04", 210.00, "out", "spend", ["Transport"]],
    ["2026-09-07", 433.30, "out", "spend", ["Shopping", "Housing"]],
    ["2026-09-10", 57.80, "out", "spend", ["Health", "Shopping"]],
    ["2026-09-12", 99.00, "out", "spend", ["Housing"]],
    ["2026-09-15", 32.00, "in", "spend", ["Food"]],
    ["2026-09-21", 50.00, "out", "spend", ["Transport"]]
  ];
  return { text, expect };
}

// ---------------------------------------------------------------------------
// Discount Bank: one signed column where money out is minus, written with a
// TRAILING minus ("342.90-"), a quoted shop name with a comma in it, and a
// בע"מ whose quote mark sits in the middle of a field.
function discountTrailing() {
  const text = [
    "תנועות בחשבון - בנק דיסקונט",
    "תאריך,תאור,סכום,יתרה",
    "01/09/2026,שופרסל בע\"מ,342.90-,5657.10",
    "02/09/2026,\"קפה, מאפה ועוד\",28.00-,5629.10",
    "05/09/2026,משכורת,7300.00,12929.10",
    "06/09/2026,הוראת קבע משכנתא,3900.00-,9029.10",
    "08/09/2026,\"החזר ביטוח, הראל\",260.00,9289.10",
    "09/09/2026,מקס איט פיננסים,2150.75-,7138.35"
  ].join("\n");
  const expect = [
    ["2026-09-01", 342.90, "out", "spend", ["Food"]],
    ["2026-09-02", 28.00, "out", "spend", ["Food"]],
    ["2026-09-05", 7300.00, "in", "income", ["Salary"]],
    ["2026-09-06", 3900.00, "out", "spend", ["Housing"]],
    ["2026-09-08", 260.00, "in", "income", ["Health", "Other"]],
    ["2026-09-09", 2150.75, "out", "transfer", null]
  ];
  return { text, expect };
}

function iso(d) { const m = d.split("/"); return m[2] + "-" + m[1] + "-" + m[0]; }

export const HARD = {
  HAPOALIM: hapoalim(),
  ISRACARD_SECTIONS: isracard(),
  US_CHECKING: usChecking(),
  UNSIGNED_LEUMI: unsignedLeumi(),
  MAX_CARD: maxCard(),
  DISCOUNT_TRAILING: discountTrailing()
};

// ---------------------------------------------------------------------------
// Three months of a Leumi current account: long enough that Alfred reads it in
// several blocks at once, so each block has to read the file the same way as
// the others. One signed amount column (minus is out), newest first, a running
// balance, and the everyday mix. Generated from a fixed seed, so the file and
// its right answer never change between runs.
function longLeumi() {
  const shops = [
    ["שופרסל דיל", "Food", 80, 420], ["רמי לוי שיווק השקמה", "Food", 90, 520], ["ארומה", "Food", 22, 60],
    ["וולט", "Food", 45, 160], ["פז דלק", "Transport", 150, 330], ["רב קו טעינה", "Transport", 50, 100],
    ["פנגו", "Transport", 8, 40], ["סופר פארם", "Health", 30, 190], ["נטפליקס", "Entertainment", 55, 55],
    ["סינמה סיטי", "Entertainment", 70, 140], ["זארה", "Shopping", 120, 480], ["KSP מחשבים", "Shopping", 90, 900]
  ];
  let seed = 20260924;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const lines = [];
  for (const [m, mm] of [[7, "07"], [8, "08"], [9, "09"]]) {
    lines.push([1, mm, "משכורת - אינטל ישראל", 16240 + m * 10, "in", "income", ["Salary"]]);
    lines.push([2, mm, "ישראכרט חיוב חודשי", 3100 + m * 37.3, "out", "transfer", null]);
    lines.push([3, mm, "חברת החשמל", 380 + m * 11.1, "out", "spend", ["Housing"]]);
    lines.push([10, mm, "העברה לחיסכון", 1500, "out", "transfer", null]);
    lines.push([15, mm, "מכבי שירותי בריאות", 108, "out", "spend", ["Health"]]);
    for (let k = 0; k < 22; k++) {
      const s = shops[Math.floor(rnd() * shops.length)];
      const amt = Math.round((s[2] + rnd() * (s[3] - s[2])) * 100) / 100;
      lines.push([1 + Math.floor(rnd() * 28), mm, s[0], amt, "out", "spend", [s[1]]]);
    }
    lines.push([20, mm, "זיכוי - שופרסל", 34.9, "in", "spend", ["Food"]]);
  }
  lines.sort((a, b) => (a[1] + String(a[0]).padStart(2, "0")).localeCompare(b[1] + String(b[0]).padStart(2, "0")));
  let bal = 4312.77;
  const body = lines.map((l) => {
    bal = Math.round((bal + (l[4] === "in" ? l[3] : -l[3])) * 100) / 100;
    const d = String(l[0]).padStart(2, "0") + "/" + l[1] + "/2026";
    return csvLine([d, l[2], (l[4] === "in" ? "" : "-") + money(l[3]), money(bal)]);
  });
  const text = ["לאומי - תנועות בחשבון", "תאריך,תיאור,סכום,יתרה", ...body.reverse()].join("\n");
  const expect = lines.map((l) => ["2026-" + l[1] + "-" + String(l[0]).padStart(2, "0"), Math.round(l[3] * 100) / 100, l[4], l[5], l[6]]);
  return { text, expect };
}
HARD.LONG_LEUMI = longLeumi();
