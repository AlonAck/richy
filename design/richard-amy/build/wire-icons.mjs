// Wire the 7 confirmed pasted icons into Richard Amy.dc.html.
// Base64 is read straight from the matted PNGs (icons-clean/, produced by
// matte.mjs) so nothing is ever hand-retyped into the HTML.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "Richard Amy.dc.html";
let html = readFileSync(FILE, "utf8");

const ICON_FILE = {
  clip: "icon-01.png", swap: "icon-02.png", key: "icon-03.png", chat: "icon-04.png",
  fork: "icon-05.png", team: "icon-06.png", book: "icon-07.png",
};
const b64 = (name) =>
  "data:image/png;base64," + readFileSync(`icons-clean/${ICON_FILE[name]}`).toString("base64");

function apply(label, oldStr, newStr) {
  if (!html.includes(oldStr)) throw new Error(`NOT FOUND: ${label}`);
  const count = html.split(oldStr).length - 1;
  if (count !== 1) throw new Error(`NOT UNIQUE (${count}x): ${label}`);
  html = html.replace(oldStr, newStr);
  console.log("OK:", label);
}

// #12 — proposal pill in header
apply(
  "12 proposal pill",
  `<i style="width:14px;height:3px;border-radius:2px;background:var(--rule)"></i>Proposal waiting`,
  `<img class="icr" src="${b64("clip")}" width="15" height="15" alt="">Proposal waiting`
);

// #4 — channel swap, decision tag row
apply(
  "4 channel swap",
  `<span style="padding:6px 12px;border-radius:999px;background:var(--tint);font-size:12.5px;font-weight:500;color:var(--atext);white-space:nowrap">Spend decision</span>`,
  `<span style="padding:6px 12px;border-radius:999px;background:var(--tint);font-size:12.5px;font-weight:500;color:var(--atext);white-space:nowrap;display:inline-flex;align-items:center;gap:6px"><img class="icr" src="${b64("swap")}" width="13" height="13" alt="">Spend decision</span>`
);

// #5 — approval / key, Standing rule box
apply(
  "5 approval key",
  `<span class="k" style="display:block;margin-bottom:8px">Standing rule</span>`,
  `<span class="k" style="display:flex;align-items:center;gap:7px;margin-bottom:8px"><img class="icr" src="${b64("key")}" width="14" height="14" alt="">Standing rule</span>`
);

// #7 — social intelligence
apply(
  "7 social listening",
  `<h2 class="h3">Social intelligence</h2>`,
  `<h2 class="h3" style="display:flex;align-items:center;gap:9px"><img class="icr" src="${b64("chat")}" width="19" height="19" alt="">Social intelligence</h2>`
);

// #8 — Richard's question / the fork
apply(
  "8 the fork",
  `<h2 class="h3">Richard has a question</h2>`,
  `<h2 class="h3" style="display:flex;align-items:center;gap:9px"><img class="icr" src="${b64("fork")}" width="19" height="19" alt="">Richard has a question</h2>`
);

// #9 — the team
apply(
  "9 the team",
  `<h2 class="h3">The team</h2>`,
  `<h2 class="h3" style="display:flex;align-items:center;gap:9px"><img class="icr" src="${b64("team")}" width="19" height="19" alt="">The team</h2>`
);

// #10 — what Amy read / book
apply(
  "10 what amy read",
  `<h2 class="h3" style="margin-bottom:6px">What Amy read</h2>`,
  `<h2 class="h3" style="margin-bottom:6px;display:flex;align-items:center;gap:9px"><img class="icr" src="${b64("book")}" width="19" height="19" alt="">What Amy read</h2>`
);

writeFileSync(FILE, html);
console.log("\nAll 7 icons wired.");
