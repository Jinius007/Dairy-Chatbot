/**
 * Collect RAG source documents from NDDB material, DAHD, DKP, and ICAR.
 * Used by Sarvam RAG ingest and keyword bundle rebuild.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";
import XLSX from "xlsx";
import * as cheerio from "cheerio";
import mammoth from "mammoth";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, "..", "..");

const PROJECT_MATERIAL = path.join(ROOT, "Material for AI Chatbot");
const DOWNLOADS_MATERIAL = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads",
  "Material for AI Chatbot",
);

/** Sibling folder: ../Knowledge Repository (NDDB consultancy manuals, etc.) */
export const KNOWLEDGE_REPOSITORY_DIR =
  process.env.KNOWLEDGE_REPOSITORY_DIR ||
  path.join(ROOT, "..", "Knowledge Repository");

const KREPO_MATERIAL = path.join(KNOWLEDGE_REPOSITORY_DIR, "Material for AI Chatbot");

export const MATERIAL_DIR =
  process.env.KNOWLEDGE_MATERIAL_DIR ||
  (fs.existsSync(KREPO_MATERIAL)
    ? KREPO_MATERIAL
    : fs.existsSync(PROJECT_MATERIAL)
      ? PROJECT_MATERIAL
      : DOWNLOADS_MATERIAL);

const MAX_CHARS_PER_DOC = 14_000;
const KREPO_EXTS = new Set([".pdf", ".docx", ".xlsx", ".pptx", ".md", ".txt"]);

const NDLM_LEGACY_NOTE = `[UPDATE 2025 — NDLM / Bharat Pashudhan: The farmer app formerly known as e-Gopala is now **1962** (Google Play). Do NOT recommend Pashu Poshan or e-Gopala as current apps. Official ecosystem: **Bharat Pashudhan** — https://bharatpashudhan.ndlm.co.in/ — toll-free helpline **1962** for Mobile Veterinary Units.]`;

/** When legacy app names appear in source PDFs/DOCX, prepend the current NDLM guidance. */
export function applyNdmlAppCorrections(text) {
  if (!text || !/e[\s-]?gopala|egopala|pashu\s*poshan/i.test(text)) return text;
  return `${NDLM_LEGACY_NOTE}\n\n${text}`;
}

export const DKP_SECTIONS = [
  { title: "Booklets and Pamphlets", url: "https://www.dairyknowledge.in/dkp/section/booklets-pamphlets" },
  { title: "Posters", url: "https://www.dairyknowledge.in/dkp/section/posters" },
  { title: "Guidelines", url: "https://www.dairyknowledge.in/dkp/section/guidelines" },
  { title: "Manuals", url: "https://www.dairyknowledge.in/dkp/section/manuals" },
  { title: "Medicinal Plants EVM", url: "https://www.dairyknowledge.in/dkp/section/medicinalplants" },
];

export const DAHD_PAGES = [
  { title: "DAHD Schemes and Programmes", url: "https://dahd.gov.in/en/schemes-programmes" },
  { title: "AHIDF Scheme", url: "https://dahd.gov.in/en/ahidf-scheme-brochure" },
  { title: "National Livestock Mission", url: "https://dahd.gov.in/en/nlm-scheme-brochure" },
  { title: "KCC Animal Husbandry", url: "https://dahd.gov.in/en/kcc-scheme-brochure" },
  { title: "Rashtriya Gokul Mission", url: "https://dahd.gov.in/en/rashtriya-gokul-mission" },
  { title: "National Programme for Dairy Development", url: "https://dahd.gov.in/en/national-programme-dairy-development" },
];

export const ICAR_PAGES = [
  {
    title: "ICAR Central Health Key — Bovine Disease Codes, Symptoms & Synonyms",
    url: "https://www.icar.org/guidelines/icar-central-health-key/",
  },
  {
    title: "ICAR-NIVEDI CaDDES — Cattle Disease Diagnosis Expert System",
    url: "https://nivedi.res.in/nicra/CaDDES/",
  },
  {
    title: "ICAR Annual Preventive Goat Health Calendar",
    url: "https://icar.org.in/en/annual-preventive-goat-health-calendar",
  },
  {
    title: "ICAR-IVRI — Indian Veterinary Research Institute",
    url: "https://ivri.nic.in/",
  },
];

