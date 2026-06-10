import { describe, expect, it } from "vitest";
import { computeRequirement, dmRangePercent, maxConcentratePercent, AnimalProfile } from "../nutrientRequirements";
import { FEED_BY_ID } from "../feedLibrary";
import { optimizeRation, RationFeedInput } from "../rationOptimizer";
import { parseCalvingsFromVoice, parseMilkingFromVoice, parseNumericAnswer, parsePregnantFromVoice, parseSpokenNumber } from "../rationVoice";

// Reference case from INAPH RBP: adult pregnant cattle 400 kg, 10 kg milk/day
// at 4% fat -> Maintenance TDN 4150, CP 890, Ca 26, P 16;
// Milk TDN 3300, CP 960, Ca 32.1, P 19.8; Totals 7450 / 1850 / 58.1 / 35.8.
const animal: AnimalProfile = {
  species: "cattle",
  weight: 400,
  adult: true,
  pregnant: true,
  pregnancyMonth: 8,
  inMilk: true,
  milkYield: 10,
  milkFat: 4,
  monthsAfterCalving: 8,
  milkPrice: 34,
};

describe("nutrient requirements (INAPH tables)", () => {
  it("matches the INAPH reference example", () => {
    const r = computeRequirement(animal);
    expect(r.pregnancyApplied).toBe(true);
    expect(r.maintenance.tdn).toBeCloseTo(4150, 0);
    expect(r.maintenance.cp).toBeCloseTo(890, 0);
    expect(r.maintenance.ca).toBeCloseTo(26, 0);
    expect(r.maintenance.p).toBeCloseTo(16, 0);
    expect(r.production.tdn).toBeCloseTo(3300, 0);
    expect(r.production.cp).toBeCloseTo(960, 0);
    expect(r.production.ca).toBeCloseTo(32.1, 1);
    expect(r.production.p).toBeCloseTo(19.8, 1);
    expect(r.total.tdn).toBeCloseTo(7450, 0);
    expect(r.total.cp).toBeCloseTo(1850, 0);
  });

  it("ignores pregnancy allowance before month 7", () => {
    const r = computeRequirement({ ...animal, pregnancyMonth: 4 });
    expect(r.pregnancyApplied).toBe(false);
    expect(r.maintenance.tdn).toBeCloseTo(3270, 0); // adult non-pregnant 400 kg
  });

  it("interpolates between weight rows", () => {
    const r = computeRequirement({ ...animal, pregnant: false, weight: 425 });
    expect(r.maintenance.tdn).toBeGreaterThan(3270);
    expect(r.maintenance.tdn).toBeLessThan(3580);
  });

  it("applies RBP dry matter and concentrate constraints", () => {
    expect(dmRangePercent(animal)).toEqual({ min: 2.0, max: 4.0 });
    expect(dmRangePercent({ ...animal, monthsAfterCalving: 1 })).toEqual({ min: 2.0, max: 2.5 });
    expect(maxConcentratePercent(animal)).toBe(50); // 10 kg milk
    expect(maxConcentratePercent({ ...animal, milkYield: 20 })).toBe(70);
    expect(maxConcentratePercent({ ...animal, inMilk: false, milkYield: 0 })).toBe(40);
  });
});

describe("least-cost ration LP", () => {
  const farmerFeeds: RationFeedInput[] = [
    { feed: FEED_BY_ID["wheat_straw"], currentQty: 5, price: 4 },
    { feed: FEED_BY_ID["maize_fodder"], currentQty: 20, price: 1 },
    { feed: FEED_BY_ID["cattle_feed_bis_i"], currentQty: 4, price: 16 },
    { feed: FEED_BY_ID["mustard_cake"], currentQty: 1, price: 14 },
    { feed: FEED_BY_ID["mineral_mixture_bis"], currentQty: 0, price: 45, suggested: true },
  ];

  it("finds a feasible least-cost plan meeting all nutrient minimums", () => {
    const req = computeRequirement(animal);
    const result = optimizeRation(farmerFeeds, animal, req);
    expect(result.feasible).toBe(true);
    expect(result.relaxed).toEqual([]);
    expect(result.supply.tdn).toBeGreaterThanOrEqual(req.total.tdn - 1);
    expect(result.supply.cp).toBeGreaterThanOrEqual(req.total.cp - 1);
    expect(result.supply.ca).toBeGreaterThanOrEqual(req.total.ca - 0.5);
    expect(result.supply.p).toBeGreaterThanOrEqual(req.total.p - 0.5);
    // DM within 2-4% of body weight
    expect(result.supply.dm).toBeGreaterThanOrEqual(result.dmRange.min - 1);
    expect(result.supply.dm).toBeLessThanOrEqual(result.dmRange.max + 1);
    // concentrate share respected
    expect(result.concentratePctOfDm).toBeLessThanOrEqual(result.maxConcentratePct);
    // mineral mixture present
    expect(result.lines.some((l) => l.feed.category === "mineral")).toBe(true);
    // farmer quantities stay within +/- 25%
    for (const line of result.lines) {
      if (line.currentQty > 0) {
        expect(line.qty).toBeGreaterThanOrEqual(line.currentQty * 0.75 - 0.01);
        expect(line.qty).toBeLessThanOrEqual(line.currentQty * 1.25 + 0.01);
      }
    }
  });

  it("market plan with extra feeds is never costlier than own-feeds plan", () => {
    const req = computeRequirement(animal);
    const own = optimizeRation(farmerFeeds, animal, req);
    const market: RationFeedInput[] = [
      ...farmerFeeds.map((f) => ({ ...f, currentQty: 0 })),
      { feed: FEED_BY_ID["groundnut_cake"], currentQty: 0, price: 17, suggested: true },
      { feed: FEED_BY_ID["wheat_bran"], currentQty: 0, price: 11, suggested: true },
      { feed: FEED_BY_ID["barseem_fodder"], currentQty: 0, price: 1.2, suggested: true },
      { feed: FEED_BY_ID["paddy_straw"], currentQty: 0, price: 3, suggested: true },
    ];
    const result = optimizeRation(market, animal, req);
    expect(result.feasible).toBe(true);
    expect(result.totalCost).toBeLessThanOrEqual(own.totalCost + 0.01);
  });
});

