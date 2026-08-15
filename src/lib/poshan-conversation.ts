/**
 * Scripted ration advisory conversation (Pashu Poshan AI local flow).
 * Ported logic — does not import from Pashu Poshan AI folder.
 */
import { FEED_LIBRARY, type FeedItem } from "@/lib/feedLibrary";
import { INDIAN_STATES } from "@/lib/india-regions";
import { matchFeedFromText } from "@/lib/rationVoice";
import {
  detectSpecies,
  parseNumericAnswer,
} from "@/lib/rationVoice";
import { computeBalancedRationFromVoice } from "@/lib/poshan-voice-tools";
import type { Species } from "@/lib/nutrientRequirements";
import { detectLanguageCode } from "@/lib/languages";
import { matchLangCode } from "@/lib/rationVoice";
import { t, toRationLang, RATION_LANG_CODES, type RationLang } from "@/lib/rationI18n";
import { LANG_NAMES } from "@/lib/languages";

/** @deprecated Use RationLang from rationI18n */
export type PoshanLang = RationLang;
export type ConvStage =
  | "language"
  | "name"
  | "district"
  | "village"
  | "state"
  | "species"
  | "milk_status"
  | "calving_months"
  | "milk_yield"
  | "pregnancy"
  | "feed_green"
  | "feed_dry"
  | "feed_concentrate"
  | "feed_mineral"
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
  speciesSet?: boolean;
  inMilk: boolean;
  milkStatusSet?: boolean;
  milkYieldKg: number;
  milkYieldSet?: boolean;
  pregnant: boolean;
  pregnancySet?: boolean;
  monthsAfterCalving: number;
  monthsAfterCalvingSet?: boolean;
  greenFodderText: string;
  greenFodderSet?: boolean;
  dryFodderText: string;
  dryFodderSet?: boolean;
  concentrateText: string;
  concentrateSet?: boolean;
  mineralText: string;
  mineralSet?: boolean;
  feeds: FarmerFeedEntry[];
}

export interface PoshanConvState {
  lang: RationLang;
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
    speciesSet: false,
    inMilk: false,
    milkStatusSet: false,
    milkYieldKg: 0,
    milkYieldSet: false,
    pregnant: false,
    pregnancySet: false,
    monthsAfterCalving: 0,
    monthsAfterCalvingSet: false,
    greenFodderText: "",
    greenFodderSet: false,
    dryFodderText: "",
    dryFodderSet: false,
    concentrateText: "",
    concentrateSet: false,
    mineralText: "",
    mineralSet: false,
    feeds: [],
  };
}

function normalizeDraft(d: ConvDraft): ConvDraft {
  const out: ConvDraft = {
    ...emptyDraft(),
    ...d,
    feeds: [...(d.feeds || [])],
    speciesSet: d.speciesSet ?? false,
    milkStatusSet: d.milkStatusSet ?? false,
    milkYieldSet: d.milkYieldSet ?? (d.milkYieldKg > 0 && d.milkYieldKg !== 8),
    pregnancySet: d.pregnancySet ?? false,
    monthsAfterCalvingSet: d.monthsAfterCalvingSet ?? (d.monthsAfterCalving > 0),
    monthsAfterCalving: d.monthsAfterCalving ?? 0,
    greenFodderSet: d.greenFodderSet ?? Boolean(d.greenFodderText?.trim()),
    dryFodderSet: d.dryFodderSet ?? Boolean(d.dryFodderText?.trim()),
    concentrateSet: d.concentrateSet ?? Boolean(d.concentrateText?.trim()),
    mineralSet: d.mineralSet ?? Boolean(d.mineralText?.trim()),
    greenFodderText: d.greenFodderText ?? "",
    dryFodderText: d.dryFodderText ?? "",
    mineralText: d.mineralText ?? "",
  };
  // Legacy sessions stored a single roughage answer.
  const legacyRoughage = (d as ConvDraft & { roughageText?: string }).roughageText?.trim();
  if (legacyRoughage && !out.greenFodderSet && !out.dryFodderSet) {
    if (/bhusa|sukha|straw|parali|paddy|hay|silage|bhusa/i.test(legacyRoughage)) {
      out.dryFodderText = legacyRoughage;
      out.dryFodderSet = true;
    } else {
      out.greenFodderText = legacyRoughage;
      out.greenFodderSet = true;
    }
  }
  for (const feed of out.feeds) {
    const kind = feedKindFromId(feed.feedId);
    if (kind === "green" && out.greenFodderText.trim()) out.greenFodderSet = true;
    if (kind === "dry" && out.dryFodderText.trim()) out.dryFodderSet = true;
    if (kind === "concentrate" && out.concentrateText.trim()) out.concentrateSet = true;
    if (kind === "mineral" && out.mineralText.trim()) out.mineralSet = true;
  }
  if (!out.milkYieldSet && out.milkYieldKg === 8) out.milkYieldKg = 0;
  return out;
}