/** ICAR / DAHD PDF documents for disease identification and treatment. */
export const ICAR_PDF_SOURCES = [
  {
    title: "ICAR Manual on Management of Gaushalas — Veterinary Care & Vaccination",
    url: "https://icar.org.in/sites/default/files/2022-06/Gaushala-Booklet_Eng-Oct-2020.pdf",
    maxChars: 22_000,
  },
  {
    title: "ICAR Guidelines — Functional Traits Dairy Cattle Health (Mastitis, Udder Health)",
    url: "https://www.icar.org/Guidelines/07.1-Functional-traits-Dairy-cattle-health.pdf",
    maxChars: 18_000,
  },
];

export const DAHD_SVTG_PDF = {
  title: "DAHD Standard Veterinary Treatment Guidelines for Livestock & Poultry (2024)",
  url: "https://dahd.gov.in/sites/default/files/2024-10/StandardVeterinaryTreatment.pdf",
  maxChars: 48_000,
};

const ICAR_ORG = "https://www.icar.org";
const ICAR_ORG_IN = "https://icar.org.in";

export const NDDB_PAGES = [
  { title: "NDDB — National Dairy Development Board", url: "https://www.nddb.coop/" },
  { title: "NDDB Extension & Advisory", url: "https://www.nddb.coop/domestic/extension" },
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
  return `${text.slice(0, max)}\n\n[…truncated…]`;
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
  if (/evm|ethno/.test(n)) topics.push("ethno-veterinary medicine", "traditional remedies");
  if (/mastitis/.test(n)) topics.push("mastitis control", "udder health");
  if (/lumpy/.test(n)) topics.push("lumpy skin disease", "LSD");
  if (/bovine|husbandry|pashupalan|handbook/.test(n)) topics.push("dairy husbandry", "cow comfort");
  if (/consultancy|consultancy manual|farm management|sustainable dairy/.test(n)) topics.push("dairy farm consultancy", "farm management", "production traits", "reproductive efficiency");
  if (/manure|gobar|dung|biogas|value chain|sustain plus|kpp|vermicompost|compost/.test(n)) topics.push("manure value chain", "gobar gas", "biogas", "organic manure", "NDDB Sustain Plus", "circular dairy");
  if (/scheme|dahd|subsidy|mission/.test(n)) topics.push("government scheme", "subsidy");
  if (!topics.length) topics.push("dairy extension", "livestock advisory");
  return topics;
}

function catalogEntry(pdfInfo, dkpUrl) {
  const topics = inferTopics(pdfInfo.name);
  return [
    `Official NDDB extension material: ${pdfInfo.name}.`,
    `Topics: ${topics.join("; ")}.`,
    dkpUrl ? `Dairy Knowledge Portal: ${dkpUrl}` : `Local file: ${pdfInfo.rel}`,
    "Hindi/Gujarati PDF may use custom fonts — see Dairy Knowledge Portal for full text.",
  ].join("\n");
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
  if (/consultancy|farm management/.test(p)) return "Farm Consultancy";
  if (/manure|gobar|dung|biogas|sustain plus|kpp|value chain|vermicompost/.test(p)) return "Manure & Sustainability";
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
        ext: ".pdf",
      });
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

function walkKnowledgeFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkKnowledgeFiles(full, base));
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!KREPO_EXTS.has(ext)) continue;
    if (/list of extension material/i.test(entry.name) && ext === ".xlsx") continue;
    out.push({
      abs: full,
      rel: path.relative(base, full).replace(/\\/g, "/"),
      name: entry.name.replace(/\.[^.]+$/i, ""),
      ext,
    });
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return cleanText(result.value || "");
}

function decodeXmlText(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTextFromOoxml(xml) {
  const texts = [];
  const re = /<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const t = decodeXmlText(m[1]).trim();
    if (!t || /xmlns:|schemas\.microsoft|<\/a:/i.test(t)) continue;
    texts.push(t);
  }
  return texts.join(" ");
}

function extractPptx(filePath) {
  const zip = new AdmZip(filePath);
  const slideEntries = zip
    .getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const na = Number.parseInt(a.entryName.match(/slide(\d+)/i)?.[1] || "0", 10);
      const nb = Number.parseInt(b.entryName.match(/slide(\d+)/i)?.[1] || "0", 10);
      return na - nb;
    });
  const parts = [];
  for (const entry of slideEntries) {
    const slideText = extractTextFromOoxml(entry.getData().toString("utf8"));
    if (slideText.trim()) {
      const n = entry.entryName.match(/slide(\d+)/i)?.[1] || "?";
      parts.push(`===== Slide ${n} =====`);
      parts.push(slideText);
    }
  }
  if (parts.length < 3) {
    const noteEntries = zip
      .getEntries()
      .filter((e) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(e.entryName));
    for (const entry of noteEntries) {
      const noteText = extractTextFromOoxml(entry.getData().toString("utf8"));
      if (noteText.trim()) parts.push(noteText);
    }
  }
  return cleanText(parts.join("\n"));
}

