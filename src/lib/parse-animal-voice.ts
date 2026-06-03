import { BREED_WEIGHTS } from "@/lib/ration-calculator";
import type { AnimalFormData, AnimalStatus } from "@/lib/ration-advisory-session";

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

const BREED_PATTERNS: [RegExp, string][] = [
  [/murrah|मुर्रा|મુર્રા/i, "murrah_buffalo"],
  [/jaffarabadi|jaff/i, "jaffarabadi"],
  [/surti|સુરતી/i, "surti_buffalo"],
  [/gir|गिर|ગીર/i, "gir_cow"],
  [/sahiwal|साहीवाल/i, "gir_cow"],
  [/tharparkar/i, "tharparkar"],
  [/holstein|hf\b|friesian|crossbred|cross|क्रॉस/i, "hf_jersey_cross"],
  [/jersey/i, "hf_jersey_cross"],
  [/buffalo|भैंस|bhains|bhens|ભેંસ/i, "murrah_buffalo"],
  [/desi|indigenous|local|स्थानीय|દેસી/i, "gir_cow"],
  [/gaay|gai|cow|गाय/i, "gir_cow"],
];

/** Milk-giving signals checked first — before dry/heifer. */
const IN_MILK_PATTERNS = [
  /doodh\s*deti|dudh\s*deti|doodh\s*de\s*rahi|doodh\s*de\s*ti|dudh\s*de\s*rahi|dudh\s*de\s*ti|milk\s*deti|milk\s*de\s*rahi/i,
  /दूध\s*देती|दूध\s*दे\s*रही|दूध\s*देती\s*है|दूध\s*दे\s*रही\s*है/i,
  /doodh\s*de(?:ti|r)?(?:\s*hai|\s*rahi)?|dudh\s*de(?:ti|r)?(?:\s*hai|\s*rahi)?/i,
  /in milk|milking|doodh de|dudh de|milk giving|दूध दे|giving milk|lactating|દૂધ આપ/i,
  /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|लीटर|लिटर)\s*(?:doodh|dudh|milk|दूध)/i,
  /(?:doodh|dudh|milk|दूध)[^\d]{0,30}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg)?/i,
];

const STATUS_PATTERNS: [RegExp, AnimalStatus][] = [
  [/dry|sukhi|sukha|sookhi|without milk|no milk|doodh nahi|dudh nahi|दूध नही|सूख|शुष्क|સૂક/u, "dry"],
  [/pregnant|gaabhan|gaabhin|garbh|gestation|गर्भ|गर्भवती|गाभिन|ગાભ|expecting|garbhi|hamla|गाभिन/i, "pregnant"],
  [/heifer|bachiya|bachhi|बछिया|young cow|વાછરડ|not calved yet|bachhu hai|bachha hai(?!.*gaabhin)/i, "heifer"],
  [/calf|bachha(?!.*(?:hua|ho|hoya|hela|thayu|zala|bar|baar|vaar))|bachhi(?!.*gaabhin)/i, "heifer"],
];

function normalizeVoiceText(text: string): string {
  let t = String(text || "");
  t = t.replace(/[०-९]/g, (ch) => String(DEVANAGARI_DIGITS.indexOf(ch)));
  t = t.replace(/\bpahu\b/gi, "pashu");
  return t.replace(/\s+/g, " ").trim();
}

function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1]);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

function detectBreedKey(text: string): string | null {
  for (const [re, key] of BREED_PATTERNS) {
    if (re.test(text)) return key;
  }
  return null;
}

function isInMilk(text: string): boolean {
  return IN_MILK_PATTERNS.some((re) => re.test(text));
}

function detectStatus(text: string): AnimalStatus | null {
  if (isInMilk(text)) return "in_milk";
  for (const [re, status] of STATUS_PATTERNS) {
    if (re.test(text)) return status;
  }
  return null;
}

function parseGaabhinOrCalvingCount(text: string): number | null {
  if (/pehli|first|1st|pahli|पहली|pratham|પહેલ/i.test(text)) return 1;
  if (/doosri|second|2nd|dusri|दूसरी|બીજ/i.test(text)) return 2;
  if (/teesri|third|3rd|तीसरी/i.test(text)) return 3;

  const n = extractNumber(text, [
    /(\d+)\s*(?:baar|bar|vaar|sari|saari|times|thara|thavana|sala|saarla|bar)\s*(?:gaabhin|gaabhan|garbh|garbha|garbham|bachha|bacha|calv|byaat|vyaat|vaat|hua|ho|hela|thayu|zala|huvudu|dhenu)/i,
    /(?:gaabhin|gaabhan|garbh|garbha|garbham|bachha|byaat)[^\d]{0,20}(\d+)/i,
    /(?:kitni|kitne|kiti|kinni|keti|ethra|eshtu|kiman|kete)\s*(?:baar|bar|vaar|thara|thavana|sala|vaar)[^\d]{0,24}(\d+)/i,
    /(\d+)\s*(?:baar|bar|vaar|thara)\s*(?:gaabhin|gaabhan|garbh|garbha|bachha|byaat|calv)/i,
    /(?:baar|bar|vaar)\s*(\d+)/i,
    /lactation\s*(?:no\.?|number)?\s*[:\s]?\s*(\d+)/i,
  ]);
  return n !== null && n >= 0 && n <= 12 ? Math.round(n) : null;
}