export function initialPoshanState(lang: RationLang = "hi"): PoshanConvState {
  return { lang, stage: "name", draft: emptyDraft() };
}

/** Detect language from farmer speech; keep current when unclear. */
export function resolveTurnLang(current: RationLang, text: string): RationLang {
  const explicit = matchLangCode(text);
  if (explicit) return toRationLang(explicit, current);
  const detected = detectLanguageCode(text);
  if (detected) return toRationLang(detected, current);
  return current;
}

const STAGE_I18N: Record<ConvStage, string> = {
  language: "chooseLanguage",
  name: "poshanOpening",
  district: "askDistrict",
  village: "askVillage",
  state: "askState",
  species: "askCowOrBuffalo",
  milk_status: "askMilkStatus",
  milk_yield: "askYield",
  calving_months: "askMonths",
  pregnancy: "askPregnant",
  feed_green: "askGreenFodder",
  feed_dry: "askDryFodder",
  feed_concentrate: "askConcentrateFeed",
  feed_mineral: "askMineralMixture",
  done: "poshanDone",
};

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function sanitizeNameToken(raw: string): string {
  return raw.replace(/ji$|bhai$|ben$|[.,!?]/gi, "").trim();
}

const NAME_STOPWORDS = new Set([
  "mera", "mere", "meri", "main", "hum", "naam", "name", "my", "i", "am", "is",
  "hai", "hoon", "hu", "the", "a", "an",
  "pas", "paas", "achha", "achchha", "accha", "theek", "haan", "han", "ok", "okay", "ji",
]);

