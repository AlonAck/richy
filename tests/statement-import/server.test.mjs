// The server half (api/_import.js) with the model replaced by a stand-in:
// what it refuses, what it sends, and what it does with an answer that is cut
// off, refused or malformed. No network.
//
//   node tests/statement-import/server.test.mjs
import { createRequire } from "module";
import { join } from "path";
import { ROOT } from "./extract.mjs";
import { section, check, eq, done } from "./harness.mjs";

const require = createRequire(import.meta.url);
const imp = require(join(ROOT, "api", "_import.js"));

// A stand-in for callAnthropic: records every request, answers with `reply`.
function fake(reply) {
  const sent = [];
  const call = (payload, ms) => {
    sent.push({ payload, ms });
    const r = typeof reply === "function" ? reply(payload, sent.length) : reply;
    return Promise.resolve(r);
  };
  return { call, sent };
}
const ok = (obj, stop) => ({ status: 200, data: { stop_reason: stop || "end_turn" }, text: JSON.stringify(obj) });
const READING = { statement: "bank", currency: "ILS", tables: [], skipRows: [], examples: [], problem: "Not a statement." };

section("importRead");
{
  const f = fake(ok(READING));
  const res = await imp.handle({ kind: "importRead", sample: "r0 | c0: hello", fileName: "a\nb.csv" }, f.call);
  eq("an answer comes back as it was given", [res.status, res.body.problem], [200, "Not a statement."]);
  const p = f.sent[0].payload;
  eq("Sonnet 5, thinking at low effort, held to the schema", [p.model, p.thinking.type, p.output_config.effort, p.output_config.format.type], ["claude-sonnet-5", "adaptive", "low", "json_schema"]);
  check("the file name cannot start a new line of the prompt", p.messages[0].content.indexOf("File name: a b.csv\n\n") === 0, p.messages[0].content);
  check("the prompt is the server's", /bank and credit-card statement exports/.test(p.system));
}
{
  const f = fake(ok(READING));
  await imp.handle({ kind: "importRead", sample: "r0 | c0: x", feedback: "Row 4 was expected to read as 2026-09-02 / -342.9" }, f.call);
  const p = f.sent[0].payload;
  eq("a second look thinks harder", p.output_config.effort, "medium");
  check("and carries what went wrong as data", /did not hold up[\s\S]*Row 4 was expected/.test(p.messages[0].content));
}
{
  const f = fake(ok(READING));
  eq("an empty file", (await imp.handle({ kind: "importRead", sample: "  " }, f.call)).status, 400);
  eq("an oversized sample", (await imp.handle({ kind: "importRead", sample: "x".repeat(90001) }, f.call)).status, 413);
  eq("neither is sent to the model", f.sent.length, 0);
}
for (const [label, reply, status] of [
  ["an answer cut off at max_tokens", ok(READING, "max_tokens"), 502],
  ["a refusal", ok(READING, "refusal"), 502],
  ["text that is not JSON", { status: 200, data: { stop_reason: "end_turn" }, text: "Sure! Here is" }, 502],
  ["JSON without tables", ok({ statement: "bank" }), 502],
  ["an API error", { status: 529, data: { error: { type: "overloaded_error" } }, text: "" }, 502],
  ["a timeout", { status: 504, error: { type: "timeout", message: "x" } }, 504]
]) {
  const res = await imp.handle({ kind: "importRead", sample: "r0 | c0: x" }, fake(reply).call);
  eq(label + " is no answer, never half an answer", res.status, status);
}

