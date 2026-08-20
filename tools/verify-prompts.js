// Proves the migration did not change a single character of Richard's prompts.
// For each id: rebuild the ORIGINAL client-side expression (lifted verbatim
// from git HEAD's budget-app.jsx) with stub vars, build the server prompt with
// the same stubs, and compare byte for byte.
//
// Two wrappers are deliberately NOT byte-equal and are excluded by passing them
// empty: richardUserCtx -> userContext and richardNotesBlock -> notesBlock were
// hardened server-side in an earlier commit (they used to hand the user's own
// free text authority over the instructions).
var P = require("../api/_prompts.js");
var cp = require("child_process");

var orig = cp.execSync("git show " + (process.argv[2] || "HEAD") + ":budget-app.jsx", { maxBuffer: 1 << 28 }).toString().split("\n");
function grab(a, b) { return orig.slice(a - 1, b).join("\n"); }
function rhs(t) {
  t = t.replace(/^\s*var (?:system|sys) =\s*/, "").trim();
  if (t.slice(-1) !== ";") throw new Error("no semicolon: " + t.slice(-60));
  return t.slice(0, -1);
}

var RICHARD_FORMAT = " Format your answer so it is easy to scan instead of a wall of text: open with one short, warm sentence that gives the main point, then when you have more than a couple of points put each on its own line starting with \"- \" (one idea per line, keep it short). You may bold a key term or a short label with **double asterisks**. For a quick reply a sentence or two is fine. Do not use emojis.";
function richardUserCtx() { return ""; }              // excluded, see header
function richardNotesBlock() { return ""; }           // excluded, see header

// ---- stubs: one value per interpolation, shared by both sides ---------------
var S = {
  data: "BALANCE 1234\nINCOME 5000", coreProblem: "debt", username: "Dana",
  plan: "Save 20%.", glossary: " (glossary)", curCode: "ILS",
  investingCash: "₪900", levelPhrase: "a beginner", marketNote: "Choppy.",
  picks: "AAPL: good", platform: "ios", stepLabel: "Getting started",
  steps: "1. Open Shortcuts", name: "Bakery", what: "cakes", structure: "Sole trader",
  stage: "Launching", size: "Just me", monthly: "₪2,000", revenueGoal: "₪9,000",
  split: "Marketing: 500", live: "Revenue 300", openTasks: "call 5 customers", notes: "",
  widgetIcons: "coffee, car, home", maxWidgets: 6, isHike: true
};

var WITH_DATA = ["advisorChat", "investCoach"];
var TRIP = { tripName: "Tokyo run", destination: "Tokyo", days: 5, style: "comfort", total: "\u20aa5,000", allocSummary: "Food: 600", liveContext: "This trip has already ended. " };

