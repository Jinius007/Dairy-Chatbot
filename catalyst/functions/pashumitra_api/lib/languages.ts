/** Language detection — shared with frontend `src/lib/languages.ts` (keep in sync). */

export const LANG_CODES = ["hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "as", "ur", "en"] as const;

export const NATIVE_SCRIPT_LABELS: Record<string, string> = {
  hi: "Devanagari (हिन्दी)",
  bn: "Bengali script (বাংলা)",
  ta: "Tamil script (தமிழ்)",
  te: "Telugu script (తెలుగు)",
  mr: "Devanagari (मराठी)",
  gu: "Gujarati script (ગુજરાતી)",
  kn: "Kannada script (ಕನ್ನಡ)",
  ml: "Malayalam script (മലയാളം)",
  pa: "Gurmukhi (ਪੰਜਾਬੀ)",
  or: "Odia script (ଓଡ଼ିଆ)",
  as: "Assamese/Bengali script (অসমীয়া)",
  ur: "Perso-Arabic / Urdu script (اردو)",
  en: "Latin (English)",
};

const ROMANIZED_LANG_HINTS: [RegExp, string][] = [
  [/\b(kya|kaise|kaisa|hai|hain|meri|mera|mere|gaay|gai|bhains|doodh|bimar|bimari|ilaj|daktar|pashu|kisan|nahi|haan|batao|bataiye|madad|dard|chara|poshan|yojana|sarkar|gaon|mahine|sal|din|ji|chahiye|dikhao|bhejo|paas|najdeek|vet|doctor|kahan|kaha)\b/i, "hi"],
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

export function detectUserLanguage(text: string, fallback = "hi"): string {
  return detectLanguageCode(text) ?? fallback;
}

export function detectLangForRefusal(text: string): string {
  return detectUserLanguage(text, "hi");
}

/** Unicode ranges per language for native-script presence checks. */
const LANG_SCRIPT_RANGES: Record<string, [number, number][]> = {
  hi: [[0x0900, 0x097f]],
  mr: [[0x0900, 0x097f]],
  bn: [[0x0980, 0x09ff]],
  as: [[0x0980, 0x09ff]],
  or: [[0x0b00, 0x0b7f]],
  pa: [[0x0a00, 0x0a7f]],
  gu: [[0x0a80, 0x0aff]],
  ta: [[0x0b80, 0x0bff]],
  te: [[0x0c00, 0x0c7f]],
  kn: [[0x0c80, 0x0cff]],
  ml: [[0x0d00, 0x0d7f]],
  ur: [[0x0600, 0x06ff]],
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
  const ratio = native / (native + latin);
  return ratio < 0.12;
}

export const NATIVE_SCRIPT_RULES = `NATIVE SCRIPT (NON-NEGOTIABLE for Indian languages):
- For hi, bn, ta, te, mr, gu, kn, ml, pa, or, as, ur: write ALL words of that language in its native script (Devanagari, Bengali, Tamil, Telugu, Gujarati, Gurmukhi, Odia, Arabic for Urdu, etc.).
- NEVER reply in Roman/Latin transliteration (wrong: "aapki gaay bimar hai", "ungal pasu rogam"; correct: use the proper script for that language).
- If the farmer spoke or typed Hinglish/Banglish/Tanglish (mixed English + romanized Indian words), still reply in native script for their language — only keep common English loanwords (vet, WhatsApp, kg, NDDB) in Latin when natural.
- Only pure English (en) replies use Latin script throughout.`;

export function nativeScriptLockPrompt(lang: string, languageLabel: string): string {
  const script = NATIVE_SCRIPT_LABELS[lang] || languageLabel;
  return `CRITICAL SCRIPT LOCK: Answer in ${languageLabel} using ${script} ONLY — NOT Roman transliteration. First line [[LANG:${lang}]]. Body script MUST match the header.`;
}
