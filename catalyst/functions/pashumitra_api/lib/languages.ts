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

interface RomanizedProfile {
  lang: string;
  strong: string[];
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
