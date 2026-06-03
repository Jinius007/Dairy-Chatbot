import {
  BREED_WEIGHTS,
  FEED_INGREDIENTS,
  REGION_PRICES,
  buildRation,
  calcRequirements,
  pickSeasonFeeds,
  type Region,
  type RationLine,
} from "@/lib/ration-calculator";
import type { AnimalFormData, AnimalRationResult, HerdRationResult, RationShareLine } from "@/lib/ration-advisory-session";
import { localizedStatusLabel } from "@/lib/ration-advisory-labels";

export function detectSeason(): "kharif" | "rabi" | "summer" {
  const m = new Date().getMonth();
  if (m >= 6 && m <= 9) return "kharif";
  if (m >= 10 || m <= 2) return "rabi";
  return "summer";
}

function defaultFat(breedKey: string): number {
  if (breedKey.includes("buffalo")) return 7.0;
  if (breedKey === "gir_cow" || breedKey === "tharparkar") return 4.5;
  return 4.0;
}

/** ICAR/NDDB: BIS Type I for >10 L/day, Type II for 5–10 L/day. */
function concentratePlan(milk: number, status: AnimalFormData["status"]) {
  if (status === "heifer") {
    return { conc: "cattle_feed_bis2", min: 0.3, max: 1.5 };
  }
  if (status === "dry") {
    return { conc: "wheat_bran", min: 0.4, max: 1.5 };
  }
  if (status === "pregnant") {
    return { conc: "cattle_feed_bis2", min: 1.0, max: 3.0 };
  }
  if (milk >= 10) return { conc: "cattle_feed_bis1", min: 2.0, max: 10 };
  if (milk >= 5) return { conc: "cattle_feed_bis2", min: 1.5, max: 6 };
  if (milk > 0) return { conc: "cattle_feed_bis2", min: 1.0, max: 4 };
  return { conc: "wheat_bran", min: 0.4, max: 1.5 };
}

function lactationStageFromForm(a: AnimalFormData): string {
  if (a.status === "dry") return "dry";
  if (a.status === "pregnant") return "late_pregnant";
  if (a.status === "heifer") return "early";
  const dim = parseStageSinceDays(a.stageSince);
  if (dim !== null) {
    if (dim <= 60) return "early";
    if (dim <= 210) return "mid";
    return "late";
  }
  return a.dimStage || "mid";
}

/** Parse "3 mahine", "60 din", "2 month" → approximate days in current stage. */
export function parseStageSinceDays(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const months = t.match(/(\d+(?:\.\d+)?)\s*(?:mahine|mahina|month|months|mas|mo|महीne|मास|महीने)/iu);
  if (months) return Math.min(Math.round(parseFloat(months[1]) * 30), 400);
  const days = t.match(/(\d+(?:\.\d+)?)\s*(?:din|day|days|roj|दिन)/iu);
  if (days) return Math.min(Math.round(parseFloat(days[1])), 400);
  const years = t.match(/(\d+(?:\.\d+)?)\s*(?:saal|sal|year|years|varsh|साल)/iu);
  if (years) return Math.min(Math.round(parseFloat(years[1]) * 365), 400);
  return null;
}

function toProfile(a: AnimalFormData) {
  const breedKey = a.breedKey in BREED_WEIGHTS ? a.breedKey : "hf_jersey_cross";
  const bw = BREED_WEIGHTS[breedKey]?.bw ?? 450;
  const status = a.status || "dry";
  const milk = status === "in_milk" ? parseFloat(a.milkLitres) || 0 : 0;
  const pregnant = status === "pregnant";
  const lactationStage = lactationStageFromForm(a);
  const fat = defaultFat(breedKey);
  const concPlan = concentratePlan(milk, status);
  return {
    breedKey,
    breedName: a.breed || BREED_WEIGHTS[breedKey]?.name || "Dairy animal",
    bw,
    status,
    milk,
    pregnant,
    lactationStage,
    fat,
    concPlan,
  };
}

