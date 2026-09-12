// Build browser-renderable previews from any .dc.html, and audit the body.
// The font links are lifted out of the helmet rather than hardcoded: the old
// script pinned Cormorant Garamond, so every preview silently fell back to
// Georgia instead of the Source Serif 4 the shell actually asks for.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { basename } from "node:path";

const OUT = "C:/Users/ackal/Downloads/Budget App/Budget App/public/_iris";
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

export function build(srcPath, slug) {
  const src = readFileSync(srcPath, "utf8");
  const style = src.slice(src.indexOf("<style>") + 7, src.indexOf("</style>"));
  const helmet = src.slice(src.indexOf("<helmet>"), src.indexOf("<style>"));
  const fonts = (helmet.match(/<link[^>]*fonts\.(googleapis|gstatic)[^>]*>/g) || []).join("\n");
  const body = src.slice(src.indexOf("</helmet>") + 9, src.indexOf("</x-dc>"));
  const page = (theme) => `<!DOCTYPE html>
<html lang="en"${theme ? ` data-theme="${theme}"` : ""}>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${slug}</title>
${fonts}
<style>${style}</style></head>
<body>${body}</body></html>`;
  for (const t of [null, "dark", "light"]) {
    writeFileSync(`${OUT}/${slug}${t ? "-" + t : "-auto"}.html`, page(t));
  }

  const classesInBody = [...new Set((body.match(/class="([^"]*)"/g) || [])
    .flatMap((m) => m.slice(7, -1).split(/\s+/)).filter((c) => c.startsWith("r-")))];
  const declared = new Set((style.match(/\.r-[a-z0-9-]+/g) || []).map((c) => c.slice(1)));
  return {
    slug,
    bytes: src.length,
    fontsLinked: (fonts.match(/family=([^&:"]+)/g) || []).map((f) => f.slice(7).replace(/\+/g, " ")),
    hardColour: [...new Set((body.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g) || []))],
    styleHover: (body.match(/style-hover/g) || []).length,
    chCap: [...new Set((body.match(/max-width:[0-9.]+ch/g) || []))],
    svgText: (body.match(/<text\b/g) || []).length,
    undeclaredClasses: classesInBody.filter((c) => !declared.has(c)),
    varRefs: (body.match(/var\(--r-/g) || []).length,
    buttons: (body.match(/<button/g) || []).length,
    landmarks: ["<header", "<main", "<section", "<aside"].filter((t) => body.includes(t)),
    h1BrSpace: !/\S<br>/.test(body),
  };
}

const targets = process.argv.slice(2);
const rows = targets.map((t) => build(t, basename(t).replace(/\.dc\.html$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")));
console.log(JSON.stringify(rows, null, 2));
