// NDDB least-cost ration calculator (ICAR 2013 standards) — shared with Supabase edge functions.

export type FeedType = "green" | "dry" | "conc" | "mineral";

export interface FeedIngredient {
  name: string;
  type: FeedType;
  dm: number;
  tdnDM: number;
  cpDM: number;
  ca: number;
  p: number;
}

export const FEED_INGREDIENTS: Record<string, FeedIngredient> = {
  maize_fodder: { name: "Maize Fodder (Green)", type: "green", dm: 20, tdnDM: 62, cpDM: 8.5, ca: 0.38, p: 0.23 },
  napier_grass: { name: "Napier Grass (CO-4)", type: "green", dm: 18, tdnDM: 58, cpDM: 9.0, ca: 0.45, p: 0.27 },
  sorghum_fodder: { name: "Sorghum / Jowar Fodder", type: "green", dm: 22, tdnDM: 57, cpDM: 7.5, ca: 0.40, p: 0.21 },
  berseem: { name: "Berseem (Egyptian Clover)", type: "green", dm: 16, tdnDM: 62, cpDM: 16.5, ca: 1.55, p: 0.30 },
  lucerne: { name: "Lucerne", type: "green", dm: 18, tdnDM: 63, cpDM: 18.0, ca: 1.60, p: 0.32 },
  wheat_straw: { name: "Wheat Straw", type: "dry", dm: 91, tdnDM: 46, cpDM: 3.8, ca: 0.28, p: 0.08 },
  paddy_straw: { name: "Paddy Straw", type: "dry", dm: 90, tdnDM: 40, cpDM: 3.5, ca: 0.30, p: 0.08 },
  bajra_straw: { name: "Bajra Straw", type: "dry", dm: 91, tdnDM: 50, cpDM: 4.5, ca: 0.31, p: 0.12 },
  silage_maize: { name: "Maize Silage", type: "dry", dm: 30, tdnDM: 68, cpDM: 8.0, ca: 0.25, p: 0.20 },
  cattle_feed_bis1: { name: "Compound Cattle Feed BIS-I", type: "conc", dm: 88, tdnDM: 72, cpDM: 22.0, ca: 1.00, p: 0.70 },
  cattle_feed_bis2: { name: "Compound Cattle Feed BIS-II", type: "conc", dm: 88, tdnDM: 70, cpDM: 18.0, ca: 0.90, p: 0.65 },
  wheat_bran: { name: "Wheat Bran", type: "conc", dm: 88, tdnDM: 70, cpDM: 14.5, ca: 0.14, p: 1.10 },
  cottonseed_cake: { name: "Cottonseed Cake", type: "conc", dm: 90, tdnDM: 73, cpDM: 32.0, ca: 0.25, p: 0.90 },
  groundnut_cake: { name: "Groundnut Cake", type: "conc", dm: 90, tdnDM: 76, cpDM: 44.0, ca: 0.20, p: 0.55 },
  mineral_mixture: { name: "Area Specific Mineral Mixture", type: "mineral", dm: 98, tdnDM: 0, cpDM: 0.0, ca: 22.0, p: 12.0 },
};

export const BREED_WEIGHTS: Record<string, { name: string; bw: number }> = {
  hf_jersey_cross: { name: "HF/Jersey Crossbred Cow", bw: 450 },
  murrah_buffalo: { name: "Murrah Buffalo", bw: 550 },
  gir_cow: { name: "Gir / Sahiwal Cow", bw: 380 },
  holstein: { name: "Holstein Friesian", bw: 550 },
  tharparkar: { name: "Tharparkar Cow", bw: 340 },
  jaffarabadi: { name: "Jaffarabadi Buffalo", bw: 600 },
  surti_buffalo: { name: "Surti Buffalo", bw: 450 },
};

export type Region = "north" | "west" | "south" | "east" | "central";

export const REGION_PRICES: Record<Region, Record<string, number>> = {
  north: { maize_fodder: 1.5, berseem: 2.0, wheat_straw: 5.5, paddy_straw: 3.0, silage_maize: 3.5, cattle_feed_bis1: 27, cattle_feed_bis2: 24, wheat_bran: 14, cottonseed_cake: 30, groundnut_cake: 35, mineral_mixture: 70 },
  west: { maize_fodder: 1.2, berseem: 1.8, wheat_straw: 4.5, paddy_straw: 4.0, silage_maize: 3.0, cattle_feed_bis1: 26, cattle_feed_bis2: 23, wheat_bran: 13, cottonseed_cake: 28, groundnut_cake: 32, mineral_mixture: 65 },
  south: { maize_fodder: 1.0, berseem: 2.5, wheat_straw: 8.0, paddy_straw: 3.5, silage_maize: 2.8, cattle_feed_bis1: 28, cattle_feed_bis2: 25, wheat_bran: 15, cottonseed_cake: 25, groundnut_cake: 28, mineral_mixture: 68 },
  east: { maize_fodder: 1.0, berseem: 2.0, wheat_straw: 4.0, paddy_straw: 2.5, silage_maize: 3.0, cattle_feed_bis1: 25, cattle_feed_bis2: 22, wheat_bran: 13, cottonseed_cake: 32, groundnut_cake: 38, mineral_mixture: 72 },
  central: { maize_fodder: 1.2, berseem: 2.2, wheat_straw: 5.0, paddy_straw: 4.0, silage_maize: 3.2, cattle_feed_bis1: 27, cattle_feed_bis2: 24, wheat_bran: 14, cottonseed_cake: 28, groundnut_cake: 32, mineral_mixture: 68 },
};

