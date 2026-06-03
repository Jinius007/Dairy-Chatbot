import type { RationLine } from "@/lib/ration-calculator";

export type AdvisoryStep = "welcome" | "herd_count" | "animals" | "review" | "ration";

export type AnimalStatus = "in_milk" | "dry" | "pregnant" | "heifer" | "unknown";

export interface AnimalFormData {
  index: number;
  breed: string;
  breedKey: string;
  ageYears: string;
  status: AnimalStatus | "";
  lactationNumber: string;
  stageSince: string;
  dimStage: string;
  milkLitres: string;
  voiceTranscript: string;
  approved: boolean;
}

export interface RationShareLine {
  key: string;
  name: string;
  kg: number;
  herdPct: number;
  extraCattleFeed?: boolean;
}

export interface AnimalRationResult {
  index: number;
  breed: string;
  statusLabel: string;
  ration: RationLine[];
  shareLines: RationShareLine[];
  dailyCost: number;
}

export interface HerdRationResult {
  herdTotals: { name: string; kg: number; cost: number }[];
  totalDailyCost: number;
  totalFeedKg: number;
  perAnimal: AnimalRationResult[];
  season: "kharif" | "rabi" | "summer";
  region: import("@/lib/ration-calculator").Region;
  seasonFeeds: { green: string; dry: string };
}

export interface RationAdvisorySession {
  step: AdvisoryStep;
  herdCount: number | null;
  stateCode: string;
  animals: AnimalFormData[];
  ration: HerdRationResult | null;
}

export const SESSION_STORAGE_KEY = "pashumitra_ration_advisory_v3";

export function emptyAnimal(index: number): AnimalFormData {
  return {
    index,
    breed: "",
    breedKey: "hf_jersey_cross",
    ageYears: "",
    status: "",
    lactationNumber: "",
    stageSince: "",
    dimStage: "mid",
    milkLitres: "0",
    voiceTranscript: "",
    approved: false,
  };
}

export function createAnimals(count: number): AnimalFormData[] {
  return Array.from({ length: count }, (_, i) => emptyAnimal(i + 1));
}

export function isAnimalFilled(a: AnimalFormData): boolean {
  if (!a.breed.trim() || !a.status) return false;

  // Young / calf — age is enough; milk always 0
  if (a.status === "heifer") {
    return !!a.ageYears.trim();
  }

  if (a.status === "dry") {
    if (parseFloat(a.milkLitres) > 0) return false;
    if (!a.stageSince.trim()) return false;
    return !!(a.lactationNumber.trim() || a.ageYears.trim());
  }

  if (!a.stageSince.trim()) return false;
  if (!a.lactationNumber.trim() && !a.ageYears.trim()) return false;
  if (a.status === "in_milk" && !(parseFloat(a.milkLitres) > 0)) return false;
  return true;
}

export function allAnimalsFilled(animals: AnimalFormData[]): boolean {
  return animals.length > 0 && animals.every(isAnimalFilled);
}

export function statusLabel(status: AnimalStatus | ""): string {
  switch (status) {
    case "in_milk": return "Giving milk (doodh)";
    case "dry": return "Dry (sukhi)";
    case "pregnant": return "Pregnant (garbh)";
    case "heifer": return "Young / calf (bachiya)";
    default: return "—";
  }
}

export function loadSession(): RationAdvisorySession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as RationAdvisorySession;
      return {
        ...s,
        stateCode: s.stateCode ?? "UP",
        animals: (s.animals ?? []).map((a) => ({
          ...a,
          stageSince: a.stageSince ?? "",
        })),
      };
    }
  } catch {
    /* ignore */
  }
  return { step: "welcome", herdCount: null, stateCode: "UP", animals: [], ration: null };
}

export function saveSession(session: RationAdvisorySession) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearSessionStorage() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem("pashumitra_ration_advisory_v2");
  } catch {
    /* ignore */
  }
}
