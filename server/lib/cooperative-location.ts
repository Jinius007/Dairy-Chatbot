/** Location-aware cooperative milk marketing guidance (DCS → union → federation). */

export const MILK_MARKETING_SYSTEM_RULES = `MILK MARKETING — COOPERATIVE ONLY (ABSOLUTE — CHAT AND VOICE):
- When farmer asks where to sell/pour/market milk, milk price, buyers, or earning from milk: advise ONLY the village-level **Dairy Cooperative Society (DCS)** / village milk collection centre.
- Chain: Village DCS → District Milk Union → State Milk Federation. Name the local union and federation when location/state is known.
- NEVER recommend private dairies, hotels, restaurants, sweet shops, middlemen, brokers, or direct sale to traders — not even as a "second option" or "if cooperative is far".
- If farmer asks about private buyer / hotel / dalal: firmly redirect to nearest DCS Secretary or milk union field officer — explain fair fat/SNF price, bonus, feed, AI, vet support.
- **Milk unions/federations (Amul, Mother Dairy, etc.) do NOT sell live cows/buffaloes** — only milk procurement and farmer services.
- Do NOT tell farmers to ask DCS for veterinarian phone numbers (vet directory is separate). DCS is for milk pouring only.`;

const CATTLE_PURCHASE_EXCLUDE =
  /\b(buy|purchase|kharid\w*|where\s*(can|to)\s*(buy|get)|kidhar\s*mil|kahan\s*(se\s*)?mil)\b.*\b(cow|cows|cattle|buffalo|gaay|gai|bhains|goru|pashu|pasu|animal|calf|murrah|gir)\b|\b(cow|cows|cattle|buffalo|gaay|gai|bhains|goru|pashu|pasu|murrah|gir)\b.*\b(buy|purchase|kharid\w*|market|mel[ae])\b|where\s*can\s*i\s*buy\s*cow|gaay\s*kaha/i;

const MILK_MARKETING_QUERY =
  /milk|dudh|doodh|dugh|दूध|sell|bech|bechna|bechne|pour|dalna|dalne|marketing|milk\s*buyer|doodh\s*.*buyer|dudh\s*.*buyer|dealer|hotel|middleman|dalal|commission|private|niji|rate|price|litre|liter|procurement|dcs|cooperative|sahakari|sahakar|union|federation|बेच|डाल|दूध.*खरीद|खरीद.*दूध|होटल|निजी|दलाल|कहाँ\s*बेच|कहां\s*बेच|कहाँ\s*डाल|कहां\s*डाल|doodh\s*kaha|dudh\s*kaha/i;

export interface CooperativeLocationHint {
  state: string;
  villageLevel: string;
  districtUnion: string;
  stateFederation: string;
}

