// No Alfred chat hits a wall at its 21st question.
//
// The server refuses more than 40 messages, or more than 100,000 characters
// with the system prompt. A chat that posts its whole history crosses that for
// good at the 21st question (20 asked, 20 answered, 1 new = 41), and Retry
// re-sends the same over-size thread. The Advisor's chat was bounded on 10 Sep
// (boundThread); five others were not: Full Analysis, Your Plan, the business
// budget wizard, the investing coach and Stock Scout - the last two saved with
// the account, so the wall followed the user to every later visit.
//
// These tests play long threads through the shipped boundThread against the
// server's own rules, read out of api/chat.js, and check that every chat that
// sends a history goes through it.
//
//   node tests/alfred/chat-wall.test.mjs
import { readFileSync } from "fs";
import { section, check, eq, done } from "../statement-import/harness.mjs";
import { SRC, ROOT } from "../statement-import/extract.mjs";
import { pullApp } from "../motivation/extract.mjs";

const { boundThread } = pullApp(["boundThread"]);

// The server's limits, from the server itself.
const SERVER = readFileSync(ROOT + "/api/chat.js", "utf8");
const limit = (name) => { const m = SERVER.match(new RegExp("var " + name + " = (\\d+);")); if (!m) throw new Error(name + " not found in api/chat.js"); return +m[1]; };
const MAX_MESSAGES = limit("MAX_MESSAGES"), MAX_SYSTEM_CHARS = limit("MAX_SYSTEM_CHARS"), MAX_TOTAL_CHARS = limit("MAX_TOTAL_CHARS");
// What api/chat.js does with a request, reduced to whether it is refused.
function serverRefuses(messages, system) {
  if (!Array.isArray(messages) || !messages.length) return "no messages";
  if (messages.length > MAX_MESSAGES) return "too many messages";
  if (system.length > MAX_SYSTEM_CHARS) return "system too large";
  if (system.length + JSON.stringify(messages).length > MAX_TOTAL_CHARS) return "too large";
  return null;
}

// The shape every one of the five chats uses.
const toApi = (m) => ({ role: m.role === "alfred" ? "assistant" : "user", content: m.text });
function thread(turns, answerChars) {
  const rows = [];
  for (let i = 1; i <= turns; i++) {
    rows.push({ role: "user", text: "Question " + i + ": how am I doing on my laptop goal this month?" });
    if (i < turns) rows.push({ role: "alfred", text: "Answer " + i + ": " + "x".repeat(answerChars) });
  }
  return rows;
}
const BIG_SYSTEM = "s".repeat(MAX_SYSTEM_CHARS);   // the largest prompt the server accepts

section("the old way: the whole thread, as five chats posted it");
{
  const t = thread(21, 300);
  eq("the 21st question is the 41st message", t.length, 41);
  eq("and the server refuses it", serverRefuses(t.map(toApi), "short system"), "too many messages");
}

section("bounded: a long thread keeps working");
{
  [21, 40, 100, 300].forEach((n) => {
    const sent = boundThread(thread(n, 300), toApi);
    eq(n + " questions: accepted", serverRefuses(sent, "short system"), null);
    eq(n + " questions: the new question is what is sent last", sent[sent.length - 1].content, "Question " + n + ": how am I doing on my laptop goal this month?");
    eq(n + " questions: opens on the user's turn", sent[0].role, "user");
  });
}

section("bounded: long answers and the largest system prompt the server takes");
{
  [5, 21, 60].forEach((n) => {
    const sent = boundThread(thread(n, 4000), toApi);
    eq(n + " long answers: accepted with a full system prompt", serverRefuses(sent, BIG_SYSTEM), null);
  });
  const one = boundThread([{ role: "user", text: "y".repeat(20000) }], toApi);
  eq("a single long question is still sent, not trimmed away", one.length, 1);
}

section("the app's own failure notes are not sent as Alfred's words");
{
  const t = [
    { role: "user", text: "First question" },
    { role: "alfred", text: "Sorry, I could not connect. Try again.", failed: true },
    { role: "user", text: "First question" }
  ];
  const sent = boundThread(t, toApi);
  check("the failure row is left out", !sent.some((m) => /could not connect/.test(m.content)), sent);
}

section("every chat that sends a history is bounded");
{
  const body = (sig) => { const at = SRC.indexOf(sig); return at < 0 ? "" : SRC.slice(at, SRC.indexOf("\n  }\n", at)); };
  const chats = [
    ["Full Analysis", "function sendFaChat(", /boundThread\(history,/],
    ["Your Plan", "function sendMessage() {", /boundThread\(newMsgs,/],
    ["the business budget wizard", "function sendWizNote() {", /boundThread\(nc,/],
    ["the investing coach", "function sendCoach(", /boundThread\(history,/]
  ];
  chats.forEach(([name, sig, re]) => check(name + " goes through boundThread", re.test(body(sig)), sig));
  // The Advisor has two send paths (Focus Mode and the normal chat); both
  // were bounded on 10 Sep and must stay so.
  eq("the Advisor's two send paths go through boundThread", (SRC.match(/boundThread\(nc, apiMsg\)/g) || []).length, 2);
  // Stock Scout's sender is sendChat inside InvestorOnboardScreen, a second
  // function of that name; find it by what it calls.
  const scoutAt = SRC.indexOf("sendScoutChat(scout, ctxObj(), apiHist");
  check("Stock Scout goes through boundThread", /var apiHist = boundThread\(history,/.test(SRC.slice(Math.max(0, scoutAt - 400), scoutAt)));
  // Bank Sync's help chat keeps its own last-10 window, well inside the limit.
  check("Bank Sync help keeps its last-10 window", /var recent = next\.slice\(-10\);/.test(SRC));
  // No chat posts a raw history again.
  check("no call posts history.map(...) straight to the server", !/callClaude(Fast)?\((history|nc|newMsgs|msgs)\.map\(/.test(SRC));
  check("no apiHist is built from the whole history", !/var apiHist = history\.map\(/.test(SRC));
}

done("Alfred chat wall");