function extractXlsx(filePath, maxRows = 400) {
  const wb = XLSX.readFile(filePath);
  const parts = [];
  for (const sheetName of wb.SheetNames) {
    const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
    parts.push(`===== Sheet: ${sheetName} =====`);
    let rowCount = 0;
    for (const row of json) {
      if (rowCount >= maxRows) {
        parts.push("[…rows truncated…]");
        break;
      }
      const vals = Object.values(row)
        .map((v) => String(v).trim())
        .filter(Boolean);
      if (vals.length) {
        parts.push(vals.join(" | "));
        rowCount++;
      }
    }
  }
  return cleanText(parts.join("\n"));
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
    if (score > bestScore) {
      bestScore = score;
      best = link.url;
    }
  }
  return bestScore >= 2 ? best : null;
}

function readXlsxManifest(xlsxPath) {
  if (!fs.existsSync(xlsxPath)) return [];
  const wb = XLSX.readFile(xlsxPath);
  const rows = [];
  for (const sheetName of wb.SheetNames) {
    const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
    for (const row of json) rows.push({ sheet: sheetName, ...row });
  }
  return rows;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "PashuMitra-RAG-Ingest/1.0 (NDDB dairy advisory)" },
    redirect: "follow",
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function htmlToText(html) {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, .breadcrumb, .pager, noscript").remove();
  const main =
    $("main").text() ||
    $(".field--name-body").text() ||
    $(".node__content").text() ||
    $(".content").text() ||
    $("article").text() ||
    $("body").text();
  return truncate(cleanText(main), 18_000);
}

/** Preserve disease code tables from ICAR Central Health Key. */
function icarHealthKeyToText(html) {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript").remove();
  const rows = [];
  $("table tr").each((_, tr) => {
    const cells = $(tr)
      .find("td, th")
      .map((__, td) => cleanText($(td).text()))
      .get()
      .filter(Boolean);
    if (cells.length >= 2) rows.push(cells.join(" | "));
  });
  const headings = [];
  $("h1, h2, h3, h4, h5, h6").each((_, h) => {
    const t = cleanText($(h).text());
    if (t.length > 2) headings.push(t);
  });
  const body = cleanText($("body").text());
  const tableBlock = rows.length ? `\n\nDisease code table:\n${rows.join("\n")}` : "";
  const headingBlock = headings.length ? `\n\nSections:\n${headings.join("\n")}` : "";
  return truncate(`${body}${headingBlock}${tableBlock}`, 90_000);
}

/** Extract cattle-relevant chapters from DAHD SVTG PDF text. */
function extractSvtgLargeRuminantSections(text) {
  const ch2 = text.search(/Chapter-\s*2\b/);
  const ch3 = text.search(/Chapter-\s*3\b/);
  if (ch2 >= 0 && ch3 > ch2) {
    return cleanText(text.slice(ch2, ch3));
  }
  const nonInf = text.search(
    /GUIDELINES FOR NON-INFECTIOUS[\s/]*SYSTEMIC DISEASES OF RUMINANTS/i,
  );
  if (nonInf >= 0) {
    const end = ch2 > nonInf ? ch2 : nonInf + 30_000;
    return cleanText(text.slice(nonInf, end));
  }
  const fmd = text.search(/2\.4\s+Foot and Mouth Disease/i);
  if (fmd >= 0) return cleanText(text.slice(fmd, fmd + 35_000));
  return cleanText(text);
}

