// Tiny static file server for previewing this folder locally.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PORT = process.env.PORT || 4410;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json",
};

createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split("?")[0]);
  if (path === "/") path = "/Richard Amy.dc.html";
  const full = join(ROOT, path);
  if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const s = await stat(full);
    if (s.isDirectory()) { res.writeHead(404); res.end("not found"); return; }
    const data = await readFile(full);
    res.writeHead(200, { "Content-Type": TYPES[extname(full)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found: " + path);
  }
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
