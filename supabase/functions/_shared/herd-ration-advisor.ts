// Multi-animal herd ration workflow — gather profiles from chat/call/voice, then compute per-animal + herd totals.
import {
  BREED_WEIGHTS,
  REGION_PRICES,
  buildRation,
  calcRequirements,
  pickSeasonFeeds,
  type Region,
} from "./ration-calculator.ts";

export interface AnimalProfile {
  index: number;
  breedKey: string;
  breedName: string;
  bodyWeight: number;
  status: "in_milk" | "dry" | "pregnant" | "heifer" | "unknown";
  milkKg: number;
  fatPct: number;
  lactationStage: string;
  lactationNumber: number | null;
  ageYears: number | null;
  pregnant: boolean;
  pregnancyMonth: number | null;
  currentFeed: { greenKg: number; dryKg: number; concentrateKg: number; note: string };
}

export interface ParsedAnimalSlot {
  profile: Partial<AnimalProfile>;
  missing: string[];
  complete: boolean;
}

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

const COUNT_WORDS: [RegExp, string][] = [
  [/(?:^|\s)(?:एक|ek|one)(?:\s|$)/giu, " 1 "],
  [/(?:^|\s)(?:दो|do|two)(?:\s|$)/giu, " 2 "],
  [/(?:^|\s)(?:तीन|teen|three)(?:\s|$)/giu, " 3 "],
  [/(?:^|\s)(?:चार|char|chaar|four)(?:\s|$)/giu, " 4 "],
  [/(?:^|\s)(?:पांच|पाँच|panch|paanch|five)(?:\s|$)/giu, " 5 "],
  [/(?:^|\s)(?:छह|छः|chhe|che|six)(?:\s|$)/giu, " 6 "],
  [/(?:^|\s)(?:सात|saat|seven)(?:\s|$)/giu, " 7 "],
  [/(?:^|\s)(?:आठ|aath|eight)(?:\s|$)/giu, " 8 "],
  [/(?:^|\s)(?:नौ|nau|nine)(?:\s|$)/giu, " 9 "],
  [/(?:^|\s)(?:दस|das|ten)(?:\s|$)/giu, " 10 "],
];

const HERD_COUNT_RE = [
  /(?:i have|we have|mere paas|meri|mere|mari|mara|hamare paas|total|)\s*(\d{1,2})\s*(?:cow|cows|buffalo|buffaloes|buffalos|animal|animals|milch|milking|gaay|gai|gay|gaye|bhains|bhens|pashu|pashuon|vaca|पशु|गाय|गायें|भैंस|ગાય|ભેંસ)/i,
  /(\d{1,2})\s*(?:cow|cows|buffalo|buffaloes|animal|animals|milch|gaay|gai|bhains|pashu|गाय|भैंस|પશુ|ગાય|ભેંસ)/i,
  /(?:i have|we have|mere paas|mar[eey] paas|hamare paas)\s*(\d{1,2})\b/i,
  /(\d{1,2})\s*(?:pashu|pashuvon|animals|cattle|milch|dairy\s*animals)/i,
  /herd\s*(?:of\s*)?(\d{1,2})/i,
  /(\d{1,2})\s*(?:milch|dairy)\s*(?:animal|cattle|cow)/i,
  /(?:मेर[eey]?|हमार[eey]?)\s*(?:पास|पासे)?\s*(\d{1,2})\s*(?:गाय|गायें|गौ|भैंस|पशु|मवेशी)/u,
  /(\d{1,2})\s*(?:गाय|गायें|भैंस|पशु|मवेशी)/u,
];

const HERD_RATION_QUERY = /ration|rasan|rashan|aahar|feed|fodder|chara|chare|poshan|खुराक|चारा|संतुलित|राशन|रेशन|आहार|diet|balanced|least.?cost|lcf|tdn|mittha|dan|daana|concentrate|bhusa|ghaas/i;

const HERD_KEYWORDS = /herd|sabhi|saari|saare|each|har ek|per animal|poori mandli|badha|badhi|sab same|ek jaise|सभी|हर|प्रत्येक|herd ration|mandli|pashuon|બધ/i;

const HOMOGENEOUS_HERD = /sab same|all same|same breed|ek jaise|ek jaisi|badha same|badhi same|saru same|same type|બધા સમાન|એક જ/pr/i;

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
];

const STATUS_PATTERNS: [RegExp, AnimalProfile["status"]][] = [
  [/dry|sukhi|sukha|sookhi|without milk|no milk|doodh nahi|dudh nahi|दूध नही|सूख|शुष्क|સૂક/u, "dry"],
  [/pregnant|gaabhan|garbh|gestation|गर्भ|गर्भवती|गाभिन|ગાભ|expecting|garbhi/u, "pregnant"],
  [/heifer|bachiya|young|not calved|pehli bar|बछिया|young cow|વાછરડ/i, "heifer"],
  [/in milk|milking|doodh de|dudh de|milk giving|दूध दे|दूध देती|दूधार|giving milk|lactating|દૂધ આપ/u, "in_milk"],
];

