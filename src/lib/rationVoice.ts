import { detectLanguageCode, LANG_NAMES } from "@/lib/languages";
import type { Species } from "@/lib/nutrientRequirements";
import { FEED_LIBRARY, FeedItem, searchFeeds } from "@/lib/feedLibrary";
import { RATION_STRINGS } from "@/lib/rationI18n";

const ENGLISH_LANG: Record<string, string> = {
  hindi: "hi", bengali: "bn", tamil: "ta", telugu: "te", marathi: "mr",
  gujarati: "gu", kannada: "kn", malayalam: "ml", punjabi: "pa", odia: "or",
  assamese: "as", urdu: "ur", english: "en",
  hindustani: "hi", bangla: "bn", tamizh: "ta", telgu: "te",
};

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

function stripEmoji(s: string): string {
  return s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
}

/** Collect plain-text tokens from rationI18n (all 13 languages). */
function i18nTokens(key: keyof typeof RATION_STRINGS): string[] {
  const entry = RATION_STRINGS[key];
  if (!entry) return [];
  return [...new Set(Object.values(entry).map(stripEmoji).filter(Boolean))];
}

function normalizeVoiceAnswer(text: string): string {
  return normalizeDigits(text)
    .replace(/(\w)'(\w)/g, "$1$2")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function exactI18nMatch(text: string, token: string): boolean {
  const raw = normalizeDigits(text).trim();
  const t = normalizeVoiceAnswer(text);
  return raw === token || t === token || t.toLowerCase() === token.toLowerCase();
}

function matchesAnyToken(text: string, tokens: string[]): boolean {
  const raw = normalizeDigits(text);
  const t = normalizeVoiceAnswer(raw);
  if (!t) return false;
  const lower = t.toLowerCase();
  const sorted = [...tokens].sort((a, b) => b.length - a.length);
  for (const tok of sorted) {
    if (!tok) continue;
    if (exactI18nMatch(text, tok)) return true;
    if (/^[a-z]/i.test(tok)) {
      if (containsWord(lower, tok.toLowerCase())) return true;
    } else if (exactI18nMatch(text, tok)) {
      return true;
    } else if (tok.length >= 4 && (raw.includes(tok) || t.includes(tok))) {
      return true;
    }
  }
  return false;
}

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
  // Tamil (roman + script)
  ["onru", 1], ["ondru", 1], ["ond", 1], ["rendu", 2], ["moonu", 3], ["moondru", 3],
  ["naalu", 4], ["nalu", 4], ["anju", 5], ["aaru", 6], ["aru", 6], ["ezhu", 7], ["eelu", 7],
  ["ettu", 8], ["onpathu", 9], ["onbathu", 9], ["pathu", 10], ["patthu", 10],
  ["ஒன்று", 1], ["இரண்டு", 2], ["மூன்று", 3], ["நான்கு", 4], ["ஐந்து", 5],
  ["ஆறு", 6], ["ஏழு", 7], ["எட்டு", 8], ["ஒன்பது", 9], ["பத்து", 10],
  // Telugu
  ["okati", 1], ["okati", 1], ["rendu", 2], ["moodu", 3], ["muudu", 3],
  ["naalugu", 4], ["nalugu", 4], ["aidu", 5], ["aaru", 6], ["edu", 7], ["yedu", 7],
  ["enimidi", 8], ["tommidi", 9], ["padi", 10],
  ["ఒకటి", 1], ["రెండు", 2], ["మూడు", 3], ["నాలుగు", 4], ["ఐదు", 5],
  ["ఆరు", 6], ["ఏడు", 7], ["ఎనిమిది", 8], ["తొమ్మిది", 9], ["పది", 10],
  // Kannada
  ["ondu", 1], ["eradu", 2], ["mooru", 3], ["moouru", 3], ["naalku", 4], ["nalku", 4],
  ["ombattu", 9], ["hattu", 10],
  ["ಒಂದು", 1], ["ಎರಡು", 2], ["ಮೂರು", 3], ["ನಾಲ್ಕು", 4], ["ಐದು", 5],
  ["ಆರು", 6], ["ಏಳು", 7], ["ಎಂಟು", 8], ["ಒಂಬತ್ತು", 9], ["ಹತ್ತು", 10],
  // Malayalam
  ["onnu", 1], ["randu", 2], ["moonnu", 3], ["munpu", 3], ["naalu", 4],
  ["ഒന്ന്", 1], ["രണ്ട്", 2], ["മൂന്ന്", 3], ["നാല്", 4], ["അഞ്ച്", 5],
  ["ആറ്", 6], ["ഏഴ്", 7], ["എട്ട്", 8], ["ഒമ്പത്", 9], ["പത്ത്", 10],
  // Gujarati
  ["એક", 1], ["બે", 2], ["ત્રણ", 3], ["ચાર", 4], ["પાંચ", 5],
  ["છ", 6], ["સાત", 7], ["આઠ", 8], ["નવ", 9], ["દસ", 10],
  // Punjabi
  ["ik", 1], ["ikk", 1], ["do", 2], ["tin", 3], ["panj", 5], ["panja", 5],
  ["ਇਕ", 1], ["ਦੋ", 2], ["ਤਿੰਨ", 3], ["ਚਾਰ", 4], ["ਪੰਜ", 5],
  ["ਛ", 6], ["ਸੱਤ", 7], ["ਅੱਠ", 8], ["ਨੌ", 9], ["ਦਸ", 10],
  // Odia
  ["ଏକ", 1], ["ଦୁଇ", 2], ["ତିନ", 3], ["ଚାର", 4], ["ପାଞ୍ଚ", 5],
  ["ଛ", 6], ["ସାତ", 7], ["ଆଠ", 8], ["ନଅ", 9], ["ଦଶ", 10],
  // Assamese
  ["আঠ", 8], ["আট", 8],
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

export function isYes(text: string): boolean {
  if (matchesAnyToken(text, i18nTokens("yes"))) return true;
  const raw = text.trim();
  const s = raw.toLowerCase();
  if (/^(y|yes|haan|haanji|ha|haa|hain|han|ji|ji haan|theek|thik|sahi|bilkul|ho|hoy|hoyee|correct|right|ok|okay|undu|am|ahe|avunu|shi|aam|am|avun|houd|houdu|athe|haudu|sach|thik hai|sahi hai)$/i.test(s)) return true;
  if (/^(haan|ha|ji|yes|y|ho|hoy|aam|avunu|houd|athe|haudu|houdu|হ্যাঁ|হ্যা|हाँ|हां|जी|हो|हoy)$/i.test(s)) return true;
  return /\b(yes|haan|haanji|ji haan|theek hai|thik hai|sahi hai|bilkul|correct|right|hoy ta|hoyeche|avunu|avun|aam|am|houd|houdu|haudu|athe|sach hai|barobar|bilkul sahi)\b/i.test(s)
    || /হ্যাঁ|হ্যা\b|हाँ|हां|जी\s*हाँ|हाँ\s*जी|ठीक\s*है|बिल्कुल|ஆம்|అవును|ಹೌದು|അതെ|ਹਾਂ|હા|ହଁ|ہاں/i.test(raw);
}

export function isNo(text: string): boolean {
  if (matchesAnyToken(text, i18nTokens("no"))) return true;
  const raw = text.trim();
  const s = raw.toLowerCase();
  if (/^(n|no|na|nahi|nahin|nai|naa|galat|wrong|illa|ledu|naahi|illai|kadu|kadhu|alla|nahi|naheen|nai ho)$/i.test(s)) return true;
  return /\b(no|nahi|nahin|not|galat|wrong|na re|dey na|dicche na|ledu|illai|illa|kadu|kadhu|alla|naheen)\b/i.test(s)
    || /না\b|नहीं|नही|नहीं\s*दे|দুধ\s*দিচ্ছে\s*না|இல்லை|కాదు|ಇಲ್ಲ|ഇല്ല|ਨਹੀਂ|ના|ନା|نہیں/i.test(raw);
}

export function isSkip(text: string): boolean {
  if (matchesAnyToken(text, i18nTokens("skip"))) return true;
  const t = normalizeVoiceAnswer(text).toLowerCase();
  return /\b(skip|chhod|chod|chhodo|chharo|chhere|bad|baad|pata nahi|patani|malum nahi|dont know|don't know|unknown|na jane|nahi pata|jani na|janina|teliyadu|ariyilla|gottilla|theriyadu|khabar nahi|vagla|chhodo|dati padi|oliyvak|chhad|chhad do)\b/i.test(t)
    || /জানি না|छोड|छोड़|தெரியாது|తెలియదు|माहीत नाही|ખબર નથી|ಗೊತ್ತಿಲ್ಲ|അറിയില്ല|ਪਤਾ ਨਹੀਂ|ଜଣା ନାହିଁ|নাজানো|معلوم نہیں/i.test(t);
}

export function isDontKnow(text: string): boolean {
  if (matchesAnyToken(text, i18nTokens("dontKnow"))) return true;
  return isSkip(text);
}

/** Plain yes/no when the step expects a boolean answer. */
export function parseYesNoFromVoice(text: string): boolean | null {
  for (const tok of i18nTokens("no")) {
    if (exactI18nMatch(text, tok)) return false;
  }
  if (matchesAnyToken(text, i18nTokens("no"))) return false;
  if (matchesAnyToken(text, i18nTokens("yes"))) return true;
  if (isNo(text) && !isYes(text)) return false;
  if (isYes(text)) return true;
  return null;
}

/** Yes/no for pregnancy question (all languages). */
export function parsePregnantFromVoice(text: string): boolean | null {
  const t = normalizeVoiceAnswer(text);
  if (!t) return null;
  if (/\b(garbh|pregnant|gaabhin|gaabhan|gabhin|gabbhin|gabhan|gestation|expecting|garbhi|hamla|garbhini|garbha|gabbh)\b/i.test(t) && !isNo(t)) return true;
  if (/गर्भ|गाभ|गर्भवती|गाभिन|गाभण|গর্ভ|গাভিন|கர்ப்ப|గర్భ|ಗರ್ಭ|ഗർഭ|ਗਰਭ|ଗର୍ଭ|گابھن|گربھ/i.test(t) && !/नहीं|না|இல்லை|కాదు|ಇಲ್ಲ|ഇല്ല|ਨਹੀਂ|ના|ନା|نہیں/i.test(t)) return true;
  if (/\b(not pregnant|garbh nahi|pregnant nahi|no pregnancy|garbha nahi|gabhin nahi)\b/i.test(t)) return false;
  if (/गर्भ\s*नहीं|गाभ\s*नहीं|গর্ভ\s*নেই|கர்ப்ப\s*இல்லை/i.test(t)) return false;
  const yn = parseYesNoFromVoice(t);
  if (yn !== null) return yn;
  return null;
}

export type NumericContext = "months" | "yield" | "fat" | "snf" | "price" | "pregMonth";

const CONTEXT_PATTERNS: Record<NumericContext, RegExp[]> = {
  months: [
    /(\d+(?:\.\d+)?)\s*(?:mahine|mahina|maheena|month|months|mas|maas|maasam|maasam|nela|nelalu|matham|maasam|tingalu|tingala|masam|মাস|मही|महिना|महिने|నెల|నెలల|மாத|திங்கள்|ತಿಂಗಳ|മാസ|ਮਹੀਨ|ମାସ)/iu,
    /(?:mahine|mahina|month|months|mas|maas|nela|matham|tingalu|masam|मही|মাস|மாத|నెల|മാസ)[^\d]{0,16}(\d+(?:\.\d+)?)/iu,
  ],
  yield: [
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|kg|litre|lee?ter|lee?tar|lee?tr|लीटर|लिटर|লিটার|லிட்டர்|లీటర|ಲೀಟರ|ലിറ്റ|ਲੀਟਰ|ଲିଟର)/iu,
    /(?:doodh|dudh|milk|paal|pal|paalu|hal|hale|palu|paalu|दूध|দুধ|पाल|পাল|பால|పాల|ಹಾಲ|പാല|ਦੁੱਧ|દૂધ|କ୍ଷୀର|گا?کھ|doodh|dudh)[^\d]{0,24}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg|lee?ter)?/iu,
    /(?:roz|daily|din|dinam|roju|rozana|रोज|prati din|or din|or dina|prati dina|din ki|din me)[^\d]{0,20}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg)?/iu,
  ],
  fat: [
    /(\d+(?:\.\d+)?)\s*(?:percent|pct|pratishat|pratishat|fat|fait|faat|phat|फैट|fat%|%.|ശതമാന|சதவீதம்|శాతం|ಟಕ್ಕು)/iu,
    /(?:fat|fait|faat|phat|pratishat|fat%|फैट|faat|kozhuppu|korippu)[^\d]{0,16}(\d+(?:\.\d+)?)/iu,
  ],
  snf: [
    /(\d+(?:\.\d+)?)\s*(?:percent|pct|pratishat|snf|%.|ശതമാന|சதவீதம்|శాతం)/iu,
    /(?:snf|pratishat|snf%)[^\d]{0,12}(\d+(?:\.\d+)?)/iu,
  ],
  price: [
    /(\d+(?:\.\d+)?)\s*(?:rupaye|rupee|rs|₹|taka|টাকা|रु|rupya|rupaye|rupya|bele|vilai|rate|daam|dam|bhav|bhaav|daam|dam|mulya|mulyam|mulya|price)/iu,
    /(?:rate|daam|dam|price|bhav|bhaav|bhaav|mulya|mulyam|bele|vilai|daam|rate|भाव|দাম|rate|rate)[^\d]{0,16}(\d+(?:\.\d+)?)/iu,
  ],
  pregMonth: [
    /(\d+(?:\.\d+)?)\s*(?:month|mahina|mahine|maas|mas|maasam|nela|matham|tingalu|मह|मही|মাস|மாத|నెల|മാസ|ਮਹੀਨ|ମାସ|maas|maasam)/iu,
    /(?:mahina|month|mas|maas|nela|matham|tingalu|महीने|মাস|மாத|నెల|മാസ|garbh|garbha|gabbh)[^\d]{0,16}(\d+(?:\.\d+)?)/iu,
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
  if (matchesAnyToken(text, i18nTokens("notCalved"))) return true;
  const s = text.toLowerCase();
  return /\b(not calved|no calving|zero|0|nahi biyai|abhi nahi|pehli bar|first time|heifer|bachiya|nahi byai|byai nahi|vyali nahi|vyali nahi|prasavam illa|prasavam illai|prasavam cheyyaledu|prasavam aayilla)\b/i.test(s)
    || /अभी\s*नहीं?\s*ब्याई|नहीं?\s*ब्याई|ब्याई\s*नहीं|पहली\s*बार|अजून\s*व्याली|હજી\s*વિયાઈ|ಇನ್ನೂ\s*ಕರು|ഇതുവരെ\s*പ്രസവ|ਅਜੇ\s*ਨਹੀਂ\s*ਸੂਈ/i.test(text);
}

