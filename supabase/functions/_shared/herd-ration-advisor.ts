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
  status: "in_milk" | "dry" | "pregnant" | "heifer";
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

const HERD_COUNT_RE = [
  /(?:i have|we have|mere paas|meri|mere|hamare paas|total|)\s*(\d{1,2})\s*(?:cow|cows|buffalo|buffaloes|buffalos|animal|animals|milch|milking|gaay|gai|gay|gaye|bhains|bhens|pashu|pashuon|पशु|गाय|गायें|भैंस)/i,
  /(\d{1,2})\s*(?:cow|cows|buffalo|buffaloes|animal|animals|milch|gaay|gai|bhains|pashu|गाय|भैंस|पशु)/i,
  /herd\s*(?:of\s*)?(\d{1,2})/i,
  /(\d{1,2})\s*(?:milch|dairy)\s*(?:animal|cattle|cow)/i,
];

const HERD_KEYWORDS = /herd|sabhi|saari|saare|each|har ek|per animal|poori mandli|सभी|हर|प्रत्येक|herd ration|mandli|pashuon/i;

const BREED_PATTERNS: [RegExp, string][] = [
  [/murrah|मुर्रा/i, "murrah_buffalo"],
  [/jaffarabadi|jaff/i, "jaffarabadi"],
  [/surti|सurti/i, "surti_buffalo"],
  [/gir|गिर/i, "gir_cow"],
  [/sahiwal|साहीवाल/i, "gir_cow"],
  [/tharparkar/i, "tharparkar"],
  [/holstein|hf\b|friesian|crossbred|cross|क्रॉस/i, "hf_jersey_cross"],
  [/jersey/i, "hf_jersey_cross"],
  [/buffalo|भैंस|bhains|bhens/i, "murrah_buffalo"],
  [/desi|indigenous|local|स्थानीय/i, "gir_cow"],
];

const STATUS_PATTERNS: [RegExp, AnimalProfile["status"]][] = [
  [/dry|sukhi|sukha|sookhi|without milk|no milk|doodh nahi|दूध नही|सूख/i, "dry"],
  [/pregnant|gaabhan|garbh|gestation|गर्भ|गाबhin|expecting/i, "pregnant"],
  [/heifer|bachiya|young|not calved|pehli bar|बछिया|young cow/i, "heifer"],
  [/in milk|milking|doodh|dudh|milk giving|दूध दे|giving milk|lactating/i, "in_milk"],
];

const REGION_KEYWORDS: [RegExp, Region][] = [
  [/punjab|haryana|up\b|uttar pradesh|north india|delhi|rajasthan.*north/i, "north"],
  [/gujarat|rajasthan|madhya pradesh|mp\b|west india|गुजरात/i, "west"],
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

export function detectHerdCount(text: string): number | null {
  let best = 0;
  for (const re of HERD_COUNT_RE) {
    for (const m of text.matchAll(new RegExp(re.source, re.flags + "g"))) {
      const n = parseInt(m[1], 10);
      if (n >= 2 && n <= 50) best = Math.max(best, n);
    }
  }
  return best >= 2 ? best : null;
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

function detectBreed(text: string): string {
  for (const [re, key] of BREED_PATTERNS) {
    if (re.test(text)) return key;
  }
  return "hf_jersey_cross";
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
  if (/pehli|first|1st|pahli|पहली|pratham/i.test(text)) return 1;
  if (/doosri|second|2nd|dusri|दूसरी/i.test(text)) return 2;
  if (/teesri|third|3rd|3\+|teen|तीसरी|zyada|more than 2/i.test(text)) return 3;
  const n = extractNumber(text, [/lactation\s*(?:no\.?|number)?\s*[:\s]?\s*(\d+)/i, /(\d+)\s*(?:th|rd|nd|st)\s*lactation/i]);
  return n !== null && n >= 1 && n <= 12 ? Math.round(n) : null;
}

function parseAgeYears(text: string): number | null {
  const n = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*(?:year|years|saal|varsh|वर्ष|yr)/i,
    /age[:\s]+(\d+(?:\.\d+)?)/i,
    /(\d+)\s*saal/i,
  ]);
  return n !== null && n > 0 && n < 25 ? n : null;
}

