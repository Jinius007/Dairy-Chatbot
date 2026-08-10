/**
 * Scripted ration advisory conversation (Pashu Poshan AI local flow).
 * Ported logic — does not import from Pashu Poshan AI folder.
 */
import { FEED_LIBRARY, type FeedItem } from "@/lib/feedLibrary";
import { INDIAN_STATES } from "@/lib/india-regions";
import { matchFeedFromText } from "@/lib/rationVoice";
import { computeBalancedRationFromVoice } from "@/lib/poshan-voice-tools";
import type { Species } from "@/lib/nutrientRequirements";

export type PoshanLang = "hi" | "en";
export type ConvStage =
  | "language"
  | "name"
  | "district"
  | "village"
  | "state"
  | "species"
  | "milk_status"
  | "milk_yield"
  | "pregnancy"
  | "feed_roughage"
  | "feed_concentrate"
  | "done";

export interface FarmerFeedEntry {
  feedId: string;
  feedName: string;
  qtyKg: number;
  priceRs: number;
}

export interface ConvDraft {
  name: string;
  district: string;
  village: string;
  state: string;
  stateCode: string;
  species: Species;
  inMilk: boolean;
  milkYieldKg: number;
  pregnant: boolean;
  roughageText: string;
  concentrateText: string;
  feeds: FarmerFeedEntry[];
}

export interface PoshanConvState {
  lang: PoshanLang;
  stage: ConvStage;
  draft: ConvDraft;
}

export function emptyDraft(): ConvDraft {
  return {
    name: "",
    district: "",
    village: "",
    state: "",
    stateCode: "UP",
    species: "cattle",
    inMilk: true,
    milkYieldKg: 8,
    pregnant: false,
    roughageText: "",
    concentrateText: "",
    feeds: [],
  };
}

