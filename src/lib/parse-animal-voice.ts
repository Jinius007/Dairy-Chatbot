import { BREED_WEIGHTS } from "@/lib/ration-calculator";
import type { AnimalFormData, AnimalStatus } from "@/lib/ration-advisory-session";

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

const STATUS_PATTERNS: [RegExp, AnimalStatus][] = [
  [/dry|sukhi|sukha|sookhi|without milk|no milk|doodh nahi|dudh nahi|दूध नही|सूख|शुष्क|સૂક/u, "dry"],
  [/pregnant|gaabhan|garbh|gestation|गर्भ|गर्भवती|गाभिन|ગાભ|expecting|garbhi/u, "pregnant"],
  [/heifer|bachiya|young|not calved|pehli bar|बछिया|young cow|વાછરડ|calf|bachha/i, "heifer"],
  [/in milk|milking|doodh de|dudh de|milk giving|दूध दे|दूध देती|दूधार|giving milk|lactating|દૂધ આપ/u, "in_milk"],
];

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

function detectStatus(text: string): AnimalStatus | null {
  for (const [re, status] of STATUS_PATTERNS) {
    if (re.test(text)) return status;
  }
  return null;
}

function parseLactationNumber(text: string): number | null {
  if (/pehli|first|1st|pahli|पहली|pratham|પહેલ/i.test(text)) return 1;
  if (/doosri|second|2nd|dusri|दूसरी|બીજ/i.test(text)) return 2;
  if (/teesri|third|3rd|3\+|teen|तीसरी|zyada|more than 2/i.test(text)) return 3;
  const baar = extractNumber(text, [
    /(\d+)\s*(?:baar|bar|vaar|sari|saari|times)\s*(?:bachha|bacha|gaabhin|garbh|calv|byaat|vyaat|vaat)/i,
    /(?:kitni|kiti|kinni|keti|ethra|eshtu)\s*(?:baar|bar|vaar)[^\d]{0,24}(\d+)/i,
    /(?:baar|bar|vaar)\s*(\d+)/i,
  ]);
  if (baar !== null && baar >= 1 && baar <= 12) return Math.round(baar);
  return null;
}

function parseAgeYears(text: string): number | null {
  const n = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*(?:year|years|saal|varsh|वर्ष|yr|વર્ષ)/i,
    /age[:\s]+(\d+(?:\.\d+)?)/i,
    /(\d+)\s*saal/i,
    /umar\s*(\d+)/i,
  ]);
  return n !== null && n > 0 && n < 25 ? n : null;
}

function parseMilkLitres(text: string): number {
  const morningEvening = text.match(/subah[^.\d]{0,40}(\d+(?:\.\d+)?)[^\d]{0,30}(?:shaam|sandhya|saam)[^\d]{0,20}(\d+(?:\.\d+)?)/i);
  if (morningEvening) {
    return parseFloat(morningEvening[1]) + parseFloat(morningEvening[2]);
  }
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b)\s*(?:milk|doodh|dudh|दूध)/i,
    /(\d+(?:\.\d+)?)\s*(?:kg|l)\s*(?:milk|doodh|dudh)/i,
    /(?:milk|doodh|dudh|दूध)[^\d]{0,12}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|kg)/i,
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|लीटर|लिटर)\s*(?:\/|per|roz|daily|din|रोज)?/iu,
    /(?:roz|रोज|प्रतिदिन)\s*(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|kg|लीटर|लिटर)/iu,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1]);
      if (n > 0 && n <= 60) return n;
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

export function parseAnimalFromVoice(transcript: string): Partial<AnimalFormData> {
  const text = transcript.trim();
  if (!text) return {};

  const breedKey = detectBreedKey(text);
  const breedName = breedKey ? BREED_WEIGHTS[breedKey]?.name ?? text.match(/\b(murrah|gir|sahiwal|jersey|holstein|desi|bhains|buffalo)\b/i)?.[0] ?? "" : "";
  const status = detectStatus(text);
  let milk = parseMilkLitres(text);
  const lactationNumber = parseLactationNumber(text);
  const ageYears = parseAgeYears(text);
  const dimStage = parseDimStage(text);

  let resolvedStatus: AnimalStatus = status ?? "unknown";
  if (resolvedStatus === "unknown" && milk > 0) resolvedStatus = "in_milk";
  if (resolvedStatus === "dry" || resolvedStatus === "heifer" || resolvedStatus === "pregnant") {
    milk = 0;
  }

  const patch: Partial<AnimalFormData> = {
    voiceTranscript: text,
    dimStage,
  };

  if (breedKey) {
    patch.breedKey = breedKey;
    patch.breed = breedName || BREED_WEIGHTS[breedKey]?.name || "";
  } else {
    const raw = text.match(/\b(murrah|gir|sahiwal|jersey|holstein|desi|cross|bhains|buffalo|gaay|gai)\b/i)?.[0];
    if (raw) patch.breed = raw;
  }

  if (resolvedStatus !== "unknown") patch.status = resolvedStatus;
  if (lactationNumber !== null) patch.lactationNumber = String(lactationNumber);
  if (ageYears !== null) patch.ageYears = String(ageYears);
  if (milk > 0) patch.milkLitres = String(milk);
  else if (resolvedStatus !== "in_milk") patch.milkLitres = "0";

  return patch;
}

export function parseHerdCount(text: string): number | null {
  const normalized = text.replace(/[०-९]/g, (ch) => String("०१२३४५६७८९".indexOf(ch)));
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
