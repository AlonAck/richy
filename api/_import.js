// Statement import - the server half. THE SERVER OWNS THESE PROMPTS, exactly
// like api/_prompts.js: the client sends the file's rows as DATA, never
// instruction text, so this cannot be turned into a general-purpose relay.
//
// Three jobs, each answered by Sonnet 5 and held to a JSON schema (structured
// outputs), so a reply can never come back in a shape the client cannot read:
//
//   importRead  Look at the rows of a spreadsheet or CSV export and say how to
//               read it: which rows are transactions, which column is the date,
//               the shop and the money, and which way the money moves. The
//               client applies that to every row of the real file itself, so
//               every amount is copied exactly - the model never retypes a
//               number. It also reads three lines by hand as proof, and the
//               client checks the proof against its own reading.
//   importSort  Say what each line is (a purchase, a salary, a card bill, a
//               move between the user's own accounts...) and which of the
//               user's categories it belongs to.
//   importDoc   A PDF statement or a photo/screenshot has no rows to apply a
//               reading to, so the model lists the transactions itself.
//
// Why the model now sees real rows: the importer this replaces showed it only
// the column titles, masked, to keep a promise that no amount would leave the
// phone - and a reader that can never look at a value cannot tell a charge
// date from a price, or a card statement from a bank account. That promise is
// gone from the app and from privacy.html; what is sent is disclosed there.
// Long digit runs (account, card and ID numbers) are still masked on the
// device before anything is sent.
//
// The `_` prefix keeps Vercel from routing this as a serverless function - it
// is a plain module required by api/chat.js, which does the auth, CORS and
// rate limiting for it.

var MODEL = "claude-sonnet-5";

// ---- importRead ---------------------------------------------------------------

