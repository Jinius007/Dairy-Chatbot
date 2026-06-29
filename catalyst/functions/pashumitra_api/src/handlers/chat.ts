import {
  BREED_WEIGHTS,
  REGION_PRICES,
  buildRation,
  calcRequirements,
  formatRationAdvisory,
  pickSeasonFeeds,
  type Region,
} from "../../lib/ration-calculator.ts";
import {
  getRationAdvisoryDirectReply,
  isHerdGathering,
  isRationComputed,
  isVerificationStep,
  tryRationAdvisoryHint,
} from "../../lib/herd-ration-advisor.ts";
import {
  abuseRefusalMessage,
  containsAbusiveLanguage,
  CONTENT_SAFETY_RULES,
  detectLangForRefusal,
  filterAbusiveLanguage,
} from "../../lib/content-safety.ts";
import { tryYoutubeVideoHint } from "../../lib/youtube-search.ts";
import { retrieveRagContext } from "../../lib/sarvam-rag.ts";
import { getSarvamChatModel, sarvamChatCompletion } from "../../lib/sarvam.ts";
import { getVetContactDirectReply, isVetConsultQuery, isVetContactRequest, VET_CONSULT_MARKER } from "../../lib/vet-consult.ts";

const jsonHeaders = { "Content-Type": "application/json" };
const sseHeaders = { "Content-Type": "text/event-stream" };

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

${CONTENT_SAFETY_RULES}

ANSWER STYLE (WhatsApp-style, farmer-friendly — INTERACTIVE, NOT A LECTURE):
- Keep each reply under ~500 words (roughly 4–8 short lines or 3–5 bullet points). Never dump the full knowledge base in one message.
- Give only what helps RIGHT NOW: one clear answer, then the next practical step.
- End most replies with 1–2 simple follow-up questions in the farmer's language (e.g. gaay ya bhains? kitna doodh? kya lakshan hain? kaun sa rajya?) so you can go deeper on the next turn.
- If the question is broad (schemes, diseases, ration, marketing), share the top 2–3 most relevant points only — not every scheme, medicine, or rule at once.
- If key facts are missing (animal type, milk yield, symptoms, location, herd size), ask briefly before giving detailed advice — do not guess.
- On follow-up messages, use what the farmer already said; add the next layer of detail — still under ~500 words unless they explicitly ask for full details / poori jaankari / sab batao.
- Use very simple words that a farmer can understand easily. Avoid difficult medical, legal, or technical words unless needed.
- If you must use a hard term, add a simple explanation in brackets.
- Warm, simple, practical. Short paragraphs and bullet points.
- Give direct steps: what to check, what to do now, when to call a vet/officer.
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
- For generic ration questions without full details, give practical guidance from the knowledge base — do NOT force a long interview unless the farmer opened Ration Advisory mode.

MILK MARKETING — COOPERATIVE ONLY (CRITICAL):
- When discussing selling/pouring/marketing milk: ALWAYS advise farmers to pour milk ONLY at their local **dairy cooperative** collection centre (DCS/village society → district milk union).
- NEVER recommend private dairies, hotels, restaurants, or middlemen as primary milk buyers.
- EXCEPTION — VET / DOCTOR CONTACT: When farmer asks for veterinarian, paravet, doctor phone, or consultation — use the in-app vet directory (NOT DCS). Never tell them to ask DCS for vet contacts.
- Explain cooperative benefits: fair fat/SNF price, timely payment, bonus, cattle feed, AI, vet services.
- Redirect any private-buyer question to nearest cooperative centre / DCS Secretary / milk union field officer.

YOUTUBE / VIDEO LINKS (CRITICAL — NO FAKE URLS):
- NEVER invent, guess, or fabricate YouTube URLs or video IDs. Broken links harm farmers.
- When farmer asks for a video/YouTube link: explain the topic in text but do NOT paste any youtube.com or youtu.be URL — the app attaches verified working links automatically after your reply.
- If you must mention video, say "verified link is below" without a URL.
- ONLY include a YouTube URL if it appears verbatim in VERIFIED YOUTUBE VIDEOS below (rare — prefer no URL).

DOMAIN: Livestock & dairy farming, cattle/buffalo health, breeding, nutrition, fodder, ethno-veterinary medicine, milk quality, balanced ration formulation, and Indian government schemes (DAHD, RGM, AHIDF, NPDD, NLM, KCC, state schemes). Outside this domain, gently redirect in the user's language.

