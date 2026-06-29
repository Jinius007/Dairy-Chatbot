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
interface RomanizedProfile {
  lang: string;
  /** Distinctive roman spellings — weight 2 each. */
  strong: string[];
  /** Common in this language (incl. shared dairy terms) — weight 1 each. */
  common: string[];
}

const ROMANIZED_PROFILES: RomanizedProfile[] = [
  {
    lang: "bn",
    strong: [
      "ekti", "ekjon", "ekta", "duti", "tin", "char", "kotota", "koto", "khabar", "khawa", "khavar",
      "uchit", "hobe", "habe", "lagbe", "dorkar", "bolun", "bolben", "bolen", "amake", "apnake", "tomake",
      "kemon", "keno", "kothay", "nei", "korbo", "korbe", "korle", "korte", "korun", "deowa", "debe",
      "dichchi", "ghash", "poshu", "gorur", "valo", "ekhon", "sheta", "eta", "egulo", "kivabe", "somoy",
      "bhalo", "byadhi", "chikitsha", "matro", "shudhu", "onek", "kom", "beshi", "shob", "taar",
    ],
    common: ["goru", "gaay", "gai", "dudh", "daktar", "kisan", "na", "ki", "ke", "dewa", "deya"],
  },
  {
    lang: "hi",
    strong: [
      "kya", "kaise", "kaisa", "kaun", "kitna", "kitne", "kyun", "kab", "hai", "hain", "hoon", "hoga",
      "chahiye", "chahie", "meri", "mera", "mere", "aapka", "aapki", "apka", "tumhara", "nahi", "nahin",
      "haan", "han", "batao", "bataiye", "bata", "kahan", "kaha", "dijiye", "karna", "karte", "karo",
      "ji", "mahine", "sal", "gaon", "yojana", "sarkar", "wala", "wali", "hogi", "tha", "thi", "rahe",
      "raha", "kripya", "krpya", "krupa", "bataiye", "bataye", "batana", "dena", "dete", "deti",
    ],
    common: ["gaay", "gai", "bhains", "doodh", "daktar", "pashu", "kisan", "chara", "doctor", "vet", "dewa"],
  },
  {
    lang: "ta",
    strong: ["enna", "epdi", "eppadi", "enga", "yen", "illai", "venum", "irukku", "sollunga", "aama", "eppo", "eppadi", "seiyungal", "vandhu", "pannunga", "theriyuma", "sari", "romba", "konjam"],
    common: ["paal", "pasu", "maruthuvam", "vaidhyan", "kodu", "doctor"],
  },
  {
    lang: "te",
    strong: ["elaa", "emi", "ekkada", "eppudu", "ledu", "kavali", "undi", "cheppandi", "ivvu", "avunu", "ela", "enduku", "chala", "koncham", "sare", "cheyandi"],
    common: ["paalu", "pashuvu", "doctor"],
  },
  {
    lang: "mr",
    strong: ["kasa", "kay", "ahe", "ahet", "naahi", "pahije", "sanga", "deto", "hoto", "hoti", "mala", "tula", "tumhala", "kay", "kiti", "kuthun", "kuthun"],
    common: ["dudh", "gai", "mhashi", "doctor", "de", "ho", "nahi"],
  },
  {
    lang: "gu",
    strong: ["shu", "kem", "chhe", "nathi", "joiye", "aapo", "kaho", "saru", "khabar", "kem", "kyare", "kyathi", "tame", "maru", "tamne", "amne"],
    common: ["dudh", "gai", "bhains", "doctor", "ha"],
  },
  {
    lang: "kn",
    strong: ["yaav", "hege", "illa", "howdu", "beku", "kodi", "heli", "yenu", "elli", "yaake", "idhu", "adu", "nanna", "nimma", "sari"],
    common: ["halu", "pasu", "doctor"],
  },
  {
    lang: "ml",
    strong: ["engane", "ente", "eppozha", "illa", "venam", "parayu", "athe", "tharu", "entha", "evide", "njan", "ningal", "sheri", "kurachu"],
    common: ["paal", "pashu", "doctor"],
  },
  {
    lang: "pa",
    strong: ["kive", "daso", "chahida", "deyo", "karda", "hunda", "nahi", "haan", "ki", "kithhe", "kado", "mera", "tera", "tusi", "asi"],
    common: ["dudh", "gaan", "doctor"],
  },
  {
    lang: "or",
    strong: ["kana", "kemiti", "kahinki", "diya", "pathao", "kaha", "nahi", "haan", "mote", "tume", "se", "ebe", "kete"],
    common: ["khir", "pashu", "daktar"],
  },
  {
    lang: "as",
    strong: ["kenekoi", "kobo", "lagibo", "hoi", "nai", "kene", "kio", "moi", "tumi", "eibur", "hetu", "bhal"],
    common: ["dudh", "goru", "daktar", "ki"],
  },
  {
    lang: "ur",
    strong: ["kyun", "kab", "kahan", "ap", "aap", "mera", "meri", "bataiye", "bataye", "chahiye", "nahin", "nahi", "ji", "kripya"],
    common: ["kya", "kaise", "hai", "doodh", "janwar", "doctor", "batao"],
  },
];

function wordBoundaryRe(word: string): RegExp {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

function scoreRomanizedProfile(text: string, profile: RomanizedProfile): number {
  let score = 0;
  for (const w of profile.strong) {
    if (wordBoundaryRe(w).test(text)) score += 2;
  }
  for (const w of profile.common) {
    if (wordBoundaryRe(w).test(text)) score += 1;
  }
  return score;
}

function detectRomanizedLang(text: string): string | null {
  const scores = ROMANIZED_PROFILES
    .map((p) => ({ lang: p.lang, score: scoreRomanizedProfile(text, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scores.length) return null;
  if (scores.length >= 2 && scores[0].score === scores[1].score) {
    // Prefer non-Hindi when tied — Hindi is the usual false positive for roman Indic text.
    const nonHi = scores.find((x) => x.lang !== "hi");
    return nonHi?.lang ?? scores[0].lang;
  }
  return scores[0].lang;
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