var READ_SYSTEM = [
  "You read bank and credit-card statement exports for Richy, a budgeting app. The user downloaded this file from their bank or card company and chose it. They have not looked inside it and cannot answer questions about it, so everything has to come from the rows themselves.",
  "",
  "The file is shown sheet by sheet, one row per line:",
  "  r12 | c0: 01/09/2026 | c1: SHUFERSAL DEAL | c3: 342.90",
  "r12 is the row's index in its sheet and c3 is the column index. Empty cells are left out, so a missing c2 means that cell is empty. A line saying rows were not shown marks part of a large file that was left out; those rows look like the rows around them. Long digit runs such as account and card numbers are masked with #.",
  "",
  "Say how to read every transaction in the file. Code applies your answer to every row of the real file, so answer in rows and columns, never by retyping values.",
  "",
  "What counts: a transaction row has a date, a description of who was paid or who paid, and an amount. Report titles, account details, date ranges, column-title rows, blank rows, section titles, and summary rows (totals, subtotals, opening or closing balance, \"סה\"כ\", \"יתרה קודמת\", \"יתרת פתיחה\", carried forward) are not transactions.",
  "",
  "tables: one entry per block of transaction rows that shares one set of column titles. Card statements often have several blocks - purchases in Israel and abroad, one block per card, transactions not yet charged - and each gets its own entry even when the titles repeat. headerRow is the row of that block's column titles (-1 if it has none). firstRow is its first transaction row. lastRow is its last transaction row, or -1 when the block runs until the next block or the end of the sheet; always -1 when rows near the end were not shown to you.",
  "",
  "date: the column with the date the purchase or payment happened (תאריך עסקה, תאריך ביצוע, transaction date). If there is also a charge, value or posting date (תאריך חיוב, תאריך ערך, posting date), do not pick it unless it is the only date.",
  "dateOrder: how to read a date like 03/04/2026. Decide from the rows: a first number above 12 means DMY, a second number above 12 means MDY. Israeli and most non-US files are DMY. Use YMD for 2026-04-03 style dates and when every date is already in that form.",
  "description: the column naming the shop, company or person (שם בית העסק, תיאור, פרטים, תיאור התנועה, description, merchant, payee). details: other text columns worth appending for a person reading the line - an extra details column beside a short description, or the other party of a transfer. Usually []. Never a date, amount, balance, reference number, card number or the bank's own category column.",
  "",
  "amount - the money that actually left or entered this account, in the account's own currency:",
  "- mode \"signed\": one column whose sign tells the direction. negativeIs \"out\" means a minus is money spent (the usual bank-account layout). negativeIs \"in\" means every charge is a plain positive number and a minus is a refund or credit (the usual card-statement layout). Decide from the rows, not from habit: see which sign the ordinary purchases carry (supermarkets, restaurants, fuel, subscriptions) and which sign a salary, deposit or refund carries. When purchases are written as plain positive numbers - including a file where no amount is negative at all - that is negativeIs \"in\". Numbers written like 342.90- or (342.90) are negative.",
  "- mode \"split\": one column for money out (חובה, debit, withdrawal, charges) and one for money in (זכות, credit, deposit). Set outColumn and inColumn; either may be -1 when the file has only one of them.",
  "- mode \"marked\": plain numbers in one column, and the direction written as words - either in a column of its own (\"חובה\"/\"זכות\", \"DR\"/\"CR\", \"Debit\"/\"Credit\") or only inside the description (a card statement where the one refund just says \"זיכוי\"). Set markColumn to that column and list the words: a row whose markColumn cell contains any inMarks word is money in, one containing any outMarks word is money out, and a row matching neither counts as out unless outMarks is non-empty and inMarks is empty, in which case it counts as in.",
  "- mode \"unsigned\": a bank account whose single amount column holds only plain positive numbers, with nothing but the running balance (and the words) to say which way each line went. Set balanceColumn; the code reads each line's direction from how the balance moved.",
  "- column is the amount column (for signed and marked). A card statement usually has two amounts: the original transaction amount (סכום עסקה, סכום מקורי - sometimes in a foreign currency) and the amount charged in the account's currency (סכום חיוב, סכום לחיוב, charged amount). column is the charged amount; fallbackColumn is the transaction amount, used only when the charged cell is empty. fallbackColumn is -1 when there is one amount column.",
  "- Never a running balance (יתרה, balance), a date, a reference number, or an installment count such as \"2 מתוך 12\".",
  "- Fields that do not apply to the mode you chose: -1 for columns, \"out\" for negativeIs, [] for word lists.",
  "balanceColumn: the running balance after each line (יתרה, balance), which the code checks every line's direction against; -1 when the block has none.",
  "foreign: when a block shows an original amount in a foreign currency beside the charged amount, originalColumn is the foreign amount and currencyColumn is the column naming its currency; otherwise both -1.",
  "",
  "skipRows: rows inside your tables that look like transactions but are not - totals or subtotals that carry a date and an amount, balance lines, repeated title rows. Only rows you can see; [] if none.",
  "statement: \"bank\" for a current, checking or savings account (usually a running balance, salary, transfers, a card bill), \"card\" for a credit-card statement, \"other\" otherwise.",
  "currency: the ISO code of the account's currency (ILS for ₪, ש\"ח, NIS), or \"\" if you cannot tell.",
  "examples: prove your reading on three different transaction rows, including one going the other way from the rest when the file has one (a salary, deposit or refund). Give sheet, row, the date as YYYY-MM-DD, the amount as a plain number that is negative for money out and positive for money in (for example -342.9 or 18500), and the description exactly as it appears in the cell.",
  "problem: \"\" normally. If the file holds no transactions at all - a loan schedule, a portfolio summary, a price list, an empty export - say so in one short plain sentence addressed to the user, and return tables: [] and examples: []."
].join("\n");

