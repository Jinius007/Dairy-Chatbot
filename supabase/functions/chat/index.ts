import { KNOWLEDGE_BASE } from "../_shared/knowledge.ts";
import {
  BREED_WEIGHTS,
  REGION_PRICES,
  buildRation,
  calcRequirements,
  formatRationAdvisory,
  pickSeasonFeeds,
  type Region,
} from "../_shared/ration-calculator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are PashuMitra, a friendly WhatsApp-style assistant for Indian livestock farmers and dairy entrepreneurs.

OUTPUT FORMAT (STRICT — NON-NEGOTIABLE):
The VERY FIRST characters of your response MUST be exactly: [[LANG:xx]]
followed immediately by a single newline, then the answer.
- xx is the 2-letter code of the language the answer is written in.
- Allowed codes: hi, bn, ta, te, mr, gu, kn, ml, pa, or, as, ur, en.
- Do NOT put the header anywhere else. Do NOT omit it. Do NOT add spaces or quotes before it.

LANGUAGE RULES (MIXED / CODE-SWITCHED INPUT SUPPORTED):
- Supported (12 Indian languages + English):
  Hindi (हिन्दी, hi), Bengali (বাংলা, bn), Tamil (தமிழ், ta), Telugu (తెలుగు, te),
  Marathi (मराठी, mr), Gujarati (ગુજરાતી, gu), Kannada (ಕನ್ನಡ, kn), Malayalam (മലയാളം, ml),
  Punjabi (ਪੰਜਾਬੀ, pa), Odia (ଓଡ଼ିଆ, or), Assamese (অসমীয়া, as), Urdu (اردو, ur), English (en).
- ALWAYS reply in the SAME language as the user's LAST message. If the user wrote in Bengali script, reply in Bengali (bn) — NEVER default to Hindi. Same for Tamil, Telugu, etc.
- The xx code in [[LANG:xx]] MUST exactly match the language/script you actually use in the answer body. If body is Bengali script → header must be [[LANG:bn]]. If body is Hindi Devanagari → [[LANG:hi]]. They must agree.
- For romanized/code-mixed input (Hinglish, Banglish, Tanglish), reply in the native script of the dominant Indian language.
- If purely English → reply in English (en). If totally unclear → Hindi (hi).
- Keep technical/scheme/medicine names in English in parentheses when helpful. NEVER refuse due to mixed language.
- DO NOT greet. Answer directly.

ANSWER STYLE (WhatsApp-style, farmer-friendly):
- Use very simple words that a farmer can understand easily. Avoid difficult medical, legal, or technical words unless needed.
- If you must use a hard term, add a simple explanation in brackets.
- Warm, simple, practical. Short paragraphs and bullet points.
- Give direct steps: what to check, what to do now, when to call a vet/officer.
- Do not write long essays. Prefer 3-6 short points.
- Emojis sparingly (🐄 🥛 💉 🌾 ✅ ⚠️) where helpful.
- For medical/disease questions ALWAYS end with: "⚠️ Please consult your local veterinarian for serious cases." (translated to the user's language).

RATION BALANCING (NDDB RBP — CRITICAL):
When the farmer asks about ration, balanced feed, least-cost feed, what to feed, concentrate quantity, or gives milk yield + animal type + location/herd size:
- Follow the NDDB Least-Cost Formulation (LCF) workflow in the knowledge base (Section 11).
- Ask only for missing essentials: breed/type, milk kg/day, fat %, lactation stage, state/region, herd count, season if unclear.
- Always calculate FCM and show a practical daily ration in kg (green fodder + dry fodder + concentrate + ASMM 150 g).
- Use regional prices from the knowledge base for cost estimates (per animal and total herd if count given).
- Pick seasonal/local feeds (berseem in rabi, maize/sorghum in kharif, silage/straw in summer).
- Recommend BIS Type I for >10 L/day, BIS Type II for 5–10 L/day.
- If COMPUTED RATION ADVISORY is provided below in this prompt, use those exact numbers as the basis of your answer (translate to farmer's language, keep amounts and costs).
- End with note to verify local prices and consult Pashu Poshan app / NDDB LRP for fine-tuning.

DOMAIN: Livestock & dairy farming, cattle/buffalo health, breeding, nutrition, fodder, ethno-veterinary medicine, milk quality, balanced ration formulation, and Indian government schemes (DAHD, RGM, AHIDF, NPDD, NLM, KCC, state schemes). Outside this domain, gently redirect in the user's language.

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}

REMEMBER: First line = [[LANG:xx]] then newline then answer. The language of the answer MUST match xx and MUST match the user's last message.`;

const LANGUAGE_LABELS: Record<string, string> = {
  hi: "Hindi / हिन्दी",
  bn: "Bengali / বাংলা",
  ta: "Tamil / தமிழ்",
  te: "Telugu / తెలుగు",
  mr: "Marathi / मराठी",
  gu: "Gujarati / ગુજરાતી",
  kn: "Kannada / ಕನ್ನಡ",
  ml: "Malayalam / മലയാളം",
  pa: "Punjabi / ਪੰਜਾਬੀ",
  or: "Odia / ଓଡ଼ିଆ",
  as: "Assamese / অসমীয়া",
  ur: "Urdu / اردو",
  en: "English",
};

const RATION_KEYWORDS = /ration|feed|fodder|concentrate|balanced|poshan|खुराक|चारा|भोजन|आहार|রেশন|খাদ্য|தீவன|మేత|आहार|આહાર|ಆಹಾರ|ആഹാര|ਖੁਰਾਕ|ଆହାର|খাদ্য|خوراک|diet|least.?cost|lcf|tdn|compound feed|mineral mix|berseem|bajra|straw|silage/i;

const REGION_KEYWORDS: [RegExp, Region][] = [
  [/punjab|haryana|up\b|uttar pradesh|north india|दिल्ली|delhi|rajasthan.*north/i, "north"],
  [/gujarat|rajasthan|madhya pradesh|mp\b|west india|गुजरात|राजस्थान/i, "west"],
  [/karnataka|andhra|telangana|tamil|tamil nadu|kerala|south india|दक्षिण/i, "south"],
  [/bengal|bihar|odisha|orissa|assam|east india|पूर्व|wb\b/i, "east"],
  [/maharashtra|deccan|central india|महाराष्ट्र/i, "central"],
];

function detectRegion(text: string): Region {
  for (const [re, region] of REGION_KEYWORDS) {
    if (re.test(text)) return region;
  }
  return "north";
}

function detectSeason(): "kharif" | "rabi" | "summer" {
  const m = new Date().getMonth(); // 0=Jan
  if (m >= 6 && m <= 9) return "kharif";
  if (m >= 10 || m <= 2) return "rabi";
  return "summer";
}

function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1]);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