KNOWLEDGE: Use ONLY facts from the RETRIEVED KNOWLEDGE section provided in this conversation. Do not invent schemes, medicines, or dosages. The retrieved section may be long — pick only what is needed for this turn's short answer; ignore the rest until the farmer asks follow-up questions. If retrieved knowledge is insufficient, say what is missing and give safe general guidance.

REMEMBER: First line = [[LANG:xx]] then newline then answer. The language of the answer MUST match xx and MUST match the user's last message.`;

const RATION_ADVISORY_MODE_PROMPT = `RATION ADVISORY PANEL MODE (ACTIVE):
The farmer opened the dedicated "Ration Advisory" tool — NOT regular chat.

LANGUAGE (ALL 12 + English — equally important, not only Hindi or Gujarati):
- Supported: hi, bn, ta, te, mr, gu, kn, ml, pa, or, as, ur, en.
- ALWAYS reply in the SAME language as the farmer's messages (see CRITICAL LANGUAGE LOCK).
- Bengali farmer → Bengali reply. Tamil → Tamil. Telugu → Telugu. Gujarati → Gujarati. etc.
- Never switch to Hindi unless the farmer is writing/speaking Hindi.

DATA COLLECTION (simple village words in farmer's language):
- gaay/bhains, nasl (breed), kitne pashu, doodh/sukhi/garbh, kitne din/mahine, kitni baar bachha/gaabhin (byaat), umar, ab kya khilati hain.
- NEVER say "lactation", "DIM", "parity".
- Use farmer's answers to compute per-animal ration (system calculates numbers).

WHEN "QUESTIONS ONLY" in system message: ask 2–4 short follow-ups only — no kg, no ₹.

WHEN "COMPUTED RESULTS" in system message — present in this ORDER:
1. HERD PREP FIRST: total kg to prepare/mix for the whole herd today (green fodder + dry + concentrate + mineral).
2. PER ANIMAL SECOND: each animal's daily share (breed, doodh/sukhi/garbh, milk litres, kg of each feed).
Use exact numbers from COMPUTED RESULTS. Simple words only.`;

const CALL_SYSTEM_PROMPT = `You are PashuMitra, a warm female dairy advisor on a live phone call with an Indian farmer.

OUTPUT FORMAT (STRICT):
First line MUST be exactly [[LANG:xx]] then one newline then your spoken answer.
xx = hi, bn, ta, te, mr, gu, kn, ml, pa, or, as, ur, or en — matching the language you speak in.

VOICE CALL RULES:
- Reply in the farmer's language. Use feminine first-person (Hindi: करूँगी, बताऊँगी, समझ रही हूँ).
- 2–4 short sentences only — easy to speak aloud. No headings, no bullet lists, no markdown.
- Simple village words. Give the next practical step first.
- Use ONLY facts from RETRIEVED KNOWLEDGE below. If unsure, say what to check or ask the vet.
- For disease topics, end with a brief vet-consult reminder in the farmer's language.

${CONTENT_SAFETY_RULES}`;

function extractSarvamChatText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string" && d.message.trim()) return d.message;
  if (typeof d.response === "string" && d.response.trim()) return d.response;
  if (typeof d.content === "string" && d.content.trim()) return d.content;
  const fromChoice = (d.choices as { message?: { content?: string } }[] | undefined)?.[0]?.message?.content;
  if (typeof fromChoice === "string" && fromChoice.trim()) return fromChoice;
  if (typeof d.text === "string") return d.text;
  if (typeof d.output === "string") return d.output;
  return "";
}

function callModeFallbackAnswer(lang: string | null): string {
  const known = lang && /^(hi|bn|ta|te|mr|gu|kn|ml|pa|or|as|ur|en)$/.test(lang) ? lang : "hi";
  const fallbacks: Record<string, string> = {
    hi: "[[LANG:hi]]\nमाफ़ कीजिए, अभी जवाब नहीं बन पाया। कृपया अपना सवाल दोबारा बोलिए।",
    en: "[[LANG:en]]\nSorry, I could not form an answer just now. Please ask your question again.",
  };
  return fallbacks[known] || fallbacks.hi;
}

