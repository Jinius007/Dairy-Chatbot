// 12 major Indian languages + English
export const LANG_NAMES: Record<string, string> = {
  hi: "हिन्दी",       // Hindi
  bn: "বাংলা",        // Bengali
  ta: "தமிழ்",        // Tamil
  te: "తెలుగు",       // Telugu
  mr: "मराठी",        // Marathi
  gu: "ગુજરાતી",      // Gujarati
  kn: "ಕನ್ನಡ",        // Kannada
  ml: "മലയാളം",       // Malayalam
  pa: "ਪੰਜਾਬੀ",       // Punjabi
  or: "ଓଡ଼ିଆ",         // Odia
  as: "অসমীয়া",       // Assamese
  ur: "اردو",          // Urdu
  en: "English",
};

export const TTS_LANG: Record<string, string> = {
  hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN",
  gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", or: "or-IN",
  as: "as-IN", ur: "ur-IN", en: "en-IN",
};

export const LANG_CODES = Object.keys(LANG_NAMES);

/** Romanized / code-mixed Indian language cues (Hinglish, Banglish, etc.). */
const ROMANIZED_LANG_HINTS: [RegExp, string][] = [
  [/\b(kya|kaise|kaisa|hai|hain|meri|mera|mere|gaay|gai|bhains|doodh|bimar|bimari|ilaj|daktar|pashu|kisan|nahi|haan|batao|bataiye|madad|sujan|dard|chara|poshan|yojana|sarkar|gaon|mahine|sal|din|ji|chahiye|dikhao|bhejo|paas|najdeek|vet|doctor|kahan|kaha)\b/i, "hi"],
  [/\b(ki|ache|kemon|bhalo|dudh|goru|bhais|chikitsa|daktar|kisan|amake|bolun|hobe|na|lagbe|dorkar)\b/i, "bn"],
  [/\b(enna|epdi|eppadi|paal|pasu|maruthuvam|vaidhyan|sollunga|illai|aama|venum|kodu)\b/i, "ta"],
  [/\b(elaa|em|eppudu|paalu|pashuvu|doctor|cheppandi|ledu|avunu|kavali|ivvu)\b/i, "te"],
  [/\b(kasa|kay|dudh|gai|mhashi|doctor|sanga|nahi|ho|pahije|de)\b/i, "mr"],
  [/\b(shu|kem|dudh|gai|bhains|doctor|kaho|nathi|ha|joiye|aapo)\b/i, "gu"],
  [/\b(yaav|hege|halu|pasu|doctor|heli|illa|howdu|beku|kodi)\b/i, "kn"],
  [/\b(engane|ente|eppozha|paal|pashu|doctor|parayu|illa|athe|venam|tharu)\b/i, "ml"],
  [/\b(ki|kive|dudh|gaan|doctor|daso|nahi|haan|chahida|deyo)\b/i, "pa"],
  [/\b(kana|kemiti|khir|pashu|daktar|kaha|nahi|haan|diya|pathao)\b/i, "or"],
  [/\b(ki|kenekoi|dudh|goru|daktar|kobo|nai|hoi|lagibo)\b/i, "as"],
  [/\b(kya|kaise|hai|doodh|janwar|doctor|batao|nahi|ji|chahiye)\b/i, "ur"],
];

function detectRomanizedLang(text: string): string | null {
  for (const [re, code] of ROMANIZED_LANG_HINTS) {
    if (re.test(text)) return code;
  }
  return null;
}