async function fetchPdfUrl(url, maxChars = MAX_CHARS_PER_DOC) {
  const res = await fetch(url, {
    headers: { "User-Agent": "PashuMitra-RAG-Ingest/1.0 (NDDB dairy advisory)" },
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return cleanText(result.text || "");
  } finally {
    await parser.destroy();
  }
}

async function fetchIcarCentralHealthKey(page) {
  const html = await fetchHtml(page.url);
  const text = icarHealthKeyToText(html);
  if (text.length < 200) throw new Error("Insufficient content from Central Health Key");
  return toDoc({
    id: "icar-central-health-key",
    title: page.title,
    category: "Animal Health",
    source: page.url,
    text,
  });
}

async function fetchRemotePdfDocs(sources, category, idPrefix = "pdf-icar") {
  const docs = [];
  for (const src of sources) {
    try {
      let text = await fetchPdfUrl(src.url);
      if (src.url.includes("StandardVeterinaryTreatment")) {
        text = extractSvtgLargeRuminantSections(text);
      }
      text = truncate(text, src.maxChars || MAX_CHARS_PER_DOC);
      if (text.length < 150) continue;
      docs.push(
        toDoc({
          id: `${idPrefix}-${slugify(src.title)}`,
          title: src.title,
          category,
          source: src.url,
          text,
        }),
      );
      console.log(`  ${category} PDF: ${src.title} (${text.length} chars)`);
    } catch (e) {
      console.warn(`  PDF skip ${src.url}:`, e.message);
    }
  }
  return docs;
}

function toDoc({ id, title, category, source, text }) {
  return {
    id,
    title,
    category,
    source,
    text: cleanText(text),
    pageContent: `${title}\n\n${cleanText(text)}`,
    metadata: { id, title, category, source },
  };
}

async function fetchWebPages(pages, category) {
  const docs = [];
  for (const page of pages) {
    try {
      if (page.url.includes("icar-central-health-key")) {
        docs.push(await fetchIcarCentralHealthKey(page));
        console.log(`  ${category}: ${page.title} (Central Health Key)`);
        continue;
      }
      const html = await fetchHtml(page.url);
      const text = htmlToText(html);
      if (text.length > 150) {
        docs.push(
          toDoc({
            id: `web-${slugify(page.title)}`,
            title: page.title,
            category,
            source: page.url,
            text,
          }),
        );
        console.log(`  ${category}: ${page.title} (${text.length} chars)`);
      }
    } catch (e) {
      console.warn(`  Skip ${page.url}:`, e.message);
    }
  }
  return docs;
}

/** Follow ICAR guideline sub-links from Central Health Key and related pages. */
async function fetchIcarHealthDetailPages(baseUrl) {
  const docs = [];
  try {
    const html = await fetchHtml(baseUrl);
    const $ = cheerio.load(html);
    const links = new Set();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const label = cleanText($(el).text());
      if (!label || label.length < 4) return;
      if (/guidelines on (id devices|milk recording|cattle genetic|milk analysis)/i.test(label)) return;
      let full = null;
      if (href.startsWith("http")) full = href;
      else if (href.startsWith("/")) full = `${ICAR_ORG}${href}`;
      if (
        full &&
        /icar\.org\/guidelines/i.test(full) &&
        full !== baseUrl &&
        !full.endsWith(".pdf")
      ) {
        links.add(JSON.stringify({ url: full, title: label.slice(0, 120) }));
      }
    });
    let count = 0;
    for (const raw of links) {
      if (count >= 25) break;
      const { url, title } = JSON.parse(raw);
      try {
        const text = htmlToText(await fetchHtml(url));
        if (text.length > 200) {
          docs.push(
            toDoc({
              id: `icar-${slugify(title)}`,
              title: `ICAR — ${title}`,
              category: "Animal Health",
              source: url,
              text,
            }),
          );
          count++;
          console.log(`  ICAR detail: ${title} (${text.length} chars)`);
        }
      } catch {
        /* skip */
      }
    }
  } catch (e) {
    console.warn("  ICAR link crawl:", e.message);
  }
  return docs;
}

async function collectMaterialPdfs(dkpLinks) {
  const docs = [];
  if (!fs.existsSync(MATERIAL_DIR)) {
    console.warn("Material folder not found:", MATERIAL_DIR);
    return docs;
  }
  const pdfs = walkPdfs(MATERIAL_DIR);
  console.log(`Material PDFs: ${pdfs.length} from ${MATERIAL_DIR}`);
  for (const pdfInfo of pdfs) {
    try {
      let text = await extractPdf(pdfInfo.abs);
      const quality = textQuality(text);
      const dkpUrl = matchDkpUrl(pdfInfo.name, dkpLinks);
      const isEnglishDoc = /\beng\b|\(eng\)/i.test(pdfInfo.name);
      const isIndicDoc = /hindi|gujarati|\bguj\b|_hi\b|\(hindi\)/i.test(pdfInfo.name) && !isEnglishDoc;

      if (isIndicDoc || quality < 0.55) {
        text = catalogEntry(pdfInfo, dkpUrl);
      } else {
        text = truncate(text, MAX_CHARS_PER_DOC);
      }
      if (text.length < 80) continue;
      docs.push(
        toDoc({
          id: `pdf-${slugify(pdfInfo.name)}`,
          title: pdfInfo.name,
          category: categorize(pdfInfo.rel),
          source: dkpUrl || pdfInfo.rel,
          text,
        }),
      );
    } catch (e) {
      console.warn(`  PDF fail ${pdfInfo.rel}:`, e.message);
    }
  }
  return docs;
}