const STATE_COOPERATIVES: Array<{ pattern: RegExp; hint: CooperativeLocationHint }> = [
  {
    pattern: /gujarat|गुजरात|anand|mehsana|surat|vadodara|rajkot|banaskantha|kaira|sabarkantha|junagadh|bhavnagar/i,
    hint: {
      state: "Gujarat",
      villageLevel: "Village DCS (Dairy Cooperative Society)",
      districtUnion: "your district milk union (e.g. Kaira, Banas, Mehsana, Surat, Rajkot)",
      stateFederation: "Gujarat Cooperative Milk Marketing Federation — GCMMF (Amul)",
    },
  },
  {
    pattern: /karnataka|कर्नाटक|bangalore|bengaluru|mandya|hassan|mysore|mysuru|dharwad|belgaum|belagavi|nandini/i,
    hint: {
      state: "Karnataka",
      villageLevel: "Village DCS",
      districtUnion: "your district cooperative milk union",
      stateFederation: "Karnataka Milk Federation (Nandini)",
    },
  },
  {
    pattern: /rajasthan|राजस्थान|jaipur|jodhpur|udaipur|bikaner|ajmer|alwar|saras/i,
    hint: {
      state: "Rajasthan",
      villageLevel: "Village DCS / milk collection centre",
      districtUnion: "district milk producers union (e.g. Jaipur, Jodhpur, Udaipur, Ajmer)",
      stateFederation: "Rajasthan Cooperative Dairy Federation (Saras)",
    },
  },
  {
    pattern: /punjab|पंजाब|amritsar|ludhiana|verka|milkfed/i,
    hint: {
      state: "Punjab",
      villageLevel: "Village DCS",
      districtUnion: "district milk producers cooperative union",
      stateFederation: "Punjab State Cooperative Milk Producers Federation (Verka / Milkfed Punjab)",
    },
  },
  {
    pattern: /haryana|हरियाण|karnal|hisar|vitthal|vita/i,
    hint: {
      state: "Haryana",
      villageLevel: "Village DCS",
      districtUnion: "district milk union (e.g. Karnal, Hisar, Rohtak)",
      stateFederation: "Haryana Dairy Development Cooperative Federation (Vita)",
    },
  },
  {
    pattern: /uttar pradesh|uttarpradesh|\bup\b|उत्तर प्रदेश|lucknow|kanpur|meerut|agra|parag|pccf/i,
    hint: {
      state: "Uttar Pradesh",
      villageLevel: "Village DCS",
      districtUnion: "district cooperative milk union (e.g. Lucknow, Kanpur, Meerut, Varanasi)",
      stateFederation: " Pradeshik Cooperative Dairy Federation (Parag)",
    },
  },
  {
    pattern: /madhya pradesh|\bmp\b|मध्य प्रदेश|bhopal|indore|gwalior|sanchi|sagar/i,
    hint: {
      state: "Madhya Pradesh",
      villageLevel: "Village DCS",
      districtUnion: "district milk union",
      stateFederation: "Madhya Pradesh State Cooperative Dairy Federation (Sanchi / Gwalior / Indore unions)",
    },
  },
  {
    pattern: /maharashtra|महाराष्ट्र|mumbai|pune|nagpur|kolhapur|amul|gokul|warna|krishna/i,
    hint: {
      state: "Maharashtra",
      villageLevel: "Village DCS",
      districtUnion: "district milk union (e.g. Kolhapur, Pune, Nagpur, Warna, Gokul)",
      stateFederation: "Maharashtra state dairy cooperative federations (district unions under NDDB pattern)",
    },
  },
  {
    pattern: /tamil nadu|tamilnadu|तमिल|chennai|coimbatore|madurai|aavin/i,
    hint: {
      state: "Tamil Nadu",
      villageLevel: "Village DCS",
      districtUnion: "district cooperative milk producers union",
      stateFederation: "Tamil Nadu Cooperative Milk Producers Federation (Aavin)",
    },
  },
  {
    pattern: /andhra|telangana|hyderabad|vijaya|visakha|telugu|प्रजा/i,
    hint: {
      state: "Andhra Pradesh / Telangana",
      villageLevel: "Village DCS",
      districtUnion: "district milk union (e.g. Vijayawada, Visakhapatnam, Hyderabad)",
      stateFederation: "Vijaya / Telangana or A.P. dairy development cooperative federations",
    },
  },
  {
    pattern: /kerala|केरल|kochi|trivandrum|thiruvananthapuram|milma|milkco/i,
    hint: {
      state: "Kerala",
      villageLevel: "Village DCS / MPCS",
      districtUnion: "regional milk union (Milma)",
      stateFederation: "Kerala Cooperative Milk Marketing Federation (Milma)",
    },
  },
  {
    pattern: /bihar|बिहार|patna|sudha|comfed/i,
    hint: {
      state: "Bihar",
      villageLevel: "Village DCS",
      districtUnion: "district milk union",
      stateFederation: "Bihar State Cooperative Milk Producers Federation (Sudha / COMFED)",
    },
  },
  {
    pattern: /odisha|orissa|ओडिशा|bhubaneswar|omfed/i,
    hint: {
      state: "Odisha",
      villageLevel: "Village DCS",
      districtUnion: "district milk union",
      stateFederation: "Odisha State Cooperative Milk Producers Federation (OMFED)",
    },
  },
  {
    pattern: /west bengal|bengal|पश्चिम बंगाल|kolkata|calcutta|sugam/i,
    hint: {
      state: "West Bengal",
      villageLevel: "Village DCS",
      districtUnion: "district milk union",
      stateFederation: "West Bengal Cooperative Milk Producers Federation (Sugam / Co-operative Milk Union)",
    },
  },
  {
    pattern: /assam|असम|guwahati|purabi/i,
    hint: {
      state: "Assam",
      villageLevel: "Village DCS",
      districtUnion: "district milk union",
      stateFederation: "Assam Cooperative Milk Producers Union (Purabi)",
    },
  },
  {
    pattern: /delhi|ncr|mother dairy|नई दिल्ली/i,
    hint: {
      state: "Delhi NCR",
      villageLevel: "linked village DCS / milk collection route",
      districtUnion: "area milk union supplying Mother Dairy",
      stateFederation: "Mother Dairy (NDDB subsidiary) — pour via cooperative collection network",
    },
  },
];

export function isMilkMarketingQuery(text: string): boolean {
  const t = String(text || "");
  if (CATTLE_PURCHASE_EXCLUDE.test(t)) return false;
  return MILK_MARKETING_QUERY.test(t);
}

export function detectCooperativeLocation(text: string): CooperativeLocationHint | null {
  for (const { pattern, hint } of STATE_COOPERATIVES) {
    if (pattern.test(text)) return hint;
  }
  return null;
}

export function buildCooperativeMarketingPrompt(userText: string): string | null {
  if (!isMilkMarketingQuery(userText)) return null;
  const loc = detectCooperativeLocation(userText);
  if (!loc) {
    return `${MILK_MARKETING_SYSTEM_RULES}

LOCATION: State not clear from message — ask which district/state they are in, then name the local DCS, district milk union, and state federation. Still NEVER mention private buyers.`;
  }
  return `${MILK_MARKETING_SYSTEM_RULES}

LOCATION CONTEXT (${loc.state}):
- Village level: pour milk ONLY at nearest ${loc.villageLevel}.
- District: ${loc.districtUnion}.
- State federation: ${loc.stateFederation}.
Mention these names naturally in the farmer's language. NEVER suggest hotel/private dealer/middleman even as backup.`;
}