function parseDim(text: string): number | null {
  const months = extractNumber(text, [
    /(\d+)\s*(?:month|months|mahine|mahina|महीने|mo)\s*(?:since|after|pehle|ago|calv)/i,
    /calv(?:ed|ing)?\s*(?:\d+\s*)?(?:month|months|mahine|ago|pehle)/i,
    /(\d+)\s*(?:month|months|mahine)\s*(?:ka|ki|old calf|bachha)/i,
  ]);
  if (months !== null) return Math.min(Math.round(months * 30), 400);
  const days = extractNumber(text, [/(\d+)\s*(?:day|days|din)\s*(?:in milk|dim|since calv)/i]);
  return days !== null ? days : null;
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
    /(\d+(?:\.\d+)?)\s*kg\s*(?:green|hari|berseem|napier|fodder|chara|ghaas|grass)/i,
    /(?:green|hari|berseem|napier|chara|ghaas)[^\d]{0,20}(\d+(?:\.\d+)?)\s*kg/i,
  ]) ?? 0;
  const dryKg = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*kg\s*(?:dry|straw|bhusa|sukha|parali|stover)/i,
    /(?:straw|bhusa|sukha|dry)[^\d]{0,20}(\d+(?:\.\d+)?)\s*kg/i,
  ]) ?? 0;
  const concentrateKg = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*kg\s*(?:concentrate|compound|feed|dana|daana|khali|cake|pellet|mittha)/i,
    /(?:concentrate|compound feed|dana|daana|khali|cake)[^\d]{0,20}(\d+(?:\.\d+)?)\s*kg/i,
  ]) ?? 0;
  const note = text.slice(0, 120).replace(/\s+/g, " ");
  return { greenKg, dryKg, concentrateKg, note };
}

