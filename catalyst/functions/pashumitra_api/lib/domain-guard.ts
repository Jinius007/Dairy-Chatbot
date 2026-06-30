/** Block off-topic queries — PashuMitra answers dairy/livestock only. */

import { detectLangForRefusal } from "./languages.ts";

const DAIRY_SIGNAL = new RegExp(
  [
    "goru", "gorur", "ghorur", "gabhi", "gavu", "pasu", "pashu", "pashuvu", "pashuvulu",
    "khabar", "khawa", "khavar", "chara", "ghash", "poshan", "poshu", "aahar", "ahara",
    "doodh", "dudh", "dugdh", "paal", "paalu", "halu", "khir",
    "bimaari", "bimari", "rog", "byadhi", "ilaj", "chikitsa", "dawai", "osudh",
    "bukhar", "jwar", "khasi", "dast", "pet", "dard", "sujan", "kamzori",
    "bachha", "bacha", "baccha", "calf", "bachheda", "bachhedi", "byat", "garbha", "garbhi", "pregnant",
    "dairy", "dairying", "milk", "milch", "cheese", "ghee", "paneer", "curd", "yogurt",
    "cow", "cattle", "buffalo", "gaay", "gai", "gay", "bhains", "bhainsa", "livestock", "herd",
    "calving", "heifer", "lactation", "mastitis", "udder", "teat",
    "fodder", "silage", "hay", "straw", "berseem", "napier", "ration", "feed", "concentrate",
    "breed", "gir", "sahiwal", "murrah", "jaffarabadi", "surti", "holstein", "jersey", "crossbred",
    "artificial insemination", "insemination", "semen", "breeding", "heat", "estrus", "oestrus", "pregnancy",
    "vaccin", "fmd", "brucellosis", "black quarter", "lumpy", "lsd", "theileria", "babesia",
    "vet", "veterinar", "paravet", "doctor", "daktar", "animal health",
    "nddb", "dahd", "dcs", "cooperative", "sahakari", "union", "amul", "milk union",
    "scheme", "yojana", "subsidy", "ahidf", "rgm", "npdd", "nlm", "kcc", "ndlm", "bharat pashudhan",
    "pashu aadhaar", "1962", "inaph", "lrp", "evm", "ethno", "ayurved",
    "goat", "sheep", "poultry", "layer", "broiler", "pig", "swine",
    "biogas", "manure", "dung", "vermicompost",
    "snf", "fat%", "milk yield", "procurement", "collection centre", "collection center",
    "kisan", "kishan", "farmer", "farm", "gaav", "gaon", "village",
  ].join("|"),
  "i",
);

/** Obvious non-dairy topics — block even if mixed. */
const OFF_TOPIC_STRICT = new RegExp(
  [
    "\\bcricket\\b", "\\bfootball\\b", "\\bipl\\b", "\\bfifa\\b", "\\bolympics\\b",
    "\\bmovie\\b", "\\bbollywood\\b", "\\bnetflix\\b", "\\brecipe for chicken\\b", "\\bcook pasta\\b",
    "\\bbitcoin\\b", "\\bcrypto\\b", "\\bstock market\\b", "\\bshare price\\b",
    "\\belection\\b", "\\bpolitics\\b", "\\bpm modi\\b", "\\btrump\\b",
    "\\bpython\\b", "\\bjavascript\\b", "\\bwrite code\\b", "\\bhomework\\b", "\\bessay on\\b",
    "\\bweather forecast\\b", "\\btemperature tomorrow\\b",
    "\\btell me a joke\\b", "\\bjoke\\b", "\\bpoem\\b", "\\bstory about\\b",
    "\\bgirlfriend\\b", "\\bboyfriend\\b", "\\bdating\\b",
    "\\bwho won (the )?world cup\\b",
    "machine learning", "artificial intelligence", "chatgpt", "openai",
  ].join("|"),
  "i",
);

const FOLLOW_UP = /^(yes|no|haan|ha|nahi|na|ok|okay|theek|thik|aur|more|continue|batao|bata|tell more|samjha|samjhao|why|kaise|kab|kitna|kitne|kya aur|please explain|explain|detail|details|dhanyavad|thanks|thank you)[\s!.?]*$/i;

export function hasDairySignal(text: string): boolean {
  return DAIRY_SIGNAL.test(String(text || ""));
}

export function isStrictOffTopic(text: string): boolean {
  return OFF_TOPIC_STRICT.test(String(text || ""));
}

export function isFollowUpInDairyThread(
  lastUserText: string,
  priorUserText: string,
): boolean {
  if (!FOLLOW_UP.test(lastUserText.trim())) return false;
  return hasDairySignal(priorUserText);
}

