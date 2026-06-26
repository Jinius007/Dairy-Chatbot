globalThis.Deno = {
  env: { get: (key) => process.env[key] },
};
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// catalyst/functions/pashumitra_api/src/server.mts
var import_express = __toESM(require("express"), 1);

// catalyst/functions/pashumitra_api/lib/ration-calculator.ts
var FEED_INGREDIENTS = {
  maize_fodder: { name: "Maize Fodder (Green)", type: "green", dm: 20, tdnDM: 62, cpDM: 8.5, ca: 0.38, p: 0.23 },
  napier_grass: { name: "Napier Grass (CO-4)", type: "green", dm: 18, tdnDM: 58, cpDM: 9, ca: 0.45, p: 0.27 },
  sorghum_fodder: { name: "Sorghum / Jowar Fodder", type: "green", dm: 22, tdnDM: 57, cpDM: 7.5, ca: 0.4, p: 0.21 },
  berseem: { name: "Berseem (Egyptian Clover)", type: "green", dm: 16, tdnDM: 62, cpDM: 16.5, ca: 1.55, p: 0.3 },
  lucerne: { name: "Lucerne", type: "green", dm: 18, tdnDM: 63, cpDM: 18, ca: 1.6, p: 0.32 },
  wheat_straw: { name: "Wheat Straw", type: "dry", dm: 91, tdnDM: 46, cpDM: 3.8, ca: 0.28, p: 0.08 },
  paddy_straw: { name: "Paddy Straw", type: "dry", dm: 90, tdnDM: 40, cpDM: 3.5, ca: 0.3, p: 0.08 },
  bajra_straw: { name: "Bajra Straw", type: "dry", dm: 91, tdnDM: 50, cpDM: 4.5, ca: 0.31, p: 0.12 },
  silage_maize: { name: "Maize Silage", type: "dry", dm: 30, tdnDM: 68, cpDM: 8, ca: 0.25, p: 0.2 },
  cattle_feed_bis1: { name: "Compound Cattle Feed BIS-I", type: "conc", dm: 88, tdnDM: 72, cpDM: 22, ca: 1, p: 0.7 },
  cattle_feed_bis2: { name: "Compound Cattle Feed BIS-II", type: "conc", dm: 88, tdnDM: 70, cpDM: 18, ca: 0.9, p: 0.65 },
  wheat_bran: { name: "Wheat Bran", type: "conc", dm: 88, tdnDM: 70, cpDM: 14.5, ca: 0.14, p: 1.1 },
  cottonseed_cake: { name: "Cottonseed Cake", type: "conc", dm: 90, tdnDM: 73, cpDM: 32, ca: 0.25, p: 0.9 },
  groundnut_cake: { name: "Groundnut Cake", type: "conc", dm: 90, tdnDM: 76, cpDM: 44, ca: 0.2, p: 0.55 },
  mineral_mixture: { name: "Area Specific Mineral Mixture", type: "mineral", dm: 98, tdnDM: 0, cpDM: 0, ca: 22, p: 12 }
};
var BREED_WEIGHTS = {
  hf_jersey_cross: { name: "HF/Jersey Crossbred Cow", bw: 450 },
  murrah_buffalo: { name: "Murrah Buffalo", bw: 550 },
  gir_cow: { name: "Gir / Sahiwal Cow", bw: 380 },
  holstein: { name: "Holstein Friesian", bw: 550 },
  tharparkar: { name: "Tharparkar Cow", bw: 340 },
  jaffarabadi: { name: "Jaffarabadi Buffalo", bw: 600 },
  surti_buffalo: { name: "Surti Buffalo", bw: 450 }
};
var REGION_PRICES = {
  north: { maize_fodder: 1.5, berseem: 2, wheat_straw: 5.5, paddy_straw: 3, silage_maize: 3.5, cattle_feed_bis1: 27, cattle_feed_bis2: 24, wheat_bran: 14, cottonseed_cake: 30, groundnut_cake: 35, mineral_mixture: 70 },
  west: { maize_fodder: 1.2, berseem: 1.8, wheat_straw: 4.5, paddy_straw: 4, silage_maize: 3, cattle_feed_bis1: 26, cattle_feed_bis2: 23, wheat_bran: 13, cottonseed_cake: 28, groundnut_cake: 32, mineral_mixture: 65 },
  south: { maize_fodder: 1, berseem: 2.5, wheat_straw: 8, paddy_straw: 3.5, silage_maize: 2.8, cattle_feed_bis1: 28, cattle_feed_bis2: 25, wheat_bran: 15, cottonseed_cake: 25, groundnut_cake: 28, mineral_mixture: 68 },
  east: { maize_fodder: 1, berseem: 2, wheat_straw: 4, paddy_straw: 2.5, silage_maize: 3, cattle_feed_bis1: 25, cattle_feed_bis2: 22, wheat_bran: 13, cottonseed_cake: 32, groundnut_cake: 38, mineral_mixture: 72 },
  central: { maize_fodder: 1.2, berseem: 2.2, wheat_straw: 5, paddy_straw: 4, silage_maize: 3.2, cattle_feed_bis1: 27, cattle_feed_bis2: 24, wheat_bran: 14, cottonseed_cake: 28, groundnut_cake: 32, mineral_mixture: 68 }
};
var DM_INTAKE_PCT = {
  early: 3.2,
  mid: 3,
  late: 2.7,
  dry: 2,
  late_pregnant: 1.8
};
function fatCorrectedMilk(milkKg, fat) {
  return milkKg * (0.4 + 0.15 * fat);
}
function calcRequirements(bw, milkKg, fat, lactationStage, pregnant) {
  const fcm = fatCorrectedMilk(milkKg, fat);
  const hundredKg = bw / 100;
  const maint = { tdn: 395 * hundredKg, cp: 62.7 * hundredKg, ca: 2.5 * hundredKg, p: 1.7 * hundredKg };
  const prod = { tdn: 332 * fcm, cp: 82 * fcm, ca: 2.8 * fcm, p: 1.8 * fcm };
  const preg = pregnant ? { tdn: 300, cp: 100, ca: 12, p: 8 } : { tdn: 0, cp: 0, ca: 0, p: 0 };
  const dmPct = DM_INTAKE_PCT[lactationStage] ?? 3;
  const total = {
    tdn: maint.tdn + prod.tdn + preg.tdn,
    cp: maint.cp + prod.cp + preg.cp,
    ca: maint.ca + prod.ca + preg.ca,
    p: maint.p + prod.p + preg.p,
    dm: bw * (dmPct / 100) * 1e3
  };
  return { maint, prod, total, bw, fcm };
}
function addIngredient(key, asFeKg, prices) {
  const ing = FEED_INGREDIENTS[key];
  const dryMatter = asFeKg * (ing.dm / 100);
  const tdn = dryMatter * (ing.tdnDM / 100);
  const cp = dryMatter * (ing.cpDM / 100);
  const cost = asFeKg * (prices[key] ?? 0);
  return { key, name: ing.name, asFeKg: +asFeKg.toFixed(2), dryMatter: +dryMatter.toFixed(2), tdn: +tdn.toFixed(0), cp: +cp.toFixed(0), cost: +cost.toFixed(2) };
}
function buildRation(requirements, greenFodder, dryFodder, concentrate, prices) {
  let remTDN = requirements.total.tdn;
  let remCP = requirements.total.cp;
  let remDM = requirements.total.dm;
  const ration = [];
  const mm = addIngredient("mineral_mixture", 0.15, prices);
  ration.push(mm);
  const gIng = FEED_INGREDIENTS[greenFodder] ?? FEED_INGREDIENTS.maize_fodder;
  const greenAsFed = Math.min(remDM * 0.6 / (gIng.dm / 100), 30);
  const gItem = addIngredient(greenFodder, greenAsFed, prices);
  ration.push(gItem);
  remDM -= gItem.dryMatter;
  remTDN -= gItem.tdn;
  remCP -= gItem.cp;
  const dIng = FEED_INGREDIENTS[dryFodder] ?? FEED_INGREDIENTS.wheat_straw;
  const dryAsFed = Math.max(0, Math.min(Math.min(remDM * 0.45, 4e3) / (dIng.dm / 100), 6));
  if (dryAsFed > 0.2) {
    const dItem = addIngredient(dryFodder, dryAsFed, prices);
    ration.push(dItem);
    remDM -= dItem.dryMatter;
    remTDN -= dItem.tdn;
    remCP -= dItem.cp;
  }
  const cIng = FEED_INGREDIENTS[concentrate] ?? FEED_INGREDIENTS.cattle_feed_bis1;
  const concByTDN = Math.max(0, remTDN / (cIng.dm / 100 * (cIng.tdnDM / 100)));
  const concByCP = Math.max(0, remCP / (cIng.dm / 100 * (cIng.cpDM / 100)));
  const concKg = Math.min(Math.max(concByTDN, concByCP, 1), 10);
  if (concKg > 0.1) ration.push(addIngredient(concentrate, +concKg.toFixed(1), prices));
  const totals = ration.reduce(
    (acc, r) => ({ asFeKg: acc.asFeKg + r.asFeKg, dm: acc.dm + r.dryMatter, tdn: acc.tdn + r.tdn, cp: acc.cp + r.cp, cost: acc.cost + r.cost }),
    { asFeKg: 0, dm: 0, tdn: 0, cp: 0, cost: 0 }
  );
  return { ration, totals };
}
function pickSeasonFeeds(season) {
  if (season === "rabi") return { green: "berseem", dry: "wheat_straw", conc: "cattle_feed_bis1" };
  if (season === "summer") return { green: "napier_grass", dry: "paddy_straw", conc: "cattle_feed_bis1" };
  return { green: "maize_fodder", dry: "paddy_straw", conc: "cattle_feed_bis2" };
}
function formatRationAdvisory(breedName, milkKg, fat, region, result, count = 1) {
  const lines = result.ration.map(
    (r) => `- ${r.name}: ${r.asFeKg} kg/animal/day${count > 1 ? ` (${(r.asFeKg * count).toFixed(1)} kg for ${count} animals)` : ""} \u2014 \u20B9${r.cost.toFixed(2)}/animal`
  );
  return [
    `Ration advisory for ${breedName}${count > 1 ? ` \xD7 ${count} animals` : ""}`,
    `Milk: ${milkKg} kg/day, Fat: ${fat}%, 4% FCM: ${result.req.fcm.toFixed(1)} kg`,
    `Nutrient need \u2014 TDN: ${result.req.total.tdn.toFixed(0)} g, CP: ${result.req.total.cp.toFixed(0)} g, DM budget: ${(result.req.total.dm / 1e3).toFixed(1)} kg`,
    `Daily ration (least-cost, ${region} India prices):`,
    ...lines,
    `Total: \u20B9${result.totals.cost.toFixed(2)}/animal/day${count > 1 ? ` | Herd: \u20B9${(result.totals.cost * count).toFixed(2)}/day (\u20B9${(result.totals.cost * count * 30).toFixed(0)}/month)` : ` (\u20B9${(result.totals.cost * 30).toFixed(0)}/month)`}`,
    `TDN coverage: ${(result.totals.tdn / result.req.total.tdn * 100).toFixed(0)}%, CP coverage: ${(result.totals.cp / result.req.total.cp * 100).toFixed(0)}%`,
    `Note: Prices indicative for ${region} region \u2014 verify locally. Include clean water 40\u201350 L/day.`
  ].join("\n");
}

// catalyst/functions/pashumitra_api/lib/ration-advisory-replies.ts
var GATHERING = {
  hi: (h, i, p) => `\u0920\u0940\u0915 \u0939\u0948, \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 ${h} \u092A\u0936u \u0939\u0948\u0902\u0964 \u0905\u092D\u0940 ${p}/${h} \u0915\u0940 \u092A\u0942\u0930\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u092E\u093F\u0932\u0940 \u0939\u0948\u0964

\u092A\u0936u #${i} \u0915\u0947 \u092C\u093E\u0930\u0947 \u092E\u0947\u0902 \u092C\u0924\u093E\u0907\u090F:
\u2022 \u0915\u094C\u0928 \u0938\u0940 \u0928\u0938l?
\u2022 \u0926\u0942\u0927 \u0926\u0947 \u0930\u0939\u0940 \u0939\u0948, \u0938\u0942\u0916\u0940, \u092F\u093E \u0917\u0930\u094D\u092D \u092E\u0947\u0902?
\u2022 \u0907\u0938 \u0905\u0935\u0938\u094D\u0925\u093E \u092E\u0947\u0902 \u0915\u093F\u0924ne \u0926\u093F\u0928/\u092E\u0939\u0940ne? \u0930\u094B\u091C\u093C \u0915\u093F\u0924na litre \u0926\u0942\u0927?
\u2022 \u0915\u093F\u0924ni \u092C\u093E\u0930 \u092C\u091Acha / \u0917\u093E\u092D\u093F\u0928? \u0909\u092Er \u0915\u093F\u0924ni?
\u2022 \u0905\u092D\u0940 \u0915\u094D\u092F\u093E \u0916\u093F\u0932\u093E\u0924\u0940 \u0939\u0948\u0902 \u2014 \u0939ara chara, bhusa, dana kitna kg?`,
  bn: (h, i, p) => `\u09A0\u09BF\u0995 \u0986\u099B\u09C7, \u0986\u09AA\u09A8\u09BE\u09B0 ${h}\u099F\u09BF \u09AA\u09B6u \u0986\u099B\u09C7\u0964 \u098F\u0996\u09A8\u09CB ${p}/${h} \u098F\u09B0 \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A4\u09A5\u09CD\u09AF \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964

#${i} \u09A8\u0982 \u09AA\u09B6u \u09B8\u09AE\u09CD\u09AA\u09B0\u09CD\u0995\u09C7 \u09AC\u09B2\u09C1\u09A8:
\u2022 \u0995\u09CB\u09A8 \u099C\u09BE\u09A4?
\u2022 \u09A6\u09C1\u09A7 \u09A6\u09BF\u099A\u09CD\u099B\u09C7, \u09B6\u09C1\u0995\u09A8\u09CB, \u09A8\u09BE\u0995\u09BF \u0997\u09B0\u09CD\u09AD\u09AC\u09A4\u09C0?
\u2022 \u0995\u09A4 \u09A6in/mas? \u09AA\u09CD\u09B0\u09A4\u09BF\u09A6\u09BF\u09A8 \u0995\u09A4 \u09B2\u09BF\u099F\u09BE\u09B0 \u09A6\u09C1\u09A7?
\u2022 \u0995\u09A4\u09AC\u09BE\u09B0 \u09ACachhur/\u0997\u09B0\u09CD\u09AD? \u09AC\u09AF\u09BC\u09B8?
\u2022 \u098F\u0996\u09A8 \u0995\u09C0 \u0996\u09BE\u0993\u09AF\u09BC\u09BE\u09A8?`,
  ta: (h, i, p) => `\u0B9A\u0BB0\u0BBF, \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BBF\u0B9F\u0BAE\u0BCD ${h} \u0BAE\u0BBF\u0BB0\u0BC1\u0B95\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B89\u0BB3\u0BCD\u0BB3\u0BA9. ${p}/${h} \u0BB5\u0BBF\u0BB5\u0BB0\u0BAE\u0BCD \u0B95\u0BBF\u0B9F\u0BC8\u0BA4\u0BCD\u0BA4\u0BA4\u0BC1.

#${i} \u0BAA\u0BB1\u0BCD\u0BB1\u0BBF \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD:
\u2022 \u0B87\u0BA9\u0BAE\u0BCD? \u2022 \u0BAA\u0BBE\u0BB2\u0BCD/ dry/ \u0B95\u0BB0\u0BCD\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD?
\u2022 \u0B8E\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BA8\u0BBE\u0B9F\u0BCD\u0B95\u0BB3\u0BCD? \u0B8E\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BB2\u0BBF\u0B9F\u0BCD\u0B9F\u0BB0\u0BCD?
\u2022 \u0B8E\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BAE\u0BC1\u0BB1\u0BC8 \u0B95\u0BA9\u0BCD\u0BB1\u0BC1? \u0BB5\u0BAF\u0BA4\u0BC1?
\u2022 \u0B8E\u0BA9\u0BCD\u0BA9 \u0BA4\u0BC0\u0BB5\u0BA9\u0BAE\u0BCD?`,
  te: (h, i, p) => `\u0C38\u0C30\u0C47, \u0C2E\u0C40 \u0C35\u0C26\u0C4D\u0C26 ${h} \u0C2A\u0C36uvulu unnayi. ippati varaku ${p}/${h} samacharam vachindi.

#${i} gurinchi cheppandi:
\u2022 breed? \u2022 paalu/dry/garbham?
\u2022 enni rojulu? roju enna litre?
\u2022 enni saarla dhenu? vayassu?
\u2022 ippudu emi feed?`,
  mr: (h, i, p) => `\u0920\u0940\u0915, tumchya kadhe ${h} pashu aahet. aata ${p}/${h} mahiti milali.

Pashu #${i} \u2014 nasl? dudh deto/sukhi/garbha? kiti divas? roj kiti litre?
kiti vela vasa? vay? aata kay khataat?`,
  gu: (h, i, p) => `\u0AA0\u0AC0\u0A95 \u0A9B\u0AC7, \u0AA4\u0AAE\u0ABE\u0AB0\u0AC0 \u0AAA\u0ABE\u0AB8\u0AC7 ${h} \u0AAA\u0AB6u \u0A9B\u0AC7. \u0AB9\u0AAE\u0AA3\u0ABE\u0A82 ${p}/${h} \u0AAE\u0ABE\u0AB9\u0ABF\u0AA4\u0AC0 \u0AAE\u0AB3\u0AC0.

\u0AAA\u0AB6u #${i}: breed? dudh/sukhi/garbh? ketla divas? roj ketla litre?
ketli vaar bachhu? umar? shu khavado cho?`,
  kn: (h, i, p) => `\u0CB8\u0CB0\u0CBF, \u0CA8\u0CBF\u0CAE\u0CCD\u0CAE \u0CAC\u0CB3\u0CBF ${h} \u0CAA\u0CB6u\u0C97\u0CB3\u0CBF\u0CB5\u0CC6. ${p}/${h} \u0CAE\u0CBE\u0CB9\u0CBF\u0CA4\u0CBF \u0CAC\u0C82\u0CA6\u0CBF\u0CA6\u0CC6.

#${i} \u2014 breed? halu/dry/garbha? eshtu dina? dina eshtu litre?
eshtu sala? vayassu? enu feed?`,
  ml: (h, i, p) => `\u0D36\u0D30\u0D3F, \u0D28\u0D3F\u0D19\u0D4D\u0D19\u0D7E\u0D15\u0D4D\u0D15\u0D4D ${h} \u0D2A\u0D36u\u0D15\u0D7E \u0D09\u0D23\u0D4D\u0D1F\u0D4D. ${p}/${h} \u0D35\u0D3F\u0D35\u0D30\u0D02 \u0D32\u0D2D\u0D3F\u0D1A\u0D4D\u0D1A\u0D41.

#${i} \u2014 breed? paal/dry/garbham? etra divasam? daily etra litre?
etra thavana? vayassu? enthu feed?`,
  pa: (h, i, p) => `\u0A20\u0A40\u0A15 \u0A39\u0A48, \u0A24\u0A41\u0A39\u0A3E\u0A21\u0A47 \u0A15\u0A4B\u0A32 ${h} \u0A2A\u0A38\u0A3Cu \u0A39\u0A28\u0964 ${p}/${h} \u0A1C\u0A3E\u0A23\u0A15\u0A3E\u0A30\u0A40 \u0A2E\u0A3F\u0A32\u0A40\u0964

#${i} \u2014 breed? doodh/sukhi/garbhi? kinne din? roz kinna litre?
kinni vaar bachha? umar? ki khilaunde ho?`,
  or: (h, i, p) => `\u0B20\u0B3F\u0B15\u0B4D \u0B05\u0B1B\u0B3F, \u0B06\u0B2A\u0B23\u0B19\u0B4D\u0B15 \u0B2A\u0B3E\u0B16\u0B30\u0B47 ${h} \u0B2A\u0B36u \u0B05\u0B1B\u0B3F\u0964 ${p}/${h} \u0B24\u0B25\u0B4D\u0B5F \u0B2E\u0B3F\u0B33\u0B3F\u0B32\u0B3E\u0964

#${i} \u2014 breed? dudha/dry/garbha? kete dina? daily kete litre?
kete thara bachha? baya? kana khuaanti?`,
  as: (h, i, p) => `\u09A0\u09BF\u0995 \u0986\u099B\u09C7, \u0986\u09AA\u09CB\u09A8\u09BE\u09F0 ${h}\u099F\u09BE \u09AA\u09B6u \u0986\u099B\u09C7\u0964 ${p}/${h} \u09A4\u09A5\u09CD\u09AF \u09AA\u09BE\u09B2\u09CB\u0981\u0964

#${i} \u2014 breed? gakh/dry/garbhini? kiman din? daily kiman litre?
kiman bar bachha? boyos? ki khua?`,
  ur: (h, i, p) => `\u0679\u06BE\u06CC\u06A9 \u06C1\u06D2\u060C \u0622\u067E \u06A9\u06D2 \u067E\u0627\u0633 ${h} \u067E\u0936u \u06C1\u06CC\u06BA\u06D4 ${p}/${h} \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0645\u0644\u06CC\u06D4

#${i} \u2014 nasl? doodh/sukhi/hamla? kitne din? roz kitna litre?
kitni baar bachha? umar? kya khilati hain?`,
  en: (h, i, p) => `OK, you have ${h} animals. I have full details for ${p}/${h} so far.

Tell me about Animal #${i}:
\u2022 Breed?
\u2022 Milking, dry, or pregnant?
\u2022 How long in this state? Daily milk litres?
\u2022 Times calved / age?
\u2022 Current feed (kg)?`
};
var NEED_COUNT = {
  hi: "\u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u0915\u093F\u0924ne \u0921\u0947\u092F\u0930\u0940 \u092A\u0936u hain? \u092A\u0939le yeh batayiye, phir har pashu ki alag jaankari lenge \u2014 nasl, doodh/sukhi/garbh, byaat, chara.",
  bn: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0995\u09A4\u0997\u09C1\u09B2\u09CB \u09A6\u09C1\u0997\u09CD\u09A7 \u09AA\u09B6u \u0986\u099B\u09C7? \u0986\u0997\u09C7 \u09B8\u0982\u0996\u09CD\u09AF\u09BE \u09AC\u09B2\u09C1\u09A8, \u09A4\u09BE\u09B0\u09AA\u09B0 \u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BF\u09B0 \u09A4\u09A5\u09CD\u09AF \u09A8\u09C7\u09AC\u0964",
  ta: "\u0B8E\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BAA\u0BBE\u0BB2\u0BCD \u0BAA\u0BA3\u0BCD\u0BA3ai \u0BAE\u0BBF\u0BB0\u0BC1\u0B95\u0B99\u0BCD\u0B95\u0BB3\u0BCD? \u0BAE\u0BC1\u0BA4\u0BB2\u0BBF\u0BB2\u0BCD \u0B8E\u0BA3\u0BCD\u0BA3\u0BBF\u0B95\u0BCD\u0B95\u0BC8 \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD.",
  te: "Meeku enni dairy pashuvulu unnayi? mundu ennikalu cheppandi.",
  mr: "Kiti pashu aahet? adhi sankhya sanga, mag pratyekachi mahiti gheu.",
  gu: "Ketla pashu che? pehla sankhya kaho, pachhi doro ek ni mahiti.",
  kn: "Eshtu pashu ide? modala ennikke heli.",
  ml: "Ethra pashukal? avasanam ennikam parayuka.",
  pa: "Kinne pashu ne? pehla ginati daso.",
  or: "Kete pashu achhi? prathame sankhya kuhantu.",
  as: "Kiman pashu asse? prothome kiman janabo.",
  ur: "Kitne pashu hain? pehle ginati batayein.",
  en: "How many dairy animals do you have? Tell me the count first, then we'll go through each one."
};
var COUNT_CONFLICT = {
  hi: (c) => `Aapne alag sankhya batayi (${c.join(", ")}). Asal mein kitne pashu hain \u2014 ek number batayiye.`,
  en: (c) => `You mentioned different counts (${c.join(", ")}). How many animals exactly?`
};
function pickLang(lang) {
  return lang && lang in GATHERING ? lang : "hi";
}
function buildDirectGatheringReply(lang, herdSize, animalIndex, profiled) {
  const code = pickLang(lang);
  return `[[LANG:${code}]]
${GATHERING[code](herdSize, animalIndex, profiled)}`;
}
function buildDirectNeedCountReply(lang) {
  const code = pickLang(lang);
  const text = NEED_COUNT[code] ?? NEED_COUNT.hi;
  return `[[LANG:${code}]]
${text}`;
}
function buildDirectCountConflictReply(lang, counts) {
  const code = pickLang(lang);
  const fn = COUNT_CONFLICT[code] ?? COUNT_CONFLICT.hi;
  return `[[LANG:${code}]]
${fn(counts)}`;
}
function buildDirectVerificationReply(lang, herdSize, summaryLines) {
  const code = pickLang(lang);
  const header = code === "hi" ? `Maine yeh samjha \u2014 kul ${herdSize} pashu:
${summaryLines.join("\n")}

Kya sab sahi hai? "haan" likhein to main ration batata/bataati hoon.` : code === "en" ? `I understood \u2014 ${herdSize} animals total:
${summaryLines.join("\n")}

Is this correct? Reply "yes" for ration.` : `${summaryLines.join("\n")}

Total ${herdSize}. Sahi hai? "haan"/yes likhein.`;
  return `[[LANG:${code}]]
${header}`;
}

