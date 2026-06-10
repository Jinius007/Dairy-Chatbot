import { detectLanguageCode, LANG_NAMES } from "@/lib/languages";
import type { Species } from "@/lib/nutrientRequirements";
import { FEED_LIBRARY, FeedItem, searchFeeds } from "@/lib/feedLibrary";

const ENGLISH_LANG: Record<string, string> = {
  hindi: "hi", bengali: "bn", tamil: "ta", telugu: "te", marathi: "mr",
  gujarati: "gu", kannada: "kn", malayalam: "ml", punjabi: "pa", odia: "or",
  assamese: "as", urdu: "ur", english: "en",
};

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

function normalizeDigits(text: string): string {
  return text.replace(/[०-९]/g, (ch) => String(DEVANAGARI_DIGITS.indexOf(ch)));
}

export function extractFirstNumber(text: string): number | null {
  const normalized = normalizeDigits(text);
  const m = normalized.replace(/,/g, "").match(/(\d+\.?\d*)/);
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
  const s = normalizeDigits(text).toLowerCase();
  const buffalo = /\b(buffalo|bhains|bhais|bhens|mahish|mahis|mhas|gedhe|erumai|mehs|भैंस|भेंस|म्हैस|ભેંસ)\b/i.test(s)
    || /भैंस|भेंस|म्हैस/.test(text);
  const cow = /\b(cow|cows|gay|gai|gaay|gaye|pasu|pashu|hasu|பசு)\b/i.test(s)
    || /गाय|गैय|गो|पशु/.test(text);
  if (buffalo && !cow) return "buffalo";
  if (cow && !buffalo) return "cattle";
  if (buffalo) return "buffalo";
  if (cow) return "cattle";
  return null;
}

/** Parse calving count from spoken answer (Hindi/English numbers and words). */
export function parseCalvingsFromVoice(text: string): number | null {
  const t = normalizeDigits(text);
  if (isNotCalved(t)) return 0;
  if (/pehli|first|1st|pahli|पहली|pratham|બીજ|ek\s|एक|\bone\b/i.test(t)) return 1;
  if (/doosri|second|2nd|dusri|दूसरी|do\s|दो|\btwo\b/i.test(t)) return 2;
  if (/teesri|third|3rd|तीसरी|teen|तीन|\bthree\b/i.test(t)) return 3;
  const n = extractFirstNumber(t);
  if (n !== null && n >= 0 && n <= 20) return Math.round(n);
  return null;
}

/** Parse pregnancy month from voice. */
export function parsePregMonthFromVoice(text: string): number | null {
  const t = normalizeDigits(text);
  const n = extractFirstNumber(t);
  if (n !== null && n >= 1 && n <= 9) return Math.round(n);
  return null;
}

/** Farmer said they have no more feeds to add. */
export function isDoneAddingFeeds(text: string): boolean {
  const s = text.toLowerCase();
  return /\b(done|enough|bas|bus|khatam|ho gaya|hogaya|hogy|that'?s all|no more|kuch nahi|koi nahi|nahi aur|nothing else|finish|complete|over|ant|samapt)\b/i.test(s);
}

/** Use library default price when farmer doesn't know. */
export function isDefaultPrice(text: string): boolean {
  const s = text.toLowerCase();
  return isSkip(text) || /\b(default|market|pata nahi|malum nahi|mujhe nahi pata|don'?t know)\b/i.test(s);
}

const FEED_ALIASES: [string, string][] = [
  ["bhusa", "wheat_straw"], ["bhoosa", "wheat_straw"], ["gehu", "wheat_straw"],
  ["parali", "paddy_straw"], ["paddy", "paddy_straw"], ["dhan", "paddy_straw"],
  ["berseem", "barseem_fodder"], ["lucerne", "barseem_fodder"], ["lasun", "barseem_fodder"],
  ["makka", "maize_fodder"], ["maize", "maize_fodder"], ["corn fodder", "maize_fodder"],
  ["jowar", "jowar_fodder"], ["sorghum", "jowar_fodder"],
  ["napier", "napier_bajra___nb_21"], ["hybrid napier", "napier_bajra___nb_21"],
  ["chokar", "wheat_bran"], ["choker", "wheat_bran"], ["wheat bran", "wheat_bran"],
  ["rice bran", "rice_bran_deoiled"], ["dhan chokar", "rice_bran_deoiled"],
  ["mustard", "mustard_cake"], ["sarson", "mustard_cake"], ["khal", "mustard_cake"],
  ["groundnut", "groundnut_cake"], ["moongfali", "groundnut_cake"], ["mungfali", "groundnut_cake"],
  ["cottonseed", "cottonseed_meal"], ["binola", "cottonseed_meal"],
  ["soya", "soyabean_meal"], ["soybean", "soyabean_meal"],
  ["cattle feed", "cattle_feed_bis_i"], ["dan", "cattle_feed_bis_i"], ["pellet", "cattle_feed_bis_i"],
  ["mineral", "mineral_mixture_bis"], ["mineral mixture", "mineral_mixture_bis"],
  ["molasses", "molasses"], ["gur", "molasses"],
];

export function matchFeedFromText(text: string): FeedItem | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  for (const [alias, id] of FEED_ALIASES) {
    if (lower.includes(alias)) {
      const f = FEED_LIBRARY.find((x) => x.id === id);
      if (f) return f;
    }
  }

  const hits = searchFeeds(lower);
  if (hits.length === 0) return null;
  const exact = hits.find((f) => lower.includes(f.name.toLowerCase()));
  if (exact) return exact;
  // Prefer shortest name match (most specific search hit)
  return hits.sort((a, b) => a.name.length - b.name.length)[0];
}