function parseFarmerName(text: string): string {
  const t = clean(text);
  const patterns = [
    /(?:mera|meri|my)\s+naam\s+(?:hai\s+)?([^\s,]+)/i,
    /(?:my\s+name\s+is|i\s+am|i'm)\s+([^\s,]+)/i,
    /naam\s+(?:hai\s+)?([^\s,]+)/i,
    /(?:main|i)\s+([^\s,]+)\s+hoon/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m?.[1]) {
      const name = sanitizeNameToken(m[1]);
      if (name && !NAME_STOPWORDS.has(name.toLowerCase())) return name;
    }
  }
  for (const word of t.split(/\s+/)) {
    const candidate = sanitizeNameToken(word);
    if (candidate.length >= 2 && !NAME_STOPWORDS.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  const fallback = sanitizeNameToken(t.split(/\s+/)[0] || t);
  return NAME_STOPWORDS.has(fallback.toLowerCase()) ? "" : fallback;
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
  wheat: "wheat_straw", bhusa: "wheat_straw", bhoosa: "wheat_straw", gehu: "wheat_straw",
  parali: "paddy_straw", paddy: "paddy_straw", dhan: "paddy_straw",
  berseem: "barseem_fodder", barseem: "barseem_fodder",
  maize: "maize_fodder", makka: "maize_fodder", jowar: "jowar_fodder",
  mustard: "mustard_cake", sarson: "mustard_cake", khali: "mustard_cake",
  chokar: "wheat_bran", choker: "wheat_bran", bran: "wheat_bran",
  groundnut: "groundnut_cake", moongphali: "groundnut_cake", napier: "napier_bajra___nb_21",
  mineral: "mineral_mixture_bis", khurak: "mineral_mixture_bis",
};

type FeedKind = "green" | "dry" | "concentrate" | "mineral";

const DRY_ROUGHAGE_GROUPS = new Set(["Straw", "Hay", "Silage"]);

function feedKindFromId(feedId: string): FeedKind | null {
  const lib = FEED_LIBRARY.find((f) => f.id === feedId);
  if (!lib) return null;
  if (lib.category === "mineral") return "mineral";
  if (lib.category === "concentrate") return "concentrate";
  if (lib.category === "roughage") {
    if (lib.group === "Green Fodder" || lib.group === "Grass") return "green";
    if (DRY_ROUGHAGE_GROUPS.has(lib.group)) return "dry";
    return "dry";
  }
  return null;
}

function isFeedDeclined(text: string): boolean {
  const t = clean(text).toLowerCase();
  if (!t) return false;
  if (/^(nahi|na|no|nah|nahi dete|nahi khilate|nahi dalte|kuch nahi|koi nahi|nothing|none)$/i.test(t)) return true;
  return parseYes(text) === false && !/\d/.test(t);
}

function isDryFodderMention(text: string): boolean {
  return /sookha|sukha|sukhe|sookhe|bhusa|bhoosa|parali|straw|paddy|hay|silage|dry fodder/i.test(text);
}

function isGreenFodderMention(text: string): boolean {
  return /\bhara\b|green fodder|berseem|barseem|lasun|napier|makka chara|maize fodder|jowar fodder|hybrid napier/i.test(text);
}

function feedKindsInText(text: string): FeedKind[] {
  const kinds = new Set<FeedKind>();
  if (isGreenFodderMention(text)) kinds.add("green");
  if (isDryFodderMention(text)) kinds.add("dry");
  if (/sarson|khali|chokar|choker|bran|mustard cake|groundnut|moongfali|cattle feed|compound feed|concentrate|binola|soya/i.test(text)) {
    kinds.add("concentrate");
  }
  if (/mineral mixture|mineral mix|mineral|khurak mixture|salt lick/i.test(text)) {
    kinds.add("mineral");
  }
  for (const entry of parseFeedsFromSpeech(text)) {
    const kind = feedKindFromId(entry.feedId);
    if (kind) kinds.add(kind);
  }
  return [...kinds];
}

function isFeedKindSet(draft: ConvDraft, kind: FeedKind): boolean {
  switch (kind) {
    case "green": return Boolean(draft.greenFodderSet);
    case "dry": return Boolean(draft.dryFodderSet);
    case "concentrate": return Boolean(draft.concentrateSet);
    case "mineral": return Boolean(draft.mineralSet);
  }
}

function setFeedKind(draft: ConvDraft, kind: FeedKind, text: string): void {
  switch (kind) {
    case "green":
      draft.greenFodderSet = true;
      if (text.trim()) draft.greenFodderText = text.slice(0, 80);
      break;
    case "dry":
      draft.dryFodderSet = true;
      if (text.trim()) draft.dryFodderText = text.slice(0, 80);
      break;
    case "concentrate":
      draft.concentrateSet = true;
      if (text.trim()) draft.concentrateText = text.slice(0, 80);
      break;
    case "mineral":
      draft.mineralSet = true;
      if (text.trim()) draft.mineralText = text.slice(0, 80);
      break;
  }
}

function resolveFeedForKind(text: string, kind: FeedKind): FarmerFeedEntry | null {
  const parsed = parseFeedsFromSpeech(text).filter((entry) => feedKindFromId(entry.feedId) === kind);
  if (parsed.length) return parsed[0];

  const t = clean(text).toLowerCase();
  if (kind === "dry" && isDryFodderMention(text)) {
    const feedId = /parali|paddy|dhan/i.test(t) ? "paddy_straw" : "wheat_straw";
    const lib = FEED_LIBRARY.find((f) => f.id === feedId);
    if (!lib) return null;
    return {
      feedId: lib.id,
      feedName: lib.name,
      qtyKg: firstNumber(text) ?? 5,
      priceRs: lib.rate,
    };
  }
  if (kind === "green" && isGreenFodderMention(text)) {
    const lib = FEED_LIBRARY.find((f) => f.id === "barseem_fodder")
      ?? FEED_LIBRARY.find((f) => f.id === "napier_bajra___nb_21");
    if (!lib) return null;
    return {
      feedId: lib.id,
      feedName: lib.name,
      qtyKg: firstNumber(text) ?? 20,
      priceRs: lib.rate,
    };
  }
  if (kind === "concentrate") {
    return resolveFeed(text);
  }
  if (kind === "mineral") {
    const lib = FEED_LIBRARY.find((f) => f.id === "mineral_mixture_bis");
    if (!lib) return null;
    const qtyG = firstNumber(text);
    return {
      feedId: lib.id,
      feedName: lib.name,
      qtyKg: qtyG != null && qtyG < 1 ? qtyG : (qtyG ?? 0.1),
      priceRs: lib.rate,
    };
  }
  return null;
}

function applyFeedAnswer(draft: ConvDraft, text: string, primaryKind: FeedKind): void {
  const parsed = parseFeedsFromSpeech(text);

  if (isFeedDeclined(text) && !parsed.length) {
    setFeedKind(draft, primaryKind, "");
    return;
  }

  for (const entry of parsed) {
    if (draft.feeds.some((x) => x.feedId === entry.feedId)) continue;
    draft.feeds.push(entry);
    const kind = feedKindFromId(entry.feedId);
    if (kind) setFeedKind(draft, kind, text);
  }

  const primaryEntry = resolveFeedForKind(text, primaryKind);
  if (primaryEntry && !draft.feeds.some((x) => x.feedId === primaryEntry.feedId)) {
    draft.feeds.push(primaryEntry);
  }

  if (text.trim()) {
    setFeedKind(draft, primaryKind, text);
  }

  for (const entry of parsed) {
    const kind = feedKindFromId(entry.feedId);
    if (kind && kind !== primaryKind) {
      setFeedKind(draft, kind, text);
    }
  }
}

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
    milkYieldSet: draft.milkYieldSet ? 1 : 0,
    monthsAfterCalving: draft.monthsAfterCalving,
    monthsAfterCalvingSet: draft.monthsAfterCalvingSet ? 1 : 0,
    greenFodderText: draft.greenFodderText.slice(0, 48),
    dryFodderText: draft.dryFodderText.slice(0, 48),
    ...extra,
  };
}