// catalyst/functions/pashumitra_api/lib/herd-ration-advisor.ts
var DEVANAGARI_DIGITS = "\u0966\u0967\u0968\u0969\u096A\u096B\u096C\u096D\u096E\u096F";
var COUNT_WORDS = [
  [/(?:^|\s)(?:एक|ek|one)(?:\s|$)/giu, " 1 "],
  [/(?:^|\s)(?:दो|do|two)(?:\s|$)/giu, " 2 "],
  [/(?:^|\s)(?:तीन|teen|three)(?:\s|$)/giu, " 3 "],
  [/(?:^|\s)(?:चार|char|chaar|four)(?:\s|$)/giu, " 4 "],
  [/(?:^|\s)(?:पांच|पाँच|panch|paanch|five)(?:\s|$)/giu, " 5 "],
  [/(?:^|\s)(?:छह|छः|chhe|che|six)(?:\s|$)/giu, " 6 "],
  [/(?:^|\s)(?:सात|saat|seven)(?:\s|$)/giu, " 7 "],
  [/(?:^|\s)(?:आठ|aath|eight)(?:\s|$)/giu, " 8 "],
  [/(?:^|\s)(?:नौ|nau|nine)(?:\s|$)/giu, " 9 "],
  [/(?:^|\s)(?:दस|das|ten)(?:\s|$)/giu, " 10 "]
];
var HERD_COUNT_RE = [
  /(?:i have|we have|mere paas|meri|mere|mari|mara|hamare paas|total|)\s*(\d{1,2})\s*(?:cow|cows|buffalo|buffaloes|buffalos|animal|animals|milch|milking|gaay|gai|gay|gaye|bhains|bhens|pashu|pashuon|vaca|पशु|गाय|गायें|भैंस|ગાય|ભેંસ)/i,
  /(\d{1,2})\s*(?:cow|cows|buffalo|buffaloes|animal|animals|milch|gaay|gai|bhains|pashu|गाय|भैंस|પશુ|ગાય|ભેંસ)/i,
  /(?:i have|we have|mere paas|mar[eey] paas|hamare paas)\s*(\d{1,2})\b/i,
  /(\d{1,2})\s*(?:pashu|pahu|pashuvon|pasu|passu|animals|cattle|milch|dairy\s*animals)/i,
  /(?:mere paas|mer[eey] paas|hamare paas)\s*(\d{1,2})\s*(?:pashu|pahu|pasu|passu|hain|hai|aahet|che|unnaru|aachhe)?/i,
  /herd\s*(?:of\s*)?(\d{1,2})/i,
  /(\d{1,2})\s*(?:milch|dairy)\s*(?:animal|cattle|cow)/i,
  /(?:मेर[eey]?|हमार[eey]?)\s*(?:पास|पासे)?\s*(\d{1,2})\s*(?:गाय|गायें|गौ|भैंस|पशु|मवेशी)/u,
  /(\d{1,2})\s*(?:गाय|गायें|भैंस|पशु|मवेशी)/u
];
var HOMOGENEOUS_HERD = /sab same|all same|same breed|ek jaise|ek jaisi|badha same|badhi same|saru same|same type|બધા સમાન|એક જ|pr/i;
var BREED_PATTERNS = [
  [/murrah|मुर्रा|મુર્રા/i, "murrah_buffalo"],
  [/jaffarabadi|jaff/i, "jaffarabadi"],
  [/surti|સુરતી/i, "surti_buffalo"],
  [/gir|गिर|ગીર/i, "gir_cow"],
  [/sahiwal|साहीवाल/i, "gir_cow"],
  [/tharparkar/i, "tharparkar"],
  [/holstein|hf\b|friesian|crossbred|cross|क्रॉस/i, "hf_jersey_cross"],
  [/jersey/i, "hf_jersey_cross"],
  [/buffalo|भैंस|bhains|bhens|ભેંસ/i, "murrah_buffalo"],
  [/desi|indigenous|local|स्थानीय|દેસી/i, "gir_cow"]
];
var STATUS_PATTERNS = [
  [/dry|sukhi|sukha|sookhi|without milk|no milk|doodh nahi|dudh nahi|दूध नही|सूख|शुष्क|સૂક/u, "dry"],
  [/pregnant|gaabhan|garbh|gestation|गर्भ|गर्भवती|गाभिन|ગાભ|expecting|garbhi/u, "pregnant"],
  [/heifer|bachiya|young|not calved|pehli bar|बछिया|young cow|વાછરડ/i, "heifer"],
  [/in milk|milking|doodh de|dudh de|milk giving|दूध दे|दूध देती|दूधार|giving milk|lactating|દૂધ આપ/u, "in_milk"]
];
var REGION_KEYWORDS = [
  [/punjab|haryana|up\b|uttar pradesh|north india|delhi|rajasthan.*north/i, "north"],
  [/gujarat|rajasthan|madhya pradesh|mp\b|west india|गुजरात|ગુજરાત/i, "west"],
  [/karnataka|andhra|telangana|tamil|kerala|south india|दक्षिण/i, "south"],
  [/bengal|bihar|odisha|orissa|assam|east india|wb\b/i, "east"],
  [/maharashtra|deccan|central india|महाराष्ट्र/i, "central"]
];
function conversationText(messages) {
  return messages.map((m) => m.content).join("\n");
}
function userText(messages) {
  return messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
}
function normalizeHerdText(text) {
  let t = String(text || "");
  t = t.replace(/[०-९]/g, (ch) => String(DEVANAGARI_DIGITS.indexOf(ch)));
  t = t.replace(/\bpahu\b/gi, "pashu");
  t = t.replace(/\bpashu\b/gi, "pashu");
  t = t.replace(/\bpas[uú]\b/gi, "pashu");
  t = t.replace(/\bpassu\b/gi, "pashu");
  for (const [re, digit] of COUNT_WORDS) {
    t = t.replace(re, digit);
  }
  return t.replace(/\s+/g, " ").trim();
}
function detectHerdCount(text) {
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
function detectAnimalCount(text) {
  const herd = detectHerdCount(text);
  if (herd !== null) return herd;
  const normalized = normalizeHerdText(text);
  const singlePatterns = [
    /(?:^|\s)(?:1|ek|one)\s*(?:cow|buffalo|gaay|gai|bhains|bhens|milch|pashu|animal|गाय|भैंस|पशु|ગાય|ભેંસ)/iu,
    /(?:mer[eey]?|i have|we have|hamare paas|मेर[eey]?)\s*(?:ek|one|1)\s*(?:cow|buffalo|gaay|gai|bhains|pashu|गाय|भैंस|पशu)/iu,
    /(?:^|\s)(?:1|१)\s*(?:गाय|भैंस|पशu|milch)/u
  ];
  for (const re of singlePatterns) {
    if (re.test(normalized)) return 1;
  }
  return null;
}
function detectRegion(text) {
  for (const [re, region] of REGION_KEYWORDS) {
    if (re.test(text)) return region;
  }
  return "north";
}
function detectSeason() {
  const m = (/* @__PURE__ */ new Date()).getMonth();
  if (m >= 6 && m <= 9) return "kharif";
  if (m >= 10 || m <= 2) return "rabi";
  return "summer";
}
function detectBreed(text) {
  for (const [re, key] of BREED_PATTERNS) {
    if (re.test(text)) return key;
  }
  return null;
}
function detectStatus(text) {
  for (const [re, status] of STATUS_PATTERNS) {
    if (re.test(text)) return status;
  }
  return null;
}
function extractNumber(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1]);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  return null;
}
function defaultFat(breedKey) {
  if (breedKey.includes("buffalo")) return 7;
  if (breedKey === "gir_cow" || breedKey === "tharparkar") return 4.5;
  return 4;
}
function lactationStageFromDim(dim) {
  if (dim === null) return "mid";
  if (dim <= 60) return "early";
  if (dim <= 210) return "mid";
  return "late";
}
function parseLactationNumber(text) {
  if (/pehli|first|1st|pahli|पहली|pratham|પહેલ/i.test(text)) return 1;
  if (/doosri|second|2nd|dusri|दूसरी|બીજ/i.test(text)) return 2;
  if (/teesri|third|3rd|3\+|teen|तीसरी|zyada|more than 2|ત્રીજ/i.test(text)) return 3;
  const baar = extractNumber(text, [
    /(\d+)\s*(?:baar|bar|vaar|sari|saari|times)\s*(?:bachha|bacha|gaabhin|garbh|calv|byaat|vyaat|vaat)/i,
    /(?:kitni|kiti|kinni|keti|ethra|eshtu)\s*(?:baar|bar|vaar)[^\d]{0,24}(\d+)/i,
    /(?:baar|bar|vaar)\s*(\d+)/i
  ]);
  if (baar !== null && baar >= 1 && baar <= 12) return Math.round(baar);
  const n = extractNumber(text, [
    /lactation\s*(?:no\.?|number)?\s*[:\s]?\s*(\d+)/i,
    /(\d+)\s*(?:th|rd|nd|st)\s*lactation/i,
    /(\d+)\s*(?:vi|mi|th)\s*(?:vyaat|byaat|vaat|calving)/i
  ]);
  return n !== null && n >= 1 && n <= 12 ? Math.round(n) : null;
}
function parseAgeYears(text) {
  const n = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*(?:year|years|saal|varsh|वर्ष|yr|વર્ષ)/i,
    /age[:\s]+(\d+(?:\.\d+)?)/i,
    /(\d+)\s*saal/i
  ]);
  return n !== null && n > 0 && n < 25 ? n : null;
}
function parseDim(text) {
  const months = extractNumber(text, [
    /(\d+)\s*(?:month|months|mahine|mahina|महीने|mo|મહિન)/i,
    /calv(?:ed|ing)?\s*(?:\d+\s*)?(?:month|months|mahine|ago|pehle)/i,
    /bachha\s*(\d+)\s*(?:month|mahine)/i
  ]);
  if (months !== null) return Math.min(Math.round(months * 30), 400);
  return null;
}
function parsePregnancyMonth(text) {
  const n = extractNumber(text, [
    /(\d+)\s*(?:month|months|mahine|mahina)\s*(?:pregnan|garbh|gaabhan)/i,
    /pregnan(?:t|cy)[:\s]+(\d+)/i,
    /garbh.*?(\d+)\s*(?:month|mahine)/i
  ]);
  return n !== null && n >= 1 && n <= 9 ? Math.round(n) : null;
}
function parseCurrentFeed(text) {
  const greenKg = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*kg\s*(?:green|hari|berseem|napier|fodder|chara|ghaas|grass|lili|ઘાસ)/i,
    /(?:green|hari|berseem|napier|chara|ghaas|lili)[^\d]{0,24}(\d+(?:\.\d+)?)\s*kg/i
  ]) ?? 0;
  const dryKg = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*kg\s*(?:dry|straw|bhusa|sukha|parali|stover|bhosa)/i,
    /(?:straw|bhusa|sukha|dry|bhosa|parali)[^\d]{0,24}(\d+(?:\.\d+)?)\s*kg/i
  ]) ?? 0;
  const concentrateKg = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*kg\s*(?:concentrate|compound|feed|dana|daana|khali|cake|pellet|mittha|dan)/i,
    /(?:concentrate|compound feed|dana|daana|khali|cake|dan)[^\d]{0,24}(\d+(?:\.\d+)?)\s*kg/i
  ]) ?? 0;
  const hasFeedWords = /chara|chare|feed|fodder|bhusa|straw|dana|daana|khali|berseem|ghaas|ચાર/i.test(text);
  const note = hasFeedWords ? text.slice(0, 160).replace(/\s+/g, " ") : "";
  return { greenKg, dryKg, concentrateKg, note };
}
function parseMilkKg(text, herdSize) {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b)\s*(?:milk|doodh|dudh|दूध|દૂધ)/i,
    /(\d+(?:\.\d+)?)\s*(?:kg|l)\s*(?:milk|doodh|dudh)/i,
    /(?:milk|doodh|dudh|दूध|દૂધ)[^\d]{0,12}(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|kg)/i,
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|लीटर|लिटर)\s*(?:\/|per|roz|daily|din|रोज)?/iu,
    /(?:roz|रोज|प्रतिदिन)\s*(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l\b|kg|लीटर|लिटर)/iu,
    /subah[^.\d]{0,40}(\d+(?:\.\d+)?)[^\d]{0,20}(?:shaam|sandhya)[^\d]{0,20}(\d+(?:\.\d+)?)/i
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
function emptySlot(index) {
  return {
    profile: { index, status: "unknown" },
    missing: ["breed (kaun si nasl)", "status (doodh / sukhi / garbh)", "kitni baar bachha ya umar", "current feed (ab kya khilati hain)"],
    complete: false
  };
}
function mergeProfile(base, incoming) {
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
      note: incoming.currentFeed.note || base.currentFeed?.note || ""
    };
  }
  return out;
}
function buildProfileFromSegment(segment, index, herdSize) {
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
  let status = statusDetected ?? "unknown";
  if (status === "unknown" && milkKg > 0) status = "in_milk";
  const lactationStage = status === "dry" ? "dry" : lactationStageFromDim(dim);
  const profile = {
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
    pregnant: pregnant || pregnancyMonth !== null && pregnancyMonth >= 7,
    pregnancyMonth,
    currentFeed
  };
  const breedDetected = detectBreed(segment);
  const breedExplicit = breedDetected !== null;
  const statusExplicit = statusDetected !== null || milkKg > 0 && /milk|doodh|dudh|litre|liter|ltr|l\b|roz|subah|shaam/i.test(segment);
  const hasLactationOrAge = lactationNumber !== null || ageYears !== null;
  const hasFeedData = currentFeed.greenKg + currentFeed.dryKg + currentFeed.concentrateKg > 0 || currentFeed.note.length > 0 && /chara|feed|bhusa|dana|khali|berseem|ghaas|straw/i.test(segment);
  const missing = [];
  if (!breedExplicit) missing.push("breed (kaun si nasl \u2014 Gir, Murrah, crossbred?)");
  if (!statusExplicit) missing.push("status (ab doodh de rahi hai, sukhi hai, ya garbh mein?)");
  if (status === "in_milk" && milkKg <= 0) missing.push("daily milk (roz kitna litre dudh?)");
  if (!hasLactationOrAge) missing.push("kitni baar bachha hua / gaabhin hui, ya kitne saal ki (pehli/doosri byaat)?");
  if (!hasFeedData) missing.push("current feed (ab kya khilati ho \u2014 hara chara, sukha, dana kitna kg?)");
  const complete = breedExplicit && statusExplicit && (status !== "in_milk" || milkKg > 0) && hasLactationOrAge && hasFeedData;
  return { profile, missing, complete };
}
function evaluateSlot(profile) {
  const segment = [
    profile.breedName,
    profile.status,
    profile.milkKg ? `${profile.milkKg} litre` : "",
    profile.lactationNumber ? `lactation ${profile.lactationNumber}` : "",
    profile.ageYears ? `${profile.ageYears} years` : "",
    profile.currentFeed?.note,
    profile.currentFeed?.greenKg ? `${profile.currentFeed.greenKg} kg green` : "",
    profile.currentFeed?.dryKg ? `${profile.currentFeed.dryKg} kg dry` : "",
    profile.currentFeed?.concentrateKg ? `${profile.currentFeed.concentrateKg} kg concentrate` : ""
  ].filter(Boolean).join(" ");
  return buildProfileFromSegment(segment, profile.index ?? 1, null);
}
function buildSlotsFromConversation(messages, herdSize) {
  const slots = Array.from({ length: herdSize }, (_, i) => emptySlot(i + 1));
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
        profile: { ...slots[0].profile, index: i + 1 }
      };
    }
  }
  return slots;
}
function estimateCurrentFeedCost(profile, region, season) {
  const feeds = pickSeasonFeeds(season);
  const prices = REGION_PRICES[region];
  const f = profile.currentFeed;
  if (f.greenKg + f.dryKg + f.concentrateKg === 0) return 0;
  const greenPrice = prices[feeds.green] ?? 1.5;
  const dryPrice = prices[feeds.dry] ?? 5;
  const concPrice = prices[feeds.conc] ?? 26;
  return f.greenKg * greenPrice + f.dryKg * dryPrice + f.concentrateKg * concPrice + 0.15 * (prices.mineral_mixture ?? 70);
}
function computeAnimalRation(profile, region, season) {
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
function formatAnimalBlock(computed) {
  const { profile, req, result, currentCost, optimalCost, savings } = computed;
  const lines = result.ration.map((r) => `    \u2022 ${r.name}: ${r.asFeKg} kg/day (\u20B9${r.cost.toFixed(0)}/day)`);
  const statusLabel = profile.status === "in_milk" ? `In milk \u2014 ${profile.milkKg} kg/day, fat ${profile.fatPct}%` : profile.status === "pregnant" ? `Pregnant${profile.pregnancyMonth ? ` (${profile.pregnancyMonth} months)` : ""}` : profile.status === "heifer" ? "Young/heifer" : "Dry (not milking)";
  return [
    `  Animal #${profile.index}: ${profile.breedName} | ${statusLabel}`,
    profile.lactationNumber ? `    Byaat (kitni baar bachha): ${profile.lactationNumber}` : "",
    profile.ageYears ? `    Age: ~${profile.ageYears} years` : "",
    profile.status === "in_milk" ? `    4% FCM: ${req.fcm.toFixed(1)} kg` : "",
    `    Balanced daily ration:`,
    ...lines,
    `    Optimal cost: \u20B9${optimalCost.toFixed(0)}/day`,
    currentCost > 0 ? `    Current feed cost (estimated): \u20B9${currentCost.toFixed(0)}/day` : "",
    `    Estimated saving: \u20B9${savings.toFixed(0)}/day${currentCost <= 0 ? " (approx \u2014 NDDB avg ~\u20B916\u201325/animal/day)" : ""}`
  ].filter(Boolean).join("\n");
}
function aggregateHerd(computed) {
  const ingredientTotals = {};
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
function gatherPrompt(herdSize, slots) {
  const next = slots.find((s) => !s.complete) ?? slots[0];
  const idx = next.profile.index ?? 1;
  const missingList = next.missing.slice(0, 4).map((m) => `- ${m}`).join("\n");
  const profiled = slots.filter((s) => s.complete).length;
  return [
    "\u26A0\uFE0F HERD RATION \u2014 QUESTIONS ONLY (MANDATORY THIS TURN)",
    "The farmer has NOT given enough details yet. You MUST ask follow-up questions.",
    "FORBIDDEN this turn: ration tables, kg amounts, feed plans, cost estimates, generic ration advice from knowledge base.",
    "FORBIDDEN: answering from general knowledge \u2014 only ask questions.",
    "",
    `DECLARED HERD SIZE: ${herdSize} animals. Fully profiled: ${profiled}/${herdSize}.`,
    profiled === 0 ? `Farmer stated ${herdSize} animals but gave NO per-animal details yet. Acknowledge the count, then ask about Animal #1.` : `Still need details for ${herdSize - profiled} more animal(s). Now ask about Animal #${idx}.`,
    "",
    `You MUST collect complete details for ALL ${herdSize} animals (breed, status, milk if milking, byaat/age, current feed) before any ration can be calculated.`,
    `Ask about Animal #${idx} \u2014 use farmer's language (all 12 Indian languages + English).`,
    "",
    "NEVER use hard words like 'lactation', 'DIM', 'parity'. Use: byaat, bachha hua, gaabhin, doodh deti, sukhi.",
    "",
    "Ask 2\u20134 short questions for THIS animal:",
    "  \u2022 Breed? (Murrah, Gir, desi, cross?)",
    "  \u2022 Milking, dry, or pregnant?",
    "  \u2022 How long in this state? Daily milk litres if milking?",
    "  \u2022 How many times calved / pregnant before? Age?",
    "  \u2022 Current feed \u2014 green fodder, straw, concentrate (kg)?",
    "",
    `Still missing for Animal #${idx}:`,
    missingList,
    "",
    `After Animal #${idx}, continue until all ${herdSize} animals are profiled.`,
    "If all animals are identical, ask once: 'Are all the same?' then copy details.",
    "End with a line inviting the farmer to reply."
  ].join("\n");
}
function initialCountPrompt() {
  return [
    "\u26A0\uFE0F RATION ADVISORY \u2014 QUESTIONS ONLY (MANDATORY THIS TURN)",
    "Farmer opened Ration Advisory. Reply in THEIR language only (from language lock).",
    "First ask: how many dairy animals (gaay/bhains/pashu)?",
    "Then ask 2\u20133 more about breed, status (doodh/sukhi/garbh), feed \u2014 for Animal #1.",
    "FORBIDDEN this turn: ration tables, kg amounts, feed plans, cost estimates, generic ration advice.",
    "Do NOT give balanced ration until ALL animals are fully profiled and farmer confirms summary."
  ].join("\n");
}
function resolveDeclaredCount(messages) {
  const declared = [];
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
function countConflictPrompt(uniqueCounts) {
  return [
    "\u26A0\uFE0F HERD COUNT MISMATCH \u2014 QUESTIONS ONLY (MANDATORY THIS TURN)",
    `Farmer mentioned different animal counts: ${uniqueCounts.join(", ")}.`,
    "Ask in farmer's language: 'Aapne alag alag sankhya batayi \u2014 asal mein kitne pashu hain?'",
    "Clarify the EXACT total before continuing. No ration advice this turn."
  ].join("\n");
}
function formatSlotSummary(slots) {
  return slots.map((s) => {
    const p = s.profile;
    const st = p.status ?? "unknown";
    const milk = p.milkKg && p.milkKg > 0 ? `${p.milkKg} L/day` : "-";
    return `  Animal #${p.index}: ${p.breedName ?? "?"} | ${st} | milk ${milk} | byaat/age ${p.lactationNumber ?? p.ageYears ?? "?"}`;
  }).join("\n");
}
function verificationPrompt(herdSize, slots) {
  return [
    "\u26A0\uFE0F HERD RATION \u2014 VERIFY BEFORE COMPUTE (MANDATORY THIS TURN)",
    `All ${herdSize} animals profiled. Read back summary and ask farmer to CONFIRM before giving ration.`,
    "FORBIDDEN this turn: ration kg amounts, feed tables, cost estimates.",
    "",
    "PARSED SUMMARY (read back in farmer's language):",
    formatSlotSummary(slots),
    "",
    `Confirm total count: ${herdSize} animals matches what farmer said.`,
    "Ask: 'Kya yeh sab sahi hai? Haan likhein to main ration batata/bataati hoon.'",
    "If farmer says no or corrects details, ask only about the corrected animal \u2014 do not compute yet."
  ].join("\n");
}
var CONFIRM_RE = /^(haan|han|ha|ji|yes|y|ok|okay|theek|thik|sahi|correct|confirm|right|हाँ|हां|जी|ठीक|सही|बराबर|બરાબર|ஆம்|అవును|হ্যাঁ|ঠিক|yes please)/iu;
function verificationWasRequested(messages) {
  const assistants = messages.filter((m) => m.role === "assistant").map((m) => m.content);
  const last = assistants[assistants.length - 1] ?? "";
  return /verify|confirm|sahi|theek|thik|punah|dohra|summary|इस तरह|ठीक है|confirm/i.test(last);
}
function farmerConfirmed(messages) {
  const users = messages.filter((m) => m.role === "user");
  const last = users[users.length - 1]?.content.trim() ?? "";
  if (!last) return false;
  if (/^(nahi|na|no|galat|wrong|गलत|नही)/iu.test(last)) return false;
  return CONFIRM_RE.test(last) || /^(haan|han|ji)\b/iu.test(last);
}
function buildRationAdvisoryHint(messages, animalCount) {
  const all = conversationText(messages);
  const region = detectRegion(all);
  const season = detectSeason();
  const slots = buildSlotsFromConversation(messages, animalCount);
  const allComplete = slots.every((s) => s.complete);
  if (!allComplete) {
    return gatherPrompt(animalCount, slots);
  }
  const profiles = slots.map((s) => ({
    index: s.profile.index ?? 1,
    breedKey: s.profile.breedKey ?? "hf_jersey_cross",
    breedName: s.profile.breedName ?? "Dairy animal",
    bodyWeight: s.profile.bodyWeight ?? 450,
    status: s.profile.status === "unknown" ? "in_milk" : s.profile.status,
    milkKg: s.profile.milkKg ?? 0,
    fatPct: s.profile.fatPct ?? 4,
    lactationStage: s.profile.lactationStage ?? "mid",
    lactationNumber: s.profile.lactationNumber ?? null,
    ageYears: s.profile.ageYears ?? null,
    pregnant: s.profile.pregnant ?? false,
    pregnancyMonth: s.profile.pregnancyMonth ?? null,
    currentFeed: s.profile.currentFeed ?? { greenKg: 0, dryKg: 0, concentrateKg: 0, note: "" }
  }));
  const computed = profiles.map((p) => computeAnimalRation(p, region, season));
  const agg = aggregateHerd(computed);
  const herdLines = Object.values(agg.ingredientTotals).sort((a, b) => b.kg - a.kg).map((i) => `  \u2022 ${i.name}: ${i.kg.toFixed(1)} kg/day total (\u20B9${i.cost.toFixed(0)}/day)`);
  const perAnimal = computed.map((c) => formatAnimalBlock(c)).join("\n\n");
  return [
    "HERD RATION ADVISORY \u2014 COMPUTED RESULTS (use these EXACT numbers)",
    `Herd: ${animalCount} animals | Region: ${region} | Season: ${season}`,
    "",
    "\u2550\u2550 STEP 1 \u2014 HERD PREP (tell farmer FIRST: how much to prepare/mix for whole herd today) \u2550\u2550",
    "TOTAL DAILY FOR WHOLE HERD \u2014 mix/prepare these amounts for all animals together:",
    ...herdLines,
    `  \u2022 Mineral mixture: ${(0.15 * animalCount).toFixed(2)} kg/day`,
    "",
    `Herd cost: \u20B9${agg.totalOptimal.toFixed(0)}/day (\u20B9${(agg.totalOptimal * 30).toFixed(0)}/month)`,
    agg.totalCurrent > 0 ? `Saving ~\u20B9${agg.totalSavings.toFixed(0)}/day vs current feed` : `Typical saving ~\u20B9${(25.5 * animalCount).toFixed(0)}/day (NDDB average)`,
    "",
    "\u2550\u2550 STEP 2 \u2014 PER ANIMAL (tell farmer SECOND: each animal's daily share) \u2550\u2550",
    "PER ANIMAL \u2014 how much of the ration each animal gets:",
    perAnimal,
    "",
    "PRESENTATION RULES FOR FARMER (mandatory):",
    "1. Reply in farmer's language (hi/bn/ta/te/mr/gu/kn/ml/pa/or/as/ur/en \u2014 same as their messages).",
    "2. Section A first: 'Poori mandli ke liye aaj itna tayyar karein' + herd totals (green, dry, concentrate, mineral kg).",
    "3. Section B second: 'Har pashu ko alag' \u2014 each animal with breed, status (doodh/sukhi/garbh), milk if any, and its kg.",
    "4. Simple village words only \u2014 no lactation/DIM/parity.",
    "5. Use exact kg and \u20B9 from this block \u2014 do not recalculate."
  ].join("\n");
}
function computeRationAdvisoryPhase(messages) {
  const countInfo = resolveDeclaredCount(messages);
  if (countInfo.conflict) {
    return { type: "count_conflict", uniqueCounts: countInfo.uniqueCounts };
  }
  const animalCount = countInfo.count;
  if (animalCount === null) return { type: "need_count" };
  const slots = buildSlotsFromConversation(messages, animalCount);
  const profiled = slots.filter((s) => s.complete).length;
  const next = slots.find((s) => !s.complete) ?? slots[0];
  const animalIndex = next.profile.index ?? 1;
  if (profiled < animalCount) {
    return { type: "gather", herdSize: animalCount, animalIndex, profiled };
  }
  const users = messages.filter((m) => m.role === "user");
  const lastUser = users[users.length - 1]?.content.trim() ?? "";
  if (verificationWasRequested(messages) && /^(nahi|na|no|galat|wrong|गलत|नही)/iu.test(lastUser)) {
    const slots2 = buildSlotsFromConversation(messages, animalCount);
    const p2 = slots2.filter((s) => s.complete).length;
    const n2 = slots2.find((s) => !s.complete) ?? slots2[0];
    return { type: "gather", herdSize: animalCount, animalIndex: n2.profile.index ?? 1, profiled: p2 };
  }
  if (!verificationWasRequested(messages) || !farmerConfirmed(messages)) {
    const summaryLines = slots.map((s) => {
      const p = s.profile;
      const milk = p.milkKg && p.milkKg > 0 ? `${p.milkKg}L` : "-";
      return `#${p.index}: ${p.breedName ?? "?"} | ${p.status ?? "?"} | milk ${milk}`;
    });
    return { type: "verify", herdSize: animalCount, summaryLines };
  }
  return { type: "compute", herdSize: animalCount };
}
function getRationAdvisoryDirectReply(messages, lang) {
  const phase = computeRationAdvisoryPhase(messages);
  switch (phase.type) {
    case "need_count":
      return buildDirectNeedCountReply(lang);
    case "count_conflict":
      return buildDirectCountConflictReply(lang, phase.uniqueCounts);
    case "gather":
      return buildDirectGatheringReply(lang, phase.herdSize, phase.animalIndex, phase.profiled);
    case "verify":
      return buildDirectVerificationReply(lang, phase.herdSize, phase.summaryLines);
    default:
      return null;
  }
}
function tryRationAdvisoryHint(messages) {
  const phase = computeRationAdvisoryPhase(messages);
  switch (phase.type) {
    case "need_count":
      return initialCountPrompt();
    case "count_conflict":
      return countConflictPrompt(phase.uniqueCounts);
    case "gather":
      return gatherPrompt(phase.herdSize, buildSlotsFromConversation(messages, phase.herdSize));
    case "verify":
      return verificationPrompt(phase.herdSize, buildSlotsFromConversation(messages, phase.herdSize));
    case "compute":
      return buildRationAdvisoryHint(messages, phase.herdSize);
  }
}
function isHerdGathering(hint) {
  return hint !== null && (hint.includes("QUESTIONS ONLY") || hint.includes("VERIFY BEFORE COMPUTE"));
}
function isVerificationStep(hint) {
  return hint !== null && hint.includes("VERIFY BEFORE COMPUTE");
}
function isRationComputed(hint) {
  return hint !== null && hint.includes("COMPUTED RESULTS");
}

// catalyst/functions/pashumitra_api/lib/content-safety.ts
var CONTENT_SAFETY_RULES = "CONTENT SAFETY (NON-NEGOTIABLE): Never use profanity, slurs, sexual abuse, hate speech, or insults in ANY language (Hindi, English, Hinglish, Gujarati, etc.). If the farmer uses abusive words, respond calmly in their language: ask them to rephrase politely and say PashuMitra helps with dairy and livestock only. Do NOT repeat, quote, or spell out abusive words. Do NOT transcribe abusive speech verbatim.";
var DEVANAGARI_DIGITS2 = "\u0966\u0967\u0968\u0969\u096A\u096B\u096C\u096D\u096E\u096F";
var ABUSE_PATTERNS = [
  /\bm(?:adarchod|aderchod|c)\b/i,
  /\bb(?:henchod|hen(?:c|k)(?:hod|d))\b/i,
  /\bchutiy(?:a|e|i)\b/i,
  /\bgaand(?:u|)\b/i,
  /\bl(?:und|oda)\b/i,
  /\b(?:f+u+c+k+|fuk)\b/i,
  /\b(?:s+h+i+t+)\b/i,
  /\b(?:b+i+t+c+h+)\b/i,
  /\b(?:a+s+s+h+o+l+e)\b/i,
  /\b(?:c+u+n+t+)\b/i,
  /\b(?:d+i+c+k+|dickhead)\b/i,
  /\b(?:p+i+s+s+)\b/i,
  /\b(?:b+s+d+k+|bsdk)\b/i,
  /\b(?:mc|bc)\b/i,
  /म(?:ादर|ader)चोद/u,
  /बह(?:ेन|en)चोद/u,
  /चूत(?:िया|िये)/u,
  /ग(?:ां|ा)ड/u,
  /ल(?:ौ|ो)ड(?:ा|े)/u,
  /हराम(?:ी|ि)/u,
  /क(?:ा|ा)म(?:ी|िन)/u,
  /स(?:ा|ा)ल(?:ा|े)/u,
  /भ(?:ो|o)s(?:ड|d)(?:ी|i|u)/u,
  /ભ(?:ો|o)s(?:ડ|d)(?:ી|i)/u,
  /ચૂત(?:િય|iy)/u,
  /বেশ(?:্য|ya)/u,
  /ப(?:்|)த(?:ி|i)க(?:ா|a)ர/u
];
function normalizeForSafety(text) {
  return String(text || "").normalize("NFKC").toLowerCase().replace(/[०-९]/g, (ch) => String(DEVANAGARI_DIGITS2.indexOf(ch))).replace(/(.)\1{2,}/g, "$1$1").replace(/[@4]/g, "a").replace(/3/g, "e").replace(/1/g, "i").replace(/0/g, "o").replace(/[$5]/g, "s").replace(/\s+/g, " ").trim();
}
function containsAbusiveLanguage(text) {
  if (!text?.trim()) return false;
  const normalized = normalizeForSafety(text);
  return ABUSE_PATTERNS.some((re) => re.test(normalized) || re.test(text));
}
function filterAbusiveLanguage(text) {
  if (!text?.trim()) return text;
  let out = text;
  for (const re of ABUSE_PATTERNS) {
    out = out.replace(re, "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}
function abuseRefusalMessage(lang = "hi") {
  const messages = {
    hi: "[[LANG:hi]]\n\u0915\u0943\u092A\u092F\u093E \u0936\u093E\u0932\u0940\u0928 \u092D\u093E\u0937\u093E \u092E\u0947\u0902 \u092A\u0942\u091B\u0947\u0902\u0964 PashuMitra \u0921\u0947\u092F\u0930\u0940 \u0914\u0930 \u092A\u0936\u0941\u092A\u093E\u0932\u0928 \u092E\u0947\u0902 \u092E\u0926\u0926 \u0915\u0947 \u0932\u093F\u090F \u0939\u0948\u0964 \u0906\u092A\u0915\u093E \u0938\u0935\u093E\u0932 \u0926\u094B\u092C\u093E\u0930\u093E \u0932\u093F\u0916\u0947\u0902 \u092F\u093E \u092C\u094B\u0932\u0947\u0902\u0964",
    gu: "[[LANG:gu]]\n\u0A95\u0AC3\u0AAA\u0ABE \u0A95\u0AB0\u0AC0\u0AA8\u0AC7 \u0AB8\u0AAD\u0ACD\u0AAF \u0AAD\u0ABE\u0AB7\u0ABE\u0AAE\u0ABE\u0A82 \u0AAA\u0AC2\u0A9B\u0ACB. PashuMitra \u0AA1\u0AC7\u0AB0\u0AC0 \u0A85\u0AA8\u0AC7 \u0AAA\u0AB6\u0AC1\u0AAA\u0ABE\u0AB2\u0AA8 \u0AAE\u0ABE\u0A9F\u0AC7 \u0A9B\u0AC7. \u0AA4\u0AAE\u0ABE\u0AB0\u0ACB \u0AAA\u0ACD\u0AB0\u0AB6\u0ACD\u0AA8 \u0AAB\u0AB0\u0AC0 \u0AB2\u0A96\u0ACB \u0A85\u0AA5\u0AB5\u0ABE \u0AAC\u0ACB\u0AB2\u0ACB.",
    mr: "[[LANG:mr]]\n\u0915\u0943\u092A\u092F\u093E \u0936\u093F\u0938\u094D\u0924 \u092D\u093E\u0937\u0947\u0924 \u0935\u093F\u091A\u093E\u0930\u093E. PashuMitra \u0921\u0947\u0905\u0930\u0940 \u0935 \u092A\u0936\u0941\u092A\u093E\u0932\u0928\u093E\u0938\u093E\u0920\u0940 \u0906\u0939\u0947.",
    bn: "[[LANG:bn]]\n\u09A6\u09AF\u09BC\u09BE \u0995\u09B0\u09C7 \u09AD\u09A6\u09CD\u09B0 \u09AD\u09BE\u09B7\u09BE\u09AF\u09BC \u099C\u09BF\u099C\u09CD\u099E\u09BE\u09B8\u09BE \u0995\u09B0\u09C1\u09A8\u0964 PashuMitra \u09A6\u09C1\u0997\u09CD\u09A7 \u0993 \u09AA\u09B6\u09C1\u09AA\u09BE\u09B2\u09A8\u09C7 \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09C7\u0964",
    ta: "[[LANG:ta]]\n\u0BA4\u0BAF\u0BB5\u0BC1\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BC1 \u0BAE\u0BB0\u0BBF\u0BAF\u0BBE\u0BA4\u0BC8\u0BAF\u0BBE\u0BA9 \u0BAE\u0BCA\u0BB4\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0B95\u0BC7\u0BB3\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD. PashuMitra \u0BAA\u0BA3\u0BCD\u0BA3\u0BC8 \u0BB5\u0BB3\u0BB0\u0BCD\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0B89\u0BA4\u0BB5\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1.",
    te: "[[LANG:te]]\n\u0C26\u0C2F\u0C1A\u0C47\u0C38\u0C3F \u0C2E\u0C30\u0C4D\u0C2F\u0C3E\u0C26\u0C17\u0C3E \u0C05\u0C21\u0C17\u0C02\u0C21\u0C3F. PashuMitra \u0C2A\u0C3E\u0C32 \u0C2A\u0C36\u0C41 \u0C38\u0C39\u0C3E\u0C2F\u0C15\u0C41\u0C21\u0C41.",
    en: "[[LANG:en]]\nPlease use respectful language. PashuMitra helps with dairy and livestock \u2014 ask your question again politely."
  };
  return messages[lang] || messages.hi;
}
function detectLangForRefusal(text) {
  const counts = {};
  const add = (code) => {
    counts[code] = (counts[code] || 0) + 1;
  };
  for (const char of text) {
    const cp = char.codePointAt(0) || 0;
    if (cp >= 2304 && cp <= 2431) add(/[ळऱ]/.test(char) ? "mr" : "hi");
    else if (cp >= 2432 && cp <= 2559) add(/[ৰৱ]/.test(char) ? "as" : "bn");
    else if (cp >= 2816 && cp <= 2943) add("or");
    else if (cp >= 2560 && cp <= 2687) add("pa");
    else if (cp >= 2688 && cp <= 2815) add("gu");
    else if (cp >= 2944 && cp <= 3071) add("ta");
    else if (cp >= 3072 && cp <= 3199) add("te");
    else if (cp >= 3200 && cp <= 3327) add("kn");
    else if (cp >= 3328 && cp <= 3455) add("ml");
    else if (cp >= 1536 && cp <= 1791) add("ur");
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (best) return best;
  if (/^[a-z0-9\s.,!?'"()-]+$/i.test(text)) return "en";
  return "hi";
}

// catalyst/functions/pashumitra_api/lib/youtube-channels.ts
var OFFICIAL_CHANNEL_SOURCES = [
  { key: "nddb", handle: "NationalDairyDevelopmentBoard" },
  { key: "nddb_official", handle: "NDDBOfficial" },
  { key: "nddb_dairy_services", handle: "NDDBDairyServices" },
  { key: "amul", username: "amultv" },
  { key: "banas", handle: "BanasDairyOfficial" },
  { key: "banas_alt", handle: "banasdairy" },
  { key: "nandini", handle: "KMFNANDINI" },
  { key: "mother_dairy", handle: "MotherDairyFruitVegetable" },
  { key: "mother_dairy_alt", handle: "MotherDairyIndia" },
  { key: "saras", handle: "SarasDairyRajasthan" },
  { key: "verka", handle: "VerkaMilkPlant" },
  { key: "aavin", handle: "AavinOfficial" },
  { key: "sudha", handle: "SudhaDairyOfficial" },
  { key: "gokul", handle: "GokulMilk" },
  { key: "parag", handle: "ParagMilkFoods" },
  { key: "dudhsagar", handle: "DudhsagarDairy" },
  { key: "milma", handle: "MilmaCooperative" },
  { key: "aarey", handle: "AareyMilk" },
  { key: "warana", handle: "WaranaDairy" },
  { key: "wamul", handle: "WAMULOfficial" },
  { key: "kwality", handle: "KwalityDairyIndia" },
  { key: "omfed", handle: "OMFEDOfficial" },
  { key: "vijaya", handle: "VijayaDairyAP" },
  { key: "nandini_alt", handle: "NandiniMilk" }
];
var OFFICIAL_CHANNEL_NAME_PATTERNS = [
  /national dairy development board/i,
  /\bnddb\b/i,
  /nddb dairy services/i,
  /^amul\b/i,
  /\bamul tv\b/i,
  /\bgcmmf\b/i,
  /gujarat cooperative milk/i,
  /banas dairy/i,
  /banaskantha district cooperative/i,
  /karnataka milk federation/i,
  /\bnandini\b/i,
  /mother dairy/i,
  /\bsaras\b/i,
  /rajasthan cooperative dairy/i,
  /\bverka\b/i,
  /punjab state cooperative milk/i,
  /milkfed punjab/i,
  /\baavin\b/i,
  /tamil nadu cooperative milk/i,
  /\bsudha\b/i,
  /bihar state cooperative.*milk/i,
  /\bcomfed\b/i,
  /gokul milk/i,
  /kolhapur milk/i,
  /\bparag milk/i,
  /pradeshik cooperative dairy/i,
  /dudhsagar dairy/i,
  /mehsana district cooperative/i,
  /\bmilma\b/i,
  /kerala cooperative milk/i,
  /aarey milk/i,
  /maharashtra rajya dairy/i,
  /warana dairy/i,
  /\bwamul\b/i,
  /west assam milk/i,
  /\bomfed\b/i,
  /odisha state cooperative milk/i,
  /\bvijaya\b.*dairy/i,
  /district cooperative milk producers/i,
  /district milk union/i,
  /milk producers union/i,
  /milk producers'? cooperative/i,
  /state cooperative.*milk/i,
  /cooperative milk producers union/i,
  /milk federation/i,
  /kwality.*dairy/i
];
var OFFICIAL_CHANNEL_HANDLE_PATTERNS = [
  /nationaldairydevelopmentboard/i,
  /nddbofficial/i,
  /nddbdairyservices/i,
  /amultv/i,
  /banasdairy/i,
  /kmfnandini/i,
  /nandini/i,
  /motherdairy/i,
  /sarasdairy/i,
  /verka/i,
  /aavin/i,
  /sudha/i,
  /gokulmilk/i,
  /parag/i,
  /dudhsagar/i,
  /milma/i,
  /aarey/i,
  /warana/i,
  /wamul/i,
  /kwality/i,
  /omfed/i,
  /vijaya/i
];
function isOfficialChannelMeta(authorName, authorUrl) {
  if (OFFICIAL_CHANNEL_NAME_PATTERNS.some((re) => re.test(authorName))) return true;
  if (OFFICIAL_CHANNEL_HANDLE_PATTERNS.some((re) => re.test(authorUrl.toLowerCase()))) return true;
  return false;
}
var resolvedIdsCache = null;
async function resolveOfficialChannelIds(apiKey) {
  if (resolvedIdsCache) return resolvedIdsCache;
  const ids = /* @__PURE__ */ new Set();
  const extra = Deno.env.get("YOUTUBE_ALLOWED_CHANNEL_IDS") || "";
  for (const part of extra.split(",")) {
    const id = part.trim();
    if (id.startsWith("UC")) ids.add(id);
  }
  if (!apiKey) {
    resolvedIdsCache = ids;
    return ids;
  }
  for (const src of OFFICIAL_CHANNEL_SOURCES) {
    try {
      let url;
      if (src.handle) {
        url = new URL("https://www.googleapis.com/youtube/v3/channels");
        url.searchParams.set("part", "id");
        url.searchParams.set("forHandle", src.handle.replace(/^@/, ""));
        url.searchParams.set("key", apiKey);
      } else if (src.username) {
        url = new URL("https://www.googleapis.com/youtube/v3/channels");
        url.searchParams.set("part", "id");
        url.searchParams.set("forUsername", src.username);
        url.searchParams.set("key", apiKey);
      } else continue;
      const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(6e3) });
      if (!resp.ok) continue;
      const data = await resp.json();
      const id = data?.items?.[0]?.id;
      if (typeof id === "string" && id.startsWith("UC")) ids.add(id);
    } catch {
    }
  }
  resolvedIdsCache = ids;
  return ids;
}
async function getVideoChannelId(videoId, apiKey) {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", apiKey);
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(6e3) });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.items?.[0]?.snippet?.channelId || null;
  } catch {
    return null;
  }
}
async function isOfficialVideo(videoId, oembed, apiKey, allowedChannelIds) {
  const authorName = oembed.author_name || oembed.channel || "";
  const authorUrl = oembed.author_url || "";
  if (isOfficialChannelMeta(authorName, authorUrl)) return true;
  if (apiKey && allowedChannelIds.size) {
    const channelId = await getVideoChannelId(videoId, apiKey);
    if (channelId && allowedChannelIds.has(channelId)) return true;
  }
  return false;
}

// catalyst/functions/pashumitra_api/lib/youtube-search.ts
var CURATED_VIDEOS = [
  { id: "4TCt7b1q5aQ", title: "Ration Balancing Programme", topics: ["ration", "feed", "balanced", "poshan", "aahar", "lcf", "tdn"] },
  { id: "LZnqdJjCJiE", title: "NDDB Samvad \u2014 Clean milk at DCS", topics: ["clean milk", "cooperative", "dcs", "procurement", "quality"] }
];
var YOUTUBE_REQUEST = /youtube|youtu\.be|video link|वीडियो|youtube link|watch video|कोई वीडियो|ভিডিও|வீடியோ|వీడియో|व्हिडिओ|યુટ્યુબ|youtube का|लिंक दे|link de/i;
function videoUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}
async function fetchOembed(id) {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl(id))}&format=json`,
      { signal: AbortSignal.timeout(4e3) }
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
async function verifyOfficialVideo(id, apiKey, allowed) {
  const oembed = await fetchOembed(id);
  if (!oembed?.title) return null;
  const ok = await isOfficialVideo(id, oembed, apiKey, allowed);
  if (!ok) return null;
  return { id, title: String(oembed.title), url: videoUrl(id), channel: oembed.author_name };
}
async function searchInChannel(channelId, query, max, key) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("q", query);
  url.searchParams.set("order", "relevance");
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("key", key);
  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8e3) });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.items || []).map((item) => item?.id?.videoId).filter((id) => typeof id === "string");
}
function matchCurated(query, max) {
  const q = query.toLowerCase();
  const scored = CURATED_VIDEOS.map((v) => {
    let score = 0;
    for (const t of v.topics) if (q.includes(t)) score += 2;
    if (/ration|feed|aahar|poshan|चारा|खुराक/.test(q) && v.topics.some((t) => /ration|feed/.test(t))) score += 3;
    if (/clean|dcs|milking|स्वच्छ/.test(q) && v.topics.some((t) => /clean|dcs/.test(t))) score += 3;
    return { id: v.id, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, max);
  return scored.map((x) => x.id);
}
function isYoutubeRequest(text) {
  return YOUTUBE_REQUEST.test(text);
}
function buildVideoSearchQuery(messages) {
  const users = messages.filter((m) => m.role === "user").slice(-4);
  const combined = users.map((m) => m.content).join(" ");
  const last = users.at(-1)?.content || combined;
  let lang = "hi";
  if (/[\u0980-\u09FF]/.test(combined)) lang = "bn";
  else if (/[\u0B80-\u0BFF]/.test(combined)) lang = "ta";
  else if (/[\u0C00-\u0C7F]/.test(combined)) lang = "te";
  else if (/[\u0900-\u097F]/.test(combined)) lang = "hi";
  else if (/[a-zA-Z]/.test(combined)) lang = "en";
  const stripped = last.replace(YOUTUBE_REQUEST, " ").replace(/\s+/g, " ").trim();
  const topic = stripped.length > 8 ? stripped : combined.replace(YOUTUBE_REQUEST, " ").trim();
  return { query: topic.slice(0, 200) || "dairy cooperative extension", lang };
}
async function findYoutubeVideos(query, _lang, max = 3) {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  const allowed = await resolveOfficialChannelIds(apiKey);
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  if (apiKey && allowed.size > 0) {
    const q = `${query} dairy cooperative`.slice(0, 120);
    for (const channelId of allowed) {
      if (out.length >= max) break;
      const ids = await searchInChannel(channelId, q, 3, apiKey);
      for (const id of ids) {
        if (seen.has(id)) continue;
        const v = await verifyOfficialVideo(id, apiKey, allowed);
        if (!v) continue;
        seen.add(id);
        out.push(v);
        if (out.length >= max) break;
      }
    }
  }
  if (out.length < max) {
    for (const id of matchCurated(query.toLowerCase(), max)) {
      if (seen.has(id)) continue;
      const v = await verifyOfficialVideo(id, apiKey, allowed);
      if (!v) continue;
      seen.add(id);
      out.push(v);
      if (out.length >= max) break;
    }
  }
  return out.slice(0, max);
}
function formatYoutubeHint(videos, query) {
  if (videos.length === 0) {
    return [
      "VERIFIED YOUTUBE VIDEOS: No official NDDB/cooperative/union channel video found for this topic.",
      "Do NOT invent or guess any YouTube URL or video ID.",
      "Tell the farmer only official dairy cooperative and NDDB YouTube channels have verified videos.",
      `Suggested search on NDDB channel: "${query}"`
    ].join("\n");
  }
  const lines = videos.map((v, i) => `${i + 1}. ${v.title}${v.channel ? ` (${v.channel})` : ""}
   ${v.url}`);
  return [
    "VERIFIED YOUTUBE VIDEOS \u2014 OFFICIAL NDDB / COOPERATIVE / MILK UNION CHANNELS ONLY:",
    ...lines,
    "Include these links in your answer. Copy URLs exactly as shown.",
    "Do NOT add any other YouTube URL."
  ].join("\n");
}
async function tryYoutubeVideoHint(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  if (!isYoutubeRequest(lastUser)) return null;
  const { query, lang } = buildVideoSearchQuery(messages);
  const videos = await findYoutubeVideos(query, lang, 3);
  return formatYoutubeHint(videos, query);
}

// catalyst/functions/pashumitra_api/lib/knowledge/balanced-ration-guide.ts
var BALANCED_RATION_GUIDE = `
BALANCED RATION CALCULATION GUIDE
For Indian Dairy Farmers \u2014 Cows & Buffaloes
Based on ICAR, NDDB (India) & FAO standards
"Genetics creates the potential \u2014 nutrition delivers it."
\u2014 FAO Animal Production Paper No. 173 (NDDB/FAO, 2012)
Sources: ICAR (2013) Nutrient Requirements of Cattle and Buffalo | NDDB INAPH Software | FAO Paper 173 | BIS IS 2052:2009
SECTION 1: Are These Sources Relevant to Indian Dairy Farmers?
Before using any ration calculation standard, it is important to confirm whether it applies to Indian conditions \u2014 Indian breeds, Indian feed ingredients, and smallholder farming reality. Below is an honest assessment of each source used in this guide.
Source
Developed By
India-Relevant?
Reason
ICAR (2013) Nutrient Requirements of Cattle & Buffalo
Indian Council of Agricultural Research, New Delhi
\u2705 FULLY relevant
Indian breeds, Indian feed ingredients, Indian climate. The primary scientific standard for India.
NDDB INAPH Software & FAO Paper No. 173 (M.R. Garg, 2012)
National Dairy Development Board, Anand, Gujarat
\u2705 FULLY relevant
Developed in India for Indian smallholders. Covers Gir, Kankrej, Murrah, Jaffarabadi, Mehsani, Crossbred. Tested in 33,374 Indian villages across 18 states.
BIS IS 2052:2009 Compounded Cattle Feed Standards
Bureau of Indian Standards / FSSAI, India
\u2705 FULLY relevant
Indian legal standards for compounded feed quality. Mandatory for commercial concentrate sold in India from 2021.
OPTIMILK / Simplex LP methodology (MDPI 2024)
European researchers
\u26A0\uFE0F Partially relevant
Mathematical methodology (linear programming / Simplex method) is universal and used by NDDB. European nutrient targets do not apply \u2014 use ICAR values instead.
NASEM/NRC (USA) standards referenced in previous summary
US National Academies
\u274C Not directly applicable
Designed for Western breeds (Holstein, Jersey). Not suitable for Indian indigenous or crossbred cattle/buffalo nutrition calculations. ICAR and NDDB standards supersede this for India.
CONCLUSION: This document uses only ICAR (2013) and NDDB standards for all nutrient values. The mathematical method (least-cost linear programming) draws on universal scientific principles validated by NDDB in the field.
SECTION 2: How Ration Balancing Software Calculates the Optimal Ration
Ration balancing software determines the minimum-cost combination of available feed ingredients that satisfies all the animal's nutrient requirements. The process has four steps.
Step 1 \u2014 Collect Animal Profile (Inputs)
The software needs the following information about the animal to calculate her requirements:
Input Parameter
Why It Matters
Example Values
Species
Buffalo has different fat content, DMI, energy needs than cow
Cow / Buffalo
Breed
Determines body weight range & production potential
Gir, HF Crossbred, Murrah, Kankrej, etc.
Body Weight (kg)
Maintenance requirement scales with body weight
Gir: 350\u2013450 kg; Murrah: 450\u2013550 kg; Crossbred: 400\u2013500 kg
Lactation Status
Dry or milking \u2014 determines whether milk production ration is added
In milk / Dry
Days in Milk (DIM)
Determines lactation stage (early/mid/late) and DMI capacity
1\u201360 = early; 61\u2013210 = mid; >210 = late
Current Milk Yield (kg/day)
Determines additional energy & protein needed for milk
5 kg, 8 kg, 12 kg/day etc.
Milk Fat %
Higher fat % requires more energy per kg of milk
Cow 3.5\u20134.5%; Buffalo 6\u20138%
Lactation Number (Parity)
1st lactation animals need extra feed for their own growth; mature animals need more for peak production
1st, 2nd, 3rd+ lactation
Pregnancy Status
Last 2 months of pregnancy require additional nutrients for calf growth
Not pregnant / Month 7, 8, or 9
Age
Animals under 3 years need extra feed for their own body growth (20% over maintenance)
Years / months
Step 2 \u2014 Calculate Nutrient Requirements (ICAR Standards)
Requirements are calculated in four components and then added together. All energy is expressed as Metabolizable Energy (ME) in Mcal/day; protein as Digestible Crude Protein (DCP) in grams/day.
A. Maintenance Requirement
Every animal needs a base ration just to survive and stay healthy \u2014 regardless of whether she is milking or not. This is based on body weight (BW).
Nutrient
Formula (ICAR 2013)
Example: 400 kg cow
ME (Mcal/day)
0.097 \xD7 BW^0.75
0.097 \xD7 400^0.75 = 0.097 \xD7 101.6 = 9.85 Mcal/day
DCP (g/day)
3.0 \xD7 BW^0.75
3.0 \xD7 101.6 = 304.8 g/day
TDN (kg/day)
Approx 0.0227 \xD7 BW^0.75
\u2248 2.3 kg/day
Note: BW^0.75 is the metabolic body weight. For 400 kg: 400^0.75 = 101.6. Most software calculates this automatically.
B. Milk Production Requirement
For each kg of milk produced above zero, the animal needs extra energy and protein. The requirement depends on how much fat is in the milk. First, actual milk is converted to Fat Corrected Milk (FCM) at 4% fat standard.
Fat Corrected Milk (FCM) Formula \u2014 ICAR 1998
FCM (kg) = Actual milk (kg) \xD7 [0.4 + (0.15 \xD7 Fat%)]

Example 1: 8 kg milk with 4% fat \u2192 FCM = 8 \xD7 [0.4 + (0.15 \xD7 4)] = 8 \xD7 1.0 = 8.0 kg FCM
Example 2: 8 kg milk with 7% fat (buffalo) \u2192 FCM = 8 \xD7 [0.4 + (0.15 \xD7 7)] = 8 \xD7 1.45 = 11.6 kg FCM
 
Higher fat % = higher FCM = higher feed requirement. This is why buffaloes need more feed per kg of milk than cows.
Nutrient per kg FCM
Requirement (ICAR 1998)
For 8 kg FCM/day
ME per kg FCM
1.188 Mcal/kg FCM
1.188 \xD7 8 = 9.50 Mcal/day
DCP per kg milk at 4% fat
50 g DCP/kg milk
50 \xD7 8 = 400 g DCP/day
DCP at other fat %
Use: DCP(g) = (Milk protein g / 0.70) per kg milk
where Milk protein% = 1.9 + 0.4\xD7Fat%
At 4% fat: protein = 1.9+(0.4\xD74)=3.5%; DCP = (35/70)\xD7100 = 50g/kg
C. Pregnancy Requirement (Last 2 Months Only)
Extra nutrients are needed only in the last 2 months of pregnancy (7th and 8th month for cow; 8th and 9th month for buffalo) for calf development. Before this period, maintenance + milk production ration is sufficient.
Month of Pregnancy
Extra ME (Mcal/day)
Extra DCP (g/day)
Note
1st to 6th month
0
0
No extra requirement
7th month (cow) / 8th month (buffalo)
+1.5 Mcal
+100 g
Fetal growth begins to accelerate
8th & 9th month (last 60 days before calving)
+3.0 Mcal
+200 g
Critical \u2014 most fetal growth happens here
D. Age/Growth Requirement
Young animals under 4 years are still growing while also milking. They need extra feed over and above their maintenance ration:
Age of Animal
Extra requirement above Maintenance
Applies to
3 years old or younger (1st lactation)
+20% of Maintenance ration
First-calf heifers \u2014 need feed for own body growth
3 to 4 years old (2nd lactation usually)
+10% of Maintenance ration
Still growing, but less than 1st lactation
4 years and above (3rd lactation+)
No extra \u2014 maintenance is sufficient
Fully mature adult animal
Step 3 \u2014 Determine Dry Matter Intake (DMI) Range
DMI is the total amount of feed dry matter an animal can eat in a day. This sets the physical limit for the ration \u2014 you cannot feed more dry matter than the animal can eat. The NDDB Nutrition Master defines this as a % of body weight:
Animal Type
Status
Months After Calving
DMI Range (% of BW)
Cow or Buffalo
Dry (not milking)
\u2014
2.0% \u2013 3.0% of BW
Cow or Buffalo
Milking
0\u20132 months (early lactation)
2.0% \u2013 3.0% of BW
Cow or Buffalo
Milking
2\u20133 months
2.0% \u2013 3.0% of BW
Cow or Buffalo
Milking
3\u201324 months (peak/mid/late)
2.0% \u2013 3.5% of BW
Example \u2014 DMI Calculation
Crossbred cow, BW = 450 kg, 4 months after calving (milking):
  DMI Range = 2.0% to 3.5% of 450 kg = 9.0 kg to 15.75 kg dry matter/day
 
The software will not formulate a ration that exceeds this DMI ceiling.
In practice, most smallholder rations for crossbreds use 10\u201312 kg DMI/day.
Step 4 \u2014 Concentrate to Forage Ratio
The ratio of concentrate to forage (dry roughage + green fodder) is critical for rumen health. Too much concentrate lowers rumen pH, reduces milk fat, and causes metabolic disorders. NDDB Nutrition Master guidelines:
Milk Yield Level
Concentrate % in DM
Forage % in DM
Low (< 5 kg/day)
20\u201330%
70\u201380%
Medium (5\u201310 kg/day)
30\u201340%
60\u201370%
High (> 10 kg/day)
40\u201350%
50\u201360%
Very High (> 20 kg/day, crossbred)
50\u201360% maximum
40\u201350% minimum
Step 5 \u2014 Least-Cost Optimization (Linear Programming)
Once the total nutrient requirements (ME, DCP, TDN, minerals) and DMI range are known, the software uses linear programming to find the cheapest combination of available ingredients that meets all these requirements simultaneously.
Mathematically, the software solves:
The Least-Cost Formula
MINIMIZE: Cost = (price of ingredient 1 \xD7 amount) + (price of ingredient 2 \xD7 amount) + ...
 
SUBJECT TO (constraints):
  \u2022 Total ME supplied \u2265 ME requirement
  \u2022 Total DCP supplied \u2265 DCP requirement
  \u2022 Total DMI \u2264 Maximum DMI for this animal
  \u2022 Concentrate % is within safe range
  \u2022 Crude Fibre \u2265 14% of DM (rumen health minimum)
  \u2022 Calcium : Phosphorus ratio between 1:1 and 1.5:1
  \u2022 Each ingredient \u2265 0 (can't use negative amounts)
The Simplex method iterates through all possible combinations and identifies the one with the lowest total daily cost that satisfies all the above constraints. This is what NDDB's INAPH software and Pashu Poshan app do automatically.
SECTION 3: Farmer Interview Questionnaire
The following questions should be asked to the farmer in simple, field-friendly language. The farmer does not need to know anything about nutrition \u2014 the extension worker collects the answers and enters them into the software.
Before You Begin
Observe the animal before asking questions. Estimate body weight if the farmer doesn't know.
Body weight estimation (girth tape method): BW (kg) \u2248 (Heart Girth in cm)\xB2 \xD7 length (cm) / 10,840
Or use visual scoring: thin=BCS 1-2; medium=BCS 3; fat=BCS 4-5
PART A: Animal Identification
Q
Ask the Farmer This
Options / What to Look For
What This Tells Us (Software Input)
1
"Yeh gaay hai ya bhains?" (Is this a cow or buffalo?)
Cow \u2192 Gai / Buffalo \u2192 Bhains
Species \u2014 changes all requirement calculations
2
"Yeh kaun si nasl hai?" (What breed is this?)
For cows: Gir, Sahiwal, Kankrej, Tharparkar, HF Crossbred, Jersey Crossbred, Desi/Local
For buffalo: Murrah, Jaffarabadi, Mehsani, Surti, Nili-Ravi, Desi
Breed \u2014 determines body weight standard and production potential
3
"Iska wajan kitna hai?" (How much does she weigh?) \u2014 If farmer doesn't know, use girth tape
Weigh or estimate using girth tape. Typical: Gir 350\u2013450 kg, Murrah 450\u2013550 kg, HF Cross 400\u2013500 kg
Body weight \u2014 used in all maintenance and DMI calculations
4
"Uski umar kitni hai?" (How old is she?) OR "Yeh uski kaun si vyaat hai?" (Which lactation is this for her?)
Age in years. Lactation number: Pehli (1st), Doosri (2nd), Teesri ya zyada (3rd+).
If farmer doesn't know age, use lactation number as proxy.
Age / Parity \u2014 determines growth requirement and DMI capacity
PART B: Current Lactation Status
Q
Ask the Farmer This
Options / What to Look For
What This Tells Us (Software Input)
5
"Yeh abhi dudh de rahi hai?" (Is she giving milk right now?)
Yes (In milk) / No (Dry / Sukhi)
Lactation status \u2014 if dry, skip Q6 & Q7. Maintenance + pregnancy ration only.
6
(If yes) "Roz kitna dudh deti hai?" (How many litres of milk per day?)
Average over last 3 days. Ask morning + evening combined. E.g., "Subah 3 litre, shaam 2 litre = 5 litre roz"
Current milk yield (kg/day) \u2014 determines milk production ration
7
"Dudh mein kitna fat hai?" (What is the fat % in the milk?) \u2014 Check with dairy society records
If unknown, use breed average: HF cross = 3.5\u20134%; Gir = 4.5\u20135%; Murrah = 7\u20138%; Jaffarabadi = 7\u20139%
Milk fat % \u2014 calculates FCM and DCP requirement
8
"Bachha kab hua tha?" (When did she last calve / deliver?)
Date or number of months ago. "Kitne mahine pehle bachha hua?" (How many months ago did she calve?)
Days in Milk (DIM) \u2014 determines lactation stage: Early (<2 months), Mid (2\u20137 months), Late (>7 months)
PART C: Pregnancy Status
Q
Ask the Farmer This
Options / What to Look For
What This Tells Us (Software Input)
9
"Yeh gaabhan hai?" (Is she pregnant / with calf?)
Yes (Gaabhan) / No / Not sure \u2192 check with vet
Pregnancy status \u2014 determines if pregnancy ration applies
10
(If yes) "Garbh mein kitne mahine ho gaye?" (How many months pregnant?)
Count from date of last AI/natural mating. Or ask: "Kab AI hua tha?" (When was she inseminated?)
Month of pregnancy \u2014 extra ration needed only in last 2 months (7th+ for cow, 8th+ for buffalo)
PART D: Current Feeding (What Ingredients Are Available)
This is the most important section for calculating least-cost optimization. Ask about every feed the farmer currently uses AND what is locally available to buy.
Q
Ask the Farmer This
Common Answers in India
Software Input Needed
11
"Roz hari ghaas ya hara chara kitna dete ho?" (How much green fodder per day?)
Napier grass (Napier/Gajraj ghaas), Maize fodder, Sorghum (Jowar), Lucerne (Rijka), Cowpea (Lobia), Sugar cane tops
Name of green fodder + kg/day fed (fresh weight). Software converts to dry matter.
12
"Sukha chara kya aur kitna dete ho?" (What dry/dry fodder do you feed and how much?)
Wheat straw (Gehu ka bhusa), Paddy straw (Parali/Dhan ki pural), Bajra straw, Maize stover, Sorghum stover
Name of dry fodder + kg/day. This is usually the main roughage.
13
"Koi silage ya TMR khilate ho?" (Do you feed silage or TMR?)
Maize silage, Sorghum silage, Dry TMR from NDDB. If yes, ask kg/day
Silage type + kg/day
14
"Dana mithan kya kya dete ho aur kitna?" (What concentrates do you give and how much?) \u2014 Ask for each item separately
Mustard cake (Sarson ki khali), Cotton seed cake (Binola khali), Groundnut cake (Moongphali khali), Maize grain (Makka), Wheat bran (Chokar), Rice bran, Soybean meal, Broken rice, Guar churi
Each concentrate name + kg/day given. Also note local market price per kg.
15
"Daana-mithan kaun sa khareeda hua dete ho?" (Do you give any purchased/branded concentrate?)
Compounded cattle feed / Dairy Ration pellets / Co-op society feed. Ask brand and kg/day
Compound feed name + kg/day
16
"Mineral mixture ya namak dete ho?" (Do you give mineral mixture or salt?)
Area-specific mineral mixture from NDDB/Co-op, Common salt (Namak), Bypass fat
Yes/No. If yes, which product. If No, this is a gap to fill.
17
"Iske alawa aur kuch khilate ho?" (Anything else you feed?)
Jaggery (Gur), molasses, vegetables, kitchen waste
Note any other items. Usually not nutritionally significant but useful for palatability.
PART E: Economic Information (for Least-Cost Calculation)
Q
Ask the Farmer This
What to Record
Why It Matters
18
"Yeh sab cheezein aapko kitne mein milti hain?" (What is the price of each feed ingredient?)
Price per kg for each ingredient currently available. Separate own-produced vs purchased.
Used in least-cost optimization \u2014 the software minimizes total feed cost
19
"Aapki dairy society mein dudh ka bhav kya chal raha hai?" (What is the current milk price at the co-op?)
Rs per litre for cow milk / buffalo milk at nearest dairy cooperative
Used to calculate economic benefit of improved milk yield
20
"Roz kitne paise chara kharidne mein lagta hai?" (How much do you spend daily on feed?)
Total daily feeding cost in Rs. Cross-check against individual ingredient prices.
Baseline for calculating actual savings after balanced ration
SECTION 4: Complete Worked Example
The following example shows how the ration balancing calculation works step by step for a typical Indian farmer scenario.
Farmer Scenario \u2014 Arjunbhai, Sabarkantha District, Gujarat
Animal: HF Crossbred cow  |  Body Weight: 420 kg  |  Age: 4 years (3rd lactation)
Milk yield: 9 kg/day  |  Milk fat: 4%  |  Days in Milk: 90 (mid-lactation)
Pregnancy: Not pregnant
 
Current feeding: 15 kg wheat straw + 3 kg groundnut cake + 1 kg compound feed + no mineral mixture
Current milk price: Rs 28/litre  |  Daily feed cost: Rs 75/day
Step 1: Calculate FCM
FCM = 9 \xD7 [0.4 + (0.15 \xD7 4%)] = 9 \xD7 [0.4 + 0.6] = 9 \xD7 1.0 = 9.0 kg FCM/day
Step 2: Calculate Total Nutrient Requirements
Requirement Component
Basis
ME (Mcal/day)
DCP (g/day)
Calculation
Maintenance
420 kg BW
9.97
308
ME = 0.097 \xD7 420^0.75; DCP = 3.0 \xD7 420^0.75
Milk Production
9 kg FCM
10.69
450
ME = 1.188 \xD7 9; DCP = 50 \xD7 9
Growth (3rd lactation, 4 yrs)
Mature \u2014 no growth extra
0
0
Animal \u2265 4 years \u2014 fully mature
Pregnancy
Not pregnant
0
0
No pregnancy requirement
TOTAL REQUIREMENT
20.66
758
Daily ME and DCP needed
Step 3: Assess Current Ration vs Requirement
Ingredient
Fresh kg/day
DM%
DM kg/day
ME (Mcal/day)
DCP (g/day)
Comment
Wheat Straw (Bhusa)
15
88%
13.2
9.24
211
Low quality roughage \u2014 high fibre, low energy
Groundnut Cake (Moongphali Khali)
3
90%
2.7
7.56
432
Good protein source
Compounded Cattle Feed
1
90%
0.9
2.43
112
Balanced, but insufficient quantity
CURRENT TOTAL
19
16.8
19.23
755
DM within range. ME just short. DCP just met. No mineral mixture!
REQUIREMENT
\u226414.7 kg
20.66
758
GAP (Requirement \u2212 Current)
-1.43 Mcal
-3 g
Mineral mixture entirely missing. Energy gap of 1.43 Mcal limiting milk production.
Step 4: Balanced Ration Recommendation (Least-Cost)
The software finds the cheapest way to fill the energy gap, reduce excess straw, and add minerals. Based on local prices in Sabarkantha (approximate):
Ingredient
kg/day
Price (Rs/kg)
Cost (Rs/day)
ME (Mcal)
DCP (g)
Change from before
Wheat Straw
10
3
30
6.16
141
\u2193 REDUCED by 5 kg
Green Napier Grass
15 (fresh)
1
15
3.15
210
\u2191 ADDED \u2014 improves rumen health & palatability
Groundnut Cake
2.5
22
55
6.3
360
\u2193 slightly reduced
Wheat Bran (Chokar)
1.5
14
21
3.57
120
\u2191 ADDED \u2014 cheaper energy source
Compounded Feed
1
25
25
2.43
112
Maintained
Mineral Mixture (NDDB)
0.05
60
3
0
0
\u2191 ADDED \u2014 was missing completely
BALANCED RATION TOTAL
Rs 149/day
21.61
943
Requirement met
Step 5: Expected Impact on Farmer (What to Tell Arjunbhai)
Parameter
Before Balanced Ration
After Balanced Ration
Daily milk yield
9 kg/day
10.5\u201311 kg/day expected (+15\u201320%)*
Milk income (@ Rs 28/litre)
Rs 252/day
Rs 294\u2013308/day
Daily feed cost
Rs 75/day
Rs 149/day (higher \u2014 includes minerals & green fodder)
Net daily income (milk \u2212 feed)
Rs 177/day
Rs 145\u2013159/day
NOTE
Short-term cost rises. But: longer lactation, better fertility, healthier animal = higher total income over full lactation cycle.
Lactation length
~240 days
~265+ days (average gain from NDDB data)
Calving interval
15\u201318 months
Target 12\u201314 months with proper nutrition
Methane emissions per kg milk
High
~13.7% lower per kg milk (NDDB field data)
*Based on NDDB national data: balanced ration increased average milk yield 10\u201315% in cows and 8\u201312% in buffaloes. Individual results vary by animal health, management, and season.
SECTION 5: Quick Reference \u2014 Indian Breeds & Standard Parameters
Breed
Type
Avg BW (kg)
Avg Fat%
Avg Yield (kg/day)
Lactation Length
Notes for Ration
Gir
Desi Cow
350\u2013450
4.5\u20135.0%
6\u201312
270\u2013305 days
Hardy; tolerates low quality roughage
Sahiwal
Desi Cow
300\u2013400
4.5\u20135.0%
7\u201315
270\u2013310 days
Good milk for low input \u2014 efficient
Kankrej
Desi Cow
350\u2013450
4.0\u20134.8%
4\u20138
240\u2013270 days
Dual purpose \u2014 balanced ration important
HF Crossbred (50%)
Crossbred Cow
400\u2013500
3.5\u20134.0%
10\u201318
280\u2013305 days
High input needed \u2014 responds well to balanced ration
Jersey Crossbred
Crossbred Cow
300\u2013400
4.5\u20135.0%
8\u201314
280\u2013300 days
Moderate input; good fat
Murrah
Buffalo
450\u2013550
7.0\u20138.0%
8\u201316
270\u2013300 days
High energy need per kg milk due to high fat
Jaffarabadi
Buffalo
500\u2013700
7.5\u20139.0%
8\u201316
260\u2013290 days
High FCM \u2014 needs more energy; Gujarat common
Mehsani
Buffalo
400\u2013500
7.0\u20138.5%
7\u201314
260\u2013285 days
Gujarat-specific; common in Mehsana district
Surti
Buffalo
350\u2013450
7.5\u20138.5%
6\u201312
245\u2013275 days
Lower body weight \u2014 adjust maintenance accordingly
Desi/Local (unrecorded)
Mixed
200\u2013350
3.5\u20135.0%
2\u20135
210\u2013260 days
Use actual body weight. Low producer \u2014 verify health status
SECTION 7: What to Tell the Farmer \u2014 Expected Benefits
After calculating the balanced ration, explain the benefits to the farmer in simple terms. Use the numbers from NDDB's national field data (28 states, 33,374 villages, 28.65 lakh animals).
If the Farmer Is Currently Underfeeding (Nutritional Gap Detected):
What to Say in Simple Language
Actual Number to Quote
Source
"Dudh badhega (Milk will increase)"
Cows: avg 10\u201320% increase in daily milk. Buffaloes: avg 8\u201315% increase.
NDDB national RBP data, 18 states
"Dudh dene ke din badhenge (Lactation will be longer)"
Average 26 extra days for cows; 50 extra days for buffaloes in lactation
NDDB RBP Programme data
"Gaay jaldi bachha degi (Cow will calve sooner)"
Calving interval reduces from 15\u201318 months toward 12\u201313 months with proper nutrition
ICAR & NDDB field observations
"Ek kilo chare se zyada dudh milega (More milk per kg of feed)"
Milk production efficiency (FCM/DM intake) improved from 0.58 to 0.78 kg/kg for cows
FAO Paper No. 173 (NDDB)
"Gaay zyada beemaar nahi hogi (Animal will be healthier)"
Immune proteins (IgG, IgM, IgA) increased measurably. Internal parasites reduced by 58%
NDDB field study, 9 locations
"Paise bachenge (You will save money)"
Net daily income increase of 10\u201315% for smallholders (1\u20132 animal farms)
FAO Paper No. 173 Executive Summary
If the Farmer Is Overfeeding Concentrates (Concentrate:Forage Imbalance):
Explain that excess concentrate lowers rumen pH and reduces milk fat percentage
Milk fat drop means lower SNF and less payment at the dairy cooperative
Reducing concentrate and adding green fodder or silage gives the same milk but at lower cost
"Zyada daana dene se dudh ki malaai kam ho jaati hai" (Too much concentrate reduces cream in milk)
If the Farmer Has No Access to Green Fodder:
Recommend Napier grass cultivation \u2014 requires minimal land, high yield per acre
Maize fodder or sorghum (jowar) for seasonal green fodder
NDDB's Dry TMR (crop residue based Total Mixed Ration) is available for areas with no green fodder access
"NDDB ka sukha TMR uplabdh hai \u2014 yeh ek balanced ration hai jo store ho sakta hai" (NDDB's dry TMR is balanced and can be stored 2\u20133 weeks)
Follow-Up Schedule (Recommended by NDDB):
Week 0: Re-record animal profile every 3\u20134 weeks
Week 4: Measure milk yield and fat %, compare with baseline
Week 8: Recalculate ration if milk yield has changed significantly or new ingredients available
Ongoing: Adjust ration for next lactation stage (if animal moves from early \u2192 mid \u2192 late lactation)
SECTION 8: Key References & Where to Access Them
Document
Publisher
Access / URL
Balanced Feeding for Improving Livestock Productivity (FAO Animal Production Paper No. 173)
FAO / NDDB (M.R. Garg), 2012
www.dairyknowledge.in \u2192 FAO Paper 173 PDF. FREE \u2014 full text with all nutrition master tables.
Nutrient Requirements of Cattle and Buffalo
ICAR, New Delhi, 2013
Available from ICAR Publication Unit, New Delhi. ISBN available. Authoritative Indian standard.
NDDB Ration Balancing Programme (INAPH Software)
NDDB, Anand, Gujarat
nddb.coop/services/animalnutrition/programmes/ration-balancing-programme
Pashu Poshan App (simplified mobile version)
NDDB
Available free on Google Play Store. Search: "Pashu Poshan NDDB"
BIS IS 2052:2009 \u2014 Compounded Cattle Feed Standards
Bureau of Indian Standards / FSSAI
Available via BIS website: bis.gov.in. Mandatory standard for commercial concentrate in India.
OPTIMILK: Least-Cost Dairy Ration Using Linear Programming
MDPI Agriculture, 2024
mdpi.com/2077-0472/14/9/1580 \u2014 Full open-access article. Mathematical methodology reference.
This guide was compiled for Indian dairy farmers and extension workers.
All nutrient standards are from ICAR (2013) and NDDB. American (NASEM/NRC) standards are NOT used in calculations.
For field implementation, use the Pashu Poshan App (NDDB) or contact your nearest dairy cooperative extension officer.
`;

// catalyst/functions/pashumitra_api/lib/knowledge/ration-knowledge.ts
var RATION_KNOWLEDGE = `
## 11. NDDB RATION BALANCING PROGRAMME (RBP) \u2014 LEAST-COST BALANCED RATION

### Overview
The National Dairy Development Board (NDDB) Ration Balancing Programme educates farmers to feed scientifically balanced rations using locally available feeds at **least cost (Least-Cost Formulation / LCF)**. Implemented across 18 major dairying states. Average farmer gain: **\u20B925.5/animal/day** (\u20B916.3 feed savings + \u20B99.2 from extra milk/fat).

Key principles:
- Formulate by animal profile: species, body weight, milk yield, fat%, lactation stage, pregnancy
- Use **Linear Programming (LP)** objective: Minimize Cost = \u03A3 (Price\u1D62 \xD7 Quantity\u1D62) subject to meeting TDN, CP, Ca, P, DM requirements; roughage DM \u2265 50% of total DM
- Include **Area Specific Mineral Mixture (ASMM)** 100\u2013200 g/day (use 150 g for lactating animals)
- Prioritize locally available feeds; validate with season and palatability
- Delivered via trained LRPs and **Pashu Poshan** Android app / INAPH platform

### When farmer asks about ration / feed / balanced diet
**Always follow this workflow:**
1. **Gather info** (ask briefly if missing): breed or animal type, milk yield (kg/day), fat %, lactation stage (early 0\u201390 DIM / mid 91\u2013180 / late 181\u2013270 / dry / late pregnancy), pregnancy (last 60 days?), **location/state/region**, season, herd size (number of animals), locally available green/dry fodder and concentrates.
2. **Estimate body weight (BW)** if not given \u2014 use breed defaults below.
3. **Calculate 4% Fat Corrected Milk (FCM):** FCM (kg) = Actual Milk (kg) \xD7 (0.4 + 0.15 \xD7 Fat%)
4. **Calculate daily nutrient requirements:**
   - Maintenance (per 100 kg BW/day): TDN 395 g, CP 62.7 g, Ca 2.5 g, P 1.7 g
   - Production (per kg FCM): TDN 332 g, CP 82 g, Ca 2.8 g, P 1.8 g
   - Late pregnancy extra (last 60 days): +TDN 300 g, +CP 100 g, +Ca 12 g, +P 8 g/day
   - Total = Maintenance + Production + Pregnancy allowance
   - DM intake budget = BW \xD7 (DM intake % / 100) \xD7 1000 g. DM intake % by stage: early 3.2%, mid 3.0%, late 2.7%, dry 2.0%, late_pregnant 1.8%
5. **Formulate ration (greedy LCF order):**
   - Step A: ASMM 0.15 kg/day (fixed)
   - Step B: Green fodder up to 60% of total DM (max ~30 kg as-fed depending on DM%)
   - Step C: Dry fodder up to ~45% remaining DM (max ~6 kg as-fed typical)
   - Step D: Concentrate to meet remaining TDN and CP deficit (choose amount = max(needed for TDN, needed for CP), cap ~10 kg/day)
   - Ensure roughage (green + dry) \u2265 50% of total DM for rumen health
6. **Select feeds by location & season** (see tables below). Pick cheapest suitable local options.
7. **Cost the ration** using regional prices (\u20B9/kg as-fed). Show **per animal/day**, and if herd given: **\xD7 count = herd/day and herd/month**.
8. **Present answer** in simple farmer language: ingredient name + kg/day per animal, brief why, total daily cost, 1\u20132 seasonal tips.

### Breed body weight defaults (kg)
- HF/Jersey crossbred cow: 450 kg (typical fat 3.8%)
- Holstein Friesian pure: 550 kg (fat 3.6%)
- Gir / Sahiwal desi cow: 380 kg (fat 4.8%)
- Tharparkar desi cow: 340 kg (fat 4.5%)
- Murrah buffalo: 550 kg (fat 7.0%)
- Jaffarabadi buffalo: 600 kg (fat 6.5%)
- Surti buffalo: 450 kg (fat 6.8%)

Buffalo note: Murrah maintenance ~35.3 g TDN/kg W^0.75; production ~406 g TDN per kg 6% FCM. Buffaloes digest roughage better than cattle.

### Feed ingredient nutrient composition (on DM basis)
Green fodder:
- Maize fodder: DM 20%, TDN 62%, CP 8.5%, Ca 0.38%, P 0.23%
- Napier CO-4: DM 18%, TDN 58%, CP 9.0%, Ca 0.45%, P 0.27%
- Sorghum/Jowar fodder: DM 22%, TDN 57%, CP 7.5%
- Oat fodder (Jai): DM 20%, TDN 60%, CP 10.5%
- Berseem: DM 16%, TDN 62%, CP 16.5%, Ca 1.55%, P 0.30%
- Lucerne: DM 18%, TDN 63%, CP 18.0%, Ca 1.60%, P 0.32%
- Cowpea fodder: DM 17%, TDN 60%, CP 14.0%

Dry fodder / roughage:
- Wheat straw: DM 91%, TDN 46%, CP 3.8%, Ca 0.28%, P 0.08%
- Paddy straw: DM 90%, TDN 40%, CP 3.5%
- Bajra straw: DM 91%, TDN 50%, CP 4.5%
- Maize stover: DM 88%, TDN 52%, CP 5.2%
- Maize silage: DM 30%, TDN 68%, CP 8.0%
- Groundnut haulm hay: DM 90%, TDN 52%, CP 11.0%, Ca 1.40%
- Cowpea hay: DM 90%, TDN 56%, CP 13.5%

Concentrates:
- Compound Cattle Feed BIS-I (\u226522% CP): DM 88%, TDN 72%, CP 22%, Ca 1.0%, P 0.70% \u2014 for high yielders >10 L/day, early lactation
- Compound Cattle Feed BIS-II (\u226518% CP): DM 88%, TDN 70%, CP 18% \u2014 for 5\u201310 L/day, dry cows
- Wheat bran (choker): DM 88%, TDN 70%, CP 14.5%, P 1.10%
- Cottonseed cake: DM 90%, TDN 73%, CP 32%
- Groundnut cake: DM 90%, TDN 76%, CP 44%
- Soybean meal: DM 88%, TDN 78%, CP 48%
- Mustard cake: DM 90%, TDN 72%, CP 38%
- Bypass protein supplement: DM 90%, TDN 74%, CP 38% \u2014 use @ 1 kg/day top feed for >15 L/day or early lactation
- Bypass fat (calcium salts): for early lactation energy deficit / heat stress periods
- ASMM (mineral mixture): DM 98%, Ca 22%, P 12% \u2014 100\u2013200 g/day

### Regional price guide (\u20B9/kg as-fed, indicative 2025)
Use the region matching farmer's state:

**North India (Punjab, Haryana, UP):** Maize fodder 1.5, Napier 1.2, Berseem/Lucerne 2.0, Wheat straw 5.5, Paddy straw 3.0, Maize silage 3.5, BIS-I feed 27, BIS-II 24, Wheat bran 14, Cotton cake 30, Groundnut cake 35, Soybean meal 38, Mustard cake 22, ASMM 70

**West India (Gujarat, Rajasthan, MP):** Maize fodder 1.2, Napier 1.0, Berseem 1.8, Wheat straw 4.5, Paddy straw 4.0, Silage 3.0, BIS-I 26, BIS-II 23, Wheat bran 13, Cotton cake 28, Groundnut cake 32, Soybean 36, ASMM 65

**South India (Karnataka, AP, TN):** Maize fodder 1.0, Napier 0.8, Berseem 2.5, Wheat straw 8.0, Paddy straw 3.5, Silage 2.8, BIS-I 28, BIS-II 25, Wheat bran 15, Cotton cake 25, Groundnut cake 28, Soybean 34, ASMM 68

**East India (WB, Bihar, Odisha):** Maize fodder 1.0, Napier 0.8, Berseem 2.0, Wheat straw 4.0, Paddy straw 2.5, Silage 3.0, BIS-I 25, BIS-II 22, Wheat bran 13, Cotton cake 32, Groundnut cake 38, Soybean 40, ASMM 72

**Central/Deccan (Maharashtra):** Maize fodder 1.2, Napier 1.0, Berseem 2.2, Wheat straw 5.0, Paddy straw 4.0, Silage 3.2, BIS-I 27, BIS-II 24, Wheat bran 14, Cotton cake 28, Groundnut cake 32, Soybean 36, ASMM 68

Prices are indicative \u2014 always note farmer should verify local market/cooperative prices (Amul/Saras cooperative feed often 10\u201315% cheaper).

### Season-wise feeding strategy
**Kharif / Monsoon (Jul\u2013Oct):** Maize, sorghum, cowpea green fodder abundant; make silage; use paddy/bajra straw as dry; BIS-II + mustard cake concentrate.

**Rabi / Winter (Nov\u2013Mar):** Best green fodder season \u2014 berseem, oats, wheat fodder; new wheat straw; BIS-I for high yielders; peak milk season.

**Summer / Zaid (Apr\u2013Jun):** Green fodder scarce \u2014 rely on silage, hay, dry straw; BIS-I + bypass fat for heat; reduce concentrate slightly to lower heat increment; ensure water; consider Pashu Sheetvardhak heat supplement.

### Example calculation walkthrough
Crossbred cow, 450 kg BW, 15 kg milk, 4% fat, mid lactation, Punjab (North India), rabi season:
- FCM = 15 \xD7 (0.4 + 0.15\xD74) = 15 \xD7 1.0 = 15 kg
- Maintenance: TDN 395\xD74.5=1778 g, CP 62.7\xD74.5=282 g
- Production: TDN 332\xD715=4980 g, CP 82\xD715=1230 g
- Total: TDN ~6758 g, CP ~1512 g, DM budget ~13.5 kg
- Sample ration: Berseem 20 kg + Wheat straw 4 kg + BIS-I 3.5 kg + ASMM 0.15 kg \u2192 verify TDN/CP met, cost ~\u20B985\u2013110/animal/day (adjust with local prices)

### Herd planning
When farmer gives herd size and groups:
- Calculate ration separately for each group (different breeds/yields/stages)
- Multiply each ingredient by animal count in that group
- Sum for total herd daily and monthly feed cost
- Example: 3 crossbred \xD7 15 L + 2 Murrah buffalo \xD7 8 L \u2192 two separate rations, then aggregate quantities

### Special supplements \u2014 when to advise
- **ASMM:** always for lactating animals (regional mineral deficiencies)
- **Bypass protein:** >15 L/day, early lactation (0\u201390 DIM), low milk protein%, poor BCS
- **Bypass fat:** early lactation energy deficit, high yielders, summer heat stress
- **UMMB:** dry cows, low producers \u2014 lick block for NPN + minerals
- **Samvriddhi:** to improve fat% and SNF

### BIS compound feed selection
- BIS Type I (\u226522% CP, TDN \u226570%): animals >10 L/day, early lactation
- BIS Type II (\u226518% CP, TDN \u226568%): 5\u201310 L/day, average yielders, dry period maintenance

### References for farmer
- **Pashu Poshan** app (Google Play) \u2014 free self-service ration formulator
- **INAPH** platform for LRPs/veterinarians
- NDDB cooperative Cattle Feed Plants for BIS-compliant affordable feed
- For exact LP optimization with 500+ feed database, recommend Pashu Poshan or local NDDB LRP visit

### Answer format for ration queries
Use WhatsApp-friendly structure:
- Brief summary of animal(s) understood
- Daily ration table: Feed | kg/day per animal | (\xD7 herd count if given) | approx cost
- Total cost per day and per month
- 1\u20132 practical tips (season, water, mineral mix, when to call vet/LRP)
- Note prices are approximate \u2014 verify locally
`;

// catalyst/functions/pashumitra_api/lib/knowledge/cooperative-policy.ts
var COOPERATIVE_MILK_POLICY = `
## 12. MILK MARKETING \u2014 COOPERATIVE FIRST (MANDATORY ADVICE)

### Core rule (always follow)
When farmer asks where to sell milk, how to market milk, milk price, pouring milk, or earning from dairy:
- **ALWAYS advise pouring/selling milk ONLY through the local dairy cooperative system** \u2014 Village Dairy Cooperative Society (DCS) \u2192 District Milk Union \u2192 State Federation (Amul/GCMMF, Nandini, Mother Dairy, Saras, Verka, Aavin, Sudha, Gokul, Parag, etc.)
- **NEVER recommend** private dairies, hotels, restaurants, middlemen, or direct hotel supply as the primary or preferred option
- If farmer mentions private buyer, gently **redirect to nearest cooperative milk collection centre / BMC / DCS**

### Why cooperatives (explain simply)
- Guaranteed daily procurement at fair fat & SNF based price
- Timely payment + annual bonus (many unions)
- Access to cattle feed, mineral mixture, AI, veterinary care, insurance
- Clean milk testing, chilling, and quality assurance
- Part of India's successful Anand-pattern cooperative model (NDDB)

### What to tell the farmer
1. Pour milk at your **village cooperative collection point** (DCS) \u2014 same time daily
2. Carry milk in clean aluminium/can; avoid adulteration
3. Contact **local milk union field officer / Secretary of DCS** for membership if not enrolled
4. For higher returns: improve fat/SNF through balanced ration (RBP), clean milk production, breed improvement \u2014 NOT by switching to private buyers

### Exceptions (mention only if farmer specifically asks)
- If no cooperative collection exists in remote area: contact District Milk Union or NDDB/state dairy department to start/link a DCS \u2014 still do NOT push private dairies as first choice
- Surplus value-added products (ghee, paneer at home) for self/family consumption is fine; bulk milk sale still via cooperative

### Phrases to use (adapt to farmer's language)
- "\u0926\u0942\u0927 \u0915\u0947\u0935\u0932 \u0905\u092A\u0928\u0947 \u0938\u0939\u0915\u093E\u0930\u0940 \u0921\u0947\u092F\u0930\u0940 \u0915\u0947 \u0915\u0947\u0902\u0926\u094D\u0930 \u092A\u0930 \u0939\u0940 \u0921\u093E\u0932\u0947\u0902"
- "Private dairy ya hotel ko doodh dena \u2014 yeh salah mat dijiye; sahyakari system behtar hai"
- "Pour milk only at your cooperative collection centre for fair price and support services"
`;

// catalyst/functions/pashumitra_api/lib/knowledge/knowledge.ts
var KNOWLEDGE_BASE = `
# DAIRY FARMING & ANIMAL HUSBANDRY KNOWLEDGE BASE

## 1. ANIMAL NUTRITION
Balanced ration: 14-16% crude protein for lactating animals; Calcium:Phosphorus = 2:1.
Green fodder targets: 25-30 kg/day lactating; dry fodder 4-6 kg; concentrate 1 kg per 2.5-3 L milk.
Green fodders: Maize, Sorghum (Jowar), Bajra, Napier, Guinea grass, Berseem, Lucerne, Cowpea, Oats.
Dry fodders: wheat straw, paddy straw, maize stover, legume hay.
Concentrates: maize, wheat, barley, sorghum + cottonseed cake, groundnut cake, soybean meal + mineral mix + salt.
Stage feeding:
- Dry period: 15-20 kg green, 4-5 kg dry, 1-2 kg concentrate.
- Early lactation (0-100d): 30-35 kg green, 5-6 kg dry, concentrate 1 kg/2.5L.
- Mid/late lactation: reduce concentrate gradually.
- Heifers: 10-15 kg green, 2-3 kg dry, 1-2 kg concentrate.
Mineral mixture 50 g/day, salt 30-50 g/day. Water 40-50 L/day (more in summer).
Urea-treated straw: 4 kg urea in 100 L water per 100 kg straw, cover 21 days.

## 2. ANIMAL HEALTH
Vaccination calendar:
- FMD: 4 months first, 6 months second, booster every 6 months for life.
- HS (Haemorrhagic Septicaemia): 6 months + annual booster before monsoon.
- Black Quarter (BQ): 6 months + annual booster.
- Brucellosis: heifer calves 4-8 months (S-19 vaccine).
Common diseases:
- Mastitis: hot swollen udder, clots in milk. Pre/post-milking teat dipping, dry-cow therapy, hygiene; CMT for subclinical. Antibiotics per vet; discard milk during treatment.
- Repeat breeding: nutritional deficiency, infections; supplement minerals (phosphorus), vet exam.
- Milk fever (hypocalcemia): around calving, animal cannot stand. Avoid excess calcium dry period; vit D. Treatment: IV calcium borogluconate, emergency.
- Bloat: distended left abdomen. Avoid sudden lush legume; dry fodder before grazing; stomach tube.
- Calf scours: ORS + continue milk + antibiotic if bacterial.
- FMD: fever, mouth/foot blisters, drooling, lameness. Isolate, soft feed, biosecurity, vaccinate healthy.
Reproduction:
- Standing heat is primary sign. AI 12-18 hours after onset of heat.
- Pregnancy: rectal palpation 45-60 days, ultrasound 30 days.
- Calving: clean dry area; assist if no progress after 2 hours of labour.
Deworming every 3-4 months with broad-spectrum anthelmintics (rotate). Tick/lice control with acaricides.
Healthy animal: alert, bright eyes, moist nose, temp 101.5\xB0F, 6-8 ruminations/min.
Normal physiology: temperature 101-102\xB0F (38.3-38.9\xB0C), heart 60-70 bpm, respiration 15-30/min.

## 3. BREEDING & GENETICS
AI is preferred (genetic improvement, disease prevention). Select bulls with high EBV, milk yield, fat %, longevity.
Female selection: dam's milk records, age at first calving 24-30 mo, calving interval 12-14 mo, udder conformation.
Indigenous high-milk breeds:
- Gir (Gujarat): 1500-2500 kg/lactation, 4.5-5% fat.
- Sahiwal: 2000-3000 kg, heat-tolerant.
- Red Sindhi: 1800-2500 kg.
- Tharparkar (Rajasthan): 1500-2200 kg.
Buffalo breeds:
- Murrah (Haryana/Punjab): 2000-3000 kg/lactation, 7% fat, best buffalo.
- Surti (Gujarat): 1200-1800 kg, 7-8% fat.
- Jaffarabadi (Gujarat): 1500-2200 kg, largest buffalo, 7-8% fat.
- Mehsana (Gujarat): 1200-1800 kg, dual purpose.

## 4. HOUSING & MILKING
Housing types: loose (free movement, more comfortable), tied (small farms), or combined.
Calf pens: 1.5 x 1.0 m for under 3 months. Clean, dry, ventilated.
Milking hygiene: wash hands, clean udder; full-hand technique; no thumb pressure; complete let-down. Pre/post teat dip.

## 5. FODDER PRODUCTION
Perennial: Hybrid Napier 150-200 t/ha/yr (4-5 cuttings); Para grass 100-150 t/ha (waterlogged areas).
Annual: Maize 350-400 q/ha (60-70 d); Sorghum/Jowar; Bajra; Cowpea 200-250 q/ha (45-50 d, mixes well with cereals).
Hay making: harvest legumes at 10% flowering, grasses before flowering, dry to <15% moisture, store covered.
Silage: chop fodder, pack tightly, exclude air, ferment 21-45 days.

## 6. ETHNO-VETERINARY MEDICINE (EVM) \u2014 Traditional plant-based formulations
**Mastitis (water-based, 1 day dose)**: 250 g aloe vera (whole leaf, thorns removed), 50 g turmeric powder, 15 g lime (calcium hydroxide), 6 lemons. Blend aloe+turmeric+lime to reddish paste. Wash udder & milk out fully. Take a handful of paste + 200 ml water; apply 10 times/day for 5 days. Last application of day = oil-based version (same paste + 600 ml mustard/gingelly oil; apply 3x/day for 5 days). Feed 2 halved lemons orally 3x/day for 3 days.
**Teat obstruction**: Insert a fresh neem leafstalk coated with turmeric powder + butter/ghee into the affected teat (cut end up). Replace after each milking.
**Udder oedema**: 200 ml sesame/mustard oil + 1 handful turmeric + 2 garlic pearls. Heat oil, add turmeric & sliced garlic, remove when fragrant. Apply circularly with pressure 4 times/day for 3 days. Rule out mastitis first.
**Retention of placenta (ROP)**: Feed 1 full white radish tuber within 2 hours of calving. If ROP >8 hours, feed 1.5 kg lady's finger (cut in halves) + jaggery + salt. If still retained at 12 hours, tie a knot near the base, cut 2 inches below; do NOT manually remove. Feed 1 radish weekly for 4 weeks.
**Repeat breeding**: Start day 1-2 of heat. Daily once with jaggery+salt: (a) 1 white radish x 5 days; (b) 1 aloe vera leaf x 4 days; (c) 4 handfuls moringa leaves x 4 days; (d) 4 handfuls cissus stem x 4 days; (e) 4 handfuls curry leaves + 5 g turmeric x 4 days. Repeat if not conceived.
**Prolapse**: Aloe vera gel from one leaf (washed of slime) + pinch turmeric, boiled to half + 2 handfuls Mimosa pudica paste. Sprinkle gel on prolapsed mass; apply M.pudica paste after gel dries. Repeat frequently.
**FMD mouth lesions**: cumin, pepper, garlic, fenugreek, turmeric, coconut, jaggery \u2014 apply gently inside mouth/tongue/palate 3x/day for 3-5 days.
**FMD foot lesions**: acalypha, neem, garlic. Clean wound, apply or bandage. For maggots: anona leaf paste or camphorated coconut oil first day.
**Fever**: coriander, garlic, bay leaves, pepper, cumin, turmeric, chirata, betel, tulsi, shallots/onion, neem, sweet basil, jaggery. Administer orally morning and evening.
**Diarrhoea**: fenugreek, pepper, onion, etc. \u2014 small balls orally once daily 1-3 days till cured.
**Bloat & indigestion**: onion, pepper, garlic, betel, chilly, turmeric, jaggery \u2014 small balls with salt 3-4x/day for 3 days.
**Worms**: onion, pepper, garlic \u2014 small balls with salt once daily for 3 days.
**Ticks/ectoparasites**: garlic, turmeric, neem \u2014 apply on affected skin.
**Pox/wart/cracks**: garlic + turmeric \u2014 apply on affected part repeatedly after drying.
**Allergy/poison/sting**: betel leaves + salt. Drops in eye every hour in critical cases.
**Hygroma (joint swelling)**: aloe vera + lime \u2014 apply 4-5x/day + hot water fomentation twice daily.
**Cough**: adhathoda (adusa), pepper, tulsi, garlic \u2014 orally 2-3x/day.
**Downer cow**: desi chicken eggs.
**Toxicity**: betel + pepper + salt as "three kings"; tamarind + moringa + jaggery 200 ml every 2 hours.
**Blood in milk**: curry leaves + EVM mastitis treatment.
**Anoestrus**: same as repeat-breeding regimen; deworm 15 days prior.

## 7. UNDERSTANDING YOUR BOVINE (cow comfort)
Body Condition Score (BCS): 1=very thin (deep cavity, prominent spine) \u2192 5=overfat. Aim 3 in lactation. BCS >3 risks ketosis, fatty liver, ROP.
Locomotion score 1=normal even strides, flat back; 5=severe lameness. Head bobs DOWN on affected forelimb, UP when standing on healthy.
Hygiene score: 1=clean \u2192 3=very dirty (long dirty patches on flank/leg/udder).
Teat end score: 1=smooth \u2192 4=very rough callus + cracking.
Manure score: 3 ideal lactating; 4-5 acceptable for dry cows.
Calving signals \u2014 Stage I (24h before): enlarged flabby vulva, udder filling, isolation. Stage II (30 min \u2013 4 h): both forelimbs + head shown in normal delivery. Stage III: placenta within 3-8 h; >12 h = ROP.
Heat stress: panting, drooling, reduced intake, reduced milk. Provide shade, fans, cool water, sprinklers.
Rumen of adult bovine holds 100-150 L. ~500 L blood circulates through udder per 1 L milk.
Gestation: cattle 280-290 days, buffalo 305-318 days.

## 8. INDIAN GOVERNMENT SCHEMES (DAHD, GoI)
**AHIDF \u2014 Animal Husbandry Infrastructure Development Fund** (\u20B929,610.25 cr through 2025-26). 3% interest subvention/yr for 8 years (2 yr moratorium). Loan up to 90% of project cost from Scheduled Banks/NABARD/NCDC/NDDB. 25% credit guarantee for MSMEs & dairy cooperatives. For dairy processing, meat processing, animal feed, breed multiplication. Eligible: individuals, companies, FPOs, MSMEs, Sec-8 cos, cooperatives.
**Rashtriya Gokul Mission (RGM)** \u2014 indigenous bovine breed improvement. Subsidy up to 50% on sex-sorted semen. \u20B95,000/IVF assured pregnancy. Up to 50% capital subsidy (max \u20B92 cr) for Breed Multiplication Farms. NAIP nationwide AI; MAITRI doorstep AI technicians.
**National Programme for Dairy Development (NPDD)** \u2014 strengthen cooperative procurement, milk testing, primary chilling at village level. Component B (DTC) JICA-aided in UP/Bihar.
**SDCFPO \u2014 Supporting Dairy Cooperatives & FPOs**: 2% interest subvention on working capital; +2% for prompt repayment.
**KCC for Animal Husbandry**: short-term working capital up to \u20B93 lakh (\u20B95 lakh in some cases) at 7% interest (extra 3% subvention for prompt repayment).
**National Livestock Mission (NLM)**: entrepreneurship support for sheep/goat/pig/poultry/fodder; silage/haylage units; fodder seed.
**Livestock Insurance Scheme**: subsidized premiums for high-yield animals; covers death by disease, accident, calamity.
**State schemes (typical)**:
- Hi-Tech Dairy Units (Haryana, UP, Gujarat \u2014 Nand Baba Doodh Mission): credit-linked subsidy for 10/20/50 milch animals.
- Small-scale (Kerala, Maharashtra, Karnataka): 25-50% subsidy for 2-5 animals + sheds, often for SHGs/JLGs/BPL.
- Indigenous breed promotion (Gujarat, Rajasthan): subsidies for Gir, Sahiwal etc.
- Cattle sheds (Kerala \u2014 Ksheera Theeram, UP): 50-75% subsidy on scientific elevated sheds.
- Equipment: 50-100% grant on Bulk Milk Coolers, milking machines, AMCUs (TN, Puducherry, Punjab).
- SC/ST/Women: 60-75% subsidy in Maharashtra, Bihar, Assam.
- Milk price incentives: per-litre premium in Karnataka, Maharashtra cooperatives.
**How to apply**: Central \u2014 through NDDB/NCDC/SLDB or AHIDF portal. State \u2014 District Animal Husbandry Office / District Dairy Development Officer; many states have online portals.

## 9. MILK QUALITY
Pre-milking: wash udder, dry with individual towel, fore-milk strip, gentle massage.
Post-milking: filter through clean cloth, cool to 4\xB0C within 2 hours. Test for fat, SNF, density, freezing point (water adulteration).

## 10. ECONOMICS
Small farm (2-5 animals) break-even ~8-12 L/day; medium (6-15) 60-100 L/day. Diversify with vermicompost, biogas.

${RATION_KNOWLEDGE}

${BALANCED_RATION_GUIDE}

${COOPERATIVE_MILK_POLICY}
`;

// catalyst/functions/pashumitra_api/lib/rag-retrieval.ts
var cachedChunks = null;
function buildChunks() {
  if (cachedChunks) return cachedChunks;
  const sections = KNOWLEDGE_BASE.split(/\n(?=## )/).map((s) => s.trim()).filter(Boolean);
  cachedChunks = sections.map((text, i) => {
    const titleMatch = text.match(/^## ([^\n]+)/);
    const title = titleMatch?.[1]?.trim() || `Section ${i + 1}`;
    return { id: `kb-${i}`, title, text };
  });
  return cachedChunks;
}
function tokenize(text) {
  const tokens = text.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 2);
  return new Set(tokens);
}
function scoreChunk(queryTokens, chunk) {
  const titleTokens = tokenize(chunk.title);
  const bodyTokens = tokenize(chunk.text);
  let score = 0;
  for (const t of queryTokens) {
    if (titleTokens.has(t)) score += 6;
    if (bodyTokens.has(t)) score += 2;
  }
  return score;
}
function formatChunks(chunks) {
  return chunks.map((c) => c.text).join("\n\n");
}
function pickByTitle(chunks, pattern, limit) {
  return chunks.filter((c) => pattern.test(c.title) || pattern.test(c.text)).slice(0, limit);
}
function mergeUnique(primary, extra) {
  const seen = new Set(primary.map((c) => c.id));
  const out = [...primary];
  for (const c of extra) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}
function retrieveRagContext(query, topK = 7) {
  const chunks = buildChunks();
  const queryTokens = tokenize(query);
  if (queryTokens.size === 0) {
    return formatChunks(pickByTitle(chunks, /NUTRITION|HEALTH|GOVERNMENT|RATION|COOPERATIVE/i, 4));
  }
  const scored = chunks.map((c) => ({ c, score: scoreChunk(queryTokens, c) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  let selected = scored.slice(0, topK).map((x) => x.c);
  if (/ration|feed|fodder|concentrate|poshan|chara|aahar|tdn|lcf|berseem|bajra|silage/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /NUTRITION|RATION|FODDER|BALANCED/i, 3));
  }
  if (/milk|sell|pour|cooperative|dcs|union|marketing|dudh|dugh|buyer/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /COOPERATIVE|MILK MARKETING|ECONOMICS/i, 2));
  }
  if (/scheme|subsidy|loan|kcc|ahidf|rgm|npdd|nlm|government|yojana/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /GOVERNMENT|SCHEME/i, 2));
  }
  if (/mastitis|fever|disease|vaccin|evm|ethno|breed|heat|calv|pregnan/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /HEALTH|EVM|BREEDING|BOVINE/i, 3));
  }
  if (selected.length === 0) {
    selected = chunks.slice(0, Math.min(5, chunks.length));
  }
  return formatChunks(selected.slice(0, topK + 2));
}

// catalyst/functions/pashumitra_api/lib/sarvam.ts
var SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions";
var SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";
function env(key) {
  if (typeof process !== "undefined" && process.env?.[key]) return process.env[key];
  if (typeof Deno !== "undefined") return Deno.env.get(key);
  return void 0;
}
function getSarvamApiKey() {
  const key = env("SARVAM_API_KEY");
  if (!key) throw new Error("SARVAM_API_KEY not configured");
  return key;
}
function getSarvamChatModel() {
  return env("SARVAM_CHAT_MODEL") || "sarvam-30b";
}
function getSarvamSttModel() {
  return env("SARVAM_STT_MODEL") || "saaras:v3";
}
async function sarvamChatCompletion(body) {
  return fetch(SARVAM_CHAT_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": getSarvamApiKey(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}
var APP_TO_SARVAM_LANG = {
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
  or: "od-IN",
  as: "as-IN",
  ur: "ur-IN",
  en: "en-IN"
};
function appLangToSarvam(code) {
  if (!code) return void 0;
  return APP_TO_SARVAM_LANG[code];
}
function mimeToFilename(mimeType) {
  if (mimeType?.includes("mp4") || mimeType?.includes("m4a")) return "audio.mp4";
  if (mimeType?.includes("wav")) return "audio.wav";
  if (mimeType?.includes("ogg")) return "audio.ogg";
  return "audio.webm";
}
function mimeToBlobType(mimeType) {
  if (mimeType?.includes("mp4")) return "audio/mp4";
  if (mimeType?.includes("wav")) return "audio/wav";
  if (mimeType?.includes("ogg")) return "audio/ogg";
  return "audio/webm";
}
async function sarvamTranscribe(audioBytes, mimeType, languageCode) {
  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: mimeToBlobType(mimeType) }), mimeToFilename(mimeType));
  form.append("model", getSarvamSttModel());
  form.append("mode", "transcribe");
  const sarvamLang = appLangToSarvam(languageCode);
  if (sarvamLang) form.append("language_code", sarvamLang);
  const res = await fetch(SARVAM_STT_URL, {
    method: "POST",
    headers: { "api-subscription-key": getSarvamApiKey() },
    body: form
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("Sarvam STT error:", res.status, t);
    throw new Error("Transcription failed");
  }
  const data = await res.json();
  return (data.transcript || "").trim();
}

// catalyst/functions/pashumitra_api/src/handlers/chat.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
var SYSTEM_PROMPT = `You are PashuMitra, a friendly WhatsApp-style assistant for Indian livestock farmers and dairy entrepreneurs.

OUTPUT FORMAT (STRICT \u2014 NON-NEGOTIABLE):
The VERY FIRST characters of your response MUST be exactly: [[LANG:xx]]
followed immediately by a single newline, then the answer.
- xx is the 2-letter code of the language the answer is written in.
- Allowed codes: hi, bn, ta, te, mr, gu, kn, ml, pa, or, as, ur, en.
- Do NOT put the header anywhere else. Do NOT omit it. Do NOT add spaces or quotes before it.

LANGUAGE RULES (MIXED / CODE-SWITCHED INPUT SUPPORTED):
- Supported (12 Indian languages + English):
  Hindi (\u0939\u093F\u0928\u094D\u0926\u0940, hi), Bengali (\u09AC\u09BE\u0982\u09B2\u09BE, bn), Tamil (\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD, ta), Telugu (\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41, te),
  Marathi (\u092E\u0930\u093E\u0920\u0940, mr), Gujarati (\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0, gu), Kannada (\u0C95\u0CA8\u0CCD\u0CA8\u0CA1, kn), Malayalam (\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02, ml),
  Punjabi (\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40, pa), Odia (\u0B13\u0B21\u0B3C\u0B3F\u0B06, or), Assamese (\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE, as), Urdu (\u0627\u0631\u062F\u0648, ur), English (en).
- ALWAYS reply in the SAME language as the user's LAST message. If the user wrote in Bengali script, reply in Bengali (bn) \u2014 NEVER default to Hindi. Same for Tamil, Telugu, etc.
- The xx code in [[LANG:xx]] MUST exactly match the language/script you actually use in the answer body. If body is Bengali script \u2192 header must be [[LANG:bn]]. If body is Hindi Devanagari \u2192 [[LANG:hi]]. They must agree.
- For romanized/code-mixed input (Hinglish, Banglish, Tanglish), reply in the native script of the dominant Indian language.
- If purely English \u2192 reply in English (en). If totally unclear \u2192 Hindi (hi).
- Keep technical/scheme/medicine names in English in parentheses when helpful. NEVER refuse due to mixed language.
- DO NOT greet. Answer directly.

${CONTENT_SAFETY_RULES}

ANSWER STYLE (WhatsApp-style, farmer-friendly):
- Use very simple words that a farmer can understand easily. Avoid difficult medical, legal, or technical words unless needed.
- If you must use a hard term, add a simple explanation in brackets.
- Warm, simple, practical. Short paragraphs and bullet points.
- Give direct steps: what to check, what to do now, when to call a vet/officer.
- Do not write long essays. Prefer 3-6 short points.
- Emojis sparingly (\u{1F404} \u{1F95B} \u{1F489} \u{1F33E} \u2705 \u26A0\uFE0F) where helpful.
- For medical/disease questions ALWAYS end with: "\u26A0\uFE0F Please consult your local veterinarian for serious cases." (translated to the user's language).

RATION BALANCING (NDDB RBP \u2014 CRITICAL):
When the farmer asks about ration, balanced feed, least-cost feed, what to feed, concentrate quantity, or gives milk yield + animal type + location/herd size:
- Follow the NDDB Least-Cost Formulation (LCF) workflow in the knowledge base (Section 11).
- Ask only for missing essentials: breed/type, milk kg/day, fat %, lactation stage, state/region, herd count, season if unclear.
- Always calculate FCM and show a practical daily ration in kg (green fodder + dry fodder + concentrate + ASMM 150 g).
- Use regional prices from the knowledge base for cost estimates (per animal and total herd if count given).
- Pick seasonal/local feeds (berseem in rabi, maize/sorghum in kharif, silage/straw in summer).
- Recommend BIS Type I for >10 L/day, BIS Type II for 5\u201310 L/day.
- If COMPUTED RATION ADVISORY is provided below in this prompt, use those exact numbers as the basis of your answer (translate to farmer's language, keep amounts and costs).
- End with note to verify local prices and consult Pashu Poshan app / NDDB LRP for fine-tuning.
- For generic ration questions without full details, give practical guidance from the knowledge base \u2014 do NOT force a long interview unless the farmer opened Ration Advisory mode.

MILK MARKETING \u2014 COOPERATIVE ONLY (CRITICAL):
- When discussing selling/pouring/marketing milk: ALWAYS advise farmers to pour milk ONLY at their local **dairy cooperative** collection centre (DCS/village society \u2192 district milk union).
- NEVER recommend private dairies, hotels, restaurants, or middlemen as primary milk buyers.
- Explain cooperative benefits: fair fat/SNF price, timely payment, bonus, cattle feed, AI, vet services.
- Redirect any private-buyer question to nearest cooperative centre / DCS Secretary / milk union field officer.

YOUTUBE / VIDEO LINKS (CRITICAL \u2014 NO FAKE URLS):
- NEVER invent, guess, or fabricate YouTube URLs or video IDs. Broken links harm farmers.
- When farmer asks for a video/YouTube link: explain the topic in text but do NOT paste any youtube.com or youtu.be URL \u2014 the app attaches verified working links automatically after your reply.
- If you must mention video, say "verified link is below" without a URL.
- ONLY include a YouTube URL if it appears verbatim in VERIFIED YOUTUBE VIDEOS below (rare \u2014 prefer no URL).

DOMAIN: Livestock & dairy farming, cattle/buffalo health, breeding, nutrition, fodder, ethno-veterinary medicine, milk quality, balanced ration formulation, and Indian government schemes (DAHD, RGM, AHIDF, NPDD, NLM, KCC, state schemes). Outside this domain, gently redirect in the user's language.

KNOWLEDGE: Use ONLY facts from the RETRIEVED KNOWLEDGE section provided in this conversation. Do not invent schemes, medicines, or dosages. If retrieved knowledge is insufficient, say what is missing and give safe general guidance.

REMEMBER: First line = [[LANG:xx]] then newline then answer. The language of the answer MUST match xx and MUST match the user's last message.`;
var RATION_ADVISORY_MODE_PROMPT = `RATION ADVISORY PANEL MODE (ACTIVE):
The farmer opened the dedicated "Ration Advisory" tool \u2014 NOT regular chat.

LANGUAGE (ALL 12 + English \u2014 equally important, not only Hindi or Gujarati):
- Supported: hi, bn, ta, te, mr, gu, kn, ml, pa, or, as, ur, en.
- ALWAYS reply in the SAME language as the farmer's messages (see CRITICAL LANGUAGE LOCK).
- Bengali farmer \u2192 Bengali reply. Tamil \u2192 Tamil. Telugu \u2192 Telugu. Gujarati \u2192 Gujarati. etc.
- Never switch to Hindi unless the farmer is writing/speaking Hindi.

DATA COLLECTION (simple village words in farmer's language):
- gaay/bhains, nasl (breed), kitne pashu, doodh/sukhi/garbh, kitne din/mahine, kitni baar bachha/gaabhin (byaat), umar, ab kya khilati hain.
- NEVER say "lactation", "DIM", "parity".
- Use farmer's answers to compute per-animal ration (system calculates numbers).

WHEN "QUESTIONS ONLY" in system message: ask 2\u20134 short follow-ups only \u2014 no kg, no \u20B9.

WHEN "COMPUTED RESULTS" in system message \u2014 present in this ORDER:
1. HERD PREP FIRST: total kg to prepare/mix for the whole herd today (green fodder + dry + concentrate + mineral).
2. PER ANIMAL SECOND: each animal's daily share (breed, doodh/sukhi/garbh, milk litres, kg of each feed).
Use exact numbers from COMPUTED RESULTS. Simple words only.`;
var LANGUAGE_LABELS = {
  hi: "Hindi / \u0939\u093F\u0928\u094D\u0926\u0940",
  bn: "Bengali / \u09AC\u09BE\u0982\u09B2\u09BE",
  ta: "Tamil / \u0BA4\u0BAE\u0BBF\u0BB4\u0BCD",
  te: "Telugu / \u0C24\u0C46\u0C32\u0C41\u0C17\u0C41",
  mr: "Marathi / \u092E\u0930\u093E\u0920\u0940",
  gu: "Gujarati / \u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0",
  kn: "Kannada / \u0C95\u0CA8\u0CCD\u0CA8\u0CA1",
  ml: "Malayalam / \u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02",
  pa: "Punjabi / \u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40",
  or: "Odia / \u0B13\u0B21\u0B3C\u0B3F\u0B06",
  as: "Assamese / \u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE",
  ur: "Urdu / \u0627\u0631\u062F\u0648",
  en: "English"
};
var RATION_KEYWORDS = /ration|feed|fodder|concentrate|balanced|poshan|खुराक|चारा|भोजन|आहार|রেশন|খাদ্য|தீவன|మేత|आहार|આહાર|ಆಹಾರ|ആഹാര|ਖੁਰਾਕ|ଆହାର|খাদ্য|خوراک|diet|least.?cost|lcf|tdn|compound feed|mineral mix|berseem|bajra|straw|silage/i;
var REGION_KEYWORDS2 = [
  [/punjab|haryana|up\b|uttar pradesh|north india|दिल्ली|delhi|rajasthan.*north/i, "north"],
  [/gujarat|rajasthan|madhya pradesh|mp\b|west india|गुजरात|राजस्थान/i, "west"],
  [/karnataka|andhra|telangana|tamil|tamil nadu|kerala|south india|दक्षिण/i, "south"],
  [/bengal|bihar|odisha|orissa|assam|east india|पूर्व|wb\b/i, "east"],
  [/maharashtra|deccan|central india|महाराष्ट्र/i, "central"]
];
function detectRegion2(text) {
  for (const [re, region] of REGION_KEYWORDS2) {
    if (re.test(text)) return region;
  }
  return "north";
}
function detectSeason2() {
  const m = (/* @__PURE__ */ new Date()).getMonth();
  if (m >= 6 && m <= 9) return "kharif";
  if (m >= 10 || m <= 2) return "rabi";
  return "summer";
}
function extractNumber2(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1]);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  return null;
}
function detectBreed2(text) {
  const t = text.toLowerCase();
  if (/murrah|मुर्रा|murra/i.test(t)) return "murrah_buffalo";
  if (/jaffarabadi|jaff/i.test(t)) return "jaffarabadi";
  if (/surti|सurti/i.test(t)) return "surti_buffalo";
  if (/gir|sahiwal|desi|indigenous|गिर|साहीवाल/i.test(t)) return "gir_cow";
  if (/tharparkar/i.test(t)) return "tharparkar";
  if (/holstein|hf\b|friesian/i.test(t)) return "holstein";
  if (/buffalo|भैंस|মহিষ/i.test(t)) return "murrah_buffalo";
  if (/cross|crossbred|क्रॉस/i.test(t)) return "hf_jersey_cross";
  return "hf_jersey_cross";
}
function tryComputeRationHint(messages) {
  const context = messages.filter((m) => m.role === "user").slice(-3).map((m) => m.content).join(" ");
  if (!RATION_KEYWORDS.test(context)) return null;
  const milk = extractNumber2(context, [
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|l\b|kg)\s*(?:milk|दूध|দুধ|பால்|పాలు|दूध)/i,
    /milk[:\s]+(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:l|kg)\s*(?:\/|per)?\s*day/i,
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|l\b)/i
  ]);
  if (milk === null || milk <= 0 || milk > 60) return null;
  const fat = extractNumber2(context, [/fat[:\s]+(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*%\s*fat/i]) ?? 4;
  const count = extractNumber2(context, [/(\d+)\s*(?:cow|buffalo|animal|cattle|गाय|भैंस|animals|milch)/i, /herd[:\s]+(\d+)/i]) ?? 1;
  const breed = detectBreed2(context);
  const region = detectRegion2(context);
  const season = detectSeason2();
  const feeds = pickSeasonFeeds(season);
  const bw = BREED_WEIGHTS[breed]?.bw ?? 450;
  const prices = REGION_PRICES[region];
  const req = calcRequirements(bw, milk, fat, "mid", false);
  const result = buildRation(req, feeds.green, feeds.dry, feeds.conc, prices);
  const advisory = formatRationAdvisory(BREED_WEIGHTS[breed]?.name ?? "Dairy animal", milk, fat, region, { req, ...result }, count);
  return `COMPUTED RATION ADVISORY (NDDB LCF \u2014 use these numbers in your answer):
${advisory}`;
}
function streamStaticText(text) {
  const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}

`;
  return new Response(`${chunk}data: [DONE]

`, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
  });
}
async function handleChat(req) {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, stream = true, mode = "chat", forceLanguage = null } = await req.json();
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser?.content && containsAbusiveLanguage(lastUser.content)) {
      const refusal = abuseRefusalMessage(detectLangForRefusal(lastUser.content));
      if (stream) return streamStaticText(refusal);
      return new Response(JSON.stringify({ text: refusal }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const safeMessages = messages.map(
      (m) => m.role === "user" ? { ...m, content: filterAbusiveLanguage(m.content) } : m
    );
    const isRationAdvisory = mode === "ration_advisory";
    const advisoryHint = isRationAdvisory ? tryRationAdvisoryHint(safeMessages) : null;
    const rationHint = isRationAdvisory ? null : tryComputeRationHint(safeMessages);
    const youtubeHint = await tryYoutubeVideoHint(safeMessages);
    const userCtx = safeMessages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
    const ragContext = retrieveRagContext(userCtx || lastUser?.content || "");
    const detectedUserLang = userCtx.trim() ? detectLangForRefusal(userCtx) : null;
    const effectiveForceLang = (typeof forceLanguage === "string" ? forceLanguage : null) ?? (isRationAdvisory && detectedUserLang ? detectedUserLang : null);
    const effectiveForcedLabel = effectiveForceLang ? LANGUAGE_LABELS[effectiveForceLang] : null;
    if (isRationAdvisory) {
      const directReply = getRationAdvisoryDirectReply(safeMessages, effectiveForceLang);
      if (directReply) {
        if (stream) return streamStaticText(directReply);
        return new Response(JSON.stringify({ text: directReply }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    const response = await sarvamChatCompletion({
      model: getSarvamChatModel(),
      temperature: 0.4,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: `RETRIEVED KNOWLEDGE (Catalyst RAG \u2014 authoritative facts for this question):
${ragContext}` },
        ...isRationAdvisory ? [{ role: "system", content: RATION_ADVISORY_MODE_PROMPT }] : [],
        ...advisoryHint ? [{ role: "system", content: advisoryHint }] : [],
        ...rationHint ? [{ role: "system", content: rationHint }] : [],
        ...youtubeHint ? [{ role: "system", content: youtubeHint }] : [],
        ...mode === "call" ? [{ role: "system", content: `LIVE CALL MODE \u2014 FEMALE ADVISOR (CRITICAL):
You are PashuMitra, a woman speaking on a live phone call with a farmer. ALWAYS use feminine first-person grammar:
- Hindi: \u0915\u0930\u0942\u0901\u0917\u0940, \u092C\u0924\u093E\u090A\u0901\u0917\u0940, \u0938\u092E\u091D \u0930\u0939\u0940 \u0939\u0942\u0901, \u0938\u0941\u0928 \u0930\u0939\u0940 \u0939\u0942\u0901 (NEVER masculine \u0915\u0930\u0942\u0901\u0917\u093E/\u0938\u092E\u091D \u0930\u0939\u093E \u0939\u0942\u0901).
- Marathi/Gujarati/Bengali/Punjabi/etc.: use feminine verb forms for "I".
Answer like a warm, patient human helper. Very simple village/farmer words. 2\u20134 short speakable sentences only. No headings, no long bullet lists. Give the next practical step first.` }] : [],
        ...isRationAdvisory && isHerdGathering(advisoryHint) ? [{ role: "system", content: "RATION DATA COLLECTION MODE: The main prompt's RATION BALANCING rules are DISABLED this turn. Do NOT give generic ration advice, kg amounts, or feed plans. ONLY ask questions or read back summary for confirmation." }] : [],
        ...effectiveForceLang && effectiveForcedLabel ? [{ role: "system", content: `CRITICAL LANGUAGE LOCK: The next answer MUST be written only in ${effectiveForcedLabel}. The first line MUST be [[LANG:${effectiveForceLang}]]. Do not use Hindi unless the locked language is Hindi. Do not mix scripts.` }] : [],
        ...safeMessages,
        ...isRationAdvisory && isHerdGathering(advisoryHint) && !isVerificationStep(advisoryHint) ? [{ role: "system", content: "FINAL INSTRUCTION: Reply with ONLY 2\u20134 simple questions for the farmer in the LOCKED language. Acknowledge herd size if stated. Ask about the next animal. NO ration advice, NO kg, NO \u20B9. First line must still be [[LANG:xx]]." }] : [],
        ...isRationAdvisory && isVerificationStep(advisoryHint) ? [{ role: "system", content: "FINAL INSTRUCTION: Read back ALL animal details from PARSED SUMMARY in farmer's language. Confirm total count matches. Ask 'Kya sab sahi hai?' NO ration kg amounts yet. First line [[LANG:xx]]." }] : [],
        ...isRationAdvisory && isRationComputed(advisoryHint) ? [{ role: "system", content: "FINAL INSTRUCTION: Present COMPUTED RESULTS in farmer's language. ORDER: (1) HERD PREP \u2014 total kg to mix/prepare for whole herd today; (2) PER ANIMAL \u2014 each animal's daily share with breed and status. Use exact kg from system block." }] : [],
        ...effectiveForceLang && effectiveForcedLabel ? [{ role: "system", content: `FINAL CHECK BEFORE ANSWERING: Reply in ${effectiveForcedLabel} only, with [[LANG:${effectiveForceLang}]] as the first line. Keep it simple enough for a farmer.` }] : []
      ],
      stream
    });
    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Too many requests, please wait." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (response.status === 401 || response.status === 403) {
      return new Response(JSON.stringify({ error: "Sarvam API key invalid or missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("Sarvam chat error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
      });
    }
    const data = await response.json();
    const text = filterAbusiveLanguage(data.choices?.[0]?.message?.content || "");
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// catalyst/functions/pashumitra_api/src/handlers/transcribe.ts
var corsHeaders2 = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
function decodeBase64Audio(audioBase64) {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function handleTranscribe(req) {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders2 });
  try {
    const { audioBase64, mimeType, language } = await req.json();
    if (!audioBase64) throw new Error("audioBase64 required");
    const audioBytes = decodeBase64Audio(audioBase64);
    const transcript = await sarvamTranscribe(audioBytes, mimeType, language);
    if (transcript === "[BLOCKED]" || containsAbusiveLanguage(transcript)) {
      return new Response(JSON.stringify({ transcript: "", blocked: true }), {
        headers: { ...corsHeaders2, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ transcript: filterAbusiveLanguage(transcript) }), {
      headers: { ...corsHeaders2, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders2, "Content-Type": "application/json" }
    });
  }
}

// catalyst/functions/pashumitra_api/src/routes/log-turn.mts
async function handleLogTurn(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const question = String(req.body?.question || "").trim();
  const answer = String(req.body?.answer || "").trim();
  const session_id = String(req.body?.session_id || "").trim();
  if (!question || !answer || !session_id) {
    res.status(400).json({ error: "question, answer, session_id required" });
    return;
  }
  const row = {
    session_id,
    conversation_id: req.body?.conversation_id ? String(req.body.conversation_id) : null,
    question: question.slice(0, 5e4),
    answer: answer.slice(0, 5e4),
    duration_ms: typeof req.body?.duration_ms === "number" ? Math.round(req.body.duration_ms) : null,
    language: req.body?.language ? String(req.body.language) : null,
    is_voice: Boolean(req.body?.is_voice),
    mode: req.body?.mode === "call" || req.body?.mode === "voice" ? req.body.mode : "chat"
  };
  try {
    const catalyst = require("zcatalyst-sdk-node");
    const app2 = catalyst.initialize(req);
    const table = app2.datastore().table("conversation_turns");
    await table.insertRow(row);
    res.status(200).json({ ok: true });
    return;
  } catch (e) {
    console.warn("Catalyst Data Store insert failed:", e);
  }
  res.status(503).json({
    error: "Logging not configured \u2014 create Catalyst Data Store table conversation_turns"
  });
}

// catalyst/functions/pashumitra_api/lib/bhashini.ts
var BHASHINI_LANG = {
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  or: "Odia",
  as: "Assamese",
  ur: "Urdu",
  en: "English"
};

// catalyst/functions/pashumitra_api/lib/tts.ts
var BHASHINI_SUPPORTED = /* @__PURE__ */ new Set(["hi", "bn", "ta", "te", "mr", "kn", "ml", "en"]);
var GOOGLE_TTS_LANG = {
  gu: "gu",
  pa: "pa",
  ur: "ur",
  or: "hi",
  as: "bn"
};
function cleanTtsText(text) {
  return String(text || "").replace(/\[?\[?\s*LANG\s*:\s*[a-zA-Z]{2}\s*\]?\]?/gi, " ").replace(/```[\s\S]*?```/g, " ").replace(/[`*_#>~[\]]/g, "").replace(/^\s*[-–—•]\s+/gm, "").replace(/(\d)\s*[-–—]\s*(?=\d)/g, "$1 to ").replace(/\s+[-–—]\s+/g, ", ").replace(/[-–—]+/g, " ").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();
}
function chunkText(text, max = 180) {
  if (text.length <= max) return [text];
  const parts = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.5) cut = max;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
}
function concatAudio(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
async function synthesizeBhashini(text, lang, apiKey) {
  const language = BHASHINI_LANG[lang] || BHASHINI_LANG.hi;
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["X-API-KEY"] = apiKey;
  const resp = await fetch("https://tts.bhashini.ai/v2/synthesize", {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      language,
      voiceName: "Female1",
      speechRate: 1,
      voiceStyle: "Neutral"
    })
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(detail || `Bhashini TTS error ${resp.status}`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}
async function synthesizeGoogle(text, lang) {
  const tl = GOOGLE_TTS_LANG[lang] || lang;
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    }
  });
  if (!resp.ok) throw new Error(`Google TTS error ${resp.status}`);
  return new Uint8Array(await resp.arrayBuffer());
}
async function synthesizeSpeech(text, lang = "hi") {
  const code = String(lang || "hi").toLowerCase();
  const apiKey = Deno.env.get("BHASHINI_API_KEY");
  const useBhashini = BHASHINI_SUPPORTED.has(code);
  const parts = chunkText(text);
  const audioChunks = [];
  for (const part of parts) {
    if (useBhashini) {
      try {
        audioChunks.push(await synthesizeBhashini(part, code, apiKey));
        continue;
      } catch {
      }
    }
    audioChunks.push(await synthesizeGoogle(part, code));
  }
  return concatAudio(audioChunks);
}