const REGION_KEYWORDS: [RegExp, Region][] = [
  [/punjab|haryana|up\b|uttar pradesh|north india|delhi|rajasthan.*north/i, "north"],
  [/gujarat|rajasthan|madhya pradesh|mp\b|west india|गुजरात|ગુજરાત/i, "west"],
  [/karnataka|andhra|telangana|tamil|kerala|south india|दक्षिण/i, "south"],
  [/bengal|bihar|odisha|orissa|assam|east india|wb\b/i, "east"],
  [/maharashtra|deccan|central india|महाराष्ट्र/i, "central"],
];

function conversationText(messages: { role: string; content: string }[]): string {
  return messages.map((m) => m.content).join("\n");
}

function userText(messages: { role: string; content: string }[]): string {
  return messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
}

function normalizeHerdText(text: string): string {
  let t = String(text || "");
  t = t.replace(/[०-९]/g, (ch) => String(DEVANAGARI_DIGITS.indexOf(ch)));
  for (const [re, digit] of COUNT_WORDS) {
    t = t.replace(re, digit);
  }
  return t.replace(/\s+/g, " ").trim();
}

export function detectHerdCount(text: string): number | null {
  const normalized = normalizeHerdText(text);
  let best = 0;
  for (const re of HERD_COUNT_RE) {
    for (const m of normalized.matchAll(new RegExp(re.source, re.flags + "g"))) {
      const n = parseInt(m[1], 10);
      if (n >= 2 && n <= 50) best = Math.max(best, n);
    }
  }
  return best >= 2 ? best : null;
}

/** 1–50 animals — used only in the dedicated Ration Advisory panel. */
export function detectAnimalCount(text: string): number | null {
  const herd = detectHerdCount(text);
  if (herd !== null) return herd;
  const normalized = normalizeHerdText(text);
  const singlePatterns = [
    /(?:^|\s)(?:1|ek|one)\s*(?:cow|buffalo|gaay|gai|bhains|bhens|milch|pashu|animal|गाय|भैंस|पशु|ગાય|ભેંસ)/iu,
    /(?:mer[eey]?|i have|we have|hamare paas|मेर[eey]?)\s*(?:ek|one|1)\s*(?:cow|buffalo|gaay|gai|bhains|pashu|गाय|भैंस|पशu)/iu,
    /(?:^|\s)(?:1|१)\s*(?:गाय|भैंस|पशu|milch)/u,
  ];
  for (const re of singlePatterns) {
    if (re.test(normalized)) return 1;
  }
  return null;
}

export function detectRegion(text: string): Region {
  for (const [re, region] of REGION_KEYWORDS) {
    if (re.test(text)) return region;
  }
  return "north";
}

function detectSeason(): "kharif" | "rabi" | "summer" {
  const m = new Date().getMonth();
  if (m >= 6 && m <= 9) return "kharif";
  if (m >= 10 || m <= 2) return "rabi";
  return "summer";
}

function detectBreed(text: string): string | null {
  for (const [re, key] of BREED_PATTERNS) {
    if (re.test(text)) return key;
  }
  return null;
}

function detectStatus(text: string): AnimalProfile["status"] | null {
  for (const [re, status] of STATUS_PATTERNS) {
    if (re.test(text)) return status;
  }
  return null;
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

function defaultFat(breedKey: string): number {
  if (breedKey.includes("buffalo")) return 7.0;
  if (breedKey === "gir_cow" || breedKey === "tharparkar") return 4.5;
  return 4.0;
}

function lactationStageFromDim(dim: number | null): string {
  if (dim === null) return "mid";
  if (dim <= 60) return "early";
  if (dim <= 210) return "mid";
  return "late";
}

function parseLactationNumber(text: string): number | null {
  if (/pehli|first|1st|pahli|पहली|pratham|પહેલ/i.test(text)) return 1;
  if (/doosri|second|2nd|dusri|दूसरी|બીજ/i.test(text)) return 2;
  if (/teesri|third|3rd|3\+|teen|तीसरी|zyada|more than 2|ત્રીજ/i.test(text)) return 3;
  const baar = extractNumber(text, [
    /(\d+)\s*(?:baar|bar|vaar|sari|saari|times)\s*(?:bachha|bacha|gaabhin|garbh|calv|byaat|vyaat|vaat)/i,
    /(?:kitni|kiti|kinni|keti|ethra|eshtu)\s*(?:baar|bar|vaar)[^\d]{0,24}(\d+)/i,
    /(?:baar|bar|vaar)\s*(\d+)/i,
  ]);
  if (baar !== null && baar >= 1 && baar <= 12) return Math.round(baar);
  const n = extractNumber(text, [
    /lactation\s*(?:no\.?|number)?\s*[:\s]?\s*(\d+)/i,
    /(\d+)\s*(?:th|rd|nd|st)\s*lactation/i,
    /(\d+)\s*(?:vi|mi|th)\s*(?:vyaat|byaat|vaat|calving)/i,
  ]);
  return n !== null && n >= 1 && n <= 12 ? Math.round(n) : null;
}

function parseAgeYears(text: string): number | null {
  const n = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*(?:year|years|saal|varsh|वर्ष|yr|વર્ષ)/i,
    /age[:\s]+(\d+(?:\.\d+)?)/i,
    /(\d+)\s*saal/i,
  ]);
  return n !== null && n > 0 && n < 25 ? n : null;
}