/** True when the conversation should proceed to RAG + LLM. */
export function isDairyRelatedQuery(
  messages: { role: string; content: string }[],
  lastUserText: string,
): boolean {
  const last = String(lastUserText || "").trim();
  if (!last) return false;
  // Block only clearly non-dairy topics — PashuMitra is a dairy app; allow by default.
  if (isStrictOffTopic(last)) return false;

  const userMsgs = messages.filter((m) => m.role === "user").map((m) => m.content);
  const priorUser = userMsgs.slice(0, -1).slice(-4).join(" ");

  if (isFollowUpInDairyThread(last, priorUser)) return true;
  if (hasDairySignal(last)) return true;

  const fullCtx = userMsgs.slice(-4).join(" ");
  if (fullCtx.trim() && isStrictOffTopic(fullCtx) && !hasDairySignal(fullCtx)) return false;

  return true;
}

export function offTopicRefusalMessage(lang?: string | null): string {
  const code = lang && /^[a-z]{2}$/.test(lang) ? lang : "hi";
  const messages: Record<string, string> = {
    hi: "[[LANG:hi]]\nMain sirf dairy aur pashu-palan (gaay, bhains, doodh, chara, bimaari, yojana) se jude sawaalon ka jawab deta hoon.\n\nKripya apna dairy / pashu se related sawal poochhen — jaise doodh, chara, bimaari, ya sarkari yojana.",
    en: "[[LANG:en]]\nI only answer questions about dairy and livestock farming (cows, buffaloes, milk, fodder, disease, schemes).\n\nPlease ask a dairy or animal-related question.",
    bn: "[[LANG:bn]]\nআমি শুধু দুগ্ধ ও পশুপালন সংক্রান্ত প্রশ্নের উত্তর দিই। দয়া করে dairy/pashu সম্পর্কিত প্রশ্ন জিজ্ঞাসা করুন।",
    ta: "[[LANG:ta]]\nநான் பால் வளர்ப்பு மற்றும் கால்நடை வளர்ப்பு கேள்விகளுக்கு மட்டுமே பதிலளிக்கிறேன்.",
    te: "[[LANG:te]]\nనేను పాల పశు పెంపకం మరియు dairy సంబంధిత ప్రశ్నలకు మాత్రమే సమాధానం ఇస్తాను.",
    gu: "[[LANG:gu]]\nહું ફક્ત dairy અને પશુપાલન સંબંધિત પ્રશ્નોના જવાબ આપું છું.",
    mr: "[[LANG:mr]]\nमी फक्त dairy व पशुपालनाशी संबंधित प्रश्नांची उत्तरे देतो.",
  };
  return messages[code] || messages.hi;
}

export function detectOffTopicLang(text: string, fallback?: string | null): string {
  return detectLangForRefusal(text) || fallback || "hi";
}

export const KNOWLEDGE_BOUNDARY_RULES = `
KNOWLEDGE BOUNDARY (CRITICAL — NO OPEN WEB):
- Your ONLY source of facts is the **RETRIEVED KNOWLEDGE** block in this conversation (NDDB/DAHD/ICAR curated corpus).
- NEVER use general internet knowledge, news, Wikipedia, or training-data guesses.
- NEVER invent scheme names, subsidy amounts, medicine doses, phone numbers, statistics, shop names, or vendor lists not present in RETRIEVED KNOWLEDGE.
- NEVER claim milk cooperatives (Amul, Mother Dairy, Nandini, etc.) or feed companies (KRIBHCO, IFFCO) **sell live cattle** — they do not. See cattle purchase rules.
- If RETRIEVED KNOWLEDGE does not contain enough to answer, say clearly in the farmer's language that this information is not in your records and suggest: nearest dairy cooperative / veterinarian / **1962 app** — do NOT guess or fill gaps.
- When the farmer's question IS about dairy, livestock, milk, fodder, disease, or schemes: answer it — do NOT refuse as "out of scope".

URL RULES (CRITICAL):
- NEVER paste a web link unless that exact URL (same host and path) appears verbatim in RETRIEVED KNOWLEDGE.
- Allowed domains when present in retrieved text only: dahd.gov.in, nddb.coop, dairyknowledge.in, bharatpashudhan.ndlm.co.in, icar.org.in, ivri.nic.in, nivedi.res.in, bis.gov.in, pib.gov.in.
- Do NOT link to random blogs, Wikipedia, news sites, or Play Store — you may name "1962 app on Google Play" in words without a URL unless the exact Play Store URL is in retrieved knowledge.
- YouTube: never paste youtube.com / youtu.be links in chat — the app attaches verified videos separately.
`;

export const DOMAIN_SCOPE_RULES = `
DOMAIN SCOPE:
PashuMitra is a dairy & livestock advisor. When the farmer asks about cattle/buffalo/goat health, breeding, nutrition, fodder, milk, cooperatives, schemes, or farm economics — answer from RETRIEVED KNOWLEDGE.
ONLY refuse (one short line, no partial answer) for clearly unrelated topics: sports, entertainment, politics, human recipes, coding, finance/crypto, weather, homework, jokes, relationships, general trivia.
Do NOT refuse valid dairy/livestock questions — even if RETRIEVED KNOWLEDGE is thin, say what you know and what you cannot confirm.
`;
