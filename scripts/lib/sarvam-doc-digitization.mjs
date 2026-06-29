/**
 * Sarvam Document Digitization (Vision) — extract text from Indic PDFs for RAG ingest.
 * API: https://docs.sarvam.ai/api-reference-docs/document-intelligence/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://api.sarvam.ai/doc-digitization/job/v1";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function apiKey() {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY required for Sarvam Vision ingest");
  return key;
}

async function sarvamFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "api-subscription-key": apiKey(),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Sarvam ${res.status}: ${t.slice(0, 400)}`);
  }
  return res.json();
}

function inferLanguage(fileName) {
  const n = fileName.toLowerCase();
  if (/guj|gujarati/.test(n)) return "gu-IN";
  if (/marathi|_mr\b/.test(n)) return "mr-IN";
  if (/tamil|_ta\b/.test(n)) return "ta-IN";
  if (/telugu|_te\b/.test(n)) return "te-IN";
  if (/bengali|_bn\b/.test(n)) return "bn-IN";
  if (/kannada|_kn\b/.test(n)) return "kn-IN";
  if (/malayalam|_ml\b/.test(n)) return "ml-IN";
  if (/punjabi|_pa\b/.test(n)) return "pa-IN";
  if (/odiya|odia|_or\b/.test(n)) return "or-IN";
  if (/\beng\b|\(eng\)/.test(n)) return "en-IN";
  return "hi-IN";
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Extract plain text from output ZIP (md or json entries). */
async function extractTextFromZip(zipBuffer) {
  const { default: AdmZip } = await import("adm-zip");
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const parts = [];
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.toLowerCase();
    const raw = entry.getData().toString("utf8");
    if (name.endsWith(".md")) {
      parts.push(raw);
    } else if (name.endsWith(".json")) {
      try {
        const j = JSON.parse(raw);
        if (typeof j.text === "string") parts.push(j.text);
        else if (Array.isArray(j.pages)) {
          for (const p of j.pages) {
            if (typeof p.text === "string") parts.push(p.text);
            else if (typeof p.content === "string") parts.push(p.content);
          }
        }
      } catch {
        /* skip malformed json */
      }
    }
  }
  return parts.join("\n\n").trim();
}

/**
 * Digitize one PDF via Sarvam Vision (max 10 pages per job).
 * @param {string} pdfPath absolute path
 * @param {{ language?: string }} opts
 * @returns {Promise<string>} extracted markdown/text
 */
export async function digitizePdf(pdfPath, opts = {}) {
  const fileName = path.basename(pdfPath);
  const language = opts.language || inferLanguage(fileName);

  const created = await sarvamFetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_parameters: { language, output_format: "md" },
    }),
  });
  const jobId = created.job_id;

  const uploadMeta = await sarvamFetch(`${BASE}/upload-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, files: [fileName] }),
  });

  const uploadUrl = uploadMeta.upload_urls?.[fileName]?.file_url;
  if (!uploadUrl) throw new Error(`No upload URL for ${fileName}`);

  const pdfBytes = fs.readFileSync(pdfPath);
  const up = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: pdfBytes,
  });
  if (!up.ok) throw new Error(`Upload failed ${up.status}`);

  await sarvamFetch(`${BASE}/${jobId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  const deadline = Date.now() + 10 * 60_000;
  let state = "Pending";
  while (Date.now() < deadline) {
    await sleep(4000);
    const status = await sarvamFetch(`${BASE}/${jobId}/status`, { method: "GET" });
    state = status.job_state;
    if (state === "Completed" || state === "PartiallyCompleted") break;
    if (state === "Failed") {
      throw new Error(status.error_message || "Sarvam digitization failed");
    }
  }
  if (state !== "Completed" && state !== "PartiallyCompleted") {
    throw new Error(`Sarvam job timed out (state=${state})`);
  }

  const dl = await sarvamFetch(`${BASE}/${jobId}/download-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  const urls = Object.values(dl.download_urls || {});
  for (const item of urls) {
    const url = item.file_url;
    if (!url) continue;
    const res = await fetch(url);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    if (url.includes(".zip") || buf[0] === 0x50) {
      const text = await extractTextFromZip(buf);
      if (text.length > 80) return text;
    }
    const asText = buf.toString("utf8");
    if (asText.length > 80) return asText;
  }
  throw new Error("No text extracted from Sarvam output");
}

export function visionCachePath(cacheDir, pdfPath) {
  const base = path.basename(pdfPath, ".pdf");
  return path.join(cacheDir, `${base}.vision.txt`);
}

export async function digitizePdfCached(pdfPath, cacheDir, opts = {}) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cache = visionCachePath(cacheDir, pdfPath);
  if (fs.existsSync(cache)) {
    const cached = fs.readFileSync(cache, "utf8").trim();
    if (cached.length > 80) return cached;
  }
  const text = await digitizePdf(pdfPath, opts);
  fs.writeFileSync(cache, text, "utf8");
  return text;
}
