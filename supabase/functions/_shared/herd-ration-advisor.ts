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

const HERD_COUNT_RE = [
  /(?:i have|we have|mere paas|meri|mere|mari|mara|hamare paas|total|)\s*(\d{1,2})\s*(?:cow|cows|buffalo|buffaloes|buffalos|animal|animals|milch|milking|gaay|gai|gay|gaye|bhains|bhens|pashu|pashuon|vaca|पशु|गाय|गायें|भैंस|ગાય|ભેંસ)/i,
  /(\d{1,2})\s*(?:cow|cows|buffalo|buffaloes|animal|animals|milch|gaay|gai|bhains|pashu|गाय|भैंस|પશુ|ગાય|ભેંસ)/i,
  /herd\s*(?:of\s*)?(\d{1,2})/i,
  /(\d{1,2})\s*(?:milch|dairy)\s*(?:animal|cattle|cow)/i,
];

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
  [/dry|sukhi|sukha|sookhi|without milk|no milk|doodh nahi|dudh nahi|दूध नही|સૂક/i, "dry"],
  [/pregnant|gaabhan|garbh|gestation|गर्भ|ગાભ|expecting|garbhi/i, "pregnant"],
  [/heifer|bachiya|young|not calved|pehli bar|बछिया|young cow|વાછરડ/i, "heifer"],
  [/in milk|milking|doodh de|dudh de|milk giving|दूध दे|giving milk|lactating|દૂધ આપ/i, "in_milk"],
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
  const n = extractNumber(text, [/lactation\s*(?:no\.?|number)?\s*[:\s]?\s*(\d+)/i, /(\d+)\s*(?:th|rd|nd|st)\s*lactation/i, /(\d+)\s*(?:vi|mi|th)\s*(?:vyaat|lactation|calving)/i]);
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
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b)\s*(?:\/|per|roz|daily|din)/i,
    /roz\s*(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|kg)/i,
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
    missing: ["breed", "status (in milk / dry / pregnant)", "lactation or age", "current feed"],
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
  if (!hasLactationOrAge) missing.push("age or lactation (pehli/doosri vyaat, ya kitne saal ki?)");
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
    profile.lactationNumber ? `    Lactation: ${profile.lactationNumber}` : "",
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
    "FORBIDDEN this turn: ration tables, kg amounts, feed plans, cost estimates, bullet lists of feed.",
    "FORBIDDEN: answering from general knowledge — only ask questions.",
    "",
    `Herd size: ${herdSize} animals. Fully profiled: ${profiled}/${herdSize}.`,
    `Ask about Animal #${idx} now — in the farmer's own simple language (same as their last message).`,
    "",
    "Ask 2–4 short easy questions, for example:",
    "  • Kaun si nasl hai? (Gir, Murrah, crossbred?)",
    "  • Ab doodh de rahi hai, sukhi hai, ya garbh mein?",
    "  • Roz kitna litre dudh? (agar doodh de rahi ho)",
    "  • Pehli/doosri vyaat? Ya kitne saal ki?",
    "  • Ab kya khilati ho — hara chara, sukha bhusa, dana kitna kg?",
    "",
    `Still missing for Animal #${idx}:`,
    missingList,
    "",
    "If all animals are the same, you may ask once and say 'kya badha ek jaisa hai?'",
    "End with a friendly line like: 'Jawab do, phir main sahi ration batata/bataati hoon.'",
  ].join("\n");
}

export function tryHerdRationHint(messages: { role: string; content: string }[]): string | null {
  const all = conversationText(messages);
  const users = userText(messages);
  const herdSize = detectHerdCount(users) ?? detectHerdCount(all);
  if (herdSize === null) return null;

  const region = detectRegion(all);
  const season = detectSeason();
  const slots = buildSlotsFromConversation(messages, herdSize);
  const allComplete = slots.every((s) => s.complete);

  if (!allComplete) {
    return gatherPrompt(herdSize, slots);
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
    `Herd: ${herdSize} animals | Region: ${region} | Season: ${season}`,
    "",
    "PER ANIMAL:",
    perAnimal,
    "",
    "TOTAL DAILY FOR WHOLE HERD:",
    ...herdLines,
    `  • Mineral mixture: ${(0.15 * herdSize).toFixed(2)} kg/day`,
    "",
    `Herd cost: ₹${agg.totalOptimal.toFixed(0)}/day (₹${(agg.totalOptimal * 30).toFixed(0)}/month)`,
    agg.totalCurrent > 0
      ? `Saving ~₹${agg.totalSavings.toFixed(0)}/day vs current feed`
      : `Typical saving ~₹${(25.5 * herdSize).toFixed(0)}/day (NDDB average)`,
    "",
    "Explain in SIMPLE farmer language: per-animal feed, total herd prep, savings.",
  ].join("\n");
}

export function isHerdGathering(hint: string | null): boolean {
  return hint !== null && hint.includes("QUESTIONS ONLY");
}
