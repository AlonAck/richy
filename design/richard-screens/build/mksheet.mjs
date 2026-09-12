// One self-contained file holding all nine screens, so it can be opened
// anywhere without a server. Each page rides inside an iframe srcdoc.
import { readFileSync, writeFileSync } from "node:fs";

const PAGES = [
  ["sib/Home.dc.html", "Home", "the roster"],
  ["sib/Talk.dc.html", "Talk", "rail, thread, decisions"],
  ["Iris-Design.dc.html", "Iris", "UX &amp; AI Design"],
  ["sib/Alfred-Finance.dc.html", "Alfred", "Finance"],
  ["sib/Amy-Marketing.dc.html", "Amy", "Marketing"],
  ["sib/Dean-Competitive.dc.html", "Dean", "Competitive Intel"],
  ["sib/Jake-Startup Advisors.dc.html", "Jake", "Startup Advisors"],
  ["sib/Mara-Signals.dc.html", "Mara", "User Signals"],
  ["sib/Victor-QA.dc.html", "Victor", "QA &amp; Security"],
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const docFor = (src, theme) => {
  const s = readFileSync(src, "utf8");
  const style = s.slice(s.indexOf("<style>") + 7, s.indexOf("</style>"));
  const helmet = s.slice(s.indexOf("<helmet>"), s.indexOf("<style>"));
  const fonts = (helmet.match(/<link[^>]*fonts\.(googleapis|gstatic)[^>]*>/g) || []).join("");
  const body = s.slice(s.indexOf("</helmet>") + 9, s.indexOf("</x-dc>"));
  return `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8">${fonts}<style>${style}</style></head><body>${body}</body></html>`;
};

const cards = PAGES.map(([src, name, role], i) => {
  const light = esc(docFor(src, "light"));
  const dark = esc(docFor(src, "dark"));
  return `<figure>
  <figcaption><span class="name">${name}</span><span class="role">${role}</span></figcaption>
  <div class="frame"><iframe title="${name}" data-i="${i}" srcdoc="${light}"></iframe></div>
  <template data-light="${i}">${light}</template>
  <template data-dark="${i}">${dark}</template>
</figure>`;
}).join("\n");

const out = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Richard — nine screens</title>
<style>
  :root { color-scheme: light; --ground:#F0EEE6; --card:#fff; --ink:#141413; --muted:#6B6A65; --line:#E5E3DA; }
  :root[data-t="dark"] { color-scheme: dark; --ground:#1F1E1D; --card:#262625; --ink:#F5F4EF; --muted:#A3A199; --line:rgba(255,255,255,.12); }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--ground); color:var(--ink);
    font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
    padding:28px clamp(16px,3vw,32px) 64px; }
  header { max-width:1460px; margin:0 auto 24px; display:flex; align-items:baseline; gap:16px; flex-wrap:wrap; }
  h1 { font:600 22px/1.2 'Source Serif 4',Georgia,serif; margin:0; letter-spacing:-.015em; }
  .sub { color:var(--muted); font-size:13px; }
  .ctl { margin-inline-start:auto; display:flex; gap:8px; }
  button { font:inherit; font-size:13px; padding:8px 14px; border-radius:999px; border:1px solid var(--line);
    background:var(--card); color:var(--ink); cursor:pointer; min-height:36px; }
  button[aria-pressed="true"] { background:var(--ink); color:var(--ground); border-color:transparent; }
  button:focus-visible { outline:2px solid currentColor; outline-offset:2px; }
  .grid { max-width:1460px; margin:0 auto; display:grid; gap:24px; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); }
  figure { margin:0; }
  figcaption { display:flex; align-items:baseline; gap:8px; margin:0 0 8px; }
  .name { font-weight:600; letter-spacing:-.01em; }
  .role { color:var(--muted); font-size:12.5px; }
  .frame { position:relative; border:1px solid var(--line); border-radius:12px; overflow:hidden;
    background:var(--card); height:440px; }
  iframe { position:absolute; inset:0; width:1240px; height:1760px; border:0; transform:scale(.25); transform-origin:0 0; }
  body.phone iframe { width:390px; height:1256px; transform:scale(.35); }
</style>
<header>
  <h1>Richard — nine screens</h1>
  <span class="sub">one shell, one palette, nine pages</span>
  <span class="ctl">
    <button id="w" aria-pressed="false">Phone width</button>
    <button id="t" aria-pressed="false">Dark</button>
  </span>
</header>
<div class="grid">
${cards}
</div>
<script>
let phone = false, dark = false;
const swap = () => {
  document.querySelectorAll("iframe[data-i]").forEach(f => {
    const tpl = document.querySelector(\`template[data-\${dark ? "dark" : "light"}="\${f.dataset.i}"]\`);
    f.setAttribute("srcdoc", tpl.innerHTML);
  });
};
document.getElementById("w").onclick = e => {
  phone = !phone; e.currentTarget.setAttribute("aria-pressed", phone);
  document.body.classList.toggle("phone", phone);
};
document.getElementById("t").onclick = e => {
  dark = !dark; e.currentTarget.setAttribute("aria-pressed", dark);
  document.documentElement.setAttribute("data-t", dark ? "dark" : "light");
  swap();
};
</script>
`;

writeFileSync("richard-nine-screens.html", out);
console.log("richard-nine-screens.html", Math.round(out.length / 1024) + "KB", PAGES.length + " screens");