var INT = { type: "integer" };
var INTS = { type: "array", items: INT };
var STRS = { type: "array", items: { type: "string" } };
var READ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["statement", "currency", "tables", "skipRows", "examples", "problem"],
  properties: {
    statement: { type: "string", enum: ["bank", "card", "other"] },
    currency: { type: "string" },
    tables: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sheet", "headerRow", "firstRow", "lastRow", "date", "dateOrder", "description", "details", "amount", "balanceColumn", "foreign"],
        properties: {
          sheet: INT, headerRow: INT, firstRow: INT, lastRow: INT,
          date: INT,
          dateOrder: { type: "string", enum: ["DMY", "MDY", "YMD"] },
          description: INT,
          details: INTS,
          balanceColumn: INT,
          amount: {
            type: "object",
            additionalProperties: false,
            required: ["mode", "column", "fallbackColumn", "negativeIs", "outColumn", "inColumn", "markColumn", "outMarks", "inMarks"],
            properties: {
              mode: { type: "string", enum: ["signed", "split", "marked", "unsigned"] },
              column: INT, fallbackColumn: INT,
              negativeIs: { type: "string", enum: ["out", "in"] },
              outColumn: INT, inColumn: INT,
              markColumn: INT, outMarks: STRS, inMarks: STRS
            }
          },
          foreign: {
            type: "object",
            additionalProperties: false,
            required: ["originalColumn", "currencyColumn"],
            properties: { originalColumn: INT, currencyColumn: INT }
          }
        }
      }
    },
    skipRows: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["sheet", "row"], properties: { sheet: INT, row: INT } }
    },
    examples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sheet", "row", "date", "amount", "description"],
        properties: { sheet: INT, row: INT, date: { type: "string" }, amount: { type: "number" }, description: { type: "string" } }
      }
    },
    problem: { type: "string" }
  }
};

// The sample is plain text the client builds from the rows (see impSample in
// budget-app.jsx). 90,000 characters is a few hundred rows of a wide export,
// far past anything the client sends, and still a bounded bill.
var READ_MAX_CHARS = 90000;

// The exact request for a reading - built here and nowhere else, so the live
// prompt test (tests/statement-import/live.mjs) sends what production sends.
function readPayload(body) {
  var sample = typeof body.sample === "string" ? body.sample : "";
  if (!sample.trim()) return { error: bad("The file came through empty.") };
  if (sample.length > READ_MAX_CHARS) return { error: tooBig() };
  var name = cleanLine(body.fileName, 120);
  var user = (name ? "File name: " + name + "\n\n" : "") + sample;
  // A second look, after the client's own check of the first answer failed or
  // the user asked for the file to be read again. What went wrong is sent as
  // data about the rows, never as instructions.
  var again = cleanBlock(body.feedback, 1500);
  if (again) {
    user += "\n\nA previous reading of this file did not hold up when it was applied to the rows:\n" + again
      + "\nRead the file again from the rows themselves.";
  }
  return {
    timeout: 50000,
    payload: {
      model: MODEL,
      max_tokens: 8000,
      // Thinking at low effort: the reading is one call per bank format (the
      // client caches it), so a few seconds of thought is worth the sign
      // convention and the right date column. "medium" on a second look.
      thinking: { type: "adaptive" },
      output_config: { effort: again ? "medium" : "low", format: { type: "json_schema", schema: READ_SCHEMA } },
      system: READ_SYSTEM,
      messages: [{ role: "user", content: user }]
    }
  };
}

async function read(body, call) {
  var req = readPayload(body);
  if (req.error) return req.error;
  var r = await call(req.payload, req.timeout);
  return answer(r, function(v) { return v && Array.isArray(v.tables) && Array.isArray(v.examples); });
}

// ---- importSort ---------------------------------------------------------------