var CASES = [
  ["onboardingPlan", 7036, 7036, function () {
    var props = { richardNotes: "" }, coreProblem = S.coreProblem,
        langInstruction = " Respond entirely in Hebrew.";
    return eval(rhs(grab(7036, 7036)));
  }, "he"],
  ["auditIntro", 7542, 7542, function () {
    function richardSystem(extra) { return extra + " Respond entirely in Hebrew."; }
    return eval(rhs(grab(7542, 7542)));
  }, "he"],
  ["cancelDraft", 7575, 7575, function () {
    var isHike = true;
    function richardSystem(extra) { return extra + " Respond entirely in Hebrew."; }
    return eval(rhs(grab(7575, 7575)));
  }, "he"],
  ["investCoach", 18577, 18581, function () {
    var ctx = { richardInstructions: "", profile: {} }, langLine = " Reply entirely in Hebrew.",
        lines = S.data.split("\n");
    function investorGlossary() { return S.glossary; }
    return eval(rhs(grab(18577, 18581)));
  }, "he"],
  ["investingBasics", 21237, 21239, function () {
    var richardInstructions = "", langLine = " Write entirely in Hebrew.";
    return eval(rhs(grab(21237, 21239)));
  }, "he"],
  ["tripWizardNote", 12672, 12682, function () {
    var props = { richardInstructions: "" },
        form = { name: "Tokyo run", destination: "Tokyo", days: 5, style: "comfort", notes: "" },
        total = 5000, allocSummary = "Food: 600";
    function dollars() { return "\u20aa5,000"; }
    return eval(rhs(grab(12672, 12682)));
  }, "he"],
  ["tripPlanNote", 12726, 12736, function () {
    var props = { richardInstructions: "" },
        trip = { name: "Tokyo run", destination: "Tokyo", days: 5, style: "comfort", notes: "", total: 5000 },
        allocSummary = "Food: 600", liveContext = "This trip has already ended. ";
    function dollars() { return "\u20aa5,000"; }
    return eval(rhs(grab(12726, 12736)));
  }, "he"],
  // id, client line range, how to rebuild the client expression, lang
  ["advisorChat", 15230, 15258, function () {
    var ctx = S.data, coreProblem = S.coreProblem, customInstructionsPrefix = "";
    var WIDGET_ICONS = S.widgetIcons.split(", "), MAX_WIDGETS = S.maxWidgets;
    var props = { lang: "he" }, LANGUAGE_NAMES = { he: "Hebrew" };
    return eval(grab(15230, 15258).replace(/,\s*$/, ""));
  }, "he"],
  ["planChat", 26320, 26336, function () {
    var customInstructionsPrefix = "", props = { username: S.username, plan: S.plan },
        planChallenge = S.coreProblem, langName = "Hebrew";
    return eval(rhs(grab(26320, 26336)));
  }, "he"],
  ["planTranslate", 0, 0, function () {
    return "You are Richard, a personal finance advisor. Translate the given financial plan faithfully to the requested language. Preserve the warm, direct, personal tone.";
  }, "he"],
  ["bigDecision", 13867, 13867, function () {
    var custom = "", langLine = " Every string value must be written entirely in Hebrew.";
    return eval(rhs(grab(13867, 13867)));
  }, "he"],
  ["moneyAnalysis", 14856, 14856, function () {
    var customInstructionsPrefix = "";
    return eval(rhs(grab(14856, 14856)));
  }, "he"],
  ["tripSplit", 12842, 12842, function () {
    var props = { richardInstructions: "" };
    return eval(rhs(grab(12842, 12842)));
  }, "he"],
  ["tripResplit", 12818, 12818, function () {
    var props = { richardInstructions: "" };
    return eval(rhs(grab(12818, 12818)));
  }, "he"],
  ["bizPlan", 22488, 22488, function () {
    var custom = ""; function langLine() { return " Every string value must be written entirely in Hebrew."; }
    return eval(rhs(grab(22488, 22488)));
  }, "he"],
  ["bizPlanRefresh", 22869, 22869, function () {
    var custom = ""; function langLine() { return " Every string value must be written entirely in Hebrew."; }
    return eval(rhs(grab(22869, 22869)));
  }, "he"],
  ["bizRoadmap", 17508, 17508, function () {
    var custom = "", langSuffix = " Every string value must be written entirely in Hebrew.";
    return eval(rhs(grab(17508, 17508)));
  }, "he"],
  ["bizWeekly", 17666, 17666, function () {
    var custom = "", langSuffix = " Every string value must be written entirely in Hebrew.";
    return eval(rhs(grab(17666, 17666)));
  }, "he"],
  ["bizIdeas", 22402, 22402, function () {
    var custom = ""; function langLine() { return " Every string value must be written entirely in Hebrew."; }
    return eval(rhs(grab(22402, 22402)));
  }, "he"],
  ["bizWizardChat", 22570, 22576, function () {
    var custom = "", form = { name: S.name, what: S.what, notes: "", revenueGoal: "9000" },
        monthly = 2000, split = S.split;
    var STRUCTURES = "ST", STAGES = "SG", SIZES = "SZ";
    function labelOf(kind) { return kind === "ST" ? S.structure : kind === "SG" ? S.stage : S.size; }
    function dollars(n) { return n === 2000 ? S.monthly : S.revenueGoal; }
    return eval(rhs(grab(22570, 22576)));
  }, "he"],
  ["bizChat", 22809, 22818, function () {
    var custom = "", biz = { name: S.name, what: S.what },
        pf = { notes: "", revenueGoal: 9000, monthly: 2000 }, split = S.split,
        openTasks = [S.openTasks], paceNow = null;
    var STRUCTURES = "ST", STAGES = "SG", SIZES = "SZ";
    function labelOf(kind) { return kind === "ST" ? S.structure : kind === "SG" ? S.stage : S.size; }
    function dollars(n) { return n === 2000 ? S.monthly : S.revenueGoal; }
    function bizContextLine() { return S.live; }
    return eval(rhs(grab(22809, 22818)));
  }, "he"],
  ["stockTake", 20569, 20571, function () {
    var ctx = { richardInstructions: "", profile: {} }, langLine = " Write entirely in Hebrew.";
    function investorGlossary() { return S.glossary; }
    return eval(rhs(grab(20569, 20571)));
  }, "he"],
  ["stockScout", 21538, 21540, function () {
    var ctx = { richardInstructions: "", profile: {} }, langLine = " Write entirely in Hebrew.";
    var _currency = { sym: "₪" }, SYM_TO_CODE = { "₪": S.curCode };
    function investorGlossary() { return S.glossary; }
    return eval(rhs(grab(21538, 21540)));
  }, "he"],
  ["stockChat", 21557, 21558, function () {
    var ctx = { richardInstructions: "", profile: {}, investingCash: 900 },
        langLine = " Reply entirely in Hebrew.", scout = { marketNote: S.marketNote }, picksLine = S.picks;
    function dollars() { return S.investingCash; }
    function investorLevelPhrase() { return S.levelPhrase; }
    return eval(rhs(grab(21557, 21558)));
  }, "he"],
  ["bankSyncHelp", 25249, 25255, function () {
    var props = { platform: S.platform, stepLabel: S.stepLabel }, stepLines = S.steps;
    return eval(rhs(grab(25249, 25255)));
  }, "he"],
];

