import { detectLanguageCode, LANG_NAMES } from "@/lib/languages";
import type { Species } from "@/lib/nutrientRequirements";

const ENGLISH_LANG: Record<string, string> = {
  hindi: "hi", bengali: "bn", tamil: "ta", telugu: "te", marathi: "mr",
  gujarati: "gu", kannada: "kn", malayalam: "ml", punjabi: "pa", odia: "or",
  assamese: "as", urdu: "ur", english: "en",
};

export function extractFirstNumber(text: string): number | null {
  const m = text.replace(/,/g, "").match(/(\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : null;
}

export function isYes(text: string): boolean {
  const s = text.toLowerCase().trim();
  if (/^(y|yes|haan|ha|haa|ji|ji haan|theek|thik|sahi|bilkul|ho|correct|right|ok|okay|undu|am|ahe|avunu|shi|ঠিক|হ্যাঁ|हाँ|हां)$/i.test(s)) return true;
  return /\b(yes|haan|haanji|ji haan|theek hai|thik hai|sahi hai|bilkul|correct|right)\b/i.test(s);
}

export function isNo(text: string): boolean {
  const s = text.toLowerCase().trim();
  if (/^(n|no|na|nahi|nahin|nai|galat|wrong|illa|ledu|naahi|না|नहीं|नही)$/i.test(s)) return true;
  return /\b(no|nahi|nahin|not|galat|wrong|na re)\b/i.test(s);
}

export function isSkip(text: string): boolean {
  const s = text.toLowerCase();
  return /\b(skip|chhod|chod|chhodo|bad|baad|pata nahi|patani|malum nahi|dont know|don't know|unknown|na jane|nahi pata)\b/i.test(s);
}

export function isNotCalved(text: string): boolean {
  const s = text.toLowerCase();
  return /\b(not calved|no calving|zero|0|nahi biyai|abhi nahi|pehli bar|first time|heifer|bachiya|nahi byai)\b/i.test(s) || s === "0";
}

export function isInMilk(text: string): boolean {
  const s = text.toLowerCase();
  if (/\b(dry|sukhi|sookhi|sukha|no milk|not milk|band|bandh)\b/i.test(s)) return false;
  return /\b(milk|doodh|dudh|duDh|dud|dairy|doodh deti|doodh de)\b/i.test(s);
}

export function isDry(text: string): boolean {
  const s = text.toLowerCase();
  return /\b(dry|sukhi|sookhi|sukha|no milk|not milk|band|bandh|nahi deti)\b/i.test(s);
}

export function matchLangCode(text: string): string | null {
  const detected = detectLanguageCode(text);
  if (detected && LANG_NAMES[detected]) return detected;
  const lower = text.toLowerCase();
  for (const [code, name] of Object.entries(LANG_NAMES)) {
    if (lower.includes(name.toLowerCase())) return code;
  }
  for (const [word, code] of Object.entries(ENGLISH_LANG)) {
    if (lower.includes(word)) return code;
  }
  return null;
}

export function detectSpecies(text: string): Species | null {
  const s = text.toLowerCase();
  const buffalo = /\b(buffalo|bhains|bhais|bhains|mahish|mahis|mhas|gedhe|erumai|mehs|भैंस|म्हैस)\b/i.test(s);
  const cow = /\b(cow|cows|gay|gai|gaay|gaye|pasu|pashu|hasu|பசு|गाय|गाय)\b/i.test(s);
  if (buffalo && !cow) return "buffalo";
  if (cow && !buffalo) return "cattle";
  if (buffalo) return "buffalo";
  if (cow) return "cattle";
  return null;
}
