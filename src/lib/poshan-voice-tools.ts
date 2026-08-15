/** LP ration compute for scripted voice/chat advisory flow. */
import { FEED_LIBRARY, searchFeeds, type FeedItem } from "@/lib/feedLibrary";
import { detectSeason } from "@/lib/herd-ration-compute";
import { pickSeasonFeeds } from "@/lib/ration-calculator";
import { mineralMixtureIdForLocation } from "@/lib/location";
import {
  computeRequirement,
  type AnimalProfile,
  type Species,
} from "@/lib/nutrientRequirements";
import { optimizeRation, type RationFeedInput, type RationResult } from "@/lib/rationOptimizer";
import { matchFeedFromText } from "@/lib/rationVoice";
import type { RationLang } from "@/lib/rationI18n";

export interface VoiceToolParams {
  farmer_name?: string;
  lang?: string;
  district?: string;
  state?: string;
  species?: string;
  breed?: string;
  weight_kg?: number;
  calvings?: number;
  in_milk?: boolean;
  months_after_calving?: number;
  milk_yield_litres?: number;
  milk_fat_percent?: number;
  pregnant?: boolean;
  pregnancy_month?: number;
  feeds_json?: string;
}

const DEFAULT_WEIGHT: Record<Species, number> = { cattle: 400, buffalo: 450 };

/** Map ration-calculator keys to FEED_LIBRARY ids. */
const SEASON_LIB_IDS: Record<string, string> = {
  berseem: "barseem_fodder",
  napier_grass: "napier_bajra___nb_21",
  maize_fodder: "maize_fodder",
  jowar_fodder: "jowar_fodder",
  wheat_straw: "wheat_straw",
  paddy_straw: "paddy_straw",
  cattle_feed_bis1: "cattle_feed_bis_i",
  cattle_feed_bis2: "cattle_feed_bis_ii",
};

const MARKET_FEED_IDS = [
  "barseem_fodder",
  "maize_fodder",
  "jowar_fodder",
  "napier_bajra___nb_21",
  "wheat_straw",
  "paddy_straw",
  "grass_hay",
  "wheat_bran",
  "rice_bran_deoiled",
  "mustard_cake",
  "cottonseed_meal",
  "groundnut_cake",
  "soyabean_meal",
  "cattle_feed_bis_i",
  "cattle_feed_bis_ii",
];

function parseLang(raw?: string): RationLang {
  const code = (raw ?? "hi").slice(0, 2);
  const allowed: RationLang[] = [
    "hi", "en", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "as", "ur",
  ];
  return (allowed.includes(code as RationLang) ? code : "hi") as RationLang;
}

function parseFeedsJson(raw: string | undefined): { name: string; qty_kg: number; price_rs?: number }[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((f) => ({
      name: String(f.name ?? f.feedName ?? ""),
      qty_kg: Number(f.qty_kg ?? f.qtyKg ?? 0),
      price_rs: f.price_rs != null ? Number(f.price_rs) : f.priceRs != null ? Number(f.priceRs) : undefined,
    }));
  } catch {
    return [];
  }
}

function matchFeed(name: string): FeedItem | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return matchFeedFromText(trimmed) ?? searchFeeds(trimmed)[0] ?? null;
}

function buildAnimalProfile(p: VoiceToolParams): AnimalProfile {
  const species: Species = p.species === "buffalo" ? "buffalo" : "cattle";
  const calvings = Number(p.calvings) || 1;
  const milkYield = Number(p.milk_yield_litres) || 0;
  const inMilk = p.in_milk ?? milkYield > 0;
  return {
    species,
    weight: Number(p.weight_kg) || DEFAULT_WEIGHT[species],
    adult: calvings > 0,
    pregnant: !!p.pregnant,
    pregnancyMonth: Number(p.pregnancy_month) || 0,
    inMilk,
    milkYield,
    milkFat: Number(p.milk_fat_percent) || (species === "buffalo" ? 7 : 4),
    monthsAfterCalving: Number(p.months_after_calving) || 4,
    milkPrice: 34,
  };
}