const DRY_MILK_PATTERNS = [
  /\b(dry|sukhi|sookhi|sukha|sookha|no milk|not milk|band|bandh|sukhi|vasuki|vattipoyindi|vattipoyi|bhakad|sukhi gai|sukhi gay)\b/i,
  /doodh\s*nahi|dudh\s*nahi|doodh\s*nahin|milk\s*nahi|dudh\s*dey\s*na|dudh\s*dicche\s*na|paal\s*illa|pal\s*illa|paalu\s*ledu|hal\s*illa|hale\s*illa|paal\s*kudukka/i,
  /nahi\s*de(?:ti|r|ta)?(?!\s*rahi)/i,
  /दूध\s*नहीं?|नहीं?\s*दे(?:ती|र)?|सूख|शुष्क|दूध\s*बंद|भाकड/i,
  /দুধ\s*দিচ্ছ(?:ে\s*)?না|দুধ\s*দেয়\s*না|দুধ\s*না/i,
  /doodh\s*bandh?|dudh\s*bandh?|paal\s*band|pal\s*band/i,
  /பால்\s*க(?:ொடுக்க|ொட)?(?:வில்லை|க்கவில்லை)/,
  /పాల(?:ు)?\s*(?:ఇవ్వ|ఇచ్చ)?(?:డ|ట)?\s*ల(?:ే|ేద)/,
  /ಹಾಲ(?:ು)?\s*(?:ಕ(?:ೊಡ)?(?:ು)?(?:ತ್ತ)?(?:ಿಲ್ಲ|ಿಲ್ಲ))/,
  /പാല(?:്)?\s*(?:തര(?:ു)?(?:ന്ന)?(?:ില്ല|ില്ല))/,
];

