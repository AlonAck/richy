import * as esbuild from "esbuild";
import { mkdirSync, writeFileSync } from "fs";

mkdirSync("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "iife",
  globalName: "RichyDS",
  outfile: "dist/richy-ds.js",
  jsx: "automatic",
  minify: false,
  external: [],
  define: { "process.env.NODE_ENV": '"production"' },
});

console.log("Built dist/richy-ds.js (window.RichyDS.*)");