function feedSortKey(feed: FeedItem): number {
  if (feed.group === "Green Fodder" || feed.group === "Grass") return 0;
  if (feed.group === "Straw" || feed.group === "Hay" || feed.group === "Silage") return 1;
  if (feed.category === "concentrate") return 2;
  if (feed.category === "mineral") return 3;
  return 4;
}

function formatRationSummary(result: RationResult, lang: RationLang): string {
  if (!result.feasible || !result.lines.length) {
    return lang === "en"
      ? "Could not build a feasible ration with the feeds given. Try adding green fodder, dry fodder and concentrate."
      : "दिए गए चारे से संतुलित खुराक नहीं बनी। हरा चारा, सूखा चारा और दाना जोड़कर फिर कोशिश करें।";
  }

  const sorted = [...result.lines].sort((a, b) => feedSortKey(a.feed) - feedSortKey(b.feed));
  const lines = sorted
    .map((l) => {
      const qty = l.qty < 0.25 ? `${Math.round(l.qty * 1000)} ग्राम` : `${l.qty.toFixed(1)} किग्रा`;
      const qtyEn = l.qty < 0.25 ? `${Math.round(l.qty * 1000)} g` : `${l.qty.toFixed(1)} kg`;
      const q = lang === "en" ? qtyEn : qty;
      const perDay = lang === "en" ? "/day" : "/दिन";
      return `• ${l.feed.name}: ${q} — ₹${l.cost.toFixed(0)}${perDay}`;
    })
    .join("\n");

  const header =
    lang === "en"
      ? `Balanced ration (LP, INAPH minimums met). Daily cost ₹${result.totalCost.toFixed(0)}.`
      : `संतुलित खुराक (एलपी से, आईएनएपीह न्यूनतम पूरा)। रोज़ का खर्च ₹${result.totalCost.toFixed(0)}।`;

  const nutrients =
    lang === "en"
      ? `TDN ${result.supply.tdn}/${result.requirement.tdn} g, CP ${result.supply.cp}/${result.requirement.cp} g.`
      : `टीडीएन ${result.supply.tdn}/${result.requirement.tdn} ग्राम, सीपी ${result.supply.cp}/${result.requirement.cp} ग्राम।`;

  const hasMineral = sorted.some((l) => l.feed.category === "mineral");
  const mineralNote =
    lang === "en"
      ? "Mineral mixture is essential for milk, health and pregnancy — feed daily."
      : hasMineral
        ? "मिनरल मिक्सचर बहुत ज़रूरी है — दूध, सेहत और गर्भ के लिए रोज़ देना चाहिए।"
        : "मिनरल मिक्सचर ज़रूर लगाएँ — दूध और सेहत के लिए बहुत ज़रूरी है।";

  return `${header}\n${nutrients}\n${lines}\n\n${mineralNote}`;
}

function libFeed(id: string): FeedItem | undefined {
  return FEED_LIBRARY.find((f) => f.id === id);
}

function buildOptimizerInputs(p: VoiceToolParams): { inputs: RationFeedInput[]; warnings: string[] } {
  const parsedFeeds = parseFeedsJson(p.feeds_json);
  const byId = new Map<string, RationFeedInput>();
  const warnings: string[] = [];

  for (const f of parsedFeeds) {
    const item = matchFeed(f.name);
    if (!item) {
      warnings.push(`Feed not matched: "${f.name}"`);
      continue;
    }
    byId.set(item.id, {
      feed: item,
      currentQty: f.qty_kg > 0 ? f.qty_kg : 0,
      price: f.price_rs && f.price_rs > 0 ? f.price_rs : item.rate,
    });
  }

  const season = detectSeason();
  const { green, dry, conc } = pickSeasonFeeds(season);
  const seasonalIds = [green, dry, conc].map((key) => SEASON_LIB_IDS[key] ?? key);

  const mineralId = mineralMixtureIdForLocation(p.district ?? "", p.state ?? "");
  const candidateIds = new Set([...seasonalIds, mineralId, ...MARKET_FEED_IDS]);

  for (const id of candidateIds) {
    if (byId.has(id)) continue;
    const feed = libFeed(id);
    if (!feed) continue;
    byId.set(id, { feed, currentQty: 0, price: feed.rate, suggested: true });
  }

  if (!byId.has(mineralId)) {
    const mineral = libFeed(mineralId) ?? libFeed("mineral_mixture_bis");
    if (mineral) {
      byId.set(mineral.id, { feed: mineral, currentQty: 0, price: mineral.rate, suggested: true });
    }
  }

  return { inputs: [...byId.values()], warnings };
}