function parseAgeYears(text: string): number | null {
  const n = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*(?:saal|sal|saal|varsh|years?|yr|वर्ष|साल|বছর|वर्ष)(?:\s*(?:ki|kī|ka|ke|em|ahe|hai|hain|old|udai|udhe|da|di|de|ki hai|ki hain|ka hai))?/iu,
    /(\d+(?:\.\d+)?)\s*(?:ki|की)\s*(?:saal|sal|साल|varsh)/iu,
    /(?:umar|umr|age|vayassu|vay|boyos|baya|boi|वय|उम्र|umar hai|umr hai)[^\d]{0,12}(\d+(?:\.\d+)?)/iu,
    /(\d+(?:\.\d+)?)\s*(?:saal|sal|varsh)\s*(?:ki|ka|ke|em|ahe|hai|hain)/iu,
    /age[:\s]+(\d+(?:\.\d+)?)/i,
  ]);
  return n !== null && n > 0 && n < 25 ? n : null;
}

function parseMilkLitres(text: string): number {
  const morningEvening = text.match(
    /subah[^.\d]{0,40}(\d+(?:\.\d+)?)[^\d]{0,30}(?:shaam|sandhya|saam|sanje)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
  );
  if (morningEvening) {
    return parseFloat(morningEvening[1]) + parseFloat(morningEvening[2]);
  }

  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|लीटर|लिटर|litre)\s*(?:doodh|dudh|milk|दूध|paalu|paal|dudha|gakh)/iu,
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg)\s*(?:doodh|dudh|milk|paalu)/i,
    /(?:doodh|dudh|milk|paalu|paal|दूध|dudha)[^\d]{0,24}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg|लीटर|लिटर)?/iu,
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|लीटर|लिटर)[^\d]{0,48}(?:deti|de rahi|de ti|deti hai|de ti hai|din mein|din me|roz|daily|prati din|per day)/iu,
    /(?:deti|de rahi|de ti|deti hai|roz|din mein|daily)[^\d]{0,40}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg|लीटर|लिटर)/iu,
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|लीटर|लिटर)\s*(?:\/|per|roz|daily|din|रोज|prati din)?/iu,
    /(?:roz|रोज|प्रतिदिन|din mein|din me|daily|prati din)\s*(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|kg|लीटर|लिटर)/iu,
    /(\d+(?:\.\d+)?)\s*(?:kg|l)\s*(?:milk|doodh|dudh)/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const val = parseFloat(m[1]);
      if (val > 0 && val <= 60) return val;
    }
  }
  return 0;
}

function parseDimStage(text: string): string {
  const months = extractNumber(text, [
    /(\d+)\s*(?:month|months|mahine|mahina|महीने|mo|મહિન)/i,
    /bachha\s*(\d+)\s*(?:month|mahine)/i,
  ]);
  if (months === null) return "mid";
  const dim = Math.min(Math.round(months * 30), 400);
  if (dim <= 60) return "early";
  if (dim <= 210) return "mid";
  return "late";
}

/** Force milk = 0 for dry and young/calf; keep for in_milk and optionally pregnant. */
export function applyStatusMilkDefaults(status: AnimalStatus | "", milkLitres: string): string {
  if (status === "dry" || status === "heifer") return "0";
  return milkLitres;
}

export function parseAnimalFromVoice(transcript: string): Partial<AnimalFormData> {
  const text = normalizeVoiceText(transcript);
  if (!text) return {};

  const breedKey = detectBreedKey(text);
  const milkFromText = parseMilkLitres(text);
  const lactationNumber = parseGaabhinOrCalvingCount(text);
  const ageYears = parseAgeYears(text);
  const dimStage = parseDimStage(text);

  let resolvedStatus: AnimalStatus = detectStatus(text) ?? "unknown";
  if (resolvedStatus === "unknown" && (milkFromText > 0 || isInMilk(text))) {
    resolvedStatus = "in_milk";
  }

  let milk = milkFromText;
  if (resolvedStatus === "dry" || resolvedStatus === "heifer") {
    milk = 0;
  }

  const patch: Partial<AnimalFormData> = {
    voiceTranscript: text,
    dimStage,
  };

  if (breedKey) {
    patch.breedKey = breedKey;
    patch.breed = BREED_WEIGHTS[breedKey]?.name || "";
  } else {
    const raw = text.match(/\b(murrah|gir|sahiwal|jersey|holstein|desi|cross|bhains|buffalo|gaay|gai)\b/i)?.[0];
    if (raw) patch.breed = raw;
  }

  if (resolvedStatus !== "unknown") patch.status = resolvedStatus;
  if (lactationNumber !== null) patch.lactationNumber = String(lactationNumber);
  if (ageYears !== null) patch.ageYears = String(Math.round(ageYears * 10) / 10);

  if (resolvedStatus === "in_milk") {
    if (milk > 0) patch.milkLitres = String(milk);
  } else if (resolvedStatus === "dry" || resolvedStatus === "heifer") {
    patch.milkLitres = "0";
  } else if (milk > 0) {
    patch.milkLitres = String(milk);
    patch.status = "in_milk";
  }

  return patch;
}

export function parseHerdCount(text: string): number | null {
  const normalized = normalizeVoiceText(text);
  const patterns = [
    /(?:mere paas|mer[eey] paas|hamare paas|i have|we have|total)\s*(\d{1,2})\s*(?:pashu|pahu|cow|cows|buffalo|animal|gaay|bhains|पशु|गाय|भैंs)/i,
    /(\d{1,2})\s*(?:pashu|pahu|cow|cows|buffalo|animal|gaay|bhains|milch)/i,
    /^(\d{1,2})$/,
  ];
  for (const re of patterns) {
    const m = normalized.match(re);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 50) return n;
    }
  }
  return null;
}