var SORT_SYSTEM = [
  "You sort the lines of a bank or credit-card statement for Richy, a budgeting app. For each line say what kind of money movement it is and which of the user's categories it belongs to. The user sees your answers and can change them, but most people never do, so be right.",
  "",
  "Each line comes with its direction as read from the file: out (money left the account), in (money came in), or unknown (the file does not say - judge it from the text).",
  "",
  "kind:",
  "- purchase (out): money spent on anything bought or paid for - shops, restaurants, services, subscriptions, bills, standing orders and direct debits (electricity, water, phone, internet, insurance, arnona, a health fund, a gym), loan and mortgage payments, government payments.",
  "- refund (in): money back from a shop or service (זיכוי, החזר עסקה, refund, reversal, cancellation). Use the category of what was bought.",
  "- income (in): money earned or received that is not a refund - salary (משכורת), freelance or business income, government benefits (ביטוח לאומי, קצבת ילדים, מענק), pension, interest or dividends, a tax refund, a gift.",
  "- own_transfer (out or in): money moved between the user's own accounts or into and out of the user's own savings and investments - a deposit (פיקדון) or savings plan (חיסכון, תוכנית חיסכון), a deposit coming back, a קרן השתלמות or קופת גמל deposit the user makes, a brokerage or investment account, \"העברה בין חשבונות\", buying foreign currency into the user's own account.",
  "- card_bill (out on a bank statement): the monthly payment of a credit card - ישראכרט, מקס or max, כאל or CAL, לאומי קארד, אמריקן אקספרס or AMEX, דיינרס, a bank's own card. It is not spending: the card's own statement lists what was bought. On a card statement, a payment received from the bank is card_bill too.",
  "- cash (out): a cash withdrawal (משיכת מזומן, כספומט, ATM).",
  "- person (out or in): money to or from a private person rather than a business - Bit (ביט), PayBox (פייבוקס), PayPal to a person, or a bank transfer naming a person.",
  "- fee (out): bank or card fees and charges (עמלה, דמי כרטיס, ריבית חובה, overdraft interest, commission).",
  "- not_transaction: a total, subtotal, balance or heading that is not a real payment.",
  "",
  "category: one of the user's categories, written exactly as given. For purchase, refund and fee, the category of what the money was spent on. For income, the income category that fits. For cash and person, your best guess at what it was for (rent paid to a landlord is housing, splitting a meal is food); if the text does not say, the user's catch-all category. For own_transfer, card_bill and not_transaction, \"\".",
  "Judge a business by what it sells, not by a word in its name: סופר פארם is a drugstore and pharmacy, רמי לוי תקשורת is a phone company (a home bill) while רמי לוי שיווק השקמה is a supermarket, פז and דלק are fuel, Wolt and תן ביס / 10bis are food delivery, Steam is games. In a card descriptor such as \"PAYPAL *NETFLIX\" or \"SQ *BLUE BOTTLE\", the business is the part after the star.",
  "If the user has filed a business before, follow their choice for it and for businesses like it.",
  "",
  "sure: false when you are guessing - a name you do not recognise, an abbreviation that could be several things, a person, a vague transfer. true otherwise.",
  "",
  "Every id you were given must come back exactly once."
].join("\n");

// What the built-in categories hold, so a category name like "Other" or
// "Housing" is read the way Richy means it. Keyed by the stored English name;
// a category the user renamed or made is shown to the model as its bare name.
var CATEGORY_HINTS = {
  Housing: "rent, mortgage, arnona (property tax), building committee, electricity, water, gas, phone, internet, TV, home insurance, furniture, home repairs",
  Food: "supermarkets, groceries, restaurants, cafes, bars, food delivery",
  Transport: "fuel, parking, public transport, taxis and ride apps, car insurance, car repairs, tolls, car leasing",
  Health: "pharmacy, doctors, dentist, health fund (קופת חולים), health insurance, optician, gym and fitness",
  Entertainment: "streaming and games, movies, shows, hobbies, flights, hotels and travel, going out",
  Shopping: "clothes, shoes, electronics, online shopping, gifts, beauty, household goods",
  Salary: "wages and freelance or business income",
  Investments: "interest, dividends and other investment income",
  Savings: "money set aside for savings",
  Other: "anything that fits nowhere else - fees, taxes, donations, cash, government payments"
};

var SORT_KINDS = ["purchase", "refund", "income", "own_transfer", "card_bill", "cash", "person", "fee", "not_transaction"];
var SORT_CHUNK = 40;        // lines per call - about 800 tokens of answer
var SORT_PARALLEL = 8;      // calls in flight at once
// One wave of calls per request, so a request always finishes inside the
// function's 60s limit (vercel.json). A file with more distinct lines than
// this is sent as several requests by the client.
var SORT_MAX_LINES = SORT_CHUNK * SORT_PARALLEL;
var SORT_MAX_CATS = 60;

function sortSchema(catNames) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["lines"],
    properties: {
      lines: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "kind", "category", "sure"],
          properties: {
            id: INT,
            kind: { type: "string", enum: SORT_KINDS },
            // The user's own names, so the answer can only ever be a real one.
            category: { type: "string", enum: catNames.concat([""]) },
            sure: { type: "boolean" }
          }
        }
      }
    }
  };
}

