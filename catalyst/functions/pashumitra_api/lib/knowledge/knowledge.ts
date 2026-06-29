// Curated knowledge base on dairy farming, livestock, ethno-veterinary medicine,
// and Indian government schemes. Compiled from NDDB Knowledge Repo, EVM Brochure,
// Cow Comfort manual, Pashupalan Nirdeshika, and DAHD Schemes documents.
import { NDLM_DIGITAL_PLATFORMS } from "./ndlm-digital-platforms.ts";
import { BALANCED_RATION_GUIDE } from "./balanced-ration-guide.ts";
import { RATION_KNOWLEDGE } from "./ration-knowledge.ts";
import { COOPERATIVE_MILK_POLICY } from "./cooperative-policy.ts";
import { DAHD_SCHEMES } from "./dahd-schemes.ts";
import { ICAR_LIVESTOCK_HEALTH } from "./icar-livestock-health.ts";
import { EXTENSION_MATERIAL } from "./extension-material.generated.ts";
import { SARVAM_RAG_CORPUS } from "./sarvam-rag.generated.ts";

export const KNOWLEDGE_BASE = `
# DAIRY FARMING & ANIMAL HUSBANDRY KNOWLEDGE BASE

${NDLM_DIGITAL_PLATFORMS}

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
Healthy animal: alert, bright eyes, moist nose, temp 101.5°F, 6-8 ruminations/min.
Normal physiology: temperature 101-102°F (38.3-38.9°C), heart 60-70 bpm, respiration 15-30/min.

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

## 6. ETHNO-VETERINARY MEDICINE (EVM) — Traditional plant-based formulations
**Mastitis (water-based, 1 day dose)**: 250 g aloe vera (whole leaf, thorns removed), 50 g turmeric powder, 15 g lime (calcium hydroxide), 6 lemons. Blend aloe+turmeric+lime to reddish paste. Wash udder & milk out fully. Take a handful of paste + 200 ml water; apply 10 times/day for 5 days. Last application of day = oil-based version (same paste + 600 ml mustard/gingelly oil; apply 3x/day for 5 days). Feed 2 halved lemons orally 3x/day for 3 days.
**Teat obstruction**: Insert a fresh neem leafstalk coated with turmeric powder + butter/ghee into the affected teat (cut end up). Replace after each milking.
**Udder oedema**: 200 ml sesame/mustard oil + 1 handful turmeric + 2 garlic pearls. Heat oil, add turmeric & sliced garlic, remove when fragrant. Apply circularly with pressure 4 times/day for 3 days. Rule out mastitis first.
**Retention of placenta (ROP)**: Feed 1 full white radish tuber within 2 hours of calving. If ROP >8 hours, feed 1.5 kg lady's finger (cut in halves) + jaggery + salt. If still retained at 12 hours, tie a knot near the base, cut 2 inches below; do NOT manually remove. Feed 1 radish weekly for 4 weeks.
**Repeat breeding**: Start day 1-2 of heat. Daily once with jaggery+salt: (a) 1 white radish x 5 days; (b) 1 aloe vera leaf x 4 days; (c) 4 handfuls moringa leaves x 4 days; (d) 4 handfuls cissus stem x 4 days; (e) 4 handfuls curry leaves + 5 g turmeric x 4 days. Repeat if not conceived.
**Prolapse**: Aloe vera gel from one leaf (washed of slime) + pinch turmeric, boiled to half + 2 handfuls Mimosa pudica paste. Sprinkle gel on prolapsed mass; apply M.pudica paste after gel dries. Repeat frequently.
**FMD mouth lesions**: cumin, pepper, garlic, fenugreek, turmeric, coconut, jaggery — apply gently inside mouth/tongue/palate 3x/day for 3-5 days.
**FMD foot lesions**: acalypha, neem, garlic. Clean wound, apply or bandage. For maggots: anona leaf paste or camphorated coconut oil first day.
**Fever**: coriander, garlic, bay leaves, pepper, cumin, turmeric, chirata, betel, tulsi, shallots/onion, neem, sweet basil, jaggery. Administer orally morning and evening.
**Diarrhoea**: fenugreek, pepper, onion, etc. — small balls orally once daily 1-3 days till cured.
**Bloat & indigestion**: onion, pepper, garlic, betel, chilly, turmeric, jaggery — small balls with salt 3-4x/day for 3 days.
**Worms**: onion, pepper, garlic — small balls with salt once daily for 3 days.
**Ticks/ectoparasites**: garlic, turmeric, neem — apply on affected skin.
**Pox/wart/cracks**: garlic + turmeric — apply on affected part repeatedly after drying.
**Allergy/poison/sting**: betel leaves + salt. Drops in eye every hour in critical cases.
**Hygroma (joint swelling)**: aloe vera + lime — apply 4-5x/day + hot water fomentation twice daily.
**Cough**: adhathoda (adusa), pepper, tulsi, garlic — orally 2-3x/day.
**Downer cow**: desi chicken eggs.
**Toxicity**: betel + pepper + salt as "three kings"; tamarind + moringa + jaggery 200 ml every 2 hours.
**Blood in milk**: curry leaves + EVM mastitis treatment.
**Anoestrus**: same as repeat-breeding regimen; deworm 15 days prior.

## 7. UNDERSTANDING YOUR BOVINE (cow comfort)
Body Condition Score (BCS): 1=very thin (deep cavity, prominent spine) → 5=overfat. Aim 3 in lactation. BCS >3 risks ketosis, fatty liver, ROP.
Locomotion score 1=normal even strides, flat back; 5=severe lameness. Head bobs DOWN on affected forelimb, UP when standing on healthy.
Hygiene score: 1=clean → 3=very dirty (long dirty patches on flank/leg/udder).
Teat end score: 1=smooth → 4=very rough callus + cracking.
Manure score: 3 ideal lactating; 4-5 acceptable for dry cows.
Calving signals — Stage I (24h before): enlarged flabby vulva, udder filling, isolation. Stage II (30 min – 4 h): both forelimbs + head shown in normal delivery. Stage III: placenta within 3-8 h; >12 h = ROP.
Heat stress: panting, drooling, reduced intake, reduced milk. Provide shade, fans, cool water, sprinklers.
Rumen of adult bovine holds 100-150 L. ~500 L blood circulates through udder per 1 L milk.
Gestation: cattle 280-290 days, buffalo 305-318 days.

## 8. INDIAN GOVERNMENT SCHEMES (see dedicated DAHD section below)

${DAHD_SCHEMES}

## 9. MILK QUALITY
Pre-milking: wash udder, dry with individual towel, fore-milk strip, gentle massage.
Post-milking: filter through clean cloth, cool to 4°C within 2 hours. Test for fat, SNF, density, freezing point (water adulteration).

## 10. ECONOMICS
Small farm (2-5 animals) break-even ~8-12 L/day; medium (6-15) 60-100 L/day. Diversify with vermicompost, biogas.

${RATION_KNOWLEDGE}

${BALANCED_RATION_GUIDE}

${COOPERATIVE_MILK_POLICY}

${ICAR_LIVESTOCK_HEALTH}

${EXTENSION_MATERIAL}

${SARVAM_RAG_CORPUS}
`;