function isConcentrateKey(key: string): boolean {
  const t = FEED_INGREDIENTS[key]?.type;
  return t === "conc";
}

function buildShareLines(
  animalRation: RationLine[],
  herdTotalsMap: Record<string, number>,
  herdAnimalCount: number,
): RationShareLine[] {
  const avgConc =
    (herdTotalsMap["cattle_feed_bis1"] ?? 0) +
    (herdTotalsMap["cattle_feed_bis2"] ?? 0) +
    (herdTotalsMap["wheat_bran"] ?? 0) +
    (herdTotalsMap["cottonseed_cake"] ?? 0);
  const avgConcPerHead = herdAnimalCount > 0 ? avgConc / herdAnimalCount : 0;

  return animalRation.map((line) => {
    const herdTotal = herdTotalsMap[line.key] ?? 0;
    const herdPct = herdTotal > 0 ? +((line.asFeKg / herdTotal) * 100).toFixed(0) : 0;
    let extraCattleFeed = false;
    if (isConcentrateKey(line.key) && avgConcPerHead > 0 && line.asFeKg > avgConcPerHead * 1.2) {
      extraCattleFeed = true;
    }
    return {
      key: line.key,
      name: line.name,
      kg: line.asFeKg,
      herdPct,
      extraCattleFeed,
    };
  });
}

export function computeHerdRation(
  animals: AnimalFormData[],
  region: Region = "north",
  lang: string | null = "hi",
): HerdRationResult {
  const season = detectSeason();
  const baseFeeds = pickSeasonFeeds(season);
  const prices = REGION_PRICES[region];

  const perAnimal: AnimalRationResult[] = animals.map((a) => {
    const p = toProfile(a);
    const req = calcRequirements(p.bw, p.milk, p.fat, p.lactationStage, p.pregnant);
    const result = buildRation(
      req,
      baseFeeds.green,
      baseFeeds.dry,
      p.concPlan.conc,
      prices,
      { minConcKg: p.concPlan.min, maxConcKg: p.concPlan.max },
    );
    return {
      index: a.index,
      breed: p.breedName,
      statusLabel: localizedStatusLabel(a.status, lang),
      ration: result.ration,
      dailyCost: result.totals.cost,
      shareLines: [],
    };
  });

  const totalsMap: Record<string, { name: string; kg: number; cost: number }> = {};
  const herdKgByKey: Record<string, number> = {};
  let totalDailyCost = 0;

  for (const animal of perAnimal) {
    totalDailyCost += animal.dailyCost;
    for (const line of animal.ration) {
      if (!totalsMap[line.key]) {
        totalsMap[line.key] = { name: line.name, kg: 0, cost: 0 };
      }
      totalsMap[line.key].kg += line.asFeKg;
      totalsMap[line.key].cost += line.cost;
      herdKgByKey[line.key] = (herdKgByKey[line.key] ?? 0) + line.asFeKg;
    }
  }

  for (const animal of perAnimal) {
    animal.shareLines = buildShareLines(animal.ration, herdKgByKey, animals.length);
  }

  const greenKey = baseFeeds.green;
  const dryKey = baseFeeds.dry;
  const greenName = FEED_INGREDIENTS[greenKey]?.name ?? greenKey;
  const dryName = FEED_INGREDIENTS[dryKey]?.name ?? dryKey;

  const herdTotals = Object.values(totalsMap)
    .map((t) => ({ ...t, kg: +t.kg.toFixed(1), cost: +t.cost.toFixed(0) }))
    .sort((a, b) => b.kg - a.kg);

  const totalFeedKg = herdTotals.reduce((s, t) => s + t.kg, 0);

  return {
    herdTotals,
    totalDailyCost: +totalDailyCost.toFixed(0),
    totalFeedKg: +totalFeedKg.toFixed(1),
    perAnimal,
    season,
    region,
    seasonFeeds: { green: greenName, dry: dryName },
  };
}

export type { RationLine };
