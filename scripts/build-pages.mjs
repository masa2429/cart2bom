import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "pages-dist");
const shareRoot = resolve(outputRoot, "share");

if (!outputRoot.startsWith(`${projectRoot}\\`) && !outputRoot.startsWith(`${projectRoot}/`)) {
  throw new Error("Pages出力先がプロジェクト外です。");
}
await rm(outputRoot, { recursive: true, force: true });
await mkdir(shareRoot, { recursive: true });
await build({
  entryPoints: [resolve(projectRoot, "src/viewer/main.ts")],
  outdir: shareRoot,
  bundle: true,
  format: "esm",
  target: ["chrome100", "edge100", "firefox100", "safari15"],
  minify: true,
  legalComments: "none",
  entryNames: "main",
});
await Promise.all([
  copyFile(resolve(projectRoot, "src/viewer/index.html"), resolve(shareRoot, "index.html")),
  copyFile(resolve(projectRoot, "src/viewer/root.html"), resolve(outputRoot, "index.html")),
  writeFile(resolve(outputRoot, ".nojekyll"), "", "utf8"),
]);

console.log(`Built ${outputRoot}`);
