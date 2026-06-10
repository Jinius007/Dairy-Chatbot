import { detectLanguageCode, LANG_NAMES } from "@/lib/languages";
import type { Species } from "@/lib/nutrientRequirements";
import { FEED_LIBRARY, FeedItem, searchFeeds } from "@/lib/feedLibrary";
import { RATION_STRINGS } from "@/lib/rationI18n";

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

/** Hindi / Bengali / English number words → digit (voice answers). */
const SPOKEN_NUMBER_WORDS: [string, number][] = [
  ["zero", 0], ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
  ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10],
  ["eleven", 11], ["twelve", 12], ["thirteen", 13], ["fourteen", 14], ["fifteen", 15],
  ["sixteen", 16], ["seventeen", 17], ["eighteen", 18], ["nineteen", 19], ["twenty", 20],
  ["ek", 1], ["do", 2], ["teen", 3], ["tin", 3], ["char", 4], ["chaar", 4], ["chhar", 4],
  ["paanch", 5], ["panch", 5], ["paach", 5],
  ["chhe", 6], ["chhah", 6], ["chha", 6], ["che", 6], ["chhay", 6],
  ["saat", 7], ["sat", 7], ["sath", 7],
  ["aath", 8], ["aat", 8], ["ath", 8], ["aathh", 8],
  ["nau", 9], ["noi", 9],
  ["das", 10], ["dus", 10],
  ["gyarah", 11], ["gyara", 11], ["barah", 12], ["baarah", 12],
  ["terah", 13], ["tehrah", 13], ["chaudah", 14], ["chauda", 14],
  ["pandrah", 15], ["pandhra", 15], ["solah", 16], ["sola", 16],
  ["satrah", 17], ["satra", 17], ["atharah", 18], ["athara", 18],
  ["bees", 20], ["bis", 20],
  ["tees", 30], ["teis", 30], ["tiis", 30], ["taintalis", 34], ["chautis", 34], ["chhtis", 34],
  ["paintis", 35], ["paitis", 35], ["chhattis", 36],
  ["एक", 1], ["दो", 2], ["तीन", 3], ["चार", 4], ["पांच", 5], ["पाँच", 5],
  ["छह", 6], ["छः", 6], ["सात", 7], ["आठ", 8], ["नौ", 9], ["दस", 10],
  ["ग्यारह", 11], ["बारह", 12], ["तेरह", 13], ["चौदह", 14], ["पंद्रह", 15],
  ["सोलह", 16], ["सत्रह", 17], ["अठारह", 18], ["उन्नीस", 19], ["बीस", 20],
  ["এক", 1], ["দুই", 2], ["তিন", 3], ["চার", 4], ["পাঁচ", 5], ["ছয়", 6],
  ["সাত", 7], ["আট", 8], ["নয়", 9], ["দশ", 10],
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(text: string, word: string): boolean {
  const w = escapeRe(word);
  return new RegExp(`(?:^|[\\s])${w}(?:[\\s]|$)`, "iu").test(text) || new RegExp(`^${w}$`, "iu").test(text);
}