// The exact requests for sorting, one per chunk of lines - built here and
// nowhere else, like readPayload.
function sortPayloads(body) {
  var cats = (Array.isArray(body.categories) ? body.categories : [])
    .map(function(c) { return cleanLine(c, 40); })
    .filter(function(c, i, all) { return c && all.indexOf(c) === i; })
    .slice(0, SORT_MAX_CATS);
  if (!cats.length) return { error: bad("No categories were sent.") };
  var lines = (Array.isArray(body.lines) ? body.lines : []).slice(0, SORT_MAX_LINES + 1);
  if (lines.length > SORT_MAX_LINES) return { error: tooBig() };
  var clean = [];
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i] || {};
    var text = cleanLine(l.text, 160);
    if (!text || typeof l.id !== "number") continue;
    clean.push({ id: l.id | 0, dir: l.dir === "in" || l.dir === "unknown" ? l.dir : "out", n: Math.max(1, l.n | 0), amount: Number(l.amount) || 0, text: text });
  }
  var statement = body.statement === "card" ? "a credit-card statement" : body.statement === "bank" ? "a bank account statement" : "a bank or card statement";
  var currency = cleanLine(body.currency, 8);
  var head = "This is " + statement + (currency ? ", in " + currency : "") + ".\n\nThe user's categories:\n"
    + cats.map(function(c) { return "- " + c + (CATEGORY_HINTS[c] ? ": " + CATEGORY_HINTS[c] : ""); }).join("\n");
  var filed = (Array.isArray(body.examples) ? body.examples : []).slice(0, 20).map(function(e) {
    var shop = cleanLine(e && e.shop, 80), cat = cleanLine(e && e.category, 40);
    return shop && cats.indexOf(cat) >= 0 ? "- " + shop + " -> " + cat : "";
  }).filter(Boolean);
  if (filed.length) head += "\n\nThe user has filed these before:\n" + filed.join("\n");
  var schema = sortSchema(cats);
  var chunks = [];
  for (var c = 0; c < clean.length; c += SORT_CHUNK) {
    var chunk = clean.slice(c, c + SORT_CHUNK);
    var list = chunk.map(function(x) { return x.id + " | " + x.dir + " | " + x.n + "x | " + fmtAmount(x.amount) + " | " + x.text; }).join("\n");
    chunks.push({
      ids: chunk.map(function(x) { return x.id; }),
      payload: {
        model: MODEL,
        max_tokens: 400 + chunk.length * 60,
        thinking: { type: "disabled" },
        output_config: { format: { type: "json_schema", schema: schema } },
        system: SORT_SYSTEM,
        messages: [{ role: "user", content: head + "\n\nLines to sort (id | direction | times in the file | amount | text):\n" + list }]
      }
    });
  }
  return { cats: cats, chunks: chunks, timeout: 45000 };
}
// What a chunk's answer may contain: its own ids, once each, real kinds and
// real categories. Anything else is dropped, and the client falls back for it.
function sortKeep(v, ids, cats) {
  if (!v || !Array.isArray(v.lines)) return null;
  var want = {};
  ids.forEach(function(id) { want[id] = true; });
  return v.lines.filter(function(x) {
    if (!x || !want[x.id] || SORT_KINDS.indexOf(x.kind) < 0) return false;
    if (x.category && cats.indexOf(x.category) < 0) return false;
    delete want[x.id];   // exactly once
    return true;
  });
}

async function sort(body, call) {
  var req = sortPayloads(body);
  if (req.error) return req.error;
  if (!req.chunks.length) return { status: 200, body: { lines: [] } };
  var failed = 0;
  var results = await pool(req.chunks, SORT_PARALLEL, async function(chunk) {
    var kept = sortKeep(parsed(await call(chunk.payload, req.timeout)), chunk.ids, req.cats);
    if (!kept) { failed++; return []; }
    return kept;
  });
  var out = [];
  results.forEach(function(r) { out = out.concat(r); });
  // A chunk that failed is reported, not retried here: the client keeps its
  // own offline guess for those lines and says so, instead of this request
  // running past the platform's time limit.
  return { status: 200, body: { lines: out, failedChunks: failed } };
}

// ---- importDoc ----------------------------------------------------------------