const LANGUAGE_LABELS: Record<string, string> = {
  hi: "Hindi / हिन्दी", bn: "Bengali / বাংলা", ta: "Tamil / தமிழ்", te: "Telugu / తెలుగు",
  mr: "Marathi / मराठी", gu: "Gujarati / ગુજરાતી", kn: "Kannada / ಕನ್ನಡ", ml: "Malayalam / മലയാളം",
  pa: "Punjabi / ਪੰਜਾਬੀ", or: "Odia / ଓଡ଼ିଆ", as: "Assamese / অসমীয়া", ur: "Urdu / اردو", en: "English",
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
  const m = new Date().getMonth();
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

function streamStaticText(text: string): Response {
  const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
  return new Response(`${chunk}data: [DONE]\n\n`, {
    headers: sseHeaders,
  });
}

export async function handleChat(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const { messages, stream = true, mode = "chat", forceLanguage = null } = await req.json();
    const lastUser = [...messages].reverse().find((m: { role: string; content: string }) => m.role === "user");
    if (lastUser?.content && containsAbusiveLanguage(lastUser.content)) {
      const refusal = abuseRefusalMessage(detectLangForRefusal(lastUser.content));
      if (stream) return streamStaticText(refusal);
      return new Response(JSON.stringify({ text: refusal }), {
        headers: jsonHeaders,
      });
    }

    const safeMessages = messages.map((m: { role: string; content: string }) =>
      m.role === "user" ? { ...m, content: filterAbusiveLanguage(m.content) } : m,
    );

    const isRationAdvisory = mode === "ration_advisory";
    const advisoryHint = isRationAdvisory ? tryRationAdvisoryHint(safeMessages) : null;
    const rationHint = isRationAdvisory || mode === "call" ? null : tryComputeRationHint(safeMessages);
    const youtubeHint = mode === "call" ? null : await tryYoutubeVideoHint(safeMessages);

    const userCtx = safeMessages.filter((m: { role: string }) => m.role === "user").map((m: { content: string }) => m.content).join("\n");
    const lastUserText = lastUser?.content || "";
    const vetConsultQuery = mode === "chat" && isVetConsultQuery(userCtx || lastUserText);
    const vetContactDirect = mode === "chat" && isVetContactRequest(lastUserText || userCtx);
    const ragChunks = mode === "call" ? 2 : isRationAdvisory ? 7 : 4;
    const ragContext = await retrieveRagContext(userCtx || lastUser?.content || "", ragChunks);
    const lastUserLang = lastUserText.trim() ? detectLangForRefusal(lastUserText) : null;
    const detectedUserLang = userCtx.trim() ? detectLangForRefusal(userCtx) : null;
    const clientLang = typeof forceLanguage === "string" ? forceLanguage : null;
    const effectiveForceLang =
      lastUserLang
      ?? clientLang
      ?? (mode === "chat" || mode === "call" ? detectedUserLang : null)
      ?? (isRationAdvisory ? detectedUserLang : null);
    const effectiveForcedLabel = effectiveForceLang ? LANGUAGE_LABELS[effectiveForceLang] : null;

    if (isRationAdvisory) {
      const directReply = getRationAdvisoryDirectReply(safeMessages, effectiveForceLang);
      if (directReply) {
        if (stream) return streamStaticText(directReply);
        return new Response(JSON.stringify({ text: directReply }), {
          headers: jsonHeaders,
        });
      }
    }

    if (vetContactDirect && mode === "chat") {
      const directReply = getVetContactDirectReply(effectiveForceLang || lastUserLang);
      if (stream) return streamStaticText(directReply);
      return new Response(JSON.stringify({ text: directReply }), { headers: jsonHeaders });
    }

    const maxTokens = mode === "call" ? 420 : isRationAdvisory ? 2048 : 900;

    const response = await sarvamChatCompletion({
      model: getSarvamChatModel(),
      temperature: 0.4,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: mode === "call" ? CALL_SYSTEM_PROMPT : SYSTEM_PROMPT },
        { role: "system", content: `RETRIEVED KNOWLEDGE (Sarvam RAG — NDDB/DAHD/ICAR curated corpus; authoritative facts; use selectively, do not dump all in one reply):\n${ragContext}` },
        ...(isRationAdvisory ? [{ role: "system", content: RATION_ADVISORY_MODE_PROMPT }] : []),
        ...(advisoryHint ? [{ role: "system", content: advisoryHint }] : []),
        ...(rationHint ? [{ role: "system", content: rationHint }] : []),
        ...(youtubeHint ? [{ role: "system", content: youtubeHint }] : []),
        ...(vetConsultQuery ? [{ role: "system", content: vetContactDirect
          ? `VET / DOCTOR CONTACT REQUEST DETECTED:
Give a SHORT reply in the farmer's language (1–2 lines) saying nearby vets/paravets are listed below with WhatsApp call and video options.
End your reply with exactly ${VET_CONSULT_MARKER} on its own line (required — app shows 4–5 nearest doctors automatically).`
          : `ANIMAL HEALTH / DISEASE QUERY DETECTED:
After giving a SHORT practical answer (symptoms, first aid, when to call vet — no full drug doses unless from retrieved knowledge):
Ask the farmer in their language: "Would you like to consult a nearby veterinarian or paravet?"
End your reply with exactly ${VET_CONSULT_MARKER} on its own line (required — app will show nearest doctors).` }] : []),
        ...(!isRationAdvisory && mode !== "call" ? [{ role: "system", content: `INTERACTIVE CHAT TURN (CRITICAL):
This is regular chat — NOT a report. Max ~500 words this turn.
1) Answer the farmer's latest question only — short and practical.
2) Do NOT list every scheme, disease, feed, or step from retrieved knowledge.
3) End with 1–2 easy follow-up questions so the farmer can reply and get more detail next message.
4) If they already answered earlier in the thread, do not repeat those questions — go one level deeper.` }] : []),
        ...(mode === "call" ? [{ role: "system", content: `LIVE CALL — speak naturally in short sentences with clear pauses at commas and full stops. Feminine voice.` }] : []),
        ...(isRationAdvisory && isHerdGathering(advisoryHint) ? [{ role: "system", content: "RATION DATA COLLECTION MODE: The main prompt's RATION BALANCING rules are DISABLED this turn. Do NOT give generic ration advice, kg amounts, or feed plans. ONLY ask questions or read back summary for confirmation." }] : []),
        ...(effectiveForceLang && effectiveForcedLabel ? [{ role: "system", content: `CRITICAL LANGUAGE LOCK: The next answer MUST be written only in ${effectiveForcedLabel}. The first line MUST be [[LANG:${effectiveForceLang}]]. Do not use Hindi unless the locked language is Hindi. Do not mix scripts.` }] : []),
        ...safeMessages,
        ...(isRationAdvisory && isHerdGathering(advisoryHint) && !isVerificationStep(advisoryHint) ? [{ role: "system", content: "FINAL INSTRUCTION: Reply with ONLY 2–4 simple questions for the farmer in the LOCKED language. Acknowledge herd size if stated. Ask about the next animal. NO ration advice, NO kg, NO ₹. First line must still be [[LANG:xx]]." }] : []),
        ...(isRationAdvisory && isVerificationStep(advisoryHint) ? [{ role: "system", content: "FINAL INSTRUCTION: Read back ALL animal details from PARSED SUMMARY in farmer's language. Confirm total count matches. Ask 'Kya sab sahi hai?' NO ration kg amounts yet. First line [[LANG:xx]]." }] : []),
        ...(isRationAdvisory && isRationComputed(advisoryHint) ? [{ role: "system", content: "FINAL INSTRUCTION: Present COMPUTED RESULTS in farmer's language. ORDER: (1) HERD PREP — total kg to mix/prepare for whole herd today; (2) PER ANIMAL — each animal's daily share with breed and status. Use exact kg from system block." }] : []),
        ...(effectiveForceLang && effectiveForcedLabel ? [{ role: "system", content: `FINAL CHECK BEFORE ANSWERING: Reply in ${effectiveForcedLabel} only, with [[LANG:${effectiveForceLang}]] as the first line. Keep it simple enough for a farmer.` }] : []),
      ],
      stream,
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Too many requests, please wait." }), {
        status: 429, headers: jsonHeaders,
      });
    }
    if (response.status === 401 || response.status === 403) {
      return new Response(JSON.stringify({ error: "Sarvam API key invalid or missing." }), {
        status: 500, headers: jsonHeaders,
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("Sarvam chat error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: jsonHeaders,
      });
    }

    if (stream) {
      return new Response(response.body, {
        headers: sseHeaders,
      });
    }

    const data = await response.json();
    let text = filterAbusiveLanguage(extractSarvamChatText(data));
    if (!text.trim() && mode === "call") {
      text = callModeFallbackAnswer(
        typeof forceLanguage === "string" ? forceLanguage : detectedUserLang,
      );
    }
    return new Response(JSON.stringify({ text }), {
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: jsonHeaders,
    });
  }
}