function parseDim(text: string): number | null {
  const months = extractNumber(text, [
    /(\d+)\s*(?:month|months|mahine|mahina|महीने|mo|મહિન)/i,
    /calv(?:ed|ing)?\s*(?:\d+\s*)?(?:month|months|mahine|ago|pehle)/i,
    /bachha\s*(\d+)\s*(?:month|mahine)/i,
  ]);
  if (months !== null) return Math.min(Math.round(months * 30), 400);
  return null;
}

function parsePregnancyMonth(text: string): number | null {
  const n = extractNumber(text, [
    /(\d+)\s*(?:month|months|mahine|mahina)\s*(?:pregnan|garbh|gaabhan)/i,
    /pregnan(?:t|cy)[:\s]+(\d+)/i,
    /garbh.*?(\d+)\s*(?:month|mahine)/i,
  ]);
  return n !== null && n >= 1 && n <= 9 ? Math.round(n) : null;
}

function parseCurrentFeed(text: string): AnimalProfile["currentFeed"] {
  const greenKg = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*kg\s*(?:green|hari|berseem|napier|fodder|chara|ghaas|grass|lili|ઘાસ)/i,
    /(?:green|hari|berseem|napier|chara|ghaas|lili)[^\d]{0,24}(\d+(?:\.\d+)?)\s*kg/i,
  ]) ?? 0;
  const dryKg = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*kg\s*(?:dry|straw|bhusa|sukha|parali|stover|bhosa)/i,
    /(?:straw|bhusa|sukha|dry|bhosa|parali)[^\d]{0,24}(\d+(?:\.\d+)?)\s*kg/i,
  ]) ?? 0;
  const concentrateKg = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*kg\s*(?:concentrate|compound|feed|dana|daana|khali|cake|pellet|mittha|dan)/i,
    /(?:concentrate|compound feed|dana|daana|khali|cake|dan)[^\d]{0,24}(\d+(?:\.\d+)?)\s*kg/i,
  ]) ?? 0;
  const hasFeedWords = /chara|chare|feed|fodder|bhusa|straw|dana|daana|khali|berseem|ghaas|ચાર/i.test(text);
  const note = hasFeedWords ? text.slice(0, 160).replace(/\s+/g, " ") : "";
  return { greenKg, dryKg, concentrateKg, note };
}

function parseMilkKg(text: string, herdSize: number | null): number {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b)\s*(?:milk|doodh|dudh|दूध|દૂધ)/i,
    /(\d+(?:\.\d+)?)\s*(?:kg|l)\s*(?:milk|doodh|dudh)/i,
    /(?:milk|doodh|dudh|दूध|દૂધ)[^\d]{0,12}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|kg)/i,
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|लीटर|लिटर)\s*(?:\/|per|roz|daily|din|रोज)?/iu,
    /(?:roz|रोज|प्रतिदिन)\s*(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|kg|लीटर|लिटर)/iu,
    /subah[^.\d]{0,40}(\d+(?:\.\d+)?)[^\d]{0,20}(?:shaam|sandhya)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
  ];
  const morningEvening = text.match(/subah[^.\d]{0,40}(\d+(?:\.\d+)?)[^\d]{0,30}(?:shaam|sandhya|saam)[^\d]{0,20}(\d+(?:\.\d+)?)/i);
  if (morningEvening) {
    return parseFloat(morningEvening[1]) + parseFloat(morningEvening[2]);
  }
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1]);
      if (n > 0 && n <= 60) {
        if (herdSize !== null && n === herdSize && !/(?:litre|liter|ltr|l\b|milk|doodh|dudh)/i.test(m[0])) continue;
        return n;
      }
    }
  }
  return 0;
}

