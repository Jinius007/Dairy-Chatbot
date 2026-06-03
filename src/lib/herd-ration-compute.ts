import {
  BREED_WEIGHTS,
  REGION_PRICES,
  buildRation,
  calcRequirements,
  pickSeasonFeeds,
  type Region,
  type RationLine,
} from "@/lib/ration-calculator";
import type { AnimalFormData, AnimalRationResult, HerdRationResult } from "@/lib/ration-advisory-session";
import { statusLabel } from "@/lib/ration-advisory-session";

function detectSeason(): "kharif" | "rabi" | "summer" {
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

function toProfile(a: AnimalFormData) {
  const breedKey = a.breedKey in BREED_WEIGHTS ? a.breedKey : "hf_jersey_cross";
  const bw = BREED_WEIGHTS[breedKey]?.bw ?? 450;
  const status = a.status || "dry";
  const milk = status === "in_milk" ? parseFloat(a.milkLitres) || 0 : 0;
  const pregnant = status === "pregnant";
  const lactationStage = status === "dry" ? "dry" : pregnant ? "late_pregnant" : a.dimStage || "mid";
  return { breedKey, breedName: a.breed || BREED_WEIGHTS[breedKey]?.name || "Dairy animal", bw, status, milk, pregnant, lactationStage, fat: defaultFat(breedKey) };
}

export function computeHerdRation(animals: AnimalFormData[], region: Region = "north"): HerdRationResult {
  const season = detectSeason();
  const feeds = pickSeasonFeeds(season);
  const prices = REGION_PRICES[region];

  const perAnimal: AnimalRationResult[] = animals.map((a) => {
    const p = toProfile(a);
    const req = calcRequirements(p.bw, p.milk, p.fat, p.lactationStage, p.pregnant);
    const result = buildRation(req, feeds.green, feeds.dry, feeds.conc, prices);
    return {
      index: a.index,
      breed: p.breedName,
      statusLabel: statusLabel(a.status),
      ration: result.ration,
      dailyCost: result.totals.cost,
    };
  });

  const totalsMap: Record<string, { name: string; kg: number; cost: number }> = {};
  let totalDailyCost = 0;

  for (const animal of perAnimal) {
    totalDailyCost += animal.dailyCost;
    for (const line of animal.ration) {
      if (!totalsMap[line.key]) {
        totalsMap[line.key] = { name: line.name, kg: 0, cost: 0 };
      }
      totalsMap[line.key].kg += line.asFeKg;
      totalsMap[line.key].cost += line.cost;
    }
  }

  const herdTotals = Object.values(totalsMap)
    .map((t) => ({ ...t, kg: +t.kg.toFixed(1), cost: +t.cost.toFixed(0) }))
    .sort((a, b) => b.kg - a.kg);

  return { herdTotals, totalDailyCost: +totalDailyCost.toFixed(0), perAnimal };
}

export type { RationLine };