function agentLine(lang: RationLang, stage: ConvStage, ctx: Record<string, string | number> = {}): string {
  const key = STAGE_I18N[stage];
  return t(key, lang, ctx as Record<string, string | number>);
}

function reprompt(lang: RationLang, stage: ConvStage, ctx: Record<string, string | number>): string {
  const key = STAGE_I18N[stage];
  if (key && RATION_STAGE_KEYS.has(stage)) {
    return t(key, lang, ctx as Record<string, string | number>);
  }
  return t("sayAgain", lang);
}

const RATION_STAGE_KEYS = new Set<ConvStage>([
  "name", "district", "village", "state", "species", "milk_status", "milk_yield",
  "calving_months", "pregnancy", "feed_green", "feed_dry", "feed_concentrate", "feed_mineral",
]);

function feedCategory(feedId: string): FeedItem["category"] | undefined {
  return FEED_LIBRARY.find((f) => f.id === feedId)?.category;
}

type StageOrCompute = ConvStage | "compute";

function firstMissingStage(d: ConvDraft): StageOrCompute {
  if (!d.name.trim()) return "name";
  if (!d.district.trim()) return "district";
  if (!d.village.trim()) return "village";
  if (!d.state.trim()) return "state";
  if (!d.speciesSet) return "species";
  if (!d.milkStatusSet) return "milk_status";
  if (d.inMilk && !d.milkYieldSet) return "milk_yield";
  if (!d.inMilk && !d.pregnancySet) return "pregnancy";
  if (!d.monthsAfterCalvingSet) return "calving_months";
  if (!d.greenFodderSet) return "feed_green";
  if (!d.dryFodderSet) return "feed_dry";
  if (!d.concentrateSet) return "feed_concentrate";
  if (!d.mineralSet) return "feed_mineral";
  return "compute";
}