/** Parse a spoken or written number from farmer voice input. */
export function parseSpokenNumber(text: string): number | null {
  const t = normalizeVoiceAnswer(text);
  if (!t) return null;

  const fromDigit = extractFirstNumber(t);
  if (fromDigit !== null) return fromDigit;

  // साढ़े / saadhe 4 → 4.5
  const saadhe = t.match(/(?:saadhe|saadha|sadhe|sade|साढ़े|সাড়ে|সাড়)\s*(\S+(?:\s*\S)?)/iu);
  if (saadhe) {
    const base = parseSpokenNumber(saadhe[1]);
    if (base !== null) return base + 0.5;
  }
  if (/\b(?:dedh|dhai|डेढ़|ढाई|derh|dher)\b/i.test(t)) return 1.5;
  if (/\b(?:saadhe|saadha|sadhe)\s*(?:das|dus|10|दस|দশ)\b/i.test(t)) return 10.5;

  const sorted = [...SPOKEN_NUMBER_WORDS].sort((a, b) => b[0].length - a[0].length);
  for (const [word, val] of sorted) {
    if (containsWord(t, word)) return val;
  }
  return null;
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
  const t = normalizeVoiceAnswer(text).toLowerCase();
  return /\b(skip|chhod|chod|chhodo|chharo|chhere|bad|baad|pata nahi|patani|malum nahi|dont know|don't know|unknown|na jane|nahi pata|jani na|janina|জানি না|छोड|छोड़)\b/i.test(t);
}

export function isDontKnow(text: string): boolean {
  const t = normalizeVoiceAnswer(text).toLowerCase();
  return isSkip(text)
    || /\b(dont know|don't know|pata nahi|patani|malum nahi|mujhe nahi pata|nahi pata|jad khu|jani na|janina|mahiit nahi|khabar nahi|teliyadu|ariyilla|na jane)\b/i.test(t)
    || /पता नहीं|जानकारी नहीं|মালুম নেই|জানি না/i.test(t);
}

/** Yes/no for pregnancy question (Hindi/Bengali phrases). */
export function parsePregnantFromVoice(text: string): boolean | null {
  const t = normalizeVoiceAnswer(text);
  if (!t) return null;
  if (/\b(garbh|pregnant|gaabhin|gaabhan|gestation|expecting|garbhi|hamla)\b/i.test(t) && !isNo(t)) return true;
  if (/गर्भ|गाभ|गर्भवती|गाभिन|গর্ভ|গাভিন/i.test(t) && !/नहीं|না/i.test(t)) return true;
  if (/\b(not pregnant|garbh nahi|pregnant nahi|no pregnancy)\b/i.test(t)) return false;
  if (/गर्भ\s*नहीं|गाभ\s*नहीं|গর্ভ\s*নেই/i.test(t)) return false;
  if (isYes(t)) return true;
  if (isNo(t)) return false;
  return null;
}

export type NumericContext = "months" | "yield" | "fat" | "snf" | "price" | "pregMonth";

const CONTEXT_PATTERNS: Record<NumericContext, RegExp[]> = {
  months: [
    /(\d+(?:\.\d+)?)\s*(?:mahine|mahina|maheena|month|months|मही|মাস)/iu,
    /(?:mahine|mahina|month|months|मही|মাস)[^\d]{0,16}(\d+(?:\.\d+)?)/iu,
  ],
  yield: [
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|kg|लीटर|लिटर|লিটার|litre)/iu,
    /(?:doodh|dudh|milk|दूध|দুধ|pal|पाल)[^\d]{0,24}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg)?/iu,
    /(?:roz|daily|din|रोज|prati din)[^\d]{0,20}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg)?/iu,
  ],
  fat: [
    /(\d+(?:\.\d+)?)\s*(?:percent|pct|pratishat|pratishat|fat|fait|फैट|%.)/iu,
    /(?:fat|fait|pratishat|fat%|फैट)[^\d]{0,16}(\d+(?:\.\d+)?)/iu,
  ],
  snf: [
    /(\d+(?:\.\d+)?)\s*(?:percent|pct|pratishat|snf|%.)/iu,
    /(?:snf|pratishat)[^\d]{0,12}(\d+(?:\.\d+)?)/iu,
  ],
  price: [
    /(\d+(?:\.\d+)?)\s*(?:rupaye|rupee|rs|₹|taka|টাকা|रु|rupya)/iu,
    /(?:rate|daam|dam|price|bhav|bhaav|भाव|দাম|rate)[^\d]{0,16}(\d+(?:\.\d+)?)/iu,
  ],
  pregMonth: [
    /(\d+(?:\.\d+)?)\s*(?:month|mahina|mahine|मह|মাস|maas)/iu,
    /(?:mahina|month|महीने|মাস)[^\d]{0,12}(\d+(?:\.\d+)?)/iu,
  ],
};

/** Parse numeric answer for a specific ration question step. */
export function parseNumericAnswer(text: string, context: NumericContext): number | null {
  const t = normalizeVoiceAnswer(text);
  if (!t) return null;

  let n = parseSpokenNumber(t);
  if (n !== null) return n;

  for (const re of CONTEXT_PATTERNS[context]) {
    const m = t.match(re);
    if (m?.[1]) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v)) return v;
    }
  }

  // Scan clause after common joiners: "char pratishat fat", "das litre doodh"
  for (const part of t.split(/\s+(?:ka|ki|ke|k|ko|me|mein|mai|me|mot|fat|percent|pratishat|litre|liter|mahine|month|hai|hain|ache|ache|de|deti)\s+/iu)) {
    n = parseSpokenNumber(part.trim());
    if (n !== null) return n;
  }

  return null;
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

function speciesLabelsFromI18n(key: "cow" | "buffalo"): string[] {
  const entry = RATION_STRINGS[key];
  if (!entry) return [];
  return Object.values(entry)
    .map((s) => s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim())
    .filter(Boolean);
}

/** Roman / Hinglish aliases farmers and ASR commonly produce (all 13 languages). */
const COW_ROMAN = [
  "cow", "cows", "gaay", "gai", "gay", "gae", "gaye", "gayein", "gayee", "gaai", "gaayi", "gayi", "gaii", "gao",
  "goru", "guru", "gaw", "goroo",
  "pasu", "pasi", "pashu",
  "aavu", "avu", "avulu", "avulu",
  "hasu", "haasu", "hassu",
  "gaan", "gaav", "gaa", "gav",
  "gaai", "gaii",
  "gaye", "gaey",
];