// Prompts that have deliberately changed since the migration baseline. Each
// needs a reason: the point of this tool is that an UNEXPLAINED difference is a
// bug, so the list is the record of what was changed on purpose.
var INTENDED = {
  advisorChat: "Phase 2 removed the Bank Leumi DEMO; Phase 7 renamed CSV import to the name users see on screen.",
  planChat:    "Phase 2 removed the Bank Leumi DEMO; Phase 7 renamed CSV import to the name users see on screen."
};

var fails = 0;
CASES.forEach(function (c) {
  var id = c[0], want, got;
  try { want = c[3](); } catch (e) { console.log("  SKIP " + id + " (client eval: " + e.message + ")"); fails++; return; }
  var vars = {}; for (var k in S) vars[k] = S[k];
  if (WITH_DATA.indexOf(id) === -1) delete vars.data;
  if (id.indexOf("trip") === 0) for (var t in TRIP) vars[t] = TRIP[t];
  got = P.build(id, vars, "", c[4]);
  if (got.replace(/[ ]+$/, "") === want.replace(/[ ]+$/, "")) { console.log("  ok   " + id + "  (" + want.length + " chars)"); return; }
  if (INTENDED[id]) { console.log("  ~    " + id + "  changed on purpose: " + INTENDED[id]); return; }
  fails++;
  console.log("  FAIL " + id);
  var i = 0; while (i < Math.min(got.length, want.length) && got[i] === want[i]) i++;
  console.log("       diverges at " + i + " of " + want.length + "/" + got.length);
  console.log("       client: ..." + JSON.stringify(want.slice(Math.max(0, i - 60), i + 90)));
  console.log("       server: ..." + JSON.stringify(got.slice(Math.max(0, i - 60), i + 90)));
});
var intended = Object.keys(INTENDED).length;
console.log(fails
  ? "\n" + fails + " prompt(s) differ with no recorded reason"
  : "\n" + (CASES.length - intended) + " prompts byte-identical to the originals; " + intended + " changed on purpose.");
process.exit(fails ? 1 : 0);
