import { readFileSync, writeFileSync, existsSync } from "node:fs";
const head = readFileSync("sib/shell.head.html", "utf8");
export const PAGES = [
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
  const b = `sib/body-${slug}.html`;
  if (!existsSync(b)) { console.log("MISSING", b); continue; }
  const css = existsSync(`sib/css-${slug}.css`) ? readFileSync(`sib/css-${slug}.css`, "utf8").trimEnd() : "";
  const body = readFileSync(b, "utf8").trim();
  writeFileSync(`sib/${out}`, head.replace("{{PAGE_CSS}}", css) + body + "\n</x-dc>\n</body>\n</html>\n");
  n++;
}
console.log("assembled", n);