const BUFFALO_ROMAN = [
  "buffalo", "buffaloes", "bhains", "bhainsh", "bhais", "bhens", "bhaisa", "bhainsa", "bhensh",
  "mahish", "mahis", "mhas", "mhish", "mehs", "mahes", "mhais", "mhashi", "mhishi", "maishi",
  "mohish", "mohis", "moh",
  "gedde", "gedhe", "gedda",
  "erumai", "erumai", "eruma",
  "emme", "emm", "emme",
  "majh", "mjh", "majha",
  "bhens", "bhaens",
];

/** “X is / has” suffixes in all supported languages — for disambiguating question echoes. */
const SPECIES_ANSWER_SUFFIX =
  /(?:hai|hain|he|ho|hoi|hoy|hoyeche|ache|achhe|ahe|ahe|ase|asi|achi|undu|unde|unnu|undi|ide|ive|irukku|irukkangal|undhi|unnayi|aahe|ahe|haiji|ji)\b/iu;

export function detectSpecies(text: string): Species | null {
  const raw = normalizeDigits(text);
  const t = normalizeVoiceAnswer(raw);
  if (!t) return null;

  const cowWords = [...new Set([...speciesLabelsFromI18n("cow"), ...COW_ROMAN])];
  const buffaloWords = [...new Set([...speciesLabelsFromI18n("buffalo"), ...BUFFALO_ROMAN])];

  const hasBuffalo = hasSpeciesToken(t, raw, buffaloWords);
  const hasCow = hasSpeciesToken(t, raw, cowWords);

  if (hasBuffalo && !hasCow) return "buffalo";
  if (hasCow && !hasBuffalo) return "cattle";

  if (hasBuffalo && hasCow) {
    const answerBuffalo = speciesAnswerPhrase(t, raw, buffaloWords);
    const answerCow = speciesAnswerPhrase(t, raw, cowWords);
    if (answerCow && !answerBuffalo) return "cattle";
    if (answerBuffalo && !answerCow) return "buffalo";
    const bIdx = firstSpeciesIndex(t, raw, buffaloWords);
    const cIdx = firstSpeciesIndex(t, raw, cowWords);
    if (bIdx >= 0 && cIdx >= 0) return cIdx < bIdx ? "cattle" : "buffalo";
  }

  return null;
}

function speciesAnswerPhrase(normalized: string, raw: string, words: string[]): boolean {
  for (const w of words) {
    if (/^[a-z]/i.test(w)) {
      const wordRe = new RegExp(`(?:^|[\\s])${escapeRe(w.toLowerCase())}(?:[\\s]|$)`, "iu");
      const m = normalized.toLowerCase().match(wordRe);
      if (m && m.index !== undefined) {
        const after = normalized.slice(m.index + m[0].length, m.index + m[0].length + 30);
        if (SPECIES_ANSWER_SUFFIX.test(after)) return true;
      }
    } else if (raw.includes(w)) {
      const idx = raw.indexOf(w);
      const tail = raw.slice(idx + w.length, idx + w.length + 24);
      if (SPECIES_ANSWER_SUFFIX.test(tail)) return true;
    }
  }
  return false;
}

function hasSpeciesToken(normalized: string, raw: string, words: string[]): boolean {
  const lower = normalized.toLowerCase();
  for (const w of words) {
    if (/^[a-z]/i.test(w)) {
      if (containsWord(lower, w.toLowerCase())) return true;
    } else if (raw.includes(w) || normalized.includes(w)) {
      return true;
    }
  }
  return false;
}

function firstSpeciesIndex(normalized: string, raw: string, words: string[]): number {
  let best = -1;
  const lower = normalized.toLowerCase();
  for (const w of words) {
    let idx = -1;
    if (/^[a-z]/i.test(w)) {
      const re = new RegExp(`(?:^|[\\s])${escapeRe(w.toLowerCase())}(?:[\\s]|$)`, "iu");
      const m = lower.match(re);
      idx = m?.index ?? -1;
    } else {
      idx = raw.indexOf(w);
      if (idx < 0) idx = normalized.indexOf(w);
    }
    if (idx >= 0 && (best < 0 || idx < best)) best = idx;
  }
  return best;
}

/** Parse calving count from spoken answer (Hindi/English numbers and words). */
export function parseCalvingsFromVoice(text: string): number | null {
  const t = normalizeVoiceAnswer(text);
  if (!t) return null;
  if (isNotCalved(t)) return 0;
  if (/pehli|first|1st|pahli|पहली|pratham|প্রথম|\bone\b/i.test(t)) return 1;
  if (/doosri|second|2nd|dusri|दूसरी|দ্বিতীয়|\btwo\b/i.test(t)) return 2;
  if (/teesri|third|3rd|तीसरी|তৃতীয়|\bthree\b/i.test(t)) return 3;
  const n = parseSpokenNumber(t);
  if (n !== null && n >= 0 && n <= 20) return Math.round(n);
  return null;
}

/** Parse pregnancy month from voice. */
export function parsePregMonthFromVoice(text: string): number | null {
  const n = parseNumericAnswer(text, "pregMonth");
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
