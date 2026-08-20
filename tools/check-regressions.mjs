// Section 10's regression list: the features Tier 0 fixes touch. Each is opened
// in the real app and checked for a render plus no uncaught errors.
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { chromium } from "playwright-core";
const ROOT=new URL("../public/", import.meta.url).pathname.replace(/\/$/, "");
const T={".html":"text/html",".js":"text/javascript",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json",".css":"text/css",".svg":"image/svg+xml"};
const srv=createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";
  const f=join(ROOT,p); if(!f.startsWith(ROOT)||!existsSync(f)||statSync(f).isDirectory()){r.writeHead(404);r.end("nf");return;}
  r.writeHead(200,{"Content-Type":T[extname(f)]||"application/octet-stream"});r.end(readFileSync(f));});
await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
const src=readFileSync(new URL("./render-app.mjs", import.meta.url),"utf8");
const stub=src.slice(src.indexOf("const stub = `")+14, src.indexOf("\n`;\n"));
const M=new Date().toISOString().slice(0,8);
const blob={displayName:"Dana",email:"d@e.com",onboardingDone:true,catchUpDone:true,currency:"₪",lang:"en",
  onboardingData:{lifeStage:"Working",income:"9000",incomeType:"fixed",essentials:"3000"},
  tx:[{id:1,type:"income",amount:9000,label:"Salary",catId:"c8",category:"Salary",date:M+"01",repeat:"none",pending:false},
      {id:2,type:"expense",amount:120,label:"Coffee",catId:"c2",category:"Food",date:M+"05",repeat:"none",pending:false},
      {id:3,type:"income",amount:5000,label:"Opening balance",catId:"opening",category:"Opening balance",opening:true,date:M+"01",repeat:"none",pending:false}],
  budgets:[{id:1,catId:"c2",category:"Food",limit:800}],
  goals:[{id:1,name:"Emergency Fund",target:10000,saved:2500,deadline:"2027-01-01"}],
  trips:[],savings:[{id:"s1",name:"Rainy day",entries:[{id:1,kind:"deposit",amount:4000,date:M+"01"}]}],
  businesses:[{id:"b1",name:"Side gig",what:"design",profile:{stage:"idea",size:"side",monthly:500,revenueGoal:2000},entries:[]}],
  investing:[{id:"i1",name:"Long term",trades:[],cash:0}],
  debts:[{id:"d1",name:"Car loan",balance:20000,apr:6,minPayment:800,createdAt:M+"01"}],notes:[]};
const body=stub.replace(/\$\{JSON\.stringify\(BLOBS\[FIXTURE\] \|\| BLOBS\.overview\)\}/, JSON.stringify(blob));
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
const page=await b.newPage({viewport:{width:420,height:1000}});
const errs=[]; page.on("pageerror",e=>errs.push(String(e&&e.message)));
for (const [pat,bd] of [["**/vendor/firebase-app-compat.js*",body],["**/vendor/firebase-auth-compat.js*",""],["**/vendor/firebase-firestore-compat.js*",""],["**/firebase-init.js*",'window.__RICHY_FB_CONFIGURED__=true;']])
  await page.route(pat, r=>r.fulfill({contentType:"text/javascript", body:bd}));
await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:"load",timeout:30000});
await page.waitForTimeout(2800);
const txt=()=>page.evaluate(()=>document.body.innerText);

async function check(label, open, expect) {
  const before = errs.length;
  try { await open(); } catch (e) { console.log("  FAIL " + label + " (could not open: " + e.message.slice(0,60) + ")"); return; }
  await page.waitForTimeout(800);
  const t = await txt();
  const ok = expect.every(x => t.includes(x));
  const newErrs = errs.length - before;
  console.log((ok && !newErrs ? "  ok   " : "  FAIL ") + label +
    (ok ? "" : " (missing: " + expect.filter(x=>!t.includes(x)).join(", ") + ")") +
    (newErrs ? " [" + newErrs + " error(s)]" : ""));
}
// Everything is clicked through the DOM: the app animates its tab wrapper, so
// Playwright's actionability checks never settle on some of these.
const clickText = (label) => page.evaluate((l) => {
  const hit = [...document.querySelectorAll("div,button,span,a")]
    .filter(e => e.textContent.trim() === l && e.children.length === 0).pop();
  if (!hit) throw new Error("not found: " + l);
  let n = hit;
  for (let i = 0; i < 8 && n; i++, n = n.parentElement) { if (n.onclick) { n.click(); return; } }
  hit.click();
}, label);
const tab = (n) => async () => clickText(n);
// Profile is the icon button in the header, not a tab.
// Profile is the icon button in the header, not a tab; get back to a tab that
// has the header first.
// Some sub-views (Business, Investing, Advisor) replace the whole shell and
// have no route back to a tab, so each Profile check starts from a fresh load.
const profileRow = (n) => async () => {
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(2200);
  // The header button sits under an animated wrapper Playwright never considers
  // "stable"; dispatch the click directly.
  await page.evaluate(() => document.querySelector('button[aria-label="Profile"]').click());
  await page.waitForTimeout(800);
  await clickText(n);
};

console.log("currency (₪ everywhere, no $):", !(await txt()).includes("$"));

await check("Overview",            tab("Overview"),  ["SAFE TO SPEND TODAY"]);
await check("Activity",            tab("Activity"),  ["MONEY IN", "Coffee"]);
await check("Budgets",             tab("Budgets"),   ["Food"]);
await check("Goals",               tab("Goals"),     ["Emergency Fund"]);
await check("Debts tracker",       profileRow("Debts"),              ["Car loan"]);
await check("Business accounts",   profileRow("Business accounts"),  ["Side gig"]);
await check("Investing accounts",  profileRow("Investing accounts"), ["Long term"]);
await check("Collab",              profileRow("Collab"),             ["Collab"]);
await check("Settings",            profileRow("Settings"),           ["Weekly close day"]);
// Last: the Advisor replaces the whole shell, so there is no way back to a tab.
await check("Advisor",             async () => { await page.reload({ waitUntil: "load" }); await page.waitForTimeout(2200); await clickText("Advisor"); },   []);
console.log("\ntotal uncaught errors:", errs.length ? errs : "none");
await b.close(); srv.close();