function emptySlot(index: number): ParsedAnimalSlot {
  return {
    profile: { index, status: "unknown" },
    missing: ["breed (kaun si nasl)", "status (doodh / sukhi / garbh)", "kitni baar bachha ya umar", "current feed (ab kya khilati hain)"],
    complete: false,
  };
}

function mergeProfile(base: Partial<AnimalProfile>, incoming: Partial<AnimalProfile>): Partial<AnimalProfile> {
  const out = { ...base, ...incoming, index: base.index ?? incoming.index };
  if (incoming.breedKey && incoming.breedKey !== "hf_jersey_cross") out.breedKey = incoming.breedKey;
  else if (!out.breedKey && incoming.breedKey) out.breedKey = incoming.breedKey;
  if (incoming.status && incoming.status !== "unknown") out.status = incoming.status;
  if (incoming.milkKg && incoming.milkKg > 0) out.milkKg = incoming.milkKg;
  if (incoming.lactationNumber) out.lactationNumber = incoming.lactationNumber;
  if (incoming.ageYears) out.ageYears = incoming.ageYears;
  if (incoming.currentFeed) {
    out.currentFeed = {
      greenKg: Math.max(base.currentFeed?.greenKg ?? 0, incoming.currentFeed.greenKg),
      dryKg: Math.max(base.currentFeed?.dryKg ?? 0, incoming.currentFeed.dryKg),
      concentrateKg: Math.max(base.currentFeed?.concentrateKg ?? 0, incoming.currentFeed.concentrateKg),
      note: incoming.currentFeed.note || base.currentFeed?.note || "",
    };
  }
  return out;
}