function isClearlyEnglish(text: string): boolean {
  const t = text.trim();
  if (!/^[a-z0-9\s.,!?'"()-]+$/i.test(t)) return false;
  return /\b(the|what|how|when|where|why|please|help|disease|milk|cattle|cow|buffalo|vet|doctor|scheme|feed|ration|can you|could you|would you|my|your|is|are|was|were)\b/i.test(t);
}

export function detectLanguageCode(text: string): string | null {
  const counts: Record<string, number> = {};
  const add = (code: string) => { counts[code] = (counts[code] || 0) + 1; };

  for (const char of text) {
    const cp = char.codePointAt(0) || 0;
    if (cp >= 0x0900 && cp <= 0x097f) add(/[ळऱ]/.test(char) ? "mr" : "hi");
    else if (cp >= 0x0980 && cp <= 0x09ff) add(/[ৰৱ]/.test(char) ? "as" : "bn");
    else if (cp >= 0x0b00 && cp <= 0x0b7f) add("or");
    else if (cp >= 0x0a00 && cp <= 0x0a7f) add("pa");
    else if (cp >= 0x0a80 && cp <= 0x0aff) add("gu");
    else if (cp >= 0x0b80 && cp <= 0x0bff) add("ta");
    else if (cp >= 0x0c00 && cp <= 0x0c7f) add("te");
    else if (cp >= 0x0c80 && cp <= 0x0cff) add("kn");
    else if (cp >= 0x0d00 && cp <= 0x0d7f) add("ml");
    else if (cp >= 0x0600 && cp <= 0x06ff) add("ur");
  }

  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (best) return best;

  const romanized = detectRomanizedLang(text);
  if (romanized) return romanized;

  if (isClearlyEnglish(text)) return "en";
  if (/[a-z]/i.test(text)) return "hi";
  return null;
}

/** Best-effort language for a user turn; never returns null. */
export function detectUserLanguage(text: string, fallback = "hi"): string {
  return detectLanguageCode(text) ?? fallback;
}

/** Scan all user turns — strongest signal for ration advisory language lock. */
export function detectLanguageFromMessages(messages: { role: string; content: string }[]): string | null {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  if (!userText.trim()) return null;
  return detectLanguageCode(userText);
}

const LANG_SCRIPT_RANGES: Record<string, [number, number][]> = {
  hi: [[0x0900, 0x097f]], mr: [[0x0900, 0x097f]], bn: [[0x0980, 0x09ff]], as: [[0x0980, 0x09ff]],
  or: [[0x0b00, 0x0b7f]], pa: [[0x0a00, 0x0a7f]], gu: [[0x0a80, 0x0aff]], ta: [[0x0b80, 0x0bff]],
  te: [[0x0c00, 0x0c7f]], kn: [[0x0c80, 0x0cff]], ml: [[0x0d00, 0x0d7f]], ur: [[0x0600, 0x06ff]],
};

function charInRanges(cp: number, ranges: [number, number][]): boolean {
  return ranges.some(([lo, hi]) => cp >= lo && cp <= hi);
}

export function countScriptLetters(text: string, lang: string): { native: number; latin: number } {
  const ranges = LANG_SCRIPT_RANGES[lang] || [];
  let native = 0;
  let latin = 0;
  for (const char of text) {
    if (/[0-9\s\d.,!?;:()[\]{}"'+\-/%₹@#&*…]/u.test(char)) continue;
    const cp = char.codePointAt(0) || 0;
    if (/[a-zA-Z]/.test(char)) latin++;
    else if (ranges.length && charInRanges(cp, ranges)) native++;
    else if (/\p{L}/u.test(char)) native++;
  }
  return { native, latin };
}

/** True when an Indic reply is mostly Roman transliteration instead of native script. */
export function needsNativeScriptConversion(text: string, lang: string | null | undefined): boolean {
  if (!lang || lang === "en" || !text?.trim()) return false;
  const cleaned = text
    .replace(/\[?\[?\s*LANG\s*:\s*[a-z]{2}\s*\]?\]?/gi, " ")
    .replace(/https?:\/\/[^\s]+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ");
  const { native, latin } = countScriptLetters(cleaned, lang);
  if (native >= 10) return false;
  if (latin < 12) return false;
  return native / (native + latin) < 0.12;
}

/** Bhashini TTS: prefer the script actually used in the reply body. */
export function resolveTtsLanguage(text: string, hint: string | null): string {
  const fromText = detectLanguageCode(text);
  const tag = hint && hint in LANG_NAMES ? hint : null;

  if (fromText) {
    if (!tag || fromText !== tag) return fromText;
  }

  return tag || fromText || "hi";
}

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
  [/\bkg\b/gi, "किलोग्राम"],
  [/\blitre?s?\b/gi, "लीटर"],
];

function applyTtsPronunciationFixes(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PRONUNCIATION_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Expand "2-3 kg" to "2 se 3 kg" (Hindi) or "2 to 3 kg" (English). */
function expandNumericRanges(text: string, langCode: string | null): string {
  const connector = langCode === "en" ? " to " : " se ";
  return text.replace(
    /(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)(\s*(?:kg|kgs|kilograms?|g|grams?|l|litres?|liters?|ml|ltr|percent|%))?/gi,
    (_match, start: string, end: string, unit = "") => `${start}${connector}${end}${unit}`,
  );
}

/** Turn markdown / layout into spoken pause markers (Whisper / Wispr-style prosody). */
function addSpokenPauses(text: string, langCode: string | null): string {
  const useDanda = langCode !== "en";
  const listBreak = useDanda ? "। " : ". ";
  return text
    .replace(/\r\n/g, "\n")
    // List / bullet boundaries → sentence-level pause
    .replace(/\n\s*[-–—•*]\s+/g, listBreak)
    .replace(/\n\s*\d+[.)]\s+/g, listBreak)
    .replace(/\n{2,}/g, listBreak)
    // Single line break → short breath (like Wispr clause comma)
    .replace(/\n/g, ", ")
    // Ellipsis → breath pause marker
    .replace(/\.{3,}/g, "… ")
    // Em/en dash between phrases → short pause
    .replace(/\s+[-–—]\s+/g, ", ")
    // Keep : ; , . ! ? as distinct tiers for split + gap timing
    .replace(/([,।:;])([^\s\d])/g, "$1 $2")
    .replace(/([.!?])([^\s])/g, "$1 $2")
    .replace(/,\s*([^\s])/g, ", $1");
}

export type TtsPauseTier = "none" | "micro" | "short" | "medium" | "long" | "breath";

/** Infer pause strength from trailing punctuation — mirrors dictation-style phrasing. */
export function ttsPauseTierFromChunk(chunk: string): TtsPauseTier {
  const t = chunk.trim();
  if (!t) return "none";
  if (/…$/.test(t)) return "breath";
  if (/[,]$/.test(t)) return "short";
  if (/[:;]$/.test(t)) return "medium";
  if (/[.!?؟。！？।\u0964\u0965]$/.test(t)) return "long";
  return "micro";
}

/** Natural gap after a TTS chunk — tiered like Whisper / Wispr speech rhythm. */
export function ttsPauseMsAfterChunk(chunk: string, callMode = false): number {
  const tier = ttsPauseTierFromChunk(chunk);
  const table: Record<TtsPauseTier, number> = callMode
    ? { none: 0, micro: 175, short: 200, medium: 270, long: 320, breath: 350 }
    : { none: 0, micro: 195, short: 225, medium: 300, long: 370, breath: 400 };
  return table[tier];
}

export function prepareTextForSpeech(text: string): string {
  const langCode = detectLanguageCode(text);
  const stripped = text
    .replace(/\[?\[?\s*LANG\s*:\s*[a-zA-Z]{2}\s*\]?\]?/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>~[\]]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");

  const withRanges = expandNumericRanges(stripped, langCode);
  const withPauses = addSpokenPauses(withRanges, langCode);

  return applyTtsPronunciationFixes(
    withPauses
      .replace(/[-–—]+/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s+([,।])/g, "$1")
      .trim(),
  );
}

/** Split at comma / sentence / list boundaries for natural TTS pauses; hard-split only oversized clauses. */
export function splitForTts(text: string, maxLen = 200): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const clauses = trimmed
    .split(/(?<=[.!?…؟。！？।\u0964\u0965,:;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (clauses.length === 0) {
    return trimmed.length <= maxLen ? [trimmed] : hardSplitForTts(trimmed, maxLen);
  }

  const chunks: string[] = [];
  for (const clause of clauses) {
    if (clause.length <= maxLen) {
      chunks.push(clause);
      continue;
    }
    chunks.push(...hardSplitForTts(clause, maxLen));
  }

  return chunks.filter(Boolean);
}

function hardSplitForTts(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const combined = current ? `${current} ${word}` : word;
    if (combined.length > maxLen) {
      if (current) chunks.push(current);
      if (word.length > maxLen) {
        for (let i = 0; i < word.length; i += maxLen) {
          chunks.push(word.slice(i, i + maxLen));
        }
        current = "";
      } else {
        current = word;
      }
    } else {
      current = combined;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