// catalyst/functions/pashumitra_api/src/routes/tts.mts
async function handleTts(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { text, lang = "hi" } = req.body ?? {};
    const clean = cleanTtsText(String(text || ""));
    if (!clean) {
      res.status(400).json({ error: "Empty text" });
      return;
    }
    const audio = await synthesizeSpeech(clean, String(lang));
    res.status(200);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(audio));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "TTS failed" });
  }
}

// catalyst/functions/pashumitra_api/src/routes/youtube-search.mts
async function handleYoutubeSearch(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { query = "dairy farming", lang = "hi", max = 3 } = req.body ?? {};
    const limit = Math.min(Math.max(Number(max) || 3, 1), 5);
    const q = String(query);
    const videos = await findYoutubeVideos(q, String(lang), limit);
    res.status(200).json({
      videos,
      query: q,
      source: videos.length > 0 ? "official_channels" : "none",
      policy: "official_cooperative_channels_only"
    });
  } catch (e) {
    console.error("youtube-search error:", e);
    res.status(200).json({
      videos: [],
      query: "dairy farming",
      fallback: true,
      source: "error",
      policy: "official_cooperative_channels_only"
    });
  }
}

// catalyst/functions/pashumitra_api/src/server.mts
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "20mb" }));
var corsHeaders3 = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
app.use((_req, res, next) => {
  res.set(corsHeaders3);
  next();
});
async function relayWebHandler(handler, req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const url = `${req.protocol}://${req.get("host") || "localhost"}${req.originalUrl}`;
  const init = {
    method: req.method,
    headers: { "Content-Type": "application/json" }
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = JSON.stringify(req.body ?? {});
  }
  const webRes = await handler(new Request(url, init));
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  if (!webRes.body) {
    res.end();
    return;
  }
  const reader = webRes.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}
app.options("/chat", (_req, res) => res.status(204).end());
app.post("/chat", (req, res) => void relayWebHandler(handleChat, req, res).catch((e) => {
  console.error("chat route error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));
app.options("/transcribe", (_req, res) => res.status(204).end());
app.post("/transcribe", (req, res) => void relayWebHandler(handleTranscribe, req, res).catch((e) => {
  console.error("transcribe route error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));
app.options("/log-turn", (_req, res) => res.status(204).end());
app.post("/log-turn", (req, res) => void handleLogTurn(req, res).catch((e) => {
  console.error("log-turn error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));
app.options("/tts", (_req, res) => res.status(204).end());
app.post("/tts", (req, res) => void handleTts(req, res).catch((e) => {
  console.error("tts error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));
app.options("/youtube-search", (_req, res) => res.status(204).end());
app.post("/youtube-search", (req, res) => void handleYoutubeSearch(req, res).catch((e) => {
  console.error("youtube-search error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "pashumitra_api", llm: "sarvam", rag: "catalyst-keyword", knowledge: "catalyst/lib/knowledge" });
});
module.exports = app;
//# sourceMappingURL=index.js.map