function buildProfileFromSegment(segment: string, index: number, herdSize: number | null): ParsedAnimalSlot {
  const breedKey = detectBreed(segment) ?? "hf_jersey_cross";
  const breedName = BREED_WEIGHTS[breedKey]?.name ?? "Dairy animal";
  const statusDetected = detectStatus(segment);
  const milkKg = parseMilkKg(segment, herdSize);
  const fatPct = extractNumber(segment, [/fat[:\s]+(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*%\s*fat/i]) ?? defaultFat(breedKey);
  const dim = parseDim(segment);
  const lactationNumber = parseLactationNumber(segment);
  const ageYears = parseAgeYears(segment);
  const pregnancyMonth = parsePregnancyMonth(segment);
  const pregnant = statusDetected === "pregnant" || pregnancyMonth !== null;
  const currentFeed = parseCurrentFeed(segment);

  let status: AnimalProfile["status"] = statusDetected ?? "unknown";
  if (status === "unknown" && milkKg > 0) status = "in_milk";

  const lactationStage = status === "dry" ? "dry" : lactationStageFromDim(dim);

  const profile: Partial<AnimalProfile> = {
    index,
    breedKey,
    breedName,
    bodyWeight: BREED_WEIGHTS[breedKey]?.bw ?? 450,
    status,
    milkKg: status === "in_milk" ? milkKg : 0,
    fatPct,
    lactationStage,
    lactationNumber,
    ageYears,
    pregnant: pregnant || (pregnancyMonth !== null && pregnancyMonth >= 7),
    pregnancyMonth,
    currentFeed,
  };

  const breedDetected = detectBreed(segment);
  const breedExplicit = breedDetected !== null;
  const statusExplicit = statusDetected !== null || (milkKg > 0 && /milk|doodh|dudh|litre|liter|ltr|l\b|roz|subah|shaam/i.test(segment));
  const hasLactationOrAge = lactationNumber !== null || ageYears !== null;
  const hasFeedData =
    currentFeed.greenKg + currentFeed.dryKg + currentFeed.concentrateKg > 0 ||
    (currentFeed.note.length > 0 && /chara|feed|bhusa|dana|khali|berseem|ghaas|straw/i.test(segment));

  const missing: string[] = [];
  if (!breedExplicit) missing.push("breed (kaun si nasl — Gir, Murrah, crossbred?)");
  if (!statusExplicit) missing.push("status (ab doodh de rahi hai, sukhi hai, ya garbh mein?)");
  if (status === "in_milk" && milkKg <= 0) missing.push("daily milk (roz kitna litre dudh?)");
  if (!hasLactationOrAge) missing.push("kitni baar bachha hua / gaabhin hui, ya kitne saal ki (pehli/doosri byaat)?");
  if (!hasFeedData) missing.push("current feed (ab kya khilati ho — hara chara, sukha, dana kitna kg?)");

  const complete =
    breedExplicit &&
    statusExplicit &&
    (status !== "in_milk" || milkKg > 0) &&
    hasLactationOrAge &&
    hasFeedData;

  return { profile, missing, complete };
}

function evaluateSlot(profile: Partial<AnimalProfile>): ParsedAnimalSlot {
  const segment = [
    profile.breedName,
    profile.status,
    profile.milkKg ? `${profile.milkKg} litre` : "",
    profile.lactationNumber ? `lactation ${profile.lactationNumber}` : "",
    profile.ageYears ? `${profile.ageYears} years` : "",
    profile.currentFeed?.note,
    profile.currentFeed?.greenKg ? `${profile.currentFeed.greenKg} kg green` : "",
    profile.currentFeed?.dryKg ? `${profile.currentFeed.dryKg} kg dry` : "",
    profile.currentFeed?.concentrateKg ? `${profile.currentFeed.concentrateKg} kg concentrate` : "",
  ].filter(Boolean).join(" ");
  return buildProfileFromSegment(segment, profile.index ?? 1, null);
}

function buildSlotsFromConversation(
  messages: { role: string; content: string }[],
  herdSize: number,
): ParsedAnimalSlot[] {
  const slots: ParsedAnimalSlot[] = Array.from({ length: herdSize }, (_, i) => emptySlot(i + 1));
  const userMsgs = messages.filter((m) => m.role === "user").map((m) => m.content);
  const allUser = userMsgs.join("\n");
  const homogeneous = HOMOGENEOUS_HERD.test(allUser);

  let activeIdx = 0;
  for (const msg of userMsgs) {
    const isHerdAnnouncement = detectHerdCount(msg) !== null && msg.length < 120;
    if (isHerdAnnouncement && !detectBreed(msg) && !parseMilkKg(msg, herdSize)) continue;

    const parsed = buildProfileFromSegment(msg, activeIdx + 1, herdSize);
    slots[activeIdx].profile = mergeProfile(slots[activeIdx].profile, parsed.profile);
    const evaluated = evaluateSlot(slots[activeIdx].profile);
    slots[activeIdx] = { ...evaluated, profile: { ...evaluated.profile, index: activeIdx + 1 } };

    if (slots[activeIdx].complete && activeIdx < herdSize - 1) {
      activeIdx += 1;
    }
  }

  if (homogeneous && slots[0].complete) {
    for (let i = 1; i < herdSize; i++) {
      slots[i] = {
        ...evaluateSlot({ ...slots[0].profile, index: i + 1 }),
        profile: { ...slots[0].profile, index: i + 1 },
      };
    }
  }

  return slots;
}

function estimateCurrentFeedCost(profile: AnimalProfile, region: Region, season: ReturnType<typeof detectSeason>): number {
  const feeds = pickSeasonFeeds(season);
  const prices = REGION_PRICES[region];
  const f = profile.currentFeed;
  if (f.greenKg + f.dryKg + f.concentrateKg === 0) return 0;
  const greenPrice = prices[feeds.green] ?? 1.5;
  const dryPrice = prices[feeds.dry] ?? 5;
  const concPrice = prices[feeds.conc] ?? 26;
  return f.greenKg * greenPrice + f.dryKg * dryPrice + f.concentrateKg * concPrice + 0.15 * (prices.mineral_mixture ?? 70);
}

function computeAnimalRation(profile: AnimalProfile, region: Region, season: ReturnType<typeof detectSeason>) {
  const feeds = pickSeasonFeeds(season);
  const prices = REGION_PRICES[region];
  const milk = profile.status === "in_milk" ? profile.milkKg : 0;
  const stage = profile.status === "dry" ? "dry" : profile.lactationStage;
  const req = calcRequirements(profile.bodyWeight, milk, profile.fatPct, stage, profile.pregnant);
  const result = buildRation(req, feeds.green, feeds.dry, feeds.conc, prices);
  const currentCost = estimateCurrentFeedCost(profile, region, season);
  const optimalCost = result.totals.cost;
  const savings = currentCost > 0 ? Math.max(0, currentCost - optimalCost) : optimalCost * 0.15;
  return { profile, req, result, currentCost, optimalCost, savings };
}

function formatAnimalBlock(computed: ReturnType<typeof computeAnimalRation>): string {
  const { profile, req, result, currentCost, optimalCost, savings } = computed;
  const lines = result.ration.map((r) => `    • ${r.name}: ${r.asFeKg} kg/day (₹${r.cost.toFixed(0)}/day)`);
  const statusLabel = profile.status === "in_milk"
    ? `In milk — ${profile.milkKg} kg/day, fat ${profile.fatPct}%`
    : profile.status === "pregnant"
    ? `Pregnant${profile.pregnancyMonth ? ` (${profile.pregnancyMonth} months)` : ""}`
    : profile.status === "heifer"
    ? "Young/heifer"
    : "Dry (not milking)";

  return [
    `  Animal #${profile.index}: ${profile.breedName} | ${statusLabel}`,
    profile.lactationNumber ? `    Byaat (kitni baar bachha): ${profile.lactationNumber}` : "",
    profile.ageYears ? `    Age: ~${profile.ageYears} years` : "",
    profile.status === "in_milk" ? `    4% FCM: ${req.fcm.toFixed(1)} kg` : "",
    `    Balanced daily ration:`,
    ...lines,
    `    Optimal cost: ₹${optimalCost.toFixed(0)}/day`,
    currentCost > 0 ? `    Current feed cost (estimated): ₹${currentCost.toFixed(0)}/day` : "",
    `    Estimated saving: ₹${savings.toFixed(0)}/day${currentCost <= 0 ? " (approx — NDDB avg ~₹16–25/animal/day)" : ""}`,
  ].filter(Boolean).join("\n");
}

function aggregateHerd(computed: ReturnType<typeof computeAnimalRation>[]) {
  const ingredientTotals: Record<string, { name: string; kg: number; cost: number }> = {};
  let totalOptimal = 0;
  let totalCurrent = 0;
  let totalSavings = 0;

  for (const c of computed) {
    totalOptimal += c.optimalCost;
    totalCurrent += c.currentCost;
    totalSavings += c.savings;
    for (const line of c.result.ration) {
      if (!ingredientTotals[line.key]) {
        ingredientTotals[line.key] = { name: line.name, kg: 0, cost: 0 };
      }
      ingredientTotals[line.key].kg += line.asFeKg;
      ingredientTotals[line.key].cost += line.cost;
    }
  }

  return { ingredientTotals, totalOptimal, totalCurrent, totalSavings };
}

function gatherPrompt(herdSize: number, slots: ParsedAnimalSlot[]): string {
  const next = slots.find((s) => !s.complete) ?? slots[0];
  const idx = next.profile.index ?? 1;
  const missingList = next.missing.slice(0, 4).map((m) => `- ${m}`).join("\n");
  const profiled = slots.filter((s) => s.complete).length;

  return [
    "⚠️ HERD RATION — QUESTIONS ONLY (MANDATORY THIS TURN)",
    "The farmer has NOT given enough details yet. You MUST ask follow-up questions.",
    "FORBIDDEN this turn: ration tables, kg amounts, feed plans, cost estimates, generic ration advice from knowledge base.",
    "FORBIDDEN: answering from general knowledge — only ask questions.",
    "",
    `DECLARED HERD SIZE: ${herdSize} animals. Fully profiled: ${profiled}/${herdSize}.`,
    profiled === 0
      ? `Farmer stated ${herdSize} animals but gave NO per-animal details yet. Acknowledge the count, then ask about Animal #1.`
      : `Still need details for ${herdSize - profiled} more animal(s). Now ask about Animal #${idx}.`,
    "",
    `You MUST collect complete details for ALL ${herdSize} animals (breed, status, milk if milking, byaat/age, current feed) before any ration can be calculated.`,
    `Ask about Animal #${idx} — use farmer's language (all 12 Indian languages + English).`,
    "",
    "NEVER use hard words like 'lactation', 'DIM', 'parity'. Use: byaat, bachha hua, gaabhin, doodh deti, sukhi.",
    "",
    "Ask 2–4 short questions for THIS animal:",
    "  • Breed? (Murrah, Gir, desi, cross?)",
    "  • Milking, dry, or pregnant?",
    "  • How long in this state? Daily milk litres if milking?",
    "  • How many times calved / pregnant before? Age?",
    "  • Current feed — green fodder, straw, concentrate (kg)?",
    "",
    `Still missing for Animal #${idx}:`,
    missingList,
    "",
    `After Animal #${idx}, continue until all ${herdSize} animals are profiled.`,
    "If all animals are identical, ask once: 'Are all the same?' then copy details.",
    "End with a line inviting the farmer to reply.",
  ].join("\n");
}

function initialCountPrompt(): string {
  return [
    "⚠️ RATION ADVISORY — QUESTIONS ONLY (MANDATORY THIS TURN)",
    "Farmer opened Ration Advisory. Reply in THEIR language only (from language lock).",
    "First ask: how many dairy animals (gaay/bhains/pashu)?",
    "Then ask 2–3 more about breed, status (doodh/sukhi/garbh), feed — for Animal #1.",
    "FORBIDDEN this turn: ration tables, kg amounts, feed plans, cost estimates, generic ration advice.",
    "Do NOT give balanced ration until ALL animals are fully profiled and farmer confirms summary.",
  ].join("\n");
}

interface DeclaredCountInfo {
  count: number | null;
  uniqueCounts: number[];
  conflict: boolean;
}

function resolveDeclaredCount(messages: { role: string; content: string }[]): DeclaredCountInfo {
  const declared: number[] = [];
  for (const m of messages.filter((x) => x.role === "user")) {
    const c = detectAnimalCount(m.content);
    if (c !== null) declared.push(c);
  }
  const unique = [...new Set(declared)];
  if (unique.length === 0) {
    const all = detectAnimalCount(userText(messages)) ?? detectAnimalCount(conversationText(messages));
    return { count: all, uniqueCounts: all !== null ? [all] : [], conflict: false };
  }
  if (unique.length > 1) {
    return { count: declared[declared.length - 1], uniqueCounts: unique, conflict: true };
  }
  return { count: unique[0], uniqueCounts: unique, conflict: false };
}

function countConflictPrompt(uniqueCounts: number[]): string {
  return [
    "⚠️ HERD COUNT MISMATCH — QUESTIONS ONLY (MANDATORY THIS TURN)",
    `Farmer mentioned different animal counts: ${uniqueCounts.join(", ")}.`,
    "Ask in farmer's language: 'Aapne alag alag sankhya batayi — asal mein kitne pashu hain?'",
    "Clarify the EXACT total before continuing. No ration advice this turn.",
  ].join("\n");
}

function formatSlotSummary(slots: ParsedAnimalSlot[]): string {
  return slots.map((s) => {
    const p = s.profile;
    const st = p.status ?? "unknown";
    const milk = p.milkKg && p.milkKg > 0 ? `${p.milkKg} L/day` : "-";
    return `  Animal #${p.index}: ${p.breedName ?? "?"} | ${st} | milk ${milk} | byaat/age ${p.lactationNumber ?? p.ageYears ?? "?"}`;
  }).join("\n");
}

function verificationPrompt(herdSize: number, slots: ParsedAnimalSlot[]): string {
  return [
    "⚠️ HERD RATION — VERIFY BEFORE COMPUTE (MANDATORY THIS TURN)",
    `All ${herdSize} animals profiled. Read back summary and ask farmer to CONFIRM before giving ration.`,
    "FORBIDDEN this turn: ration kg amounts, feed tables, cost estimates.",
    "",
    "PARSED SUMMARY (read back in farmer's language):",
    formatSlotSummary(slots),
    "",
    `Confirm total count: ${herdSize} animals matches what farmer said.`,
    "Ask: 'Kya yeh sab sahi hai? Haan likhein to main ration batata/bataati hoon.'",
    "If farmer says no or corrects details, ask only about the corrected animal — do not compute yet.",
  ].join("\n");
}

const CONFIRM_RE = /^(haan|han|ha|ji|yes|y|ok|okay|theek|thik|sahi|correct|confirm|right|हाँ|हां|जी|ठीक|सही|बराबर|બરાબર|ஆம்|అవును|হ্যাঁ|ঠিক|yes please)/iu;

function verificationWasRequested(messages: { role: string; content: string }[]): boolean {
  const assistants = messages.filter((m) => m.role === "assistant").map((m) => m.content);
  const last = assistants[assistants.length - 1] ?? "";
  return /verify|confirm|sahi|theek|thik|punah|dohra|summary|इस तरह|ठीक है|confirm/i.test(last);
}

function farmerConfirmed(messages: { role: string; content: string }[]): boolean {
  const users = messages.filter((m) => m.role === "user");
  const last = users[users.length - 1]?.content.trim() ?? "";
  if (!last) return false;
  if (/^(nahi|na|no|galat|wrong|गलत|नही)/iu.test(last)) return false;
  return CONFIRM_RE.test(last) || /^(haan|han|ji)\b/iu.test(last);
}

function buildRationAdvisoryHint(
  messages: { role: string; content: string }[],
  animalCount: number,
): string {
  const all = conversationText(messages);
  const region = detectRegion(all);
  const season = detectSeason();
  const slots = buildSlotsFromConversation(messages, animalCount);
  const allComplete = slots.every((s) => s.complete);

  if (!allComplete) {
    return gatherPrompt(animalCount, slots);
  }

  const profiles: AnimalProfile[] = slots.map((s) => ({
    index: s.profile.index ?? 1,
    breedKey: s.profile.breedKey ?? "hf_jersey_cross",
    breedName: s.profile.breedName ?? "Dairy animal",
    bodyWeight: s.profile.bodyWeight ?? 450,
    status: (s.profile.status === "unknown" ? "in_milk" : s.profile.status) as AnimalProfile["status"],
    milkKg: s.profile.milkKg ?? 0,
    fatPct: s.profile.fatPct ?? 4,
    lactationStage: s.profile.lactationStage ?? "mid",
    lactationNumber: s.profile.lactationNumber ?? null,
    ageYears: s.profile.ageYears ?? null,
    pregnant: s.profile.pregnant ?? false,
    pregnancyMonth: s.profile.pregnancyMonth ?? null,
    currentFeed: s.profile.currentFeed ?? { greenKg: 0, dryKg: 0, concentrateKg: 0, note: "" },
  }));

  const computed = profiles.map((p) => computeAnimalRation(p, region, season));
  const agg = aggregateHerd(computed);
  const herdLines = Object.values(agg.ingredientTotals)
    .sort((a, b) => b.kg - a.kg)
    .map((i) => `  • ${i.name}: ${i.kg.toFixed(1)} kg/day total (₹${i.cost.toFixed(0)}/day)`);
  const perAnimal = computed.map((c) => formatAnimalBlock(c)).join("\n\n");

  return [
    "HERD RATION ADVISORY — COMPUTED RESULTS (use these EXACT numbers)",
    `Herd: ${animalCount} animals | Region: ${region} | Season: ${season}`,
    "",
    "══ STEP 1 — HERD PREP (tell farmer FIRST: how much to prepare/mix for whole herd today) ══",
    "TOTAL DAILY FOR WHOLE HERD — mix/prepare these amounts for all animals together:",
    ...herdLines,
    `  • Mineral mixture: ${(0.15 * animalCount).toFixed(2)} kg/day`,
    "",
    `Herd cost: ₹${agg.totalOptimal.toFixed(0)}/day (₹${(agg.totalOptimal * 30).toFixed(0)}/month)`,
    agg.totalCurrent > 0
      ? `Saving ~₹${agg.totalSavings.toFixed(0)}/day vs current feed`
      : `Typical saving ~₹${(25.5 * animalCount).toFixed(0)}/day (NDDB average)`,
    "",
    "══ STEP 2 — PER ANIMAL (tell farmer SECOND: each animal's daily share) ══",
    "PER ANIMAL — how much of the ration each animal gets:",
    perAnimal,
    "",
    "PRESENTATION RULES FOR FARMER (mandatory):",
    "1. Reply in farmer's language (hi/bn/ta/te/mr/gu/kn/ml/pa/or/as/ur/en — same as their messages).",
    "2. Section A first: 'Poori mandli ke liye aaj itna tayyar karein' + herd totals (green, dry, concentrate, mineral kg).",
    "3. Section B second: 'Har pashu ko alag' — each animal with breed, status (doodh/sukhi/garbh), milk if any, and its kg.",
    "4. Simple village words only — no lactation/DIM/parity.",
    "5. Use exact kg and ₹ from this block — do not recalculate.",
  ].join("\n");
}

/** Dedicated Ration Advisory panel — always active when farmer opens that flow. */
export function tryRationAdvisoryHint(messages: { role: string; content: string }[]): string | null {
  const countInfo = resolveDeclaredCount(messages);

  if (countInfo.conflict) {
    return countConflictPrompt(countInfo.uniqueCounts);
  }

  const animalCount = countInfo.count;
  if (animalCount === null) return initialCountPrompt();

  const slots = buildSlotsFromConversation(messages, animalCount);
  const profiled = slots.filter((s) => s.complete).length;

  if (profiled < animalCount) {
    return gatherPrompt(animalCount, slots);
  }

  const users = messages.filter((m) => m.role === "user");
  const lastUser = users[users.length - 1]?.content.trim() ?? "";
  if (verificationWasRequested(messages) && /^(nahi|na|no|galat|wrong|गलत|नही)/iu.test(lastUser)) {
    return gatherPrompt(animalCount, buildSlotsFromConversation(messages, animalCount));
  }

  if (!verificationWasRequested(messages) || !farmerConfirmed(messages)) {
    return verificationPrompt(animalCount, slots);
  }

  return buildRationAdvisoryHint(messages, animalCount);
}

/** Legacy auto-trigger from main chat — only when 2+ animals mentioned (unused in main chat now). */
export function tryHerdRationHint(messages: { role: string; content: string }[]): string | null {
  const all = conversationText(messages);
  const users = userText(messages);
  const herdSize = detectHerdCount(users) ?? detectHerdCount(all);
  if (herdSize === null) return null;
  return buildRationAdvisoryHint(messages, herdSize);
}

export function isHerdGathering(hint: string | null): boolean {
  return hint !== null && (hint.includes("QUESTIONS ONLY") || hint.includes("VERIFY BEFORE COMPUTE"));
}

export function isVerificationStep(hint: string | null): boolean {
  return hint !== null && hint.includes("VERIFY BEFORE COMPUTE");
}

export function isRationComputed(hint: string | null): boolean {
  return hint !== null && hint.includes("COMPUTED RESULTS");
}
