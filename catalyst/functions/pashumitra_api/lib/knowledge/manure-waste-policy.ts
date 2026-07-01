/** Dung / waste management — always mention biogas + manure value chain when relevant. */

export const MANURE_WASTE_KNOWLEDGE = `
## DUNG, WASTE & MANURE MANAGEMENT (NDDB — BRIEF FACTS)

### Why it matters
- Cattle dung is **not waste** — it can become **clean cooking fuel (biogas)**, **Bio-CNG/CBG**, and **organic manure/slurry** (NDDB **Gobar Se Samriddhi** / manure value chain models).
- Proper management **reduces methane**, improves farm hygiene, and can add **income** (slurry sale, carbon credits in some models).

### Practical options for farmers (use RETRIEVED KNOWLEDGE for details)
1. **Household biogas (≈2 m³ flexi plant)** — ~40–50 kg dung + water daily → cooking gas; **digested slurry** used as organic manure in fields.
2. **Slurry processing / vermicompost / FOM-PROM** — surplus slurry from biogas clusters processed into organic fertiliser for sale or own use.
3. **Community biogas / gaushala models** — piped biogas to households; cluster slurry centres (NDDB **Sustain Plus** partnership examples).
4. **Large CBG plants** — dung procured from farmers (often via cooperatives); farmers may get payment for dung + bio-slurry back.
5. **Schemes** — National Biogas Programme, MGNREGA (Deenbandhu type), state AH/NDDB programmes — check district veterinary / cooperative extension officer.

### Safe answer pattern (dung / waste / disposal questions)
- Answer the farmer's specific question first (storage, smell, flies, disposal, pit, etc.).
- **Always add 2–4 short lines** on **biogas** (fuel from dung) and **manure/slurry** (organic fertiliser) as the recommended NDDB path — not just "throw away" or "dump".
- Mention **manure value chain** / **Gobar Se Samriddhi** if in RETRIEVED KNOWLEDGE.
- Do not invent subsidy amounts or scheme names not in RETRIEVED KNOWLEDGE.
`;

export const MANURE_WASTE_RULES = `
DUNG / WASTE / MANURE MANAGEMENT (NON-NEGOTIABLE WHEN TOPIC IS RAISED):
- If farmer asks about **dung disposal, waste management, gobar, manure handling, slurry, smell, flies, or farm hygiene** → after the direct answer, **briefly include biogas AND manure/slurry use** (2–4 lines minimum).
- Frame dung as a **resource**: biogas for cooking + organic manure — NDDB manure value chain / Gobar Se Samriddhi / Sustain Plus models where relevant.
- Do NOT say dung has "no use" or only suggest dumping — always mention **biogas plant** and **organic manure** options from RETRIEVED KNOWLEDGE.
- Keep it practical for village farmers; schemes only if in RETRIEVED KNOWLEDGE.
`;

const MANURE_WASTE_QUERY =
  /\b(dung|cow dung|buffalo dung|cattle dung|manure|gobar|gober|gobar gas|gobar\s*gas|biogas|bio[\s-]?cng|cbg|slurry|digested slurry|vermicompost|compost|organic manure|methane|waste|waste management|dung management|manure management|disposal|dispose|kachra|kuda|garbage|refuse|sanitation|hygiene|smell|odour|odor|stench|badbu|badboo|flies|makh[i]|drain|sewage|effluent|liquid waste|farm waste|dairy waste|cleaning|safai|swachh|udbhr|pit|gutter|soak|leach|litter|bedding|gandagi|gandh)\b|गोबर|गobar|कूड़ा|कचरा|गंदगी|बदबू|मैनर|खाद|बायोगैस|गobar\s*gas|জবর|গোবর|আবর্জনা|gobar\s*vyavastha|pashu\s*gobar|gaay\s*ka\s*gobar|bhains\s*ka\s*gobar/i;

export function isManureWasteQuery(text: string): boolean {
  return MANURE_WASTE_QUERY.test(String(text || ""));
}

export function buildManureWastePrompt(userText: string): string | null {
  if (!isManureWasteQuery(userText)) return null;
  return `${MANURE_WASTE_RULES}

ACTIVE QUERY: Farmer asked about **dung / waste / manure management**.
1) Answer their specific question briefly and practically.
2) **Mandatory:** Add 2–4 lines on **biogas** (cooking fuel from dung) and **manure/slurry** (organic fertiliser, vermicompost, field use) from RETRIEVED KNOWLEDGE — NDDB manure value chain / Gobar Se Samriddhi / household or community biogas models.
3) Do not skip biogas and manure even if they only asked about "waste" or "disposal".`;
}