const IN_MILK_PATTERNS = [
  /doodh\s*de(?:ti|r|ta)?(?:\s*rahi|\s*rhi|\s*rahe|\s*rah)?(?:\s*hai|\s*he|a)?/i,
  /dudh\s*de(?:ti|r|ta)?(?:\s*rahi|\s*rhi|\s*rahe)?(?:\s*hai|\s*he)?/i,
  /dudh\s*dey|dudh\s*dicch(?:e|i)|dudh\s*de\s*rahi/i,
  /milk\s*de(?:ti|r|ta)?(?:\s*rahi|\s*rhi)?(?:\s*hai)?/i,
  /दूध\s*दे(?:ती|ता|र)?(?:\s*रही|\s*रह)?(?:\s*है)?/,
  /दूध\s*दे\s*रही/,
  /दूध\s*देती/,
  /(?:aaj|aj|ippodhu|ippudu|ippol|aajkal|hal|haal|hala)\s*(?:kal|podhu|udu|ol)?[^\d]{0,12}(?:doodh|dudh|milk|paal|pal|paalu|hal|hale|दूध|দুধ|பால|పాల|ಹಾಲ|പാല|ਦੁੱਧ)/i,
  /(?:doodh|dudh|milk|paal|pal|paalu|hal|hale|दूध|দুধ|பால|పాల|ಹಾಲ|പാല)[^\d]{0,12}(?:de(?:ti|r|ta|y)?|det|dete|det aahe|koduk|koduth|koduthu|ist|istundi|isthundi|isthond|tar|thar|kodut|kodutte|dichch|dichhe|dichhi)/i,
  /pal(?:u)?\s*(?:koduk|koduth|koduthu|kodukir|kodukira|thar|tar)/i,
  /paalu\s*(?:ist|istundi|isthundi)/i,
  /ಹಾಲ(?:ು)?\s*(?:kodu|kodut|kodutte)/i,
  /പാല(?:്)?\s*(?:tar|thar|koduk)/i,
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
  if (isYes(t) && !isNo(t) && !/\b(dry|sukhi|sookhi|sukha|band|nahi|nahin|illa|illai|ledu|alla|না|नही)\b/i.test(t)) {
    // Plain yes to a yes/no milking question (all languages)
    if (/^(haan|ha|ji|yes|y|ho|hoy|haanji|bilkul|theek|thik|aam|am|avunu|avun|houd|houdu|haudu|athe|হ্যাঁ|হ্যা|हाँ|हां|जी|हो|hain|han)\b/i.test(t)) return true;
  }

  const yn = parseYesNoFromVoice(t);
  if (yn === true) return true;
  if (yn === false) return false;

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
    if (lower.includes(name.toLowerCase()) || text.includes(name)) return code;
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

/** Parse calving count from spoken answer (all languages). */
export function parseCalvingsFromVoice(text: string): number | null {
  const t = normalizeVoiceAnswer(text);
  if (!t) return null;
  if (isNotCalved(t)) return 0;
  if (/pehli|first|1st|pahli|पहली|pratham|প্রথম|muthal|mudhal|modhama|prathama|pehli|pahili|\bone\b|onnu|ondu|okati|ek baar/i.test(t)) return 1;
  if (/doosri|second|2nd|dusri|दूसरी|দ্বিতীয়|rendu|eradu|rendu|\btwo\b/i.test(t)) return 2;
  if (/teesri|third|3rd|तीसरी|তৃতীয়|moonu|mooru|moodu|\bthree\b/i.test(t)) return 3;
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
  const s = normalizeVoiceAnswer(text).toLowerCase();
  return /\b(done|enough|bas|bus|khatam|ho gaya|hogaya|hogy|that'?s all|no more|kuch nahi|koi nahi|nahi aur|nothing else|finish|complete|over|ant|samapt|mudinj|mudiyum|mudi|aipoyindi|sampurn|puro|purn|sufficient|sakal|sakal|theer|theerpu|nahi|ledu|illa|illai|alla|bas ho gaya|bas hogaya)\b/i.test(s);
}

/** Use library default price when farmer doesn't know. */
export function isDefaultPrice(text: string): boolean {
  return isDontKnow(text) || /\b(default|market|standard|sadharan|saadharan)\b/i.test(normalizeVoiceAnswer(text).toLowerCase());
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
  const lower = normalizeVoiceAnswer(text).toLowerCase().trim();
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