var DOC_SYSTEM = [
  "You read a bank or credit-card statement for Richy, a budgeting app. The user uploaded it as a PDF or as a photo or screenshot. List every transaction on it. The user has not checked the document and cannot answer questions, so read carefully.",
  "",
  "- A transaction has a date, a description (the shop, company or person) and an amount. Leave out totals, subtotals, balances, column titles, account details, ads and notices.",
  "- d: the date as YYYY-MM-DD. Israeli documents write the day first (03/04/2026 is 3 April 2026). If a line has no year, take it from the statement period. In an app screenshot, a date heading (\"היום\", \"אתמול\", \"12 בספטמבר\", \"Today\") applies to the lines under it.",
  "- t: the description as printed, in its original language, without card or account numbers.",
  "- a: the amount as a plain number: negative for money that left the account (purchases, payments, withdrawals, fees), positive for money that came in (salary, refunds, deposits). On a credit-card statement every charge is money out even though it is printed without a minus, and a refund or credit (זיכוי) is money in. Use the amount charged in the account's own currency (סכום חיוב), not the original foreign amount.",
  "- statement: bank, card or other. currency: the ISO code of the account's currency (ILS for ₪), or \"\".",
  "- problem: \"\" normally. If this is not a statement - a receipt, a payslip, a photo you cannot read - say so in one short plain sentence addressed to the user and return rows: []."
].join("\n");

var DOC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["statement", "currency", "rows", "problem"],
  properties: {
    statement: { type: "string", enum: ["bank", "card", "other"] },
    currency: { type: "string" },
    rows: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["d", "t", "a"],
        properties: { d: { type: "string" }, t: { type: "string" }, a: { type: "number" } }
      }
    },
    problem: { type: "string" }
  }
};

var DOC_TYPES = { "application/pdf": "document", "image/jpeg": "image", "image/png": "image", "image/webp": "image", "image/gif": "image" };
// Vercel refuses a request body over 4.5 MB; the client keeps a document
// under ~3.2 MB before encoding so this is a backstop, not the budget.
var DOC_MAX_B64 = 4400000;
var DOC_PAGES_PER_CALL = 3;
var DOC_MAX_PAGES = 21;

// The exact requests for a PDF or a photo, one per group of pages.
function docPayloads(body) {
  var type = String(body.mediaType || "");
  var block = DOC_TYPES[type];
  var data = typeof body.data === "string" ? body.data : "";
  if (!block || !data) return { error: bad("That file could not be read.") };
  if (data.length > DOC_MAX_B64) return { error: tooBig() };
  var today = /^\d{4}-\d{2}-\d{2}$/.test(String(body.today || "")) ? body.today : new Date().toISOString().slice(0, 10);
  var content = block === "document"
    ? { type: "document", source: { type: "base64", media_type: type, data: data } }
    : { type: "image", source: { type: "base64", media_type: type, data: data } };
  // A long PDF is read a few pages per call, all at once, so the answer comes
  // back inside the platform's time limit - one call writing out 200 lines
  // would not. Pages are counted from the file itself; when that fails (a PDF
  // that keeps its page list compressed) it is one call for the whole file.
  var pages = block === "document" ? pdfPageCount(data) : 1;
  var ranges = [];
  if (pages > DOC_PAGES_PER_CALL) {
    for (var p = 1; p <= Math.min(pages, DOC_MAX_PAGES); p += DOC_PAGES_PER_CALL) ranges.push([p, Math.min(p + DOC_PAGES_PER_CALL - 1, pages, DOC_MAX_PAGES)]);
  } else {
    ranges.push(null);
  }
  var head = "Today is " + today + ".";
  return {
    pages: pages,
    readPages: ranges[0] ? Math.min(pages, DOC_MAX_PAGES) : pages,
    timeout: 52000,
    payloads: ranges.map(function(range) {
      var ask = range ? head + " Read only pages " + range[0] + " to " + range[1] + " of this document, and list the transactions printed on those pages." : head + " List the transactions in this " + (block === "document" ? "document" : "image") + ".";
      return {
        model: MODEL,
        max_tokens: 12000,
        thinking: { type: "disabled" },
        output_config: { format: { type: "json_schema", schema: DOC_SCHEMA } },
        system: DOC_SYSTEM,
        messages: [{ role: "user", content: [content, { type: "text", text: ask }] }]
      };
    })
  };
}

