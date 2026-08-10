import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outFile = join(root, "api/index.cjs");

mkdirSync(dirname(outFile), { recursive: true });

const denoShim = `
globalThis.Deno = {
  env: { get: (key) => process.env[key] },
};
`.trim();

await esbuild.build({
  entryPoints: [join(root, "server/src/server.mts")],
  outfile: outFile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  banner: { js: denoShim },
  external: [],
  loader: { ".ts": "ts" },
});

console.log("Built Vercel API →", outFile);
