/** Where farmers can (and cannot) buy live cattle — prevent cooperative/brand hallucinations. */

export const CATTLE_PURCHASE_POLICY = `
## 13. BUYING / SELLING LIVE CATTLE (COWS, BUFFALOES) — FACTUAL RULES

### What dairy cooperatives and milk brands DO NOT do (CRITICAL — NEVER GET THIS WRONG)
- **Amul, Mother Dairy, Nandini, Saras, Verka, Aavin, Sudha, Parag, Milma, OMFED, etc. are milk marketing federations/unions** — they **procure and process MILK** from member farmers via village DCS collection centres.
- They **DO NOT sell live cows, buffaloes, or calves** as a retail service. **NEVER tell a farmer to buy an animal from Amul, Mother Dairy, or any milk union/federation.**
- **KRIBHCO / IFFCO / cooperative feed plants** supply **cattle FEED, mineral mixture, fertiliser** — they **DO NOT sell live animals**. Do not list KRIBHCO as a place to buy cows.
- **NDDB** supports breed improvement, AI, RBP, cooperatives — it is **not a cattle market**.

### Where farmers CAN buy or source animals (only mention what is in retrieved knowledge or below)
1. **Other farmers / local livestock markets (haat/mela)** — inspect health, milk records, vaccination; take a paravet/vet; check breed papers if claimed.
2. **1962 Farmer App (Bharat Pashudhan / NDLM)** — has **buy/sell animals** features in the official ecosystem; farmer can also contact toll-free **1962** for guidance.
3. **Rashtriya Gokul Mission (RGM)** — **Breed Multiplication Farms (BMF)** and state breed farms for indigenous breeds (Gir, Sahiwal, Murrah etc.) — apply via **State Animal Husbandry Department** / district veterinary officer — not via milk unions.
4. **National Livestock Mission (NLM)** — entrepreneurship/support for sheep/goat/poultry units; state AH department for programmes.
5. **Registered breeders / NDDB-linked AI network** — for **genetics (semen/AI)**, not usually whole live animals unless through approved farm schemes.
6. **Nearest veterinary hospital / KVK / AH department** — for verified breeder contacts or government livestock fairs in the district.

### Safe answer pattern when farmer asks "where can I buy cows?"
- Say clearly: milk cooperatives (Amul/Mother Dairy etc.) are for **selling milk**, not buying animals.
- Give 2–3 practical routes above (local market + vet check, 1962 app, state AH/RGM breed farm if indigenous breed wanted).
- If district/state unknown: ask location; do **NOT** invent shop names, phone numbers, or prices.
- If not in retrieved knowledge: say you do not have a verified local seller list — suggest **1962 helpline**, **block veterinary officer**, or **district animal husbandry office**.

### Phrases to NEVER use
- "Amul se gaay kharid sakte hain" / "Buy cows from Mother Dairy"
- "KRIBHCO sells cattle" (wrong — feed only)
- Any made-up dealer, NGO, or private company name not in RETRIEVED KNOWLEDGE
`;

export const CATTLE_PURCHASE_RULES = `
CATTLE PURCHASE / SALE (ANTI-HALLUCINATION — NON-NEGOTIABLE):
- Milk cooperatives & federations (Amul, GCMMF, Mother Dairy, Nandini, Saras, Verka, Aavin, Sudha, Gokul, Parag, etc.) **buy MILK from farmers** — they **do NOT sell live animals**.
- **KRIBHCO, IFFCO, feed companies** sell **feed/minerals** — **NOT live cattle**.
- For "where to buy cow/buffalo": local farmer/market + vet health check; **1962 app**; **State AH Department** / **RGM breed farms** — only if supported by RETRIEVED KNOWLEDGE.
- **NEVER invent** vendor lists, shop names, phone numbers, or prices. If unsure, say so and point to **1962** or **district veterinary officer**.
`;

const CATTLE_PURCHASE_QUERY =
  /\b(buy|purchase|kharid\w*|len|levu|vang|where\s*(can|to)\s*(buy|get|find)|kidhar\s*mil|kahan\s*(se\s*)?mil|kothay\s*pab|kothay\s*pao|evide\s*kit|enga\s*vaang|where.*source)\b.*\b(cow|cows|cattle|buffalo|buffaloes|gaay|gai|gay|bhains|bhainsa|goru|gorur|ghoru|pashu|pasu|animal|herd|calf|calves|murrah|gir|sahiwal|heifer)\b|\b(cow|cows|cattle|buffalo|buffaloes|gaay|gai|gay|bhains|bhainsa|goru|gorur|ghoru|pashu|pasu|murrah|gir|sahiwal|heifer)\b.*\b(buy|purchase|kharid\w*|milenge|milega|milti|paabo|paawa|pabo|pabo|source|market|mel[ae])\b|gaay\s*kaha|goru\w*\s*kothay|pasu\s*evide|buy\s*cow|buy\s*cattle|where\s*can\s*i\s*buy/i;

const MILK_NOT_ANIMAL =
  /\b(milk|dudh|doodh|dugh|दूध|pour|bech|bechna|sell\s*milk|milk\s*sell|procurement|collection\s*centre|dcs)\b/i;

export function isCattlePurchaseQuery(text: string): boolean {
  const t = String(text || "");
  if (!CATTLE_PURCHASE_QUERY.test(t)) return false;
  if (MILK_NOT_ANIMAL.test(t) && !/\b(cow|cattle|gaay|bhains|goru|pashu|buffalo)\b/i.test(t)) return false;
  return true;
}

export function buildCattlePurchasePrompt(userText: string): string | null {
  if (!isCattlePurchaseQuery(userText)) return null;
  return `${CATTLE_PURCHASE_RULES}

ACTIVE QUERY: Farmer wants to **buy/source live cattle** — NOT milk marketing.
Use section 13 (CATTLE PURCHASE) from RETRIEVED KNOWLEDGE. Explicitly state Amul/Mother Dairy/milk unions/KRIBHCO do **NOT** sell live animals. Give practical routes only (local market + vet, 1962 app, state AH/RGM). Do not invent dealers.`;
}
