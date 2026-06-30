/**
 * Build Sarvam RAG knowledge bundle:
 * - Web sources (ICAR, NDDB, DAHD, DKP) via rag-sources.mjs
 * - Optional Hindi/Gujarati PDF text via Sarvam Document Digitization (--vision)
 *
 * Output: catalyst/.../lib/knowledge/sarvam-rag.generated.ts
 * Runtime: keyword retrieval (rag-retrieval.ts) + Sarvam chat with injected context
 *
 * Run: npm run ingest:sarvam-rag
 *      npm run ingest:sarvam-rag -- --vision   (requires SARVAM_API_KEY, ~₹0.5/page)
 */
import fs from "node:fs";
import path from "node:path";
import { collectRagDocuments, MATERIAL_DIR, KNOWLEDGE_REPOSITORY_DIR, ROOT } from "./lib/rag-sources.mjs";
import { digitizePdfCached } from "./lib/sarvam-doc-digitization.mjs";

const OUT_TS = path.join(
  ROOT,
  "catalyst/functions/pashumitra_api/lib/knowledge/sarvam-rag.generated.ts",
);
const OUT_MANIFEST = path.join(
  ROOT,
  "catalyst/functions/pashumitra_api/lib/knowledge/sources/sarvam-rag-manifest.json",
);
const VISION_CACHE = path.join(
  ROOT,
  "catalyst/functions/pashumitra_api/lib/knowledge/sources/vision-cache",
);

const MAX_TOTAL_CHARS = 550_000;
const VISION_LIMIT = Number(process.env.SARVAM_VISION_PDF_LIMIT || "12");
const VISION_DELAY_MS = Number(process.env.SARVAM_VISION_DELAY_MS || "7000");

const useVision = process.argv.includes("--vision") || process.env.SARVAM_VISION_INGEST === "1";

function escapeTemplate(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function docToSection(doc) {
  const header = `## ${doc.title}`;
  const meta = `Source: ${doc.source} | Category: ${doc.category}`;
  return `${header}\n${meta}\n\n${doc.text}`;
}

async function enhanceIndicPdfs(docs) {
  if (!useVision) return docs;
  if (!process.env.SARVAM_API_KEY) {
    console.warn("--vision requested but SARVAM_API_KEY not set; skipping Vision OCR");
    return docs;
  }

  let count = 0;
  const out = [];
  for (const doc of docs) {
    if (!doc.id.startsWith("pdf-") || count >= VISION_LIMIT) {
      out.push(doc);
      continue;
    }
    const isIndic = /hindi|gujarati|\bguj\b|_hi\b|\(hindi\)/i.test(doc.title) && !/\beng\b|\(eng\)/i.test(doc.title);
    const isCatalog = doc.text.includes("custom fonts") || doc.text.includes("topic summary");
    if (!isIndic && !isCatalog) {
      out.push(doc);
      continue;
    }

    const rel = doc.source.includes("/") ? doc.source : null;
    const abs = rel ? path.join(MATERIAL_DIR, rel) : null;
    if (!abs || !fs.existsSync(abs)) {
      out.push(doc);
      continue;
    }

    try {
      console.log(`  Vision OCR (${count + 1}/${VISION_LIMIT}): ${doc.title}`);
      const text = await digitizePdfCached(abs, VISION_CACHE);
      count++;
      out.push({
        ...doc,
        text: text.slice(0, 14_000),
        metadata: { ...doc.metadata, visionDigitized: true },
      });
      if (count < VISION_LIMIT) await new Promise((r) => setTimeout(r, VISION_DELAY_MS));
    } catch (e) {
      console.warn(`  Vision skip ${doc.title}:`, e.message);
      out.push(doc);
    }
  }
  return out;
}

function filterSupplemental(docs) {
  return docs.filter((d) => {
    if (d.id.startsWith("bundled-ndlm") || d.id.startsWith("bundled-cattle")) return true;
    if (d.category === "Curated Knowledge") return false;
    if (d.metadata?.visionDigitized) return true;
    if (d.id === "icar-central-health-key") return true;
    if (d.id.startsWith("icar-") || d.id.startsWith("web-") || d.id.startsWith("dkp-")) return true;
    if (d.id.startsWith("pdf-icar-") || d.id.startsWith("pdf-dahd-")) return true;
    if (d.id.startsWith("krepo-")) return true;
    if (d.id.startsWith("bundled-ndlm") || d.id.startsWith("bundled-cattle")) return true;
    if (d.category === "NDLM / Digital Platforms") return true;
    if (d.id === "nddb-youtube") return true;
    return false;
  });
}

async function main() {
  console.log("Collecting RAG documents…");
  let docs = await collectRagDocuments();
  console.log(`Collected ${docs.length} source documents`);

  if (useVision) {
    console.log("Enhancing Indic PDFs with Sarvam Vision…");
    docs = await enhanceIndicPdfs(docs);
  }

  let supplemental = filterSupplemental(docs);
  const ndlm = supplemental.filter(
    (d) =>
      d.category === "NDLM / Digital Platforms" ||
      d.id.startsWith("bundled-ndlm") ||
      /bharat pashudhan|1962|ndlm/i.test(d.title),
  );
  const krepo = supplemental.filter((d) => d.id.startsWith("krepo-") && !ndlm.includes(d));
  const rest = supplemental.filter((d) => !ndlm.includes(d) && !krepo.includes(d));
  supplemental = [...ndlm, ...krepo, ...rest];
  if (supplemental.length === 0) {
    console.warn("No supplemental docs matched filter; including ICAR + NDDB web only");
    supplemental = docs.filter(
      (d) => d.category === "Animal Health" || d.category === "NDDB" || d.metadata?.visionDigitized,
    );
  }

  let body = supplemental.map(docToSection).join("\n\n");
  if (body.length > MAX_TOTAL_CHARS) {
    body = `${body.slice(0, MAX_TOTAL_CHARS)}\n\n[…truncated for bundle size…]`;
  }

  const ts = `// AUTO-GENERATED by scripts/ingest-sarvam-rag.mjs — do not edit by hand.
// Rebuild: npm run ingest:sarvam-rag [-- --vision]
// Sarvam RAG: Document Digitization ingest + keyword retrieval at runtime.

export const SARVAM_RAG_CORPUS = \`
# SARVAM RAG — ICAR, NDDB WEB & VISION-DIGITIZED MATERIAL

${escapeTemplate(body)}
\`;
`;

  fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
  fs.writeFileSync(OUT_TS, ts, "utf8");

  const manifest = {
    ingestedAt: new Date().toISOString(),
    sourceDocs: docs.length,
    supplementalDocs: supplemental.length,
    visionEnabled: useVision,
    visionPdfLimit: VISION_LIMIT,
    materialDir: MATERIAL_DIR,
    knowledgeRepositoryDir: KNOWLEDGE_REPOSITORY_DIR,
    chars: body.length,
  };
  fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true });
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2), "utf8");

  console.log("Wrote", OUT_TS);
  console.log("Done.", manifest);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
