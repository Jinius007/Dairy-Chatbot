/** LP ration compute for scripted voice/chat advisory flow. */
import { FEED_LIBRARY, searchFeeds, type FeedItem } from "@/lib/feedLibrary";
import { pickSeasonFeeds, type Region } from "@/lib/ration-calculator";
import { regionForState } from "@/lib/india-regions";
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

function formatRationSummary(result: RationResult, lang: RationLang): string {
  if (!result.feasible || !result.lines.length) {
    return lang === "en"
      ? "Could not build a feasible ration with the feeds given. Try adding green fodder and concentrate."
      : "Diye gaye chara se santulit khurak nahi bani. Hara chara aur dana add karke phir try karein.";
  }
  const lines = result.lines
    .map((l) => {
      const qty = l.qty < 0.25 ? `${Math.round(l.qty * 1000)} g` : `${l.qty.toFixed(1)} kg`;
      return `â€¢ ${l.feed.name}: ${qty} â€” â‚¹${l.cost.toFixed(0)}/day`;
    })
    .join("\n");
  const header =
    lang === "en"
      ? `Balanced ration (LP, INAPH minimums met). Daily cost â‚¹${result.totalCost.toFixed(0)}.`
      : `Santulit khurak (LP se, INAPH minimum poora). Roz ka kharch â‚¹${result.totalCost.toFixed(0)}.`;
  const nutrients =
    lang === "en"
      ? `TDN ${result.supply.tdn}/${result.requirement.tdn} g, CP ${result.supply.cp}/${result.requirement.cp} g.`
      : `TDN ${result.supply.tdn}/${result.requirement.tdn} gram, CP ${result.supply.cp}/${result.requirement.cp} gram.`;
  return `${header}\n${nutrients}\n${lines}`;
}

export function computeBalancedRationFromVoice(
  params: VoiceToolParams | Record<string, unknown>,
): { ok: true; summary: string; result: RationResult } | { ok: false; summary: string } {
  const p = params as VoiceToolParams;
  const lang = parseLang(p.lang);
  const animal = buildAnimalProfile(p);
  const requirement = computeRequirement(animal);
  const parsedFeeds = parseFeedsJson(p.feeds_json);

  const inputs: RationFeedInput[] = [];
  const warnings: string[] = [];

  for (const f of parsedFeeds) {
    const item = matchFeed(f.name);
    if (!item) {
      warnings.push(`Feed not matched: "${f.name}"`);
      continue;
    }
    inputs.push({
      feed: item,
      currentQty: f.qty_kg > 0 ? f.qty_kg : 0,
      price: f.price_rs && f.price_rs > 0 ? f.price_rs : item.rate,
    });
  }

  if (inputs.length < 2) {
    const msg =
      lang === "en"
        ? "Need at least 2 feeds (roughage + concentrate). Ask farmer what they feed."
        : "Kam se kam 2 chara chahiye (hara/bhusa + dana). Pashu palak se poochhein kya khilata hai.";
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
  const region = regionForState(state || "UP") as Region;
  const { green, dry, conc } = pickSeasonFeeds(region);
  const ids = new Set([green, dry, conc, "mineral_mixture"]);
  const feeds = FEED_LIBRARY.filter((f) => ids.has(f.id) || f.group.toLowerCase().includes("fodder")).slice(0, 25);
  const lines = feeds.map((f) => `â€¢ ${f.name} â€” â‚¹${f.rate}/kg (${f.category})`);
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
