import { readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  await readFile(resolve(projectRoot, "package.json"), "utf8"),
);
const development = process.argv.includes("--development");
const outputFile = resolve(projectRoot, "dist/cart2bom.user.js");

const userScriptHeader = `// ==UserScript==
// @name         Cart2BOM
// @namespace    cart2bom
// @version      ${packageJson.version}
// @author       morita_masato
// @description  通販サイトのカートを保存・共有・再利用します
// @homepageURL  https://github.com/masa2429/cart2bom
// @supportURL   https://github.com/masa2429/cart2bom/issues
// @match        https://akizukidenshi.com/*
// @match        https://www.akizukidenshi.com/*
// @run-at       document-idle
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @updateURL    https://raw.githubusercontent.com/masa2429/cart2bom/main/dist/cart2bom.user.js
// @downloadURL  https://raw.githubusercontent.com/masa2429/cart2bom/main/dist/cart2bom.user.js
// ==/UserScript==`;

await mkdir(dirname(outputFile), { recursive: true });
await build({
  entryPoints: [resolve(projectRoot, "src/entry.user.ts")],
  outfile: outputFile,
  bundle: true,
  format: "iife",
  globalName: "Cart2BOM",
  target: ["chrome100", "edge100", "firefox100"],
  sourcemap: development ? "linked" : false,
  minify: !development,
  legalComments: "none",
  banner: { js: userScriptHeader },
  define: {
    __CART2BOM_VERSION__: JSON.stringify(packageJson.version),
    __CART2BOM_DEVELOPMENT__: JSON.stringify(development),
  },
});

console.log(`Built ${outputFile}${development ? " with source map" : ""}`);