export async function collectKnowledgeRepositoryFiles(dkpLinks) {
  const docs = [];
  if (!fs.existsSync(KNOWLEDGE_REPOSITORY_DIR)) {
    console.warn("Knowledge Repository not found:", KNOWLEDGE_REPOSITORY_DIR);
    return docs;
  }
  const files = walkKnowledgeFiles(KNOWLEDGE_REPOSITORY_DIR, KNOWLEDGE_REPOSITORY_DIR);
  console.log(`Knowledge Repository files: ${files.length} from ${KNOWLEDGE_REPOSITORY_DIR}`);
  for (const fileInfo of files) {
    try {
      let text = "";
      const { ext, abs, rel, name } = fileInfo;

      if (ext === ".pdf") text = await extractPdf(abs);
      else if (ext === ".docx") text = await extractDocx(abs);
      else if (ext === ".pptx") text = extractPptx(abs);
      else if (ext === ".xlsx") {
        const isFeedLib = /feed library/i.test(name);
        text = extractXlsx(abs, isFeedLib ? 900 : 250);
      } else if (ext === ".md" || ext === ".txt") {
        text = cleanText(fs.readFileSync(abs, "utf8"));
      }

      text = applyNdmlAppCorrections(text);
      const quality = ext === ".pdf" ? textQuality(text) : 0.92;
      const isConsultancy = /consultancy|farm consultancy|consultancy manual/i.test(name);
      const isBharatMoM = /bharat pashudhan|ndlm|1962|conversational ai/i.test(name);
      const isFeedLib = /feed library|inaph|ration|rbp|constraints/i.test(name);
      const isSchemes = /scheme|farmer.*2025|dahd|government/i.test(name);
      const isManureSustain =
        /manure|gobar|dung|biogas|sustain plus|kpp|value chain|vermicompost|samriddhi/i.test(name);

      let maxChars = MAX_CHARS_PER_DOC;
      if (isConsultancy) maxChars = 48_000;
      else if (isFeedLib) maxChars = 35_000;
      else if (isManureSustain) maxChars = 40_000;
      else if (isBharatMoM || isSchemes) maxChars = 25_000;

      if (ext === ".pdf") {
        const dkpUrl = matchDkpUrl(name, dkpLinks);
        const isEnglishDoc = /\beng\b|\(eng\)/i.test(name);
        const isIndicDoc =
          /hindi|gujarati|\bguj\b|_hi\b|\(hindi\)/i.test(name) && !isEnglishDoc;
        if ((isIndicDoc || quality < 0.55) && dkpLinks.length) {
          text = catalogEntry(fileInfo, dkpUrl);
        } else if (text.length < 500) {
          text = [
            `Official NDDB knowledge repository: ${name}.`,
            `Topics: ${inferTopics(name).join("; ")}.`,
            `Source: Knowledge Repository/${rel}`,
            text.length > 40
              ? `Extracted text (image-based PDF — partial):\n${truncate(text, 2000)}`
              : "Image-based PDF — see related PPTX/booklets in knowledge repository for full narrative.",
          ].join("\n\n");
        }
      }

      if (quality < 0.55 && ext !== ".pdf") {
        text = [
          `Official knowledge repository document: ${name}.`,
          `Local file: Knowledge Repository/${rel}`,
          truncate(text, maxChars),
        ].join("\n\n");
      } else {
        text = truncate(text, maxChars);
      }

      if (text.length < 80) continue;

      let category = categorize(rel);
      if (isConsultancy) category = "Farm Consultancy";
      else if (isBharatMoM) category = "NDLM / Digital Platforms";
      else if (isFeedLib) category = "Nutrition";
      else if (isSchemes) category = "Government Scheme";
      else if (isManureSustain) category = "Manure & Sustainability";

      docs.push(
        toDoc({
          id: `krepo-${slugify(name)}`,
          title: name,
          category,
          source: `Knowledge Repository/${rel}`,
          text,
        }),
      );
      console.log(`  KRepo ${ext} (${(quality * 100).toFixed(0)}%): ${rel} (${text.length} chars)`);
    } catch (e) {
      console.warn(`  KRepo fail ${fileInfo.rel}:`, e.message);
    }
  }
  return docs;
}