export function computeBalancedRationFromVoice(
  params: VoiceToolParams | Record<string, unknown>,
): { ok: true; summary: string; result: RationResult } | { ok: false; summary: string } {
  const p = params as VoiceToolParams;
  const lang = parseLang(p.lang);
  const animal = buildAnimalProfile(p);
  const requirement = computeRequirement(animal);
  const { inputs, warnings } = buildOptimizerInputs(p);

  if (inputs.length < 2) {
    const msg =
      lang === "en"
        ? "Need at least 2 feeds (roughage + concentrate). Ask farmer what they feed."
        : "कम से कम २ चारे चाहिए (हरा/सूखा + दाना)। पशुपालक से पूछें क्या खिलाता है।";
    return { ok: false, summary: warnings.length ? `${msg} (${warnings.join("; ")})` : msg };
  }

  const result = optimizeRation(inputs, animal, requirement);
  const warn = warnings.length ? `\n(${warnings.join("; ")})` : "";
  return { ok: true, summary: formatRationSummary(result, lang) + warn, result };
}

export function listRegionalFeedsText(district: string, state: string): string {
  if (!district.trim()) {
    return "District and state required for regional feed list.";
  }
  const season = detectSeason();
  const { green, dry, conc } = pickSeasonFeeds(season);
  const ids = new Set([
    SEASON_LIB_IDS[green] ?? green,
    SEASON_LIB_IDS[dry] ?? dry,
    SEASON_LIB_IDS[conc] ?? conc,
    "mineral_mixture_bis",
  ]);
  const feeds = FEED_LIBRARY.filter((f) => ids.has(f.id) || f.group.toLowerCase().includes("fodder")).slice(0, 25);
  const lines = feeds.map((f) => `• ${f.name} — ₹${f.rate}/kg (${f.category})`);
  return `Season feeds for ${district}, ${state}:\n${lines.join("\n")}`;
}

export function nutrientRequirementsText(params: Record<string, unknown>): string {
  const species: Species = params.species === "buffalo" ? "buffalo" : "cattle";
  const req = computeRequirement({
    species,
    weight: Number(params.weight_kg) || DEFAULT_WEIGHT[species],
    adult: (Number(params.calvings) || 1) > 0,
    pregnant: !!params.pregnant,
    pregnancyMonth: Number(params.pregnancy_month) || 0,
    inMilk: !!params.in_milk || (Number(params.milk_yield_litres) || 0) > 0,
    milkYield: Number(params.milk_yield_litres) || 0,
    milkFat: Number(params.milk_fat_percent) || (species === "buffalo" ? 7 : 4),
    monthsAfterCalving: Number(params.months_after_calving) || 4,
    milkPrice: 34,
  });
  const lang = parseLang(String(params.lang ?? "hi"));
  return lang === "en"
    ? `Daily need (INAPH): TDN ${Math.round(req.total.tdn)} g, CP ${Math.round(req.total.cp)} g, Ca ${req.total.ca.toFixed(1)} g, P ${req.total.p.toFixed(1)} g.`
    : `Roz ki zaroorat (INAPH): TDN ${Math.round(req.total.tdn)} gram, CP ${Math.round(req.total.cp)} gram, Calcium ${req.total.ca.toFixed(1)} gram, Phosphorus ${req.total.p.toFixed(1)} gram.`;
}
