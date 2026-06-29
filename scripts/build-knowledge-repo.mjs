/**
 * Build extension knowledge from:
 * - NDDB extension PDFs (Material for AI Chatbot folder)
 * - List of Extension Material & Youtube.xlsx
 * - DAHD schemes pages (dahd.gov.in)
 * - Dairy Knowledge Portal section index
 *
 * Output: catalyst/functions/pashumitra_api/lib/knowledge/extension-material.generated.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";
import XLSX from "xlsx";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_TS = path.join(
  ROOT,
  "catalyst/functions/pashumitra_api/lib/knowledge/extension-material.generated.ts",
);
const OUT_MANIFEST = path.join(
  ROOT,
  "catalyst/functions/pashumitra_api/lib/knowledge/sources/manifest.json",
);

const DEFAULT_MATERIAL_DIR = path.join(
  process.env.USERPROFILE || "",
  "Downloads",
  "Material for AI Chatbot",
);
const PROJECT_MATERIAL_DIR = path.join(ROOT, "Material for AI Chatbot");
const MATERIAL_DIR =
  process.env.KNOWLEDGE_MATERIAL_DIR ||
  (fs.existsSync(PROJECT_MATERIAL_DIR) ? PROJECT_MATERIAL_DIR : DEFAULT_MATERIAL_DIR);

const MAX_CHARS_PER_DOC = 12_000;
const MAX_TOTAL_CHARS = 450_000;

const DKP_SECTIONS = [
  { title: "Booklets and Pamphlets", url: "https://www.dairyknowledge.in/dkp/section/booklets-pamphlets" },
  { title: "Posters", url: "https://www.dairyknowledge.in/dkp/section/posters" },
  { title: "Guidelines", url: "https://www.dairyknowledge.in/dkp/section/guidelines" },
  { title: "Manuals", url: "https://www.dairyknowledge.in/dkp/section/manuals" },
  { title: "Medicinal Plants EVM", url: "https://www.dairyknowledge.in/dkp/section/medicinalplants" },
];

const DAHD_PAGES = [
  { title: "DAHD Schemes and Programmes", url: "https://dahd.gov.in/en/schemes-programmes" },
  { title: "AHIDF Scheme", url: "https://dahd.gov.in/en/ahidf-scheme-brochure" },
  { title: "National Livestock Mission", url: "https://dahd.gov.in/en/nlm-scheme-brochure" },
  { title: "KCC Animal Husbandry", url: "https://dahd.gov.in/en/kcc-scheme-brochure" },
  { title: "Rashtriya Gokul Mission", url: "https://dahd.gov.in/en/rashtriya-gokul-mission" },
  { title: "National Programme for Dairy Development", url: "https://dahd.gov.in/en/national-programme-dairy-development" },
];

function cleanText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[…truncated for RAG bundle size…]`;
}

function textQuality(text) {
  if (!text || text.length < 80) return 0;
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  const gujarati = (text.match(/[\u0A80-\u0AFF]/g) || []).length;
  const latinWords = (text.match(/\b[a-zA-Z]{4,}\b/g) || []).length;
  const garbage = (text.match(/[{}$¢±<>|\\^~`]/g) || []).length;
  if (latinWords >= 20 && garbage / text.length < 0.008) return 0.95;
  if (devanagari >= 120 || gujarati >= 120) return 0.9;
  if (text.length > 400 && devanagari < 80 && gujarati < 80 && latinWords < 12) return 0.15;
  if (garbage / text.length > 0.012) return 0.2;
  const readable = (text.match(/[\u0900-\u097F\u0A80-\u0AFFa-zA-Z0-9\s.,;:!?()%/-]/g) || []).length;
  return readable / text.length;
}

function normalizeTitle(s) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\u0900-\u097F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTopics(name) {
  const n = name.toLowerCase();
  const topics = [];
  if (/ration|balancing/.test(n)) topics.push("ration balancing", "least-cost feed", "NDDB RBP");
  if (/compound|cattle feed/.test(n)) topics.push("compound cattle feed", "concentrate");
  if (/calf|heifer|crp/.test(n)) topics.push("calf rearing", "heifer nutrition");
  if (/silage/.test(n)) topics.push("silage making", "fodder preservation");
  if (/fodder|green|maize|napier|berseem/.test(n)) topics.push("green fodder", "fodder production");
  if (/mineral/.test(n)) topics.push("mineral mixture", "ASMM");
  if (/moringa/.test(n)) topics.push("moringa fodder");
  if (/evm|ethno/.test(n)) topics.push("ethno-veterinary medicine", "traditional remedies");
  if (/mastitis/.test(n)) topics.push("mastitis control", "udder health");
  if (/lumpy/.test(n)) topics.push("lumpy skin disease", "LSD");
  if (/bovine|husbandry|pashupalan|handbook/.test(n)) topics.push("dairy husbandry", "cow comfort", "milking");
  if (/bee/.test(n)) topics.push("bee keeping", "honey");
  if (/rainy|monsoon/.test(n)) topics.push("rainy season management");
  if (/methane/.test(n)) topics.push("methane emission", "climate");
  if (/crop residue|chaff|densification/.test(n)) topics.push("crop residue", "straw enrichment");
  if (/pest/.test(n)) topics.push("integrated pest management");
  if (/feeding|lactation|nutrition/.test(n)) topics.push("lactation feeding", "nutrition");
  if (!topics.length) topics.push("dairy extension", "livestock advisory");
  return topics;
}

function catalogEntry(pdfInfo, dkpUrl) {
  const topics = inferTopics(pdfInfo.name);
  return [
    `Official NDDB extension ${categorize(pdfInfo.rel)}: ${pdfInfo.name}.`,
    `Topics: ${topics.join("; ")}.`,
    dkpUrl ? `Dairy Knowledge Portal: ${dkpUrl}` : `Local source: ${pdfInfo.rel}`,
    "Note: Hindi/Gujarati PDF uses custom fonts — full text on Dairy Knowledge Portal; chat uses topic summary for RAG.",
  ].join("\n");
}

function parseXlsxLinks(rows) {
  const dkp = [];
  const youtube = [];
  for (const row of rows) {
    const vals = Object.values(row).map((v) => String(v).trim()).filter(Boolean);
    const line = vals.join(" ");
    const urls = line.match(/https?:\/\/[^\s|]+/g) || [];
    for (const url of urls) {
      const title = vals.find((v) => !v.startsWith("http") && v.length > 2) || "NDDB resource";
      if (/youtube\.com|youtu\.be/.test(url)) youtube.push({ title, url });
      else if (/dairyknowledge\.in/.test(url)) dkp.push({ title, url });
    }
  }
  return { dkp, youtube };
}

function matchDkpUrl(pdfName, dkpLinks) {
  const norm = normalizeTitle(pdfName);
  let best = null;
  let bestScore = 0;
  for (const link of dkpLinks) {
    const lt = normalizeTitle(link.title);
    const words = norm.split(" ").filter((w) => w.length > 3);
    let score = 0;
    for (const w of words) if (lt.includes(w)) score++;
    if (/hindi|gujarati|eng/.test(norm) && /hindi|gujarati|eng/.test(lt)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = link.url;
    }
  }
  return bestScore >= 2 ? best : null;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function categorize(relPath) {
  const p = relPath.toLowerCase();
  if (p.includes("booklets")) return "Booklet";
  if (p.includes("pamphlets")) return "Pamphlet";
  if (p.includes("poster")) return "Poster";
  if (p.includes("trifold")) return "Trifold";
  if (/scheme|dahd|government/.test(p)) return "Government Scheme";
  if (/evm|ethno|medicinal/.test(p)) return "EVM";
  if (/ration|feed|fodder|silage|mineral|compound|calf|nutrition/.test(p)) return "Nutrition";
  if (/mastitis|lumpy|disease|health|vaccin/.test(p)) return "Health";
  if (/breed|ai-|bovine|calving/.test(p)) return "Breeding";
  return "Extension";
}

async function extractPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return cleanText(result.text || "");
  } finally {
    await parser.destroy();
  }
}

function walkPdfs(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkPdfs(full, base));
    else if (entry.name.toLowerCase().endsWith(".pdf")) {
      out.push({
        abs: full,
        rel: path.relative(base, full).replace(/\\/g, "/"),
        name: entry.name.replace(/\.pdf$/i, ""),
      });
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

function readXlsxManifest(xlsxPath) {
  if (!fs.existsSync(xlsxPath)) return [];
  const wb = XLSX.readFile(xlsxPath);
  const rows = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    for (const row of json) rows.push({ sheet: sheetName, ...row });
  }
  return rows;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "PashuMitra-Knowledge-Builder/1.0 (NDDB internal)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function htmlToText(html, title) {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, .breadcrumb, .pager").remove();
  const main =
    $("main").text() ||
    $(".field--name-body").text() ||
    $(".node__content").text() ||
    $("article").text() ||
    $("body").text();
  return truncate(cleanText(main), 15_000);
}

async function fetchDahdSchemes() {
  const sections = [];
  for (const page of DAHD_PAGES) {
    try {
      const html = await fetchHtml(page.url);
      const text = htmlToText(html, page.title);
      if (text.length > 200) {
        sections.push({
          id: `dahd-${slugify(page.title)}`,
          title: page.title,
          category: "Government Scheme",
          source: page.url,
          text,
        });
      }
      console.log(`  DAHD: ${page.title} (${text.length} chars)`);
    } catch (e) {
      console.warn(`  DAHD skip ${page.url}:`, e.message);
    }
  }
  return sections;
}

async function fetchDkpIndex() {
  const sections = [];
  for (const sec of DKP_SECTIONS) {
    try {
      const html = await fetchHtml(sec.url);
      const $ = cheerio.load(html);
      const links = [];
      $("a[href*='/dkp/']").each((_, el) => {
        const href = $(el).attr("href");
        const label = cleanText($(el).text());
        if (href && label.length > 3 && !links.some((l) => l.url === href)) {
          links.push({
            title: label,
            url: href.startsWith("http") ? href : `https://www.dairyknowledge.in${href}`,
          });
        }
      });
      const listing = links
        .slice(0, 80)
        .map((l) => `- ${l.title}: ${l.url}`)
        .join("\n");
      sections.push({
        id: `dkp-${slugify(sec.title)}`,
        title: `Dairy Knowledge Portal — ${sec.title}`,
        category: "Extension Index",
        source: sec.url,
        text: `Official NDDB Dairy Knowledge Portal resources (${sec.url}).\n\n${listing}`,
      });
      console.log(`  DKP: ${sec.title} (${links.length} links)`);
    } catch (e) {
      console.warn(`  DKP skip ${sec.url}:`, e.message);
    }
  }
  return sections;
}

function formatSection({ title, category, source, text }) {
  return `## ${title}\nSource: ${source} | Category: ${category}\n\n${text}`;
}

async function main() {
  console.log("Material folder:", MATERIAL_DIR);
  if (!fs.existsSync(MATERIAL_DIR)) {
    console.error("Material folder not found. Set KNOWLEDGE_MATERIAL_DIR env var.");
    process.exit(1);
  }

  const pdfs = walkPdfs(MATERIAL_DIR);
  console.log(`Found ${pdfs.length} PDFs`);

  const xlsxPath = path.join(MATERIAL_DIR, "List of Extension Material & Youtube.xlsx");
  const xlsxRows = readXlsxManifest(xlsxPath);
  const { dkp: dkpLinks, youtube: youtubeLinks } = parseXlsxLinks(xlsxRows);
  console.log(`XLSX rows: ${xlsxRows.length} | DKP links: ${dkpLinks.length} | YouTube: ${youtubeLinks.length}`);

  const sections = [];
  let totalChars = 0;

  for (const pdfInfo of pdfs) {
    try {
      let text = await extractPdf(pdfInfo.abs);
      const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
      const gujarati = (text.match(/[\u0A80-\u0AFF]/g) || []).length;
      const quality = textQuality(text);
      const dkpUrl = matchDkpUrl(pdfInfo.name, dkpLinks) || matchDkpUrl(pdfInfo.name.replace(/_/g, " "), dkpLinks);
      const isEnglishDoc = /\beng\b|\(eng\)/i.test(pdfInfo.name);
      const isIndicDoc = /hindi|gujarati|\bguj\b|_hi\b|\(hindi\)/i.test(pdfInfo.name) && !isEnglishDoc;

      if (isIndicDoc) {
        text = catalogEntry(pdfInfo, dkpUrl);
        console.log(`  PDF catalog (Indic/custom-font PDF): ${pdfInfo.rel}`);
      } else if (quality < 0.55) {
        text = catalogEntry(pdfInfo, dkpUrl);
        console.log(`  PDF catalog (low OCR quality ${(quality * 100).toFixed(0)}%): ${pdfInfo.rel}`);
      } else {
        text = truncate(text, MAX_CHARS_PER_DOC);
        console.log(`  PDF text (${(quality * 100).toFixed(0)}% readable): ${pdfInfo.rel} (${text.length} chars)`);
      }

      if (text.length < 80) {
        console.warn(`  Skip (empty): ${pdfInfo.rel}`);
        continue;
      }
      if (totalChars + text.length > MAX_TOTAL_CHARS) {
        console.warn("  Total char budget reached; stopping PDF ingest.");
        break;
      }
      totalChars += text.length;
      sections.push({
        id: `pdf-${slugify(pdfInfo.name)}`,
        title: pdfInfo.name,
        category: categorize(pdfInfo.rel),
        source: dkpUrl || pdfInfo.rel,
        text,
      });
    } catch (e) {
      console.warn(`  PDF fail ${pdfInfo.rel}:`, e.message);
    }
  }

  if (youtubeLinks.length) {
    sections.push({
      id: "nddb-youtube-playlists",
      title: "NDDB Verified YouTube Playlists and Films",
      category: "Extension Video",
      source: "List of Extension Material & Youtube.xlsx",
      text: youtubeLinks.map((y) => `- ${y.title}: ${y.url}`).join("\n"),
    });
  }

  if (xlsxRows.length) {
    const lines = xlsxRows.map((row) => {
      const vals = Object.entries(row)
        .filter(([k]) => k !== "sheet")
        .map(([, v]) => String(v).trim())
        .filter(Boolean);
      return vals.join(" | ");
    });
    sections.push({
      id: "xlsx-extension-youtube-index",
      title: "NDDB Extension Material and YouTube Index",
      category: "Extension Index",
      source: "List of Extension Material & Youtube.xlsx",
      text: truncate(lines.join("\n"), 20_000),
    });
  }

  console.log("Fetching DAHD schemes…");
  sections.push(...(await fetchDahdSchemes()));

  console.log("Fetching Dairy Knowledge Portal index…");
  sections.push(...(await fetchDkpIndex()));

  const manifest = {
    generatedAt: new Date().toISOString(),
    materialDir: MATERIAL_DIR,
    sectionCount: sections.length,
    sections: sections.map(({ id, title, category, source, text }) => ({
      id,
      title,
      category,
      source,
      charCount: text.length,
    })),
  };

  fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true });
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2), "utf8");

  const body = sections.map(formatSection).join("\n\n");
  const ts = `// AUTO-GENERATED by scripts/build-knowledge-repo.mjs — do not edit by hand.
// Rebuild: npm run build:knowledge
// Sources: NDDB extension PDFs, DAHD schemes, Dairy Knowledge Portal index.

export const EXTENSION_MATERIAL = \`
# NDDB EXTENSION MATERIAL & OFFICIAL SCHEMES (RAG)

${body.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}
\`;
`;

  fs.writeFileSync(OUT_TS, ts, "utf8");
  console.log(`\nWrote ${sections.length} sections → ${OUT_TS}`);
  console.log(`Manifest → ${OUT_MANIFEST}`);
  console.log(`Total knowledge chars: ${body.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
