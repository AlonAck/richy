// Scope-aware check for references to variables that nothing declares. The
// build only transforms JSX, so a deleted `var` would otherwise surface as a
// runtime ReferenceError on a rarely-hit path.
import { readFileSync } from "fs";
import { parseSync } from "@babel/core";
import presetReact from "@babel/preset-react";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const code = readFileSync(new URL("../budget-app.jsx", import.meta.url), "utf8")
  .replace(/^\s*import[^\n]*\n/gm, "")
  .replace(/export default function App/, "function App");

const ast = parseSync(code, { presets: [[presetReact, {}]], babelrc: false, configFile: false, sourceType: "script" });

// Globals the app legitimately reads from the host page / React shim.
const GLOBALS = new Set(["window","document","console","navigator","location","localStorage","sessionStorage",
  "setTimeout","clearTimeout","setInterval","clearInterval","fetch","Promise","JSON","Math","Date","Object","Array",
  "String","Number","Boolean","RegExp","Error","Map","Set","WeakMap","isNaN","parseInt","parseFloat","encodeURIComponent",
  "decodeURIComponent","AbortController","Blob","URL","FileReader","Intl","React","useState","useEffect","useRef",
  "useMemo","useCallback","firebase","RC","alert","confirm","btoa","atob","TextEncoder","Uint8Array","performance",
  "requestAnimationFrame","cancelAnimationFrame","CustomEvent","Event","IntersectionObserver","ResizeObserver",
  "MutationObserver","Image","FormData","Headers","Request","Response","structuredClone","queueMicrotask","globalThis",
  "undefined","NaN","Infinity","matchMedia","getComputedStyle","crypto","history","screen","Symbol","Proxy","Reflect","BigInt",
  "isFinite","Float32Array","ReactDOM","Notification","arguments"]);

const bad = [];
traverse(ast, {
  ReferencedIdentifier(path) {
    const n = path.node.name;
    if (GLOBALS.has(n)) return;
    if (path.scope.hasBinding(n, true)) return;
    bad.push({ name: n, line: path.node.loc && path.node.loc.start.line });
  },
});
const byName = new Map();
for (const b of bad) { if (!byName.has(b.name)) byName.set(b.name, []); byName.get(b.name).push(b.line); }
if (!byName.size) { console.log("No undeclared identifiers."); process.exit(0); }
for (const [n, ls] of byName) console.log(`  ${n}  @ ${ls.slice(0, 8).join(", ")}${ls.length > 8 ? " ..." : ""}`);
console.log(`\n${byName.size} undeclared identifier(s)`);
process.exit(1);
