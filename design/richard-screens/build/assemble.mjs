// Writes every .dc.html from the shared shell plus that page's body and CSS.
// Run from design/richard-screens:  node build/assemble.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const head = readFileSync("src/shell.head.html", "utf8");
export const PAGES = [
  ["iris", "Iris-Design.dc.html"],
  ["alfred", "Alfred-Finance.dc.html"],
  ["amy", "Amy-Marketing.dc.html"],
  ["dean", "Dean-Competitive.dc.html"],
  ["jake", "Jake-Startup Advisors.dc.html"],
  ["mara", "Mara-Signals.dc.html"],
  ["victor", "Victor-QA.dc.html"],
  ["home", "Home.dc.html"],
  ["talk", "Talk.dc.html"],
];
let n = 0;
for (const [slug, out] of PAGES) {
  const b = `src/body-${slug}.html`;
  if (!existsSync(b)) { console.log("MISSING", b); continue; }
  const css = existsSync(`src/css-${slug}.css`) ? readFileSync(`src/css-${slug}.css`, "utf8").trimEnd() : "";
  const body = readFileSync(b, "utf8").trim();
  writeFileSync(out, head.replace("{{PAGE_CSS}}", css) + body + "\n</x-dc>\n</body>\n</html>\n");
  n++;
}
console.log("assembled", n);
