/** Vercel serverless entry — loads Express app built by scripts/build-vercel-api.mjs */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("./_handler.cjs");

export const config = {
  maxDuration: 120,
  memory: 1024,
};

export default app;