const DM_INTAKE_PCT: Record<string, number> = {
  early: 3.2, mid: 3.0, late: 2.7, dry: 2.0, late_pregnant: 1.8,
};

export function fatCorrectedMilk(milkKg: number, fat: number): number {
  return milkKg * (0.4 + 0.15 * fat);
}

export function calcRequirements(
  bw: number,
  milkKg: number,
  fat: number,
  lactationStage: string,
  pregnant: boolean,
) {
  const fcm = fatCorrectedMilk(milkKg, fat);
  const hundredKg = bw / 100;
  const maint = { tdn: 395 * hundredKg, cp: 62.7 * hundredKg, ca: 2.5 * hundredKg, p: 1.7 * hundredKg };
  const prod = { tdn: 332 * fcm, cp: 82 * fcm, ca: 2.8 * fcm, p: 1.8 * fcm };
  const preg = pregnant ? { tdn: 300, cp: 100, ca: 12, p: 8 } : { tdn: 0, cp: 0, ca: 0, p: 0 };
  const dmPct = DM_INTAKE_PCT[lactationStage] ?? 3.0;
  const total = {
    tdn: maint.tdn + prod.tdn + preg.tdn,
    cp: maint.cp + prod.cp + preg.cp,
    ca: maint.ca + prod.ca + preg.ca,
    p: maint.p + prod.p + preg.p,
    dm: bw * (dmPct / 100) * 1000,
  };
  return { maint, prod, total, bw, fcm };
}

export interface RationLine {
  key: string;
  name: string;
  asFeKg: number;
  dryMatter: number;
  tdn: number;
  cp: number;
  cost: number;
}

function addIngredient(key: string, asFeKg: number, prices: Record<string, number>): RationLine {
  const ing = FEED_INGREDIENTS[key];
  const dryMatter = asFeKg * (ing.dm / 100);
  const tdn = dryMatter * (ing.tdnDM / 100);
  const cp = dryMatter * (ing.cpDM / 100);
  const cost = asFeKg * (prices[key] ?? 0);
  return { key, name: ing.name, asFeKg: +asFeKg.toFixed(2), dryMatter: +dryMatter.toFixed(2), tdn: +tdn.toFixed(0), cp: +cp.toFixed(0), cost: +cost.toFixed(2) };
}

export function buildRation(
  requirements: ReturnType<typeof calcRequirements>,
  greenFodder: string,
  dryFodder: string,
  concentrate: string,
  prices: Record<string, number>,
) {
  let remTDN = requirements.total.tdn;
  let remCP = requirements.total.cp;
  let remDM = requirements.total.dm;
  const ration: RationLine[] = [];

  const mm = addIngredient("mineral_mixture", 0.15, prices);
  ration.push(mm);

  const gIng = FEED_INGREDIENTS[greenFodder] ?? FEED_INGREDIENTS.maize_fodder;
  const greenAsFed = Math.min((remDM * 0.6) / (gIng.dm / 100), 30);
  const gItem = addIngredient(greenFodder, greenAsFed, prices);
  ration.push(gItem);
  remDM -= gItem.dryMatter;
  remTDN -= gItem.tdn;
  remCP -= gItem.cp;

  const dIng = FEED_INGREDIENTS[dryFodder] ?? FEED_INGREDIENTS.wheat_straw;
  const dryAsFed = Math.max(0, Math.min((Math.min(remDM * 0.45, 4000)) / (dIng.dm / 100), 6));
  if (dryAsFed > 0.2) {
    const dItem = addIngredient(dryFodder, dryAsFed, prices);
    ration.push(dItem);
    remDM -= dItem.dryMatter;
    remTDN -= dItem.tdn;
    remCP -= dItem.cp;
  }

  const cIng = FEED_INGREDIENTS[concentrate] ?? FEED_INGREDIENTS.cattle_feed_bis1;
  const concByTDN = Math.max(0, remTDN / ((cIng.dm / 100) * (cIng.tdnDM / 100)));
  const concByCP = Math.max(0, remCP / ((cIng.dm / 100) * (cIng.cpDM / 100)));
  const concKg = Math.min(Math.max(concByTDN, concByCP, 1.0), 10);
  if (concKg > 0.1) ration.push(addIngredient(concentrate, +concKg.toFixed(1), prices));

  const totals = ration.reduce(
    (acc, r) => ({ asFeKg: acc.asFeKg + r.asFeKg, dm: acc.dm + r.dryMatter, tdn: acc.tdn + r.tdn, cp: acc.cp + r.cp, cost: acc.cost + r.cost }),
    { asFeKg: 0, dm: 0, tdn: 0, cp: 0, cost: 0 },
  );
  return { ration, totals };
}

export function pickSeasonFeeds(season: "kharif" | "rabi" | "summer") {
  if (season === "rabi") return { green: "berseem", dry: "wheat_straw", conc: "cattle_feed_bis1" };
  if (season === "summer") return { green: "napier_grass", dry: "paddy_straw", conc: "cattle_feed_bis1" };
  return { green: "maize_fodder", dry: "paddy_straw", conc: "cattle_feed_bis2" };
}