function detectBreed(text: string): string {
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

function tryComputeRationHint(messages: { role: string; content: string }[]): string | null {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const context = messages.filter((m) => m.role === "user").slice(-3).map((m) => m.content).join(" ");
  if (!RATION_KEYWORDS.test(context)) return null;

  const milk = extractNumber(context, [
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|l\b|kg)\s*(?:milk|दूध|দুধ|பால்|పాలు|दूध)/i,
    /milk[:\s]+(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:l|kg)\s*(?:\/|per)?\s*day/i,
    /(\d+(?:\.\d+)?)\s*(?:litre|liter|l\b)/i,
  ]);
  if (milk === null || milk <= 0 || milk > 60) return null;

  const fat = extractNumber(context, [/fat[:\s]+(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*%\s*fat/i]) ?? 4.0;
  const count = extractNumber(context, [/(\d+)\s*(?:cow|buffalo|animal|cattle|गाय|भैंस|animals|milch)/i, /herd[:\s]+(\d+)/i]) ?? 1;
  const breed = detectBreed(context);
  const region = detectRegion(context);
  const season = detectSeason();
  const feeds = pickSeasonFeeds(season);
  const bw = BREED_WEIGHTS[breed]?.bw ?? 450;
  const prices = REGION_PRICES[region];

  const req = calcRequirements(bw, milk, fat, "mid", false);
  const result = buildRation(req, feeds.green, feeds.dry, feeds.conc, prices);
  const advisory = formatRationAdvisory(BREED_WEIGHTS[breed]?.name ?? "Dairy animal", milk, fat, region, { req, ...result }, count);

  return `COMPUTED RATION ADVISORY (NDDB LCF — use these numbers in your answer):\n${advisory}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, stream = true, mode = "chat", forceLanguage = null } = await req.json();
    const forcedLabel = typeof forceLanguage === "string" ? LANGUAGE_LABELS[forceLanguage] : null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const rationHint = tryComputeRationHint(messages);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(rationHint ? [{ role: "system", content: rationHint }] : []),
          ...(mode === "call" ? [{ role: "system", content: "LIVE CALL MODE: Answer like a patient human helper on a phone call. Use very simple village/farmer language. Keep the answer short, natural, and speakable: 2-4 short sentences only. No headings, no long bullet list, no difficult words. Give the next practical step first." }] : []),
          ...(forceLanguage && forcedLabel ? [{ role: "system", content: `CRITICAL LANGUAGE LOCK: The next answer MUST be written only in ${forcedLabel}. The first line MUST be [[LANG:${forceLanguage}]]. Do not use Hindi unless the locked language is Hindi. Do not mix scripts.` }] : []),
          ...messages,
          ...(forceLanguage && forcedLabel ? [{ role: "system", content: `FINAL CHECK BEFORE ANSWERING: Reply in ${forcedLabel} only, with [[LANG:${forceLanguage}]] as the first line. Keep it simple enough for a farmer.` }] : []),
        ],
        stream,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Too many requests, please wait." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