function computeRationReply(lang: RationLang, draft: ConvDraft): ProcessResult {
  const working = { ...draft, feeds: [...draft.feeds] };
  const feedsJson = JSON.stringify(
    working.feeds.map((f) => ({ name: f.feedName, qty_kg: f.qtyKg, price_rs: f.priceRs })),
  );
  const computed = computeBalancedRationFromVoice({
    farmer_name: working.name,
    lang,
    district: working.district,
    state: working.state,
    species: working.species,
    in_milk: working.inMilk,
    milk_yield_litres: working.milkYieldKg,
    milk_fat_percent: working.species === "buffalo" ? 7 : 4,
    pregnant: working.pregnant,
    months_after_calving: working.monthsAfterCalvingSet ? working.monthsAfterCalving : undefined,
    feeds_json: feedsJson,
  });
  const closing = `${t("optimizing", lang)}\n\n${computed.summary}`;
  return {
    reply: closing,
    state: { lang, stage: "done", draft: working },
    done: true,
    rationSummary: computed.summary,
  };
}

function replyForStage(lang: RationLang, nextStage: ConvStage, draft: ConvDraft): string {
  return agentLine(lang, nextStage, buildCtx(draft));
}

export function openingLine(lang: RationLang): string {
  return agentLine(lang, "name");
}

export function languagePrompt(): string {
  return `🌾 ${t("title", "hi")} / Ration Advisory\n\n${t("chooseLanguage", "hi")} — ${RATION_LANG_CODES.map((c) => LANG_NAMES[c]).join(", ")}:`;
}

export interface ProcessResult {
  reply: string;
  state: PoshanConvState;
  done: boolean;
  rationSummary?: string;
}