async function doc(body, call) {
  var req = docPayloads(body);
  if (req.error) return req.error;
  var pages = req.pages;
  var failed = 0;
  var parts = await pool(req.payloads, req.payloads.length, async function(payload) {
    var v = parsed(await call(payload, req.timeout));
    if (!v || !Array.isArray(v.rows)) { failed++; return null; }
    return v;
  });
  var got = parts.filter(Boolean);
  if (!got.length) return unavailable();
  var rows = [];
  got.forEach(function(v) {
    v.rows.forEach(function(x) {
      if (!x || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.d)) || typeof x.a !== "number" || !isFinite(x.a) || !x.a) return;
      rows.push({ d: x.d, t: cleanLine(x.t, 160), a: Math.round(x.a * 100) / 100 });
    });
  });
  var first = got[0];
  var problem = rows.length ? "" : cleanLine(got.map(function(v) { return v.problem; }).filter(Boolean)[0], 300);
  return { status: 200, body: {
    statement: first.statement, currency: cleanLine(first.currency, 8), rows: rows, problem: problem,
    pages: pages, readPages: req.readPages, failedParts: failed
  } };
}

// Counts page objects in the raw bytes ("/Type /Page", not "/Pages"). Good
// for the plain PDFs banks generate; 0 when the page tree sits inside a
// compressed object stream, which the caller treats as "unknown".
function pdfPageCount(b64) {
  try {
    var s = Buffer.from(b64, "base64").toString("latin1");
    var m = s.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
    return m ? m.length : 0;
  } catch (e) {
    return 0;
  }
}

// ---- shared -----------------------------------------------------------------

async function handle(body, call) {
  try {
    if (body.kind === "importRead") return await read(body, call);
    if (body.kind === "importSort") return await sort(body, call);
    if (body.kind === "importDoc") return await doc(body, call);
  } catch (e) {
    return { status: 500, body: { error: { type: "import_error", message: "Richy couldn't read that just now. Try again in a moment." } } };
  }
  return bad("Unknown request.");
}

// Runs fn over items with at most `limit` in flight, keeping the order.
async function pool(items, limit, fn) {
  var out = new Array(items.length);
  var next = 0;
  async function worker() {
    while (next < items.length) {
      var i = next++;
      out[i] = await fn(items[i]);
    }
  }
  var workers = [];
  for (var w = 0; w < Math.min(limit, items.length); w++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

// The structured answer, or null. Structured outputs guarantee the shape
// unless the call stopped early (max_tokens) or was refused - both of which
// are "no answer" here, never half an answer.
function parsed(r) {
  if (!r || r.error || r.status !== 200 || !r.data) return null;
  if (r.data.stop_reason && r.data.stop_reason !== "end_turn") return null;
  try { return JSON.parse(r.text); } catch (e) { return null; }
}

function answer(r, ok) {
  if (r && r.error && r.error.type === "timeout") return { status: 504, body: { error: { type: "timeout", message: "Reading the file took too long. Try again." } } };
  var v = parsed(r);
  if (!v || !ok(v)) return unavailable();
  return { status: 200, body: v };
}

function unavailable() {
  return { status: 502, body: { error: { type: "import_unavailable", message: "Alfred couldn't read the file just now. Try again in a moment." } } };
}
function bad(message) {
  return { status: 400, body: { error: { type: "invalid_request", message: message } } };
}
function tooBig() {
  return { status: 413, body: { error: { type: "request_too_large", message: "That file is too large to read in one go." } } };
}

// One line of user-supplied text: control characters and line breaks out, so
// a cell can never start a new line of the prompt and pose as structure.
function cleanLine(s, max) {
  return String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f\u2027-\u202e]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max || 200);
}
function cleanBlock(s, max) {
  return String(s == null ? "" : s).replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, " ").trim().slice(0, max || 1000);
}
function fmtAmount(n) {
  var v = Math.abs(Number(n) || 0);
  return v ? v.toFixed(2) : "?";
}

module.exports = {
  handle: handle,
  // Exposed for the offline tests and the live prompt check, which build
  // their requests with these so they send exactly what production sends.
  readPayload: readPayload, sortPayloads: sortPayloads, sortKeep: sortKeep, docPayloads: docPayloads,
  READ_SCHEMA: READ_SCHEMA, DOC_SCHEMA: DOC_SCHEMA, SORT_KINDS: SORT_KINDS,
  pdfPageCount: pdfPageCount, cleanLine: cleanLine
};