function splitAnimalSegments(text: string, herdSize: number): string[] {
  const numbered = text.split(/\b(?:animal|cow|buffalo|gaay|bhains|pashu)\s*#?\s*(\d+)\b[:\-—]?\s*/i);
  if (numbered.length > 2) {
    const segments: string[] = [];
    for (let i = 1; i < numbered.length; i += 2) {
      segments.push(numbered[i + 1] || "");
    }
    if (segments.length >= 2) return segments.slice(0, herdSize);
  }

  const listParts = text.split(/\n|\.\s+|;\s+|,\s+(?=\d)/).filter(Boolean);
  const milkHits = listParts.filter((p) => /(\d+(?:\.\d+)?)\s*(?:l|litre|liter|kg)\b/i.test(p) || detectBreed(p) !== "hf_jersey_cross" || detectStatus(p));
  if (milkHits.length >= 2) return milkHits.slice(0, herdSize);

  return [text];
}

function buildProfileFromSegment(segment: string, index: number): ParsedAnimalSlot {
  const breedKey = detectBreed(segment);
  const breedName = BREED_WEIGHTS[breedKey]?.name ?? "Dairy animal";
  const status = detectStatus(segment) ?? (extractNumber(segment, [/(\d+(?:\.\d+)?)\s*(?:l|litre|liter|kg)\b/i, /(\d+(?:\.\d+)?)\s*(?:kg|l)\s*(?:milk|doodh|dudh)/i]) ? "in_milk" : null);
  const milkKg = extractNumber(segment, [
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|l\b|kg)\s*(?:milk|doodh|dudh|दूध)/i,
    /(\d+(?:\.\d+)?)\s*(?:l|kg)\s*(?:\/|per)?\s*day/i,
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|l\b)/i,
    /doodh[:\s]+(\d+(?:\.\d+)?)/i,
    /milk[:\s]+(\d+(?:\.\d+)?)/i,
  ]) ?? 0;
  const fatPct = extractNumber(segment, [/fat[:\s]+(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*%\s*fat/i]) ?? defaultFat(breedKey);
  const dim = parseDim(segment);
  const lactationNumber = parseLactationNumber(segment);
  const ageYears = parseAgeYears(segment);
  const pregnancyMonth = parsePregnancyMonth(segment);
  const pregnant = status === "pregnant" || pregnancyMonth !== null;
  const resolvedStatus: AnimalProfile["status"] = status ?? (milkKg > 0 ? "in_milk" : pregnant ? "pregnant" : "dry");
  const lactationStage = resolvedStatus === "dry" ? "dry" : lactationStageFromDim(dim);
  const currentFeed = parseCurrentFeed(segment);

  const profile: Partial<AnimalProfile> = {
    index,
    breedKey,
    breedName,
    bodyWeight: BREED_WEIGHTS[breedKey]?.bw ?? 450,
    status: resolvedStatus,
    milkKg: resolvedStatus === "in_milk" ? milkKg : 0,
    fatPct,
    lactationStage,
    lactationNumber,
    ageYears,
    pregnant: pregnant || (pregnancyMonth !== null && pregnancyMonth >= 7),
    pregnancyMonth,
    currentFeed,
  };

  const breedExplicit = BREED_PATTERNS.some(([re]) => re.test(segment));
  const statusExplicit = detectStatus(segment) !== null;

  const missing: string[] = [];
  if (!breedExplicit) {
    missing.push("breed (nasl — Gir, Murrah, crossbred, etc.)");
  }
  if (!statusExplicit && milkKg <= 0 && !pregnant) {
    missing.push("status (doodh de rahi hai, sukhi hai, ya garbh mein hai?)");
  }
  if (resolvedStatus === "in_milk" && milkKg <= 0) {
    missing.push("daily milk yield (roz kitna litre dudh?)");
  }
  if (lactationNumber === null && ageYears === null) {
    missing.push("age or lactation number (pehli/doosri vyaat, ya kitne saal ki?)");
  }
  if (currentFeed.greenKg + currentFeed.dryKg + currentFeed.concentrateKg === 0) {
    missing.push("current feed (ab kya khilati ho — hara chara, sukha, dana kitna kg?)");
  }

  const hasCoreData =
    breedExplicit &&
    (statusExplicit || milkKg > 0 || pregnant || resolvedStatus === "dry") &&
    (resolvedStatus !== "in_milk" || milkKg > 0);

  const complete = hasCoreData;

  return { profile, missing, complete };
}