describe("voice parsing — milking status", () => {
  it("recognises Hinglish milking phrases", () => {
    expect(parseMilkingFromVoice("veh aajkal doodh de rhi hai")).toBe(true);
    expect(parseMilkingFromVoice("voh aajkal dudh de rahi hai")).toBe(true);
    expect(parseMilkingFromVoice("haan doodh deti hai")).toBe(true);
  });

  it("recognises Devanagari milking phrases", () => {
    expect(parseMilkingFromVoice("वह आजकल दूध दे रही है")).toBe(true);
    expect(parseMilkingFromVoice("हाँ दूध देती है")).toBe(true);
    expect(parseMilkingFromVoice("हां, वह दूध दे रही है")).toBe(true);
    expect(parseMilkingFromVoice("दूध नहीं देती")).toBe(false);
  });

  it("recognises Bengali milking phrases", () => {
    expect(parseMilkingFromVoice("হ্যাঁ, দুধ দিচ্ছে")).toBe(true);
    expect(parseMilkingFromVoice("হ্যাঁ দুধ দিচ্ছে")).toBe(true);
    expect(parseMilkingFromVoice("দুধ দিচ্ছে")).toBe(true);
    expect(parseMilkingFromVoice("হ্যাঁ")).toBe(true);
    expect(parseMilkingFromVoice("না, দুধ দিচ্ছে না")).toBe(false);
  });

  it("recognises short yes/no at milking step", () => {
    expect(parseMilkingFromVoice("haan")).toBe(true);
    expect(parseMilkingFromVoice("nahi")).toBe(false);
  });
});

describe("voice parsing — spoken numbers", () => {
  it("parses Hindi number words", () => {
    expect(parseSpokenNumber("teen")).toBe(3);
    expect(parseSpokenNumber("aath")).toBe(8);
    expect(parseSpokenNumber("aath baar byai")).toBe(8);
    expect(parseSpokenNumber("teen baar")).toBe(3);
    expect(parseSpokenNumber("das litre doodh")).toBe(10);
    expect(parseSpokenNumber("आठ")).toBe(8);
    expect(parseSpokenNumber("तीन")).toBe(3);
  });

  it("parses Bengali number words", () => {
    expect(parseSpokenNumber("aat")).toBe(8);
    expect(parseSpokenNumber("তিন")).toBe(3);
    expect(parseSpokenNumber("আট বার")).toBe(8);
  });

  it("parses calving count from voice", () => {
    expect(parseCalvingsFromVoice("teen")).toBe(3);
    expect(parseCalvingsFromVoice("aath")).toBe(8);
    expect(parseCalvingsFromVoice("आठ बार ब्याई")).toBe(8);
  });

  it("parses numeric answers for later ration steps", () => {
    expect(parseNumericAnswer("aath mahine", "months")).toBe(8);
    expect(parseNumericAnswer("das litre doodh", "yield")).toBe(10);
    expect(parseNumericAnswer("char pratishat fat", "fat")).toBe(4);
    expect(parseNumericAnswer("saadhe char pratishat", "fat")).toBe(4.5);
    expect(parseNumericAnswer("saat mahina garbh", "pregMonth")).toBe(7);
    expect(parsePregnantFromVoice("haan garbh hai")).toBe(true);
    expect(parsePregnantFromVoice("nahi")).toBe(false);
  });
});