async function fetchDkpIndex() {
  const docs = [];
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
      docs.push(
        toDoc({
          id: `dkp-${slugify(sec.title)}`,
          title: `NDDB Dairy Knowledge Portal — ${sec.title}`,
          category: "Extension Index",
          source: sec.url,
          text: `Official NDDB resources (${sec.url}).\n\n${listing}`,
        }),
      );
      console.log(`  DKP: ${sec.title} (${links.length} links)`);
    } catch (e) {
      console.warn(`  DKP skip ${sec.url}:`, e.message);
    }
  }
  return docs;
}

/** Load curated static knowledge shipped with Catalyst (fallback corpus). */
function loadBundledKnowledgeDocs() {
  const knowledgeDir = path.join(ROOT, "catalyst/functions/pashumitra_api/lib/knowledge");
  const files = [
    "knowledge.ts",
    "dahd-schemes.ts",
    "ration-knowledge.ts",
    "balanced-ration-guide.ts",
    "icar-livestock-health.ts",
    "ndlm-digital-platforms.ts",
    "cattle-purchase-policy.ts",
    "manure-waste-policy.ts",
  ];
  const docs = [];
  for (const file of files) {
    const fp = path.join(knowledgeDir, file);
    if (!fs.existsSync(fp)) continue;
    const raw = fs.readFileSync(fp, "utf8");
    const match = raw.match(/export const \w+ = `([\s\S]*?)`;/);
    if (!match?.[1]) continue;
    const text = truncate(cleanText(match[1]), 25_000);
    docs.push(
      toDoc({
        id: `bundled-${slugify(file)}`,
        title: `PashuMitra curated — ${file.replace(".ts", "")}`,
        category: "Curated Knowledge",
        source: `catalyst/lib/knowledge/${file}`,
        text,
      }),
    );
  }
  return docs;
}

/**
 * @returns {Promise<Array<{ id, title, category, source, text, pageContent, metadata }>>}
 */
export async function collectRagDocuments() {
  const docs = [];
  const useKRepo = fs.existsSync(KNOWLEDGE_REPOSITORY_DIR);

  const xlsxPath = path.join(MATERIAL_DIR, "List of Extension Material & Youtube.xlsx");
  const xlsxRows = readXlsxManifest(xlsxPath);
  const { dkp: dkpLinks, youtube: youtubeLinks } = parseXlsxLinks(xlsxRows);

  if (useKRepo) {
    docs.push(...(await collectKnowledgeRepositoryFiles(dkpLinks)));
  } else {
    docs.push(...(await collectMaterialPdfs(dkpLinks)));
  }

  if (youtubeLinks.length) {
    docs.push(
      toDoc({
        id: "nddb-youtube",
        title: "NDDB Verified YouTube Playlists",
        category: "Extension Video",
        source: xlsxPath,
        text: youtubeLinks.map((y) => `- ${y.title}: ${y.url}`).join("\n"),
      }),
    );
  }

  console.log("Fetching DAHD schemes…");
  docs.push(...(await fetchWebPages(DAHD_PAGES, "Government Scheme")));

  console.log("Fetching NDDB web pages…");
  docs.push(...(await fetchWebPages(NDDB_PAGES, "NDDB")));

  console.log("Fetching ICAR animal health…");
  docs.push(...(await fetchWebPages(ICAR_PAGES, "Animal Health")));
  docs.push(
    ...(await fetchIcarHealthDetailPages(
      "https://www.icar.org/guidelines/icar-central-health-key/",
    )),
  );

  console.log("Fetching ICAR / DAHD disease PDFs…");
  docs.push(...(await fetchRemotePdfDocs(ICAR_PDF_SOURCES, "Animal Health", "pdf-icar")));
  docs.push(
    ...(await fetchRemotePdfDocs([DAHD_SVTG_PDF], "Animal Health", "pdf-dahd")),
  );

  console.log("Fetching Dairy Knowledge Portal index…");
  docs.push(...(await fetchDkpIndex()));

  console.log("Loading bundled curated knowledge…");
  docs.push(...loadBundledKnowledgeDocs());

  return docs.filter((d) => d.text.length >= 80);
}