section("importSort");
{
  const lines = Array.from({ length: 95 }, (_, i) => ({ id: i, text: "Shop " + i, dir: i % 7 ? "out" : "in", n: 1, amount: 10 + i }));
  const f = fake((payload) => {
    const ids = [...payload.messages[0].content.matchAll(/^(\d+) \| /gm)].map((m) => +m[1]);
    return ok({ lines: ids.map((id) => ({ id, kind: "purchase", category: "Food", sure: true })) });
  });
  const res = await imp.handle({ kind: "importSort", lines, categories: ["Food", "Other", "Food"], statement: "card", currency: "ILS" }, f.call);
  eq("one call per 40 lines", f.sent.length, 3);
  eq("every line answered once", res.body.lines.length, 95);
  const p = f.sent[0].payload;
  eq("the category list is the answer's only choice", p.output_config.format.schema.properties.lines.items.properties.category.enum, ["Food", "Other", ""]);
  check("with what the built-in categories hold", /- Food: supermarkets/.test(p.messages[0].content));
  eq("sorting does not think", p.thinking.type, "disabled");
}
{
  const f = fake(ok({ lines: [
    { id: 0, kind: "purchase", category: "Food", sure: true }, { id: 0, kind: "refund", category: "Food", sure: true },
    { id: 1, kind: "stolen", category: "Food", sure: true }, { id: 2, kind: "purchase", category: "Yachts", sure: true },
    { id: 99, kind: "purchase", category: "Food", sure: true }
  ] }));
  const res = await imp.handle({ kind: "importSort", lines: [0, 1, 2].map((id) => ({ id, text: "x" + id, dir: "out", n: 1, amount: 1 })), categories: ["Food"] }, f.call);
  eq("duplicates, unknown kinds, unknown categories and strange ids are dropped", res.body.lines, [{ id: 0, kind: "purchase", category: "Food", sure: true }]);
}
{
  let n = 0;
  const f = fake(() => (++n === 2 ? { status: 500, error: { type: "proxy_error" } } : ok({ lines: [] })));
  const lines = Array.from({ length: 80 }, (_, i) => ({ id: i, text: "s" + i, dir: "out", n: 1, amount: 1 }));
  const res = await imp.handle({ kind: "importSort", lines, categories: ["Food"] }, f.call);
  eq("a failed chunk is reported, not hidden", res.body.failedChunks, 1);
}
{
  const res = await imp.handle({ kind: "importSort", lines: Array.from({ length: 321 }, (_, i) => ({ id: i, text: "s", dir: "out" })), categories: ["Food"] }, fake(ok({ lines: [] })).call);
  eq("more lines than one wave of calls can finish in time", res.status, 413);
  eq("no categories", (await imp.handle({ kind: "importSort", lines: [], categories: [] }, fake(ok({})).call)).status, 400);
}

section("importDoc");
{
  // A PDF with seven plain page objects is read three pages per call.
  const pdf = Buffer.from("%PDF-1.4\n" + Array.from({ length: 7 }, (_, i) => (i + 3) + " 0 obj << /Type /Page /Parent 2 0 R >> endobj\n").join("") + "2 0 obj << /Type /Pages /Count 7 >> endobj\n").toString("base64");
  eq("pages are counted from the file", imp.pdfPageCount(pdf), 7);
  const f = fake((payload, i) => ok({ statement: "card", currency: "ILS", rows: [{ d: "2026-09-0" + i, t: "Shop " + i, a: -10 * i }, { d: "bad", t: "x", a: 1 }, { d: "2026-09-09", t: "zero", a: 0 }], problem: "" }));
  const res = await imp.handle({ kind: "importDoc", mediaType: "application/pdf", data: pdf, today: "2026-09-25" }, f.call);
  eq("three calls, all at once", f.sent.length, 3);
  check("each asks for its own pages", /pages 1 to 3/.test(f.sent[0].payload.messages[0].content[1].text) && /pages 7 to 7/.test(f.sent[2].payload.messages[0].content[1].text));
  eq("rows from every part, the unreadable ones dropped", res.body.rows.map((r) => r.t), ["Shop 1", "Shop 2", "Shop 3"]);
  eq("the PDF is sent as a document", f.sent[0].payload.messages[0].content[0].type, "document");
  check("today's date is given for undated screenshot headings", /Today is 2026-09-25/.test(f.sent[0].payload.messages[0].content[1].text));
}
{
  const f = fake(ok({ statement: "other", currency: "", rows: [], problem: "This is a receipt." }));
  const res = await imp.handle({ kind: "importDoc", mediaType: "image/jpeg", data: "abc" }, f.call);
  eq("a photo is one call, as an image", [f.sent.length, f.sent[0].payload.messages[0].content[0].type], [1, "image"]);
  eq("and its problem comes back to be shown", res.body.problem, "This is a receipt.");
  eq("an unknown type", (await imp.handle({ kind: "importDoc", mediaType: "application/zip", data: "x" }, f.call)).status, 400);
  eq("too large", (await imp.handle({ kind: "importDoc", mediaType: "application/pdf", data: "x".repeat(4400001) }, f.call)).status, 413);
}
eq("an unknown kind", (await imp.handle({ kind: "importNope" }, fake(ok({})).call)).status, 400);

done("server");