function expandProfiles(segments: string[], herdSize: number): ParsedAnimalSlot[] {
  const slots: ParsedAnimalSlot[] = [];
  for (let i = 0; i < herdSize; i++) {
    const segment = segments[i] ?? segments[segments.length - 1] ?? "";
    slots.push(buildProfileFromSegment(segment, i + 1));
  }
  if (segments.length === 1 && herdSize > 1) {
    for (let i = 1; i < herdSize; i++) {
      slots[i] = buildProfileFromSegment(segments[0], i + 1);
      slots[i].profile.index = i + 1;
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

function formatAnimalBlock(
  computed: ReturnType<typeof computeAnimalRation>,
  region: Region,
): string {
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
    profile.lactationNumber ? `    Lactation: ${profile.lactationNumber}` : "",
    profile.ageYears ? `    Age: ~${profile.ageYears} years` : "",
    profile.status === "in_milk" ? `    4% FCM: ${req.fcm.toFixed(1)} kg` : "",
    `    Balanced daily ration:`,
    ...lines,
    `    Optimal cost: ₹${optimalCost.toFixed(0)}/day`,
    currentCost > 0 ? `    Current feed cost (estimated): ₹${currentCost.toFixed(0)}/day` : "",
    `    Estimated saving: ₹${savings.toFixed(0)}/day${currentCost <= 0 ? " (approx — farmer did not give current feed amounts; NDDB avg ~₹16–25/animal/day)" : ""}`,
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

export function tryHerdRationHint(messages: { role: string; content: string }[]): string | null {
  const all = conversationText(messages);
  const users = userText(messages);
  const herdSize = detectHerdCount(users) ?? detectHerdCount(all);
  if (herdSize === null && !HERD_KEYWORDS.test(users)) return null;
  if (herdSize === null) return null;

  const region = detectRegion(all);
  const season = detectSeason();
  const segments = splitAnimalSegments(users, herdSize);
  const slots = expandProfiles(segments, herdSize);
  const completeCount = slots.filter((s) => s.complete).length;
  const allComplete = slots.every((s) => s.complete);

  if (!allComplete) {
    const next = slots.find((s) => !s.complete) ?? slots[0];
    const idx = next.profile.index ?? 1;
    const missingList = next.missing.slice(0, 4).map((m) => `- ${m}`).join("\n");
    const profiled = slots.filter((s) => s.complete).length;

    return [
      "HERD RATION ADVISORY — GATHER INFORMATION (do NOT calculate final ration yet)",
      `Farmer mentioned a herd of ${herdSize} animals. Profiled so far: ${profiled}/${herdSize}.`,
      `Now ask about Animal #${idx} in VERY SIMPLE farmer-friendly language — same language as the farmer's last message.`,
      "Ask only 2–4 short questions at a time (especially on live call). Use easy words, not technical terms.",
      "Questions to cover (from NDDB Balanced Ration Guide Section 3):",
      "  1) Cow or buffalo? Which breed (Gir, Murrah, crossbred…)?",
      "  2) Is she giving milk now, dry, or pregnant?",
      "  3) If milking: how many litres per day? Fat % if known.",
      "  4) Which lactation (pehli/doosri/teesri) or age in years?",
      "  5) What do you feed now — green fodder kg, dry straw kg, concentrate/dana kg?",
      `Still needed for Animal #${idx}:`,
      missingList || "- breed, milk/dry/pregnant status, current feed",
      "Do NOT give the final ration table until all animals have breed + status + milk (if milking) + current feed.",
      "Be warm and patient — like a village extension worker on WhatsApp.",
    ].join("\n");
  }

  const profiles: AnimalProfile[] = slots.map((s) => ({
    index: s.profile.index ?? 1,
    breedKey: s.profile.breedKey ?? "hf_jersey_cross",
    breedName: s.profile.breedName ?? "Dairy animal",
    bodyWeight: s.profile.bodyWeight ?? 450,
    status: s.profile.status ?? "in_milk",
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
    .map((i) => `  • ${i.name}: ${i.kg.toFixed(1)} kg/day total for ${herdSize} animals (₹${i.cost.toFixed(0)}/day)`);

  const perAnimal = computed.map((c) => formatAnimalBlock(c, region)).join("\n\n");

  return [
    "HERD RATION ADVISORY — COMPUTED RESULTS (use these EXACT numbers in your answer)",
    `Herd: ${herdSize} animals | Region: ${region} India | Season: ${season}`,
    "",
    "PER ANIMAL (balanced least-cost ration — ICAR/NDDB):",
    perAnimal,
    "",
    "TOTAL TO PREPARE DAILY FOR THE WHOLE HERD:",
    ...herdLines,
    `  • Mineral mixture (ASMM): ${(0.15 * herdSize).toFixed(2)} kg/day total`,
    "",
    `Herd optimal feed cost: ₹${agg.totalOptimal.toFixed(0)}/day (₹${(agg.totalOptimal * 30).toFixed(0)}/month)`,
    agg.totalCurrent > 0
      ? `Estimated current feed cost: ₹${agg.totalCurrent.toFixed(0)}/day → Saving ~₹${agg.totalSavings.toFixed(0)}/day (₹${(agg.totalSavings * 30).toFixed(0)}/month)`
      : `Estimated saving vs typical over-feeding: ~₹${(25.5 * herdSize).toFixed(0)}/day (NDDB field average ₹25.5/animal/day)`,
    "",
    "Tell the farmer in SIMPLE language:",
    "- For EACH animal: what to give daily (kg of green, dry, concentrate)",
    "- For the WHOLE herd: total kg to prepare/mix each morning",
    "- How much money they can save per day and month",
    "- Remind: verify local prices; use cooperative compound feed if available; clean water 40–50 L/animal",
    "- Suggest Pashu Poshan app or NDDB LRP for fine-tuning",
  ].join("\n");
}
