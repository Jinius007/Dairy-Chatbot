import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outFile = join(root, "catalyst/functions/pashumitra_api/index.js");

mkdirSync(dirname(outFile), { recursive: true });

const denoShim = `
globalThis.Deno = {
  env: { get: (key) => process.env[key] },
};
`.trim();

await esbuild.build({
  entryPoints: [join(root, "catalyst/functions/pashumitra_api/src/server.mts")],
  outfile: outFile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  banner: { js: denoShim },
  external: ["zcatalyst-sdk-node", "express"],
  loader: { ".ts": "ts" },
});

console.log("Built Catalyst API →", outFile);
