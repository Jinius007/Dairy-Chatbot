/** Vercel serverless entry — loads Express app built by scripts/build-vercel-api.mjs */
export const config = {
  maxDuration: 120,
  memory: 1024,
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const app = require("./_handler.cjs");

export default app;
