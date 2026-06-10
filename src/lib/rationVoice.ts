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

function normalizeVoiceAnswer(text: string): string {
  return normalizeDigits(text)
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isYes(text: string): boolean {
  const raw = text.trim();
  const s = raw.toLowerCase();
  if (/^(y|yes|haan|haanji|ha|haa|hain|han|ji|ji haan|theek|thik|sahi|bilkul|ho|hoy|hoyee|correct|right|ok|okay|undu|am|ahe|avunu|shi|ঠিক|হ্যাঁ|হ্যা|हाँ|हां|जी|हो)$/i.test(s)) return true;
  if (/^(haan|ha|ji|yes|y|ho|hoy|হ্যাঁ|হ্যা|हाँ|हां|जी)\b/i.test(s)) return true;
  return /\b(yes|haan|haanji|ji haan|theek hai|thik hai|sahi hai|bilkul|correct|right|hoy ta|hoyeche)\b/i.test(s)
    || /হ্যাঁ|হ্যা\b|हाँ|हां|जी\s*हाँ|हाँ\s*जी|ठीक\s*है|बिल्कुल/i.test(raw);
}

export function isNo(text: string): boolean {
  const raw = text.trim();
  const s = raw.toLowerCase();
  if (/^(n|no|na|nahi|nahin|nai|naa|galat|wrong|illa|ledu|naahi|না|नहीं|नही|न)$/i.test(s)) return true;
  return /\b(no|nahi|nahin|not|galat|wrong|na re|dey na|dicche na)\b/i.test(s)
    || /না\b|नहीं|नही|नहीं\s*दे|দুধ\s*দিচ্ছে\s*না/i.test(raw);
}

export function isSkip(text: string): boolean {
  const s = text.toLowerCase();
  return /\b(skip|chhod|chod|chhodo|bad|baad|pata nahi|patani|malum nahi|dont know|don't know|unknown|na jane|nahi pata)\b/i.test(s);
}

export function isNotCalved(text: string): boolean {
  const s = text.toLowerCase();
  return /\b(not calved|no calving|zero|0|nahi biyai|abhi nahi|pehli bar|first time|heifer|bachiya|nahi byai)\b/i.test(s)
    || /अभी\s*नहीं?\s*ब्याई|नहीं?\s*ब्याई|ब्याई\s*नहीं|पहली\s*बार/i.test(text);
}

const DRY_MILK_PATTERNS = [
  /\b(dry|sukhi|sookhi|sukha|sookha|no milk|not milk|band|bandh)\b/i,
  /doodh\s*nahi|dudh\s*nahi|doodh\s*nahin|milk\s*nahi|dudh\s*dey\s*na|dudh\s*dicche\s*na/i,
  /nahi\s*de(?:ti|r|ta)?(?!\s*rahi)/i,
  /दूध\s*नहीं?|नहीं?\s*दे(?:ती|र)?|सूख|शुष्क|दूध\s*बंद/i,
  /দুধ\s*দিচ্ছ(?:ে\s*)?না|দুধ\s*দেয়\s*না|দুধ\s*না/i,
  /doodh\s*bandh?|dudh\s*bandh?/i,
];

const IN_MILK_PATTERNS = [
  /doodh\s*de(?:ti|r|ta)?(?:\s*rahi|\s*rhi|\s*rahe|\s*rah)?(?:\s*hai|\s*he|a)?/i,
  /dudh\s*de(?:ti|r|ta)?(?:\s*rahi|\s*rhi|\s*rahe)?(?:\s*hai|\s*he)?/i,
  /dudh\s*dey|dudh\s*dicch(?:e|i)|dudh\s*de\s*rahi/i,
  /milk\s*de(?:ti|r|ta)?(?:\s*rahi|\s*rhi)?(?:\s*hai)?/i,
  /दूध\s*दे(?:ती|ता|र)?(?:\s*रही|\s*रह)?(?:\s*है)?/,
  /दूध\s*दे\s*रही/,
  /दूध\s*देती/,
  /(?:aaj|aj)\s*kal\s*(?:doodh|dudh|se\s*doodh)/i,
  /आज\s*कल\s*दूध/,
  /দুধ\s*দি(?:চ্ছ|য়|চ্ছে|চ্ছ)/,
  /দুধ\s*দে(?:য়|ত)?(?:\s*র)?(?:\s*হয়)?/,
  /দুধ\s*দিচ্ছে/,
  /दूध\s*दet(?:e|a)?(?:\s*आhe)?/i,
  /पाल(?:u)?\s*de(?:ti|r)?/i,
  /பால(?:்)?\s*(?:koduk|kotuk|thar)/i,
  /పాల(?:u)?\s*(?:ist|istun)/i,
  /ಗಾಲ(?:u)?\s*(?:kodu|kodut)/i,
  /\b(in milk|milking|giving milk|lactating|dairy)\b/i,
  /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg|लीटर|লিটার|লিটার)\s*(?:doodh|dudh|milk|दूध|দুধ)/i,
  /(?:doodh|dudh|milk|दूध|দুধ|पाल|পাল)[^\d]{0,40}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg|लीटर|লিটার)?/i,
];

const MILK_WORD = /doodh|dudh|milk|दूध|দুধ|पाल|পাল|பால|పాల|ಹಾಲ|dairy/i;
const GIVE_VERB = /de(?:ti|r|ta|y)?|de rahi|de rhi|de raha|deti|dey|dicch|dichch|dichhe|দে|দিচ্ছ|दे(?:ती|र)?|देती|दे रही|koduk|istun|kodut|kotuk|thar|de ta|det ahe/i;

/**
 * Parse whether the animal is currently giving milk.
 * Returns true (in milk), false (dry), or null (unclear).
 */
export function parseMilkingFromVoice(text: string): boolean | null {
  const t = normalizeVoiceAnswer(text);
  if (!t) return null;

  if (DRY_MILK_PATTERNS.some((p) => p.test(t))) return false;
  if (IN_MILK_PATTERNS.some((p) => p.test(t))) return true;

  if (MILK_WORD.test(t) && GIVE_VERB.test(t)) return true;

  if (isYes(t) && MILK_WORD.test(t)) return true;
  if (isYes(t) && !isNo(t) && !/\b(dry|sukhi|sookhi|sukha|band|nahi|nahin|না|नही)\b/i.test(t)) {
    // Plain "haan" / "হ্যাঁ" to a yes/no milking question
    if (/^(haan|ha|ji|yes|y|ho|hoy|haanji|bilkul|theek|thik|হ্যাঁ|হ্যা|हाँ|हां|जी|हो|hain|han)\b/i.test(t)) return true;
  }

  if (isYes(t)) return true;
  if (isNo(t)) return false;

  return null;
}

export function isInMilk(text: string): boolean {
  return parseMilkingFromVoice(text) === true;
}

export function isDry(text: string): boolean {
  return parseMilkingFromVoice(text) === false;
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