export function processPoshanInput(state: PoshanConvState, input: string): ProcessResult {
  const text = clean(input);
  let lang = state.stage === "language" ? state.lang : resolveTurnLang(state.lang, text);
  const draft = normalizeDraft({ ...state.draft, feeds: [...state.draft.feeds] });
  let stage = state.stage;

  if (stage === "language") {
    const picked = matchLangCode(text) || detectLanguageCode(text);
    lang = toRationLang(picked ?? lang);
    return {
      reply: openingLine(lang),
      state: { lang, stage: "name", draft: emptyDraft() },
      done: false,
    };
  }

  if (stage === "done") {
    return { reply: agentLine(lang, "done", buildCtx(draft)), state: { lang, stage: "done", draft }, done: true };
  }

  if (!text) {
    const next = firstMissingStage(draft);
    if (next === "compute") return computeRationReply(lang, draft);
    return { reply: reprompt(lang, next, buildCtx(draft)), state: { lang, stage: next, draft }, done: false };
  }

  switch (stage) {
    case "name": {
      if (!draft.name.trim() || NAME_STOPWORDS.has(draft.name.toLowerCase())) {
        draft.name = parseFarmerName(text);
      }
      break;
    }
    case "district": {
      if (!draft.district.trim()) draft.district = text.replace(/\s*jila\s*$/i, "").trim();
      break;
    }
    case "village": {
      if (!draft.village.trim()) draft.village = text.replace(/\s*gaanv\s*$/i, "").trim();
      break;
    }
    case "state": {
      if (!draft.state.trim()) {
        const st = matchState(text);
        if (!st) {
          return { reply: reprompt(lang, "state", buildCtx(draft)), state: { lang, stage, draft }, done: false };
        }
        draft.state = st.name;
        draft.stateCode = st.code;
      }
      break;
    }
    case "species": {
      if (!draft.speciesSet) {
        const sp = parseSpecies(text) || detectSpecies(text);
        if (!sp) {
          return { reply: reprompt(lang, "species", buildCtx(draft)), state: { lang, stage, draft }, done: false };
        }
        draft.species = sp;
        draft.speciesSet = true;
      }
      break;
    }
    case "milk_status": {
      if (!draft.milkStatusSet) {
        const lower = text.toLowerCase();
        const yn = parseYes(text);
        if (/garbhwati|garbh|pregnant|gaabhin/i.test(lower)) {
          draft.inMilk = false;
          draft.pregnant = true;
          draft.milkStatusSet = true;
          draft.pregnancySet = true;
        } else if (/sukhi|dry/i.test(lower)) {
          draft.inMilk = false;
          draft.pregnant = false;
          draft.milkStatusSet = true;
        } else if (/doodh|milk|दूध/i.test(lower) || yn === true) {
          draft.inMilk = true;
          draft.milkStatusSet = true;
        } else if (yn === false) {
          draft.inMilk = false;
          draft.milkStatusSet = true;
        } else {
          return { reply: reprompt(lang, "milk_status", buildCtx(draft)), state: { lang, stage, draft }, done: false };
        }
      }
      break;
    }
    case "milk_yield": {
      if (!draft.milkYieldSet) {
        const n = parseNumericAnswer(text, "yield") ?? firstNumber(text);
        if (!n || n <= 0 || n > 40) {
          return { reply: reprompt(lang, "milk_yield", buildCtx(draft)), state: { lang, stage, draft }, done: false };
        }
        draft.milkYieldKg = n;
        draft.milkYieldSet = true;
      }
      break;
    }
    case "calving_months": {
      if (!draft.monthsAfterCalvingSet) {
        const n = parseNumericAnswer(text, "months") ?? firstNumber(text);
        if (n === null || n < 0 || n > 24) {
          return { reply: reprompt(lang, "calving_months", buildCtx(draft)), state: { lang, stage, draft }, done: false };
        }
        draft.monthsAfterCalving = Math.round(n);
        draft.monthsAfterCalvingSet = true;
      }
      break;
    }
    case "pregnancy": {
      if (!draft.pregnancySet) {
        const yn = parseYes(text);
        draft.pregnant = yn === true || /garbhwati|garbh|pregnant/i.test(text);
        draft.pregnancySet = true;
      }
      break;
    }
    case "feed_green": {
      applyFeedAnswer(draft, text, "green");
      break;
    }
    case "feed_dry": {
      applyFeedAnswer(draft, text, "dry");
      break;
    }
    case "feed_concentrate": {
      applyFeedAnswer(draft, text, "concentrate");
      break;
    }
    case "feed_mineral": {
      applyFeedAnswer(draft, text, "mineral");
      break;
    }
    default:
      break;
  }

  const next = firstMissingStage(draft);
  if (next === "compute") return computeRationReply(lang, draft);

  return {
    reply: replyForStage(lang, next, draft),
    state: { lang, stage: next, draft },
    done: false,
  };
}

export function convStateKey(conversationId: string): string {
  return `pashumitra_poshan_${conversationId}`;
}

export function convModeKey(conversationId: string): string {
  return `pashumitra_conv_mode_${conversationId}`;
}

function migrateStage(stage: string, draft: ConvDraft): ConvStage {
  if (stage === "feed_roughage") {
    if (!draft.greenFodderSet) return "feed_green";
    if (!draft.dryFodderSet) return "feed_dry";
    if (!draft.concentrateSet) return "feed_concentrate";
    return "feed_mineral";
  }
  return stage as ConvStage;
}

export function loadPoshanState(conversationId: string): PoshanConvState | null {
  try {
    const raw = localStorage.getItem(convStateKey(conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PoshanConvState;
    const draft = normalizeDraft(parsed.draft);
    return {
      ...parsed,
      lang: toRationLang(parsed.lang),
      stage: migrateStage(parsed.stage, draft),
      draft,
    };
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

export function markRationConversation(conversationId: string, lang?: RationLang): void {
  localStorage.setItem(convModeKey(conversationId), "ration");
  if (lang) {
    savePoshanState(conversationId, { lang, stage: "name", draft: emptyDraft() });
  }
}
