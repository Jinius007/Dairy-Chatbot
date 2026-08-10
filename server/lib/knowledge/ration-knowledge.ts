// NDDB Ration Balancing Programme (RBP) — Least-Cost Formulation guide
// Source: NDDB RBP / ICAR 2013 / NDLM 1962 app ecosystem
export const RATION_KNOWLEDGE = `
## 11. NDDB RATION BALANCING PROGRAMME (RBP) — LEAST-COST BALANCED RATION

### Overview
The National Dairy Development Board (NDDB) Ration Balancing Programme educates farmers to feed scientifically balanced rations using locally available feeds at **least cost (Least-Cost Formulation / LCF)**. Implemented across 18 major dairying states. Average farmer gain: **₹25.5/animal/day** (₹16.3 feed savings + ₹9.2 from extra milk/fat).

Key principles:
- Formulate by animal profile: species, body weight, milk yield, fat%, lactation stage, pregnancy
- Use **Linear Programming (LP)** objective: Minimize Cost = Σ (Priceᵢ × Quantityᵢ) subject to meeting TDN, CP, Ca, P, DM requirements; roughage DM ≥ 50% of total DM
- Include **Area Specific Mineral Mixture (ASMM)** 100–200 g/day (use 150 g for lactating animals)
- Prioritize locally available feeds; validate with season and palatability
- Delivered via trained LRPs, **1962 Farmer App** (scheme/nutrition info), and **INAPH** platform for professionals

### When farmer asks about ration / feed / balanced diet
**Always follow this workflow:**
1. **Gather info** (ask briefly if missing): breed or animal type, milk yield (kg/day), fat %, lactation stage (early 0–90 DIM / mid 91–180 / late 181–270 / dry / late pregnancy), pregnancy (last 60 days?), **location/state/region**, season, herd size (number of animals), locally available green/dry fodder and concentrates.
2. **Estimate body weight (BW)** if not given — use breed defaults below.
3. **Calculate 4% Fat Corrected Milk (FCM):** FCM (kg) = Actual Milk (kg) × (0.4 + 0.15 × Fat%)
4. **Calculate daily nutrient requirements:**
   - Maintenance (per 100 kg BW/day): TDN 395 g, CP 62.7 g, Ca 2.5 g, P 1.7 g
   - Production (per kg FCM): TDN 332 g, CP 82 g, Ca 2.8 g, P 1.8 g
   - Late pregnancy extra (last 60 days): +TDN 300 g, +CP 100 g, +Ca 12 g, +P 8 g/day
   - Total = Maintenance + Production + Pregnancy allowance
   - DM intake budget = BW × (DM intake % / 100) × 1000 g. DM intake % by stage: early 3.2%, mid 3.0%, late 2.7%, dry 2.0%, late_pregnant 1.8%
5. **Formulate ration (greedy LCF order):**
   - Step A: ASMM 0.15 kg/day (fixed)
   - Step B: Green fodder up to 60% of total DM (max ~30 kg as-fed depending on DM%)
   - Step C: Dry fodder up to ~45% remaining DM (max ~6 kg as-fed typical)
   - Step D: Concentrate to meet remaining TDN and CP deficit (choose amount = max(needed for TDN, needed for CP), cap ~10 kg/day)
   - Ensure roughage (green + dry) ≥ 50% of total DM for rumen health
6. **Select feeds by location & season** (see tables below). Pick cheapest suitable local options.
7. **Cost the ration** using regional prices (₹/kg as-fed). Show **per animal/day**, and if herd given: **× count = herd/day and herd/month**.
8. **Present answer** in simple farmer language: ingredient name + kg/day per animal, brief why, total daily cost, 1–2 seasonal tips.

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
- Compound Cattle Feed BIS-I (≥22% CP): DM 88%, TDN 72%, CP 22%, Ca 1.0%, P 0.70% — for high yielders >10 L/day, early lactation
- Compound Cattle Feed BIS-II (≥18% CP): DM 88%, TDN 70%, CP 18% — for 5–10 L/day, dry cows
- Wheat bran (choker): DM 88%, TDN 70%, CP 14.5%, P 1.10%
- Cottonseed cake: DM 90%, TDN 73%, CP 32%
- Groundnut cake: DM 90%, TDN 76%, CP 44%
- Soybean meal: DM 88%, TDN 78%, CP 48%
- Mustard cake: DM 90%, TDN 72%, CP 38%
- Bypass protein supplement: DM 90%, TDN 74%, CP 38% — use @ 1 kg/day top feed for >15 L/day or early lactation
- Bypass fat (calcium salts): for early lactation energy deficit / heat stress periods
- ASMM (mineral mixture): DM 98%, Ca 22%, P 12% — 100–200 g/day

### Regional price guide (₹/kg as-fed, indicative 2025)
Use the region matching farmer's state:

**North India (Punjab, Haryana, UP):** Maize fodder 1.5, Napier 1.2, Berseem/Lucerne 2.0, Wheat straw 5.5, Paddy straw 3.0, Maize silage 3.5, BIS-I feed 27, BIS-II 24, Wheat bran 14, Cotton cake 30, Groundnut cake 35, Soybean meal 38, Mustard cake 22, ASMM 70

**West India (Gujarat, Rajasthan, MP):** Maize fodder 1.2, Napier 1.0, Berseem 1.8, Wheat straw 4.5, Paddy straw 4.0, Silage 3.0, BIS-I 26, BIS-II 23, Wheat bran 13, Cotton cake 28, Groundnut cake 32, Soybean 36, ASMM 65

**South India (Karnataka, AP, TN):** Maize fodder 1.0, Napier 0.8, Berseem 2.5, Wheat straw 8.0, Paddy straw 3.5, Silage 2.8, BIS-I 28, BIS-II 25, Wheat bran 15, Cotton cake 25, Groundnut cake 28, Soybean 34, ASMM 68

**East India (WB, Bihar, Odisha):** Maize fodder 1.0, Napier 0.8, Berseem 2.0, Wheat straw 4.0, Paddy straw 2.5, Silage 3.0, BIS-I 25, BIS-II 22, Wheat bran 13, Cotton cake 32, Groundnut cake 38, Soybean 40, ASMM 72

**Central/Deccan (Maharashtra):** Maize fodder 1.2, Napier 1.0, Berseem 2.2, Wheat straw 5.0, Paddy straw 4.0, Silage 3.2, BIS-I 27, BIS-II 24, Wheat bran 14, Cotton cake 28, Groundnut cake 32, Soybean 36, ASMM 68

Prices are indicative — always note farmer should verify local market/cooperative prices (Amul/Saras cooperative feed often 10–15% cheaper).

### Season-wise feeding strategy
**Kharif / Monsoon (Jul–Oct):** Maize, sorghum, cowpea green fodder abundant; make silage; use paddy/bajra straw as dry; BIS-II + mustard cake concentrate.

**Rabi / Winter (Nov–Mar):** Best green fodder season — berseem, oats, wheat fodder; new wheat straw; BIS-I for high yielders; peak milk season.

**Summer / Zaid (Apr–Jun):** Green fodder scarce — rely on silage, hay, dry straw; BIS-I + bypass fat for heat; reduce concentrate slightly to lower heat increment; ensure water; consider Pashu Sheetvardhak heat supplement.

### Example calculation walkthrough
Crossbred cow, 450 kg BW, 15 kg milk, 4% fat, mid lactation, Punjab (North India), rabi season:
- FCM = 15 × (0.4 + 0.15×4) = 15 × 1.0 = 15 kg
- Maintenance: TDN 395×4.5=1778 g, CP 62.7×4.5=282 g
- Production: TDN 332×15=4980 g, CP 82×15=1230 g
- Total: TDN ~6758 g, CP ~1512 g, DM budget ~13.5 kg
- Sample ration: Berseem 20 kg + Wheat straw 4 kg + BIS-I 3.5 kg + ASMM 0.15 kg → verify TDN/CP met, cost ~₹85–110/animal/day (adjust with local prices)

### Herd planning
When farmer gives herd size and groups:
- Calculate ration separately for each group (different breeds/yields/stages)
- Multiply each ingredient by animal count in that group
- Sum for total herd daily and monthly feed cost
- Example: 3 crossbred × 15 L + 2 Murrah buffalo × 8 L → two separate rations, then aggregate quantities

### Special supplements — when to advise
- **ASMM:** always for lactating animals (regional mineral deficiencies)
- **Bypass protein:** >15 L/day, early lactation (0–90 DIM), low milk protein%, poor BCS
- **Bypass fat:** early lactation energy deficit, high yielders, summer heat stress
- **UMMB:** dry cows, low producers — lick block for NPN + minerals
- **Samvriddhi:** to improve fat% and SNF

### BIS compound feed selection
- BIS Type I (≥22% CP, TDN ≥70%): animals >10 L/day, early lactation
- BIS Type II (≥18% CP, TDN ≥68%): 5–10 L/day, average yielders, dry period maintenance

### References for farmer
- **1962 Farmer App** (Google Play — DAHD/NDLM; renamed from e-Gopala under Bharat Pashudhan) — schemes, Pashupedia, animal records, ethnoveterinary guides
- **Toll-free 1962** — Mobile Veterinary Units at doorstep
- **Bharat Pashudhan portal:** https://bharatpashudhan.ndlm.co.in/
- **INAPH** platform for LRPs/veterinarians (professional ration balancing)
- NDDB cooperative Cattle Feed Plants for BIS-compliant affordable feed
- For exact LP optimization with 500+ feed database, contact nearest **NDDB LRP** or dairy cooperative extension officer

### Answer format for ration queries
Use WhatsApp-friendly structure:
- Brief summary of animal(s) understood
- Daily ration table: Feed | kg/day per animal | (× herd count if given) | approx cost
- Total cost per day and per month
- 1–2 practical tips (season, water, mineral mix, when to call vet/LRP)
- Note prices are approximate — verify locally
`;
