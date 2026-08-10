import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const port = Number(process.env.PORT || 3000);

const app = require(join(root, "api/index.cjs"));

createServer((req, res) => app(req, res)).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
