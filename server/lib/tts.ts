/** Sarvam Bulbul v3 (primary) + Bhashini + Google TTS fallbacks. */
import { BHASHINI_LANG } from "./bhashini.ts";
import { appLangToSarvam, hasSarvamApiKey, sarvamSynthesizeSpeech } from "./sarvam.ts";

const BHASHINI_SUPPORTED = new Set(["hi", "bn", "ta", "te", "mr", "kn", "ml", "en"]);

const GOOGLE_TTS_LANG: Record<string, string> = {
  gu: "gu",
  pa: "pa",
  ur: "ur",
  or: "hi",
  as: "bn",
};

/** Latin/Hinglish dairy terms → native script so TTS does not misread (e.g. "Pashu" → "pahu"). */
const PRONUNCIATION_REPLACEMENTS: [RegExp, string][] = [
  [/\bPashu\s*Mitra\b/gi, "पशु मित्र"],
  [/\bPashuMitra\b/gi, "पशुमित्र"],
  [/\bpashumitra\b/gi, "पशुमित्र"],
  [/\bPashu\b/g, "पशु"],
  [/\bpashu\b/g, "पशु"],
  [/\bSahayak\b/gi, "सहायक"],
  [/\bsahayak\b/gi, "सहायक"],
  [/\bDairy\s*Sakha\b/gi, "डेयरी सखा"],
  [/\bDairy\s*Mitra\b/gi, "डेयरी मित्र"],
  [/\bNDDB\b/g, "एन डी डी बी"],
  [/\bDAHD\b/g, "डी ए एच डी"],
  [/\bAIIMS\b/g, "ए आई आई एम एस"],
  [/\bLSD\b/g, "एल एस डी"],
  [/\bFMD\b/g, "एफ एम डी"],
  [/\bHSN\b/g, "एच एस एन"],
  [/\bGST\b/g, "जी एस टी"],
  [/\bML\b/g, "एम एल"],
  [/\bkg\b/gi, "किलोग्राम"],
  [/\blitre?s?\b/gi, "लीटर"],
  [/\bRs\.?\s*/g, "रुपये "],
  [/\bINR\b/g, "रुपये"],
];

export function applyTtsPronunciationFixes(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PRONUNCIATION_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function cleanTtsText(text: string, langHint = "hi"): string {
  const langCode = langHint === "en" ? "en" : langHint;
  const connector = langCode === "en" ? " to " : " se ";
  const stripped = String(text || "")
    .replace(/\[?\[?\s*LANG\s*:\s*[a-zA-Z]{2}\s*\]?\]?/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>~[\]]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");

  const withRanges = stripped.replace(
    /(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)(\s*(?:kg|kgs|kilograms?|g|grams?|l|litres?|liters?|ml|ltr|percent|%))?/gi,
    (_m, a: string, b: string, unit = "") => `${a}${connector}${b}${unit}`,
  );

  const useDanda = langCode !== "en";
  const listBreak = useDanda ? "। " : ". ";
  const withPauses = withRanges
    .replace(/\r\n/g, "\n")
    .replace(/\n\s*[-–—•*]\s+/g, listBreak)
    .replace(/\n\s*\d+[.)]\s+/g, listBreak)
    .replace(/\n{2,}/g, listBreak)
    .replace(/\n/g, ", ")
    .replace(/\.{3,}/g, "… ")
    .replace(/\s+[-–—]\s+/g, ", ")
    .replace(/([,।:;])([^\s\d])/g, "$1 $2");

  return applyTtsPronunciationFixes(
    withPauses
      .replace(/[-–—]+/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s+([,।])/g, "$1")
      .trim(),
  );
}

function splitTtsClauses(text: string, max = 200): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const clauses = trimmed
    .split(/(?<=[.!?…؟。！？।\u0964\u0965,:;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (clauses.length === 0) return trimmed.length <= max ? [trimmed] : chunkText(trimmed, max);
  const out: string[] = [];
  for (const clause of clauses) {
    if (clause.length <= max) out.push(clause);
    else out.push(...chunkText(clause, max));
  }
  return out;
}

function chunkText(text: string, max = 2200): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf(". ", max);
    if (cut < max * 0.4) cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.4) cut = max;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
}

function concatAudio(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function synthesizeBhashini(text: string, lang: string, apiKey?: string): Promise<Uint8Array> {
  const language = BHASHINI_LANG[lang] || BHASHINI_LANG.hi;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-API-KEY"] = apiKey;

  const resp = await fetch("https://tts.bhashini.ai/v2/synthesize", {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      language,
      voiceName: "Female1",
      speechRate: 0.92,
      voiceStyle: "Neutral",
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(detail || `Bhashini TTS error ${resp.status}`);
  }

  return new Uint8Array(await resp.arrayBuffer());
}

async function synthesizeGoogle(text: string, lang: string): Promise<Uint8Array> {
  const tl = GOOGLE_TTS_LANG[lang] || lang;
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
  });

  if (!resp.ok) throw new Error(`Google TTS error ${resp.status}`);
  return new Uint8Array(await resp.arrayBuffer());
}

export type SynthesizeSpeechResult = {
  audio: Uint8Array;
  contentType: string;
};

export async function synthesizeSpeech(
  text: string,
  lang = "hi",
  opts?: { callMode?: boolean },
): Promise<SynthesizeSpeechResult> {
  const code = String(lang || "hi").toLowerCase();
  const sarvamLang = appLangToSarvam(code) || "hi-IN";
  const cleaned = cleanTtsText(text, code);
  const parts = splitTtsClauses(cleaned).length > 0 ? splitTtsClauses(cleaned) : chunkText(cleaned);
  const audioChunks: Uint8Array[] = [];
  let contentType = "audio/mpeg";

  const trySarvam = hasSarvamApiKey();
  for (const part of parts) {
    if (trySarvam) {
      try {
        audioChunks.push(await sarvamSynthesizeSpeech(part, sarvamLang, opts));
        contentType = "audio/mpeg";
        continue;
      } catch (err) {
        console.warn("Sarvam TTS failed, falling back:", err instanceof Error ? err.message : err);
      }
    }

    const apiKey = Deno.env.get("BHASHINI_API_KEY");
    if (BHASHINI_SUPPORTED.has(code)) {
      try {
        audioChunks.push(await synthesizeBhashini(part, code, apiKey));
        contentType = "audio/mpeg";
        continue;
      } catch {
        // Fall through to Google.
      }
    }
    audioChunks.push(await synthesizeGoogle(part, code));
    contentType = "audio/mpeg";
  }

  return { audio: concatAudio(audioChunks), contentType };
}