export function initialPoshanState(lang: PoshanLang = "hi"): PoshanConvState {
  return { lang, stage: "name", draft: emptyDraft() };
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function firstNumber(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export function parseYes(text: string): boolean | null {
  const t = text.toLowerCase();
  if (/^(haan|ha|han|yes|yep|yeah|ji|हाँ|हां|हा|हो|छे|है)/i.test(t) || /\b(yes|haan|ha|ji)\b/i.test(t)) return true;
  if (/^(nahi|na|no|nah|नही|नहीं|mat)/i.test(t) || /\b(no|nahi|na)\b/i.test(t)) return false;
  return null;
}

export function parseSpecies(text: string): Species | null {
  const t = text.toLowerCase();
  if (/bhains|buffalo|भैंस|મહ/i.test(t)) return "buffalo";
  if (/gaay|gai|cow|cattle|गाय|ગાય/i.test(t)) return "cattle";
  return null;
}

function matchState(text: string): { name: string; code: string } | null {
  const t = clean(text).toLowerCase();
  for (const s of INDIAN_STATES) {
    if (t.includes(s.name.toLowerCase()) || t.includes(s.code.toLowerCase())) return s;
  }
  const aliases: Record<string, string> = {
    up: "UP", mp: "MP", gj: "GJ", gujarat: "GJ", maharashtra: "MH", punjab: "PB",
    haryana: "HR", bihar: "BR", rajasthan: "RJ", karnataka: "KA", tamil: "TN",
    telangana: "TS", kerala: "KL", bengal: "WB", odisha: "OR", assam: "AS",
  };
  for (const [key, code] of Object.entries(aliases)) {
    if (t.includes(key)) {
      const st = INDIAN_STATES.find((x) => x.code === code);
      if (st) return st;
    }
  }
  if (t.length >= 2) return { name: clean(text), code: "UP" };
  return null;
}

const FEED_ALIASES: Record<string, string> = {
  wheat: "wheat_straw", bhusa: "wheat_straw", gehu: "wheat_straw", paddy: "paddy_straw",
  parali: "paddy_straw", berseem: "barseem_fodder", barseem: "barseem_fodder",
  maize: "maize_fodder", makka: "maize_fodder", jowar: "jowar_fodder",
  mustard: "mustard_cake", sarson: "mustard_cake", khali: "mustard_cake",
  chokar: "wheat_bran", bran: "wheat_bran", groundnut: "groundnut_cake",
  moongphali: "groundnut_cake", napier: "napier_bajra___nb_21",
};

function resolveFeed(spoken: string): FarmerFeedEntry | null {
  const t = spoken.toLowerCase();
  let feedId: string | undefined;
  for (const [alias, id] of Object.entries(FEED_ALIASES)) {
    if (t.includes(alias)) { feedId = id; break; }
  }
  if (!feedId) {
    const hit = matchFeedFromText(spoken) ?? FEED_LIBRARY.find(
      (f) => t.includes(f.name.toLowerCase().slice(0, 6)) || f.name.toLowerCase().includes(t.slice(0, 5)),
    );
    feedId = hit?.id;
  }
  const lib = FEED_LIBRARY.find((f) => f.id === feedId);
  if (!lib) return null;
  const qty = firstNumber(spoken) ?? (lib.category === "roughage" ? 25 : 4);
  return { feedId: lib.id, feedName: lib.name, qtyKg: qty, priceRs: lib.rate };
}

function parseFeedsFromSpeech(text: string): FarmerFeedEntry[] {
  const parts = text.split(/,| aur | and | तथा | व |\+/i).map(clean).filter(Boolean);
  const out: FarmerFeedEntry[] = [];
  for (const part of parts.length ? parts : [text]) {
    const entry = resolveFeed(part);
    if (entry) out.push(entry);
  }
  if (!out.length) {
    const fallback = resolveFeed(text);
    if (fallback) out.push(fallback);
  }
  return out;
}

function buildCtx(draft: ConvDraft, extra: Record<string, string | number> = {}): Record<string, string | number> {
  return {
    name: draft.name,
    district: draft.district,
    village: draft.village,
    state: draft.state,
    species: draft.species,
    inMilk: draft.inMilk ? 1 : 0,
    pregnant: draft.pregnant ? 1 : 0,
    milkYieldKg: draft.milkYieldKg,
    roughageText: draft.roughageText.slice(0, 48),
    ...extra,
  };
}

type ScriptFn = (ctx: Record<string, string | number>) => string;

const HI: Record<ConvStage, ScriptFn> = {
  language: () => "नीचे अपनी भाषा चुनें — Hindi या English बोलिए।",
  name: () =>
    "Namaste! Main aapka Pashu Sahayak hoon — gaon ke livestock officer ki tarah. Thodi si baat karke santulit khurak banaunga. Shuru karte hain — aap apna naam batayiye.",
  district: (c) => `${c.name} ji! Bahut achha. Kis jile mein rehte hain?`,
  village: (c) => `${c.district} jila — theek hai. Aapka gaanv ka naam kya hai?`,
  state: (c) => `${c.village} gaanv — achha. Ye gaanv kis rajya mein pada hai? Jaise Gujarat, UP…`,
  species: (c) => `${c.state} — samajh gaya. ${c.name} ji, gaay hai ya bhains?`,
  milk_status: (c) =>
    c.species === "buffalo"
      ? "Bhains hai — kya abhi doodh de rahi hai? Ya sukhi, ya garbh?"
      : "Gaay hai — kya abhi doodh de rahi hai? Ya sukhi, ya garbh?",
  milk_yield: (c) =>
    c.milkYieldKg
      ? `${c.milkYieldKg} litre — note kar liya. Roz kya chara khilate ho? Naam, kitna kilogram, aur daam batayiye.`
      : "Roz kitna doodh milta hai? Litron mein boliye. Phir chara batayiye.",
  pregnancy: () => "Theek hai. Ab chara ke baare mein — roz kya dalte ho?",
  feed_roughage: (c) =>
    c.roughageText
      ? `Achha, ${c.roughageText} — sun liya. Ab concentrate kya dete ho? Sarson khali, chokar, dan?`
      : "Sun liya. Ab concentrate — sarson khali, chokar? Naam aur kitna kilogram batayiye.",
  feed_concentrate: (c) =>
    `${c.name} ji, sab samajh aa gaya. Main ab santulit khurak nikal raha hoon… bas ek pal.`,
  done: () => "Bahut achha raha. Phir kabhi zaroorat ho to dubara poochhiye. Dhanyavaad!",
};

const EN: Record<ConvStage, ScriptFn> = {
  language: () => "Choose your language — say Hindi or English.",
  name: () =>
    "Hello! I'm your Pashu Sahayak — like the livestock officer in your village. I'll ask a few questions and work out a balanced ration. What's your name?",
  district: (c) => `Nice to meet you, ${c.name}! Which district do you live in?`,
  village: (c) => `${c.district} — got it. What's your village name?`,
  state: (c) => `${c.village} — which state is that in?`,
  species: (c) => `${c.state} — do you have a cow or a buffalo, ${c.name}?`,
  milk_status: (c) =>
    c.species === "buffalo"
      ? "A buffalo — is she giving milk, dry, or pregnant?"
      : "A cow — is she giving milk, dry, or pregnant?",
  milk_yield: (c) =>
    c.milkYieldKg
      ? `${c.milkYieldKg} litres — noted. What fodder do you feed daily? Name, kg, and price.`
      : "How many litres of milk per day? Then tell me about fodder.",
  pregnancy: () => "Okay. What roughage do you give each day?",
  feed_roughage: (c) =>
    c.roughageText
      ? `Got it — ${c.roughageText}. What concentrates — mustard cake, bran?`
      : "Thanks. Now concentrates — mustard cake, bran, grain?",
  feed_concentrate: (c) =>
    `${c.name}, that's everything — working out your balanced ration for ${c.district}…`,
  done: () => "Great talking with you. Come back anytime. Thank you!",
};

function agentLine(lang: PoshanLang, stage: ConvStage, ctx: Record<string, string | number> = {}): string {
  const pack = lang === "en" ? EN : HI;
  return pack[stage](ctx);
}

function reprompt(lang: PoshanLang, stage: ConvStage, ctx: Record<string, string | number>): string {
  const n = ctx.name ? `${ctx.name} ji, ` : "";
  if (lang === "en") {
    const en: Partial<Record<ConvStage, string>> = {
      name: "Sorry, I didn't catch your name. Could you say it again?",
      district: `${n}which district are you in?`,
      village: `${n}what's your village called?`,
      state: "Which state — Gujarat, UP, Maharashtra…?",
      species: "Cow or buffalo?",
      milk_status: "In milk, dry, or pregnant?",
      milk_yield: "How many litres per day? Like 8 or 10.",
      pregnancy: "Is she pregnant? Yes or no.",
      feed_roughage: "What fodder do you give? Name and kg amount.",
      feed_concentrate: "What concentrate — mustard cake, bran?",
    };
    return en[stage] ?? "Could you say that once more?";
  }
  const hi: Partial<Record<ConvStage, string>> = {
    name: "Maaf kijiye, naam clear nahi suna. Ek baar phir boliye.",
    district: `${n}kis jile mein rehte hain?`,
    village: `${n}gaanv ka naam kya hai?`,
    state: "Kaunsa rajya — Gujarat, UP…?",
    species: "Gaay hai ya bhains?",
    milk_status: "Doodh de rahi hai, sukhi, ya garbh?",
    milk_yield: "Roz kitna litre doodh? Jaise 6 ya 8.",
    pregnancy: "Kya garbh hai? Haan ya nahi.",
    feed_roughage: "Roz kya chara dalte ho?",
    feed_concentrate: "Concentrate kya dete ho — sarson khali, chokar?",
  };
  return hi[stage] ?? "Thoda clear boliye, phir se sun leta hoon.";
}

export function openingLine(lang: PoshanLang): string {
  return agentLine(lang, "name");
}

export function languagePrompt(): string {
  return "🌾 पशु पोषण / Ration Advisory\n\nपहले भाषा चुनें / Choose language — Hindi (हिन्दी) or English:";
}

export interface ProcessResult {
  reply: string;
  state: PoshanConvState;
  done: boolean;
  rationSummary?: string;
}

export function processPoshanInput(state: PoshanConvState, input: string): ProcessResult {
  const lang = state.lang;
  const draft = { ...state.draft, feeds: [...state.draft.feeds] };
  let stage = state.stage;
  const text = clean(input);

  if (stage === "language") {
    const lower = text.toLowerCase();
    if (/english|angrezi|en\b/i.test(lower)) {
      return {
        reply: openingLine("en"),
        state: { lang: "en", stage: "name", draft: emptyDraft() },
        done: false,
      };
    }
    return {
      reply: openingLine("hi"),
      state: { lang: "hi", stage: "name", draft: emptyDraft() },
      done: false,
    };
  }

  if (!text) {
    return { reply: reprompt(lang, stage, buildCtx(draft)), state: { ...state, draft }, done: false };
  }

  switch (stage) {
    case "name": {
      draft.name = text.split(/\s+/)[0].replace(/ji$|bhai$|ben$/i, "") || text;
      stage = "district";
      return { reply: agentLine(lang, "district", buildCtx(draft)), state: { lang, stage, draft }, done: false };
    }
    case "district": {
      draft.district = text.replace(/\s*jila\s*$/i, "").trim();
      stage = "village";
      return { reply: agentLine(lang, "village", buildCtx(draft)), state: { lang, stage, draft }, done: false };
    }
    case "village": {
      draft.village = text.replace(/\s*gaanv\s*$/i, "").trim();
      stage = "state";
      return { reply: agentLine(lang, "state", buildCtx(draft)), state: { lang, stage, draft }, done: false };
    }
    case "state": {
      const st = matchState(text);
      if (!st) {
        return { reply: reprompt(lang, "state", buildCtx(draft)), state: { lang, stage, draft }, done: false };
      }
      draft.state = st.name;
      draft.stateCode = st.code;
      stage = "species";
      return { reply: agentLine(lang, "species", buildCtx(draft)), state: { lang, stage, draft }, done: false };
    }
    case "species": {
      const sp = parseSpecies(text);
      if (!sp) {
        return { reply: reprompt(lang, "species", buildCtx(draft)), state: { lang, stage, draft }, done: false };
      }
      draft.species = sp;
      stage = "milk_status";
      return { reply: agentLine(lang, "milk_status", buildCtx(draft)), state: { lang, stage, draft }, done: false };
    }
    case "milk_status": {
      const yn = parseYes(text);
      const lower = text.toLowerCase();
      if (/doodh|milk|दूध/i.test(lower) || (yn === true && !/garbh|pregnant|sukhi|dry/i.test(lower))) {
        draft.inMilk = true;
      } else if (/garbh|pregnant/i.test(lower)) {
        draft.inMilk = false;
        draft.pregnant = true;
      } else if (/sukhi|dry/i.test(lower)) {
        draft.inMilk = false;
        draft.pregnant = false;
      } else if (yn === true) draft.inMilk = true;
      else if (yn === false) draft.inMilk = false;
      else {
        return { reply: reprompt(lang, "milk_status", buildCtx(draft)), state: { lang, stage, draft }, done: false };
      }
      if (draft.inMilk) {
        stage = "milk_yield";
        return { reply: agentLine(lang, "milk_yield", buildCtx(draft)), state: { lang, stage, draft }, done: false };
      }
      if (draft.pregnant) {
        stage = "feed_roughage";
        return { reply: agentLine(lang, "milk_status", buildCtx(draft)), state: { lang, stage, draft }, done: false };
      }
      const followUp = lang === "en"
        ? `Okay, she's dry. Is she pregnant right now? Yes or no.`
        : `Theek hai, sukhi hai. Kya abhi garbh hai? Haan ya nahi boliye.`;
      stage = "pregnancy";
      return { reply: followUp, state: { lang, stage, draft }, done: false };
    }
    case "milk_yield": {
      const n = firstNumber(text);
      if (!n || n <= 0 || n > 40) {
        return { reply: reprompt(lang, "milk_yield", buildCtx(draft)), state: { lang, stage, draft }, done: false };
      }
      draft.milkYieldKg = n;
      stage = "feed_roughage";
      return { reply: agentLine(lang, "milk_yield", buildCtx(draft)), state: { lang, stage, draft }, done: false };
    }
    case "pregnancy": {
      const yn = parseYes(text);
      draft.pregnant = yn === true || /garbh|pregnant/i.test(text);
      stage = "feed_roughage";
      return { reply: agentLine(lang, "pregnancy", buildCtx(draft)), state: { lang, stage, draft }, done: false };
    }
    case "feed_roughage": {
      draft.roughageText = text;
      draft.feeds = parseFeedsFromSpeech(text);
      stage = "feed_concentrate";
      return { reply: agentLine(lang, "feed_roughage", buildCtx(draft)), state: { lang, stage, draft }, done: false };
    }
    case "feed_concentrate": {
      draft.concentrateText = text;
      draft.feeds = [...draft.feeds, ...parseFeedsFromSpeech(text)];
      if (draft.feeds.length < 2) {
        for (const f of FEED_LIBRARY.filter((x) => x.category === "roughage" || x.category === "concentrate").slice(0, 2)) {
          if (!draft.feeds.some((x) => x.feedId === f.id)) {
            draft.feeds.push({ feedId: f.id, feedName: f.name, qtyKg: f.category === "roughage" ? 20 : 3, priceRs: f.rate });
          }
        }
      }
      const feedsJson = JSON.stringify(
        draft.feeds.map((f) => ({ name: f.feedName, qty_kg: f.qtyKg, price_rs: f.priceRs })),
      );
      const computed = computeBalancedRationFromVoice({
        farmer_name: draft.name,
        lang,
        district: draft.district,
        state: draft.state,
        species: draft.species,
        in_milk: draft.inMilk,
        milk_yield_litres: draft.milkYieldKg,
        milk_fat_percent: draft.species === "buffalo" ? 7 : 4,
        pregnant: draft.pregnant,
        feeds_json: feedsJson,
      });
      const ctx = buildCtx(draft, { summary: computed.summary });
      const closing = `${agentLine(lang, "feed_concentrate", ctx)}\n\n${computed.summary}`;
      stage = "done";
      return {
        reply: closing,
        state: { lang, stage, draft },
        done: true,
        rationSummary: computed.summary,
      };
    }
    default:
      return { reply: agentLine(lang, "done", buildCtx(draft)), state: { lang, stage: "done", draft }, done: true };
  }
}

export function convStateKey(conversationId: string): string {
  return `pashumitra_poshan_${conversationId}`;
}

export function convModeKey(conversationId: string): string {
  return `pashumitra_conv_mode_${conversationId}`;
}

export function loadPoshanState(conversationId: string): PoshanConvState | null {
  try {
    const raw = localStorage.getItem(convStateKey(conversationId));
    if (!raw) return null;
    return JSON.parse(raw) as PoshanConvState;
  } catch {
    return null;
  }
}

export function savePoshanState(conversationId: string, state: PoshanConvState): void {
  localStorage.setItem(convStateKey(conversationId), JSON.stringify(state));
}

export function isRationConversation(conversationId: string): boolean {
  return localStorage.getItem(convModeKey(conversationId)) === "ration";
}

export function markRationConversation(conversationId: string, lang?: PoshanLang): void {
  localStorage.setItem(convModeKey(conversationId), "ration");
  if (lang) {
    savePoshanState(conversationId, { lang, stage: "name", draft: emptyDraft() });
  }
}
