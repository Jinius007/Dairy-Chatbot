import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wheat } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { LANG_NAMES } from "@/lib/languages";
import { speakText, stopSpeech, waitForSpeechIdle } from "@/lib/speech";
import { t } from "@/lib/rationI18n";
import {
  detectSpecies,
  isDefaultPrice,
  isDoneAddingFeeds,
  isDontKnow,
  isNo,
  isSkip,
  isYes,
  matchFeedFromText,
  matchLangCode,
  parseCalvingsFromVoice,
  parseMilkingFromVoice,
  parseNumericAnswer,
  parsePregnantFromVoice,
  parsePregMonthFromVoice,
  parseYesNoFromVoice,
  type NumericContext,
} from "@/lib/rationVoice";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FEED_BY_ID, FeedItem } from "@/lib/feedLibrary";
import {
  AnimalProfile,
  RequirementBreakdown,
  Species,
  computeRequirement,
} from "@/lib/nutrientRequirements";
import { RationFeedInput, RationResult, optimizeRation } from "@/lib/rationOptimizer";
import { detectLocation, mineralMixtureIdForLocation } from "@/lib/location";

type Step =
  | "language"
  | "locating"
  | "locationConfirm"
  | "locationManual"
  | "species"
  | "calvings"
  | "milking"
  | "months"
  | "yield"
  | "fat"
  | "snf"
  | "price"
  | "pregnant"
  | "pregMonth"
  | "feedName"
  | "feedMore"
  | "optimizing"
  | "done";

interface Msg {
  id: string;
  role: "bot" | "user";
  text?: string;
  requirement?: RequirementBreakdown;
  plan?: { result: RationResult; title: string; better?: boolean };
}

interface Answers {
  species: Species;
  weight: number;
  calvings: number;
  inMilk: boolean;
  months: number;
  yield: number;
  fat: number;
  snf: number | null;
  price: number;
  pregnant: boolean;
  pregMonth: number;
}

interface FarmerFeed {
  feed: FeedItem;
  price: number;
}

const uid = () => Math.random().toString(36).slice(2);

const DEFAULT_WEIGHT: Record<Species, number> = { cattle: 400, buffalo: 450 };

const MARKET_FEED_IDS = [
  "barseem_fodder",
  "maize_fodder",
  "jowar_fodder",
  "napier_bajra___nb_21",
  "wheat_straw",
  "paddy_straw",
  "grass_hay",
  "wheat_bran",
  "rice_bran_deoiled",
  "mustard_cake",
  "cottonseed_meal",
  "groundnut_cake",
  "soyabean_meal",
  "maize_grain",
  "cattle_feed_bis_i",
  "cattle_feed_bis_ii",
  "molasses",
];

const RationAdvisor = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<string>("en");
  const [step, setStep] = useState<Step>("language");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [place, setPlace] = useState<{ district: string; state: string; label: string } | null>(null);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [feeds, setFeeds] = useState<FarmerFeed[]>([]);
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(step);
  const langRef = useRef(lang);
  const answersRef = useRef(answers);
  const placeRef = useRef(place);
  const feedsRef = useRef(feeds);
  const speechPendingRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { placeRef.current = place; }, [place]);
  useEffect(() => { feedsRef.current = feeds; }, [feeds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, step, transcribing, busy]);

  useEffect(() => () => stopSpeech(), []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    bot(t("chooseLanguage", "en"), undefined, "en");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bot = useCallback((text: string, extra?: Partial<Msg>, speakIn?: string) => {
    const speakLang = speakIn ?? langRef.current;
    setMessages((m) => [...m, { id: uid(), role: "bot", text, ...extra }]);
    if (!text?.trim()) return;
    speechPendingRef.current += 1;
    setSpeaking(true);
    void speakText(text, { lang: speakLang, forceLang: true }).finally(() => {
      speechPendingRef.current = Math.max(0, speechPendingRef.current - 1);
      if (speechPendingRef.current === 0) setSpeaking(false);
    });
  }, []);

  const userMsg = useCallback((text: string, extra?: Partial<Msg>, isVoice = false) => {
    stopSpeech();
    const display = isVoice ? `🎤 ${text}` : text;
    setMessages((m) => [...m, { id: uid(), role: "user", text: display, ...extra }]);
  }, []);

  const startLocation = async (chosenLang: string) => {
    setStep("locating");
    bot(t("intro", chosenLang), undefined, chosenLang);
    bot(t("detectingLocation", chosenLang), undefined, chosenLang);
    const loc = await detectLocation();
    if (loc) {
      setPlace(loc);
      bot(t("locationConfirm", chosenLang, { place: loc.label }), undefined, chosenLang);
      setStep("locationConfirm");
    } else {
      bot(t("locationManual", chosenLang), undefined, chosenLang);
      setStep("locationManual");
    }
  };

  const chooseLanguage = (code: string, isVoice = false) => {
    setLang(code);
    userMsg(LANG_NAMES[code], undefined, isVoice);
    void startLocation(code);
  };

  const confirmLocation = (ok: boolean, isVoice = false) => {
    userMsg(ok ? t("yes", lang) : t("no", lang), undefined, isVoice);
    if (ok && place) {
      bot(t("locationSet", lang, { place: place.label }));
      askSpecies();
    } else {
      setPlace(null);
      bot(t("locationManual", lang));
      setStep("locationManual");
    }
  };

  const submitManualLocation = (text: string, isVoice = false) => {
    userMsg(text, undefined, isVoice);
    const parts = text.split(/[,،]/).map((p) => p.trim()).filter(Boolean);
    const loc = {
      district: parts[parts.length - 1] || text,
      state: "",
      label: text,
    };
    setPlace(loc);
    bot(t("locationSet", lang, { place: text }));
    askSpecies();
  };

  const askSpecies = () => {
    bot(t("askSpecies", lang));
    setStep("species");
  };

  const chooseSpecies = (s: Species, isVoice = false) => {
    setAnswers((a) => ({ ...a, species: s, weight: DEFAULT_WEIGHT[s] }));
    userMsg(s === "cattle" ? t("cow", lang) : t("buffalo", lang), undefined, isVoice);
    bot(t("askCalvings", lang));
    setStep("calvings");
  };

  const submitNumber = (raw: string, isVoice = false, context: NumericContext) => {
    const examples: Record<NumericContext, string> = {
      months: "8",
      yield: "10",
      fat: answersRef.current.species === "buffalo" ? "7" : "4",
      snf: "8.5",
      price: "34",
      pregMonth: "7",
    };
    const example = examples[context];
    const v = parseNumericAnswer(raw, context);
    const currentStep = stepRef.current;
    const L = langRef.current;
    const sp = answersRef.current.species;
    if (v === null || !Number.isFinite(v)) {
      userMsg(raw, undefined, isVoice);
      bot(t("invalidNumber", L, { x: example }));
      return;
    }
    switch (currentStep) {
      case "months": {
        if (!valid(v, 0, 24, example, L, isVoice, raw)) return;
        setAnswers((a) => ({ ...a, months: v }));
        userMsg(String(v), undefined, isVoice);
        bot(t("askYield", lang));
        setStep("yield");
        break;
      }
      case "yield": {
        if (!valid(v, 0.5, 60, example, L, isVoice, raw)) return;
        setAnswers((a) => ({ ...a, yield: v }));
        userMsg(`${v} L`, undefined, isVoice);
        bot(t("askFat", lang));
        setStep("fat");
        break;
      }
      case "fat": {
        const min = sp === "buffalo" ? 5 : 3;
        const max = sp === "buffalo" ? 14 : 6;
        if (!valid(v, min, max, example, L, isVoice, raw)) return;
        setFat(v, isVoice);
        break;
      }
      case "snf": {
        if (!valid(v, 6, 12, example, L, isVoice, raw)) return;
        setAnswers((a) => ({ ...a, snf: v }));
        userMsg(`${v} %`, undefined, isVoice);
        askPrice();
        break;
      }
      case "price": {
        if (!valid(v, 10, 150, example, L, isVoice, raw)) return;
        setAnswers((a) => ({ ...a, price: v }));
        userMsg(`₹${v}`, undefined, isVoice);
        askPregnant();
        break;
      }
    }
  };

  const valid = (v: number, min: number, max: number, example: string, L = langRef.current, isVoice = false, spoken = ""): boolean => {
    if (Number.isFinite(v) && v >= min && v <= max) return true;
    if (spoken) userMsg(spoken, undefined, isVoice);
    bot(t("invalidNumber", L, { x: example }));
    return false;
  };

  const chooseCalvings = (n: number, isVoice = false) => {
    setAnswers((a) => ({ ...a, calvings: n }));
    userMsg(n === 0 ? t("notCalved", lang) : String(n), undefined, isVoice);
    if (n === 0) {
      setAnswers((a) => ({ ...a, calvings: 0, inMilk: false, months: 0, yield: 0, fat: 0, price: 30 }));
      askPregnant();
    } else {
      bot(t("askMilking", lang));
      setStep("milking");
    }
  };

  const chooseMilking = (milking: boolean, isVoice = false) => {
    userMsg(milking ? t("inMilk", lang) : t("dryAnimal", lang), undefined, isVoice);
    if (milking) {
      setAnswers((a) => ({ ...a, inMilk: true }));
      bot(t("askMonths", lang));
      setStep("months");
    } else {
      setAnswers((a) => ({ ...a, inMilk: false, months: 0, yield: 0, fat: 0, price: 30 }));
      askPregnant();
    }
  };

  const setFat = (v: number, isVoice = false) => {
    setAnswers((a) => ({ ...a, fat: v }));
    userMsg(`${v} %`, undefined, isVoice);
    bot(t("askSnf", lang));
    setStep("snf");
  };

  const skipSnf = (isVoice = false) => {
    userMsg(t("skip", lang), undefined, isVoice);
    setAnswers((a) => ({ ...a, snf: null }));
    askPrice();
  };

  const askPrice = () => {
    bot(t("askPrice", lang));
    setStep("price");
  };

  const askPregnant = () => {
    bot(t("askPregnant", lang));
    setStep("pregnant");
  };

  const choosePregnant = (preg: boolean, isVoice = false) => {
    setAnswers((a) => ({ ...a, pregnant: preg }));
    userMsg(preg ? t("yes", lang) : t("no", lang), undefined, isVoice);
    if (preg) {
      bot(t("askPregMonth", lang));
      setStep("pregMonth");
    } else {
      setAnswers((a) => ({ ...a, pregnant: false, pregMonth: 0 }));
      showRequirement({ pregnant: false, pregMonth: 0 });
    }
  };

  const choosePregMonth = (m: number, isVoice = false) => {
    setAnswers((a) => ({ ...a, pregMonth: m }));
    userMsg(String(m), undefined, isVoice);
    showRequirement({ pregMonth: m, pregnant: true });
  };

  const buildProfile = (a: Partial<Answers>): AnimalProfile => ({
    species: a.species || "cattle",
    weight: a.weight || DEFAULT_WEIGHT[a.species || "cattle"],
    adult: (a.calvings ?? 0) >= 1,
    pregnant: !!a.pregnant,
    pregnancyMonth: a.pregMonth || 0,
    inMilk: !!a.inMilk,
    milkYield: a.yield || 0,
    milkFat: a.fat || (a.species === "buffalo" ? 7 : 4),
    monthsAfterCalving: a.months || 0,
    milkPrice: a.price || 30,
  });

  const showRequirement = (override?: Partial<Answers>) => {
    const merged = { ...answersRef.current, ...override };
    const profile = buildProfile(merged);
    const req = computeRequirement(profile);
    bot(t("reqIntro", lang), { requirement: req });
    bot(t("nutrientNote", lang));
    askFeedName();
  };

  const askFeedName = () => {
    bot(t("askFeeds", lang));
    setStep("feedName");
  };

  const askFeedMore = () => {
    bot(t("askFeedMore", lang));
    setStep("feedMore");
  };

  const addFeedByName = (feed: FeedItem, isVoice = false) => {
    setFeeds((prev) => {
      if (prev.some((f) => f.feed.id === feed.id)) return prev;
      return [...prev, { feed, price: feed.rate }];
    });
    userMsg(feed.name, undefined, isVoice);
    bot(t("feedAdded", lang, { feed: feed.name }));
    askFeedMore();
  };

  const submitFeedName = (text: string, isVoice = false) => {
    const feed = matchFeedFromText(text);
    if (!feed) {
      userMsg(text, undefined, isVoice);
      bot(t("feedNotFound", lang));
      return;
    }
    addFeedByName(feed, isVoice);
  };

  const finishFeedsAndOptimize = () => {
    const list = feedsRef.current;
    if (list.length === 0) {
      bot(t("needOneFeed", lang));
      setStep("feedName");
      bot(t("askFeeds", lang));
      return;
    }
    runOptimize();
  };

  const handleFeedStep = (text: string, isVoice: boolean, s: Step) => {
    if (s === "feedName") {
      submitFeedName(text, isVoice);
      return;
    }
    if (s === "feedMore") {
      if (isDoneAddingFeeds(text)) {
        userMsg(text, undefined, isVoice);
        finishFeedsAndOptimize();
        return;
      }
      submitFeedName(text, isVoice);
    }
  };

  const runOptimize = () => {
    const list = feedsRef.current;
    if (list.length === 0) {
      bot(t("needOneFeed", lang));
      askFeedName();
      return;
    }

    setBusy(true);
    setStep("optimizing");
    bot(t("optimizing", lang));
    userMsg(list.map((f) => f.feed.name).join(", "));

    setTimeout(() => {
      try {
        const a = answersRef.current;
        const p = placeRef.current;
        const L = langRef.current;
        const profile = buildProfile(a);
        const req = computeRequirement(profile);
        const mineralId = mineralMixtureIdForLocation(p?.district || "", p?.state || "");
        const mineral = FEED_BY_ID[mineralId] || FEED_BY_ID["mineral_mixture_bis"];

        const inputsA: RationFeedInput[] = list.map((f) => ({
          feed: f.feed,
          currentQty: 0,
          price: f.price,
        }));
        if (!inputsA.some((i) => i.feed.category === "mineral")) {
          inputsA.push({ feed: mineral, currentQty: 0, price: mineral.rate, suggested: true });
        }
        const planA = optimizeRation(inputsA, profile, req);

        const marketIds = new Set(MARKET_FEED_IDS);
        list.forEach((f) => marketIds.delete(f.feed.id));
        const inputsB: RationFeedInput[] = [
          ...list.map((f) => ({ feed: f.feed, currentQty: 0, price: f.price })),
          ...[...marketIds]
            .map((id) => FEED_BY_ID[id])
            .filter(Boolean)
            .map((feed) => ({ feed, currentQty: 0, price: feed.rate, suggested: true })),
        ];
        if (!inputsB.some((i) => i.feed.category === "mineral")) {
          inputsB.push({ feed: mineral, currentQty: 0, price: mineral.rate, suggested: true });
        }
        const planB = optimizeRation(inputsB, profile, req);

        if (planA.feasible) {
          if (planA.relaxed.length > 0) bot(t("notMetWarn", L));
          bot(t("planTitle", L), { plan: { result: planA, title: t("planTitle", L) } });
        } else {
          bot(t("infeasible", L));
        }
        if (planB.feasible && (!planA.feasible || planB.totalCost < planA.totalCost - 1)) {
          bot(t("planBetter", L), { plan: { result: planB, title: t("planBetter", L), better: true } });
        }
        bot(t("mineralNote", L));
        bot(t("disclaimer", L));
        setStep("done");
      } finally {
        setBusy(false);
      }
    }, 80);
  };

  const reprompt = (spoken: string, isVoice: boolean) => {
    userMsg(spoken, undefined, isVoice);
    bot(t("repeatAnswer", langRef.current));
  };

  const handleUserAnswer = useCallback((raw: string, isVoice = false) => {
    const text = raw.trim();
    if (!text) return;
    stopSpeech();
    speechPendingRef.current = 0;
    setSpeaking(false);
    const s = stepRef.current;

    switch (s) {
      case "language": {
        const code = matchLangCode(text);
        if (code) chooseLanguage(code, isVoice);
        else {
          userMsg(text, undefined, isVoice);
          bot(t("chooseLanguage", "en"), undefined, "en");
        }
        return;
      }
      case "locationConfirm": {
        const loc = parseYesNoFromVoice(text);
        if (loc === true || isYes(text)) confirmLocation(true, isVoice);
        else if (loc === false || isNo(text)) confirmLocation(false, isVoice);
        else reprompt(text, isVoice);
        return;
      }
      case "locationManual":
        submitManualLocation(text, isVoice);
        return;
      case "species": {
        const sp = detectSpecies(text);
        if (sp) chooseSpecies(sp, isVoice);
        else {
          userMsg(text, undefined, isVoice);
          bot(t("repeatSpecies", langRef.current));
        }
        return;
      }
      case "calvings": {
        const n = parseCalvingsFromVoice(text);
        if (n !== null) {
          chooseCalvings(n, isVoice);
          return;
        }
        const milkingHint = parseMilkingFromVoice(text);
        if (milkingHint !== null) {
          setAnswers((a) => ({ ...a, calvings: 1 }));
          userMsg(text, undefined, isVoice);
          chooseMilking(milkingHint, isVoice);
          return;
        }
        userMsg(text, undefined, isVoice);
        bot(t("invalidNumber", langRef.current, { x: "2" }));
        return;
      }
      case "milking": {
        const milking = parseMilkingFromVoice(text);
        if (milking === true) chooseMilking(true, isVoice);
        else if (milking === false) chooseMilking(false, isVoice);
        else {
          const yn = parseYesNoFromVoice(text);
          if (yn === true) chooseMilking(true, isVoice);
          else if (yn === false) chooseMilking(false, isVoice);
          else reprompt(text, isVoice);
        }
        return;
      }
      case "pregnant": {
        const preg = parsePregnantFromVoice(text);
        if (preg === true) choosePregnant(true, isVoice);
        else if (preg === false) choosePregnant(false, isVoice);
        else {
          const yn = parseYesNoFromVoice(text);
          if (yn === true) choosePregnant(true, isVoice);
          else if (yn === false) choosePregnant(false, isVoice);
          else reprompt(text, isVoice);
        }
        return;
      }
      case "pregMonth": {
        const m = parsePregMonthFromVoice(text);
        if (m !== null) choosePregMonth(m, isVoice);
        else {
          userMsg(text, undefined, isVoice);
          bot(t("invalidNumber", langRef.current, { x: "7" }));
        }
        return;
      }
      case "snf":
        if (isSkip(text) || isDontKnow(text)) skipSnf(isVoice);
        else submitNumber(text, isVoice, "snf");
        return;
      case "feedName":
      case "feedMore":
        handleFeedStep(text, isVoice, s);
        return;
      case "months":
        submitNumber(text, isVoice, "months");
        return;
      case "yield":
        submitNumber(text, isVoice, "yield");
        return;
      case "fat":
        if (isSkip(text) || isDontKnow(text)) {
          userMsg(t("dontKnow", langRef.current), undefined, isVoice);
          setFat(answersRef.current.species === "buffalo" ? 7 : 4, isVoice);
          return;
        }
        submitNumber(text, isVoice, "fat");
        return;
      case "price":
        if (isDefaultPrice(text) || isDontKnow(text)) {
          userMsg(t("dontKnow", langRef.current), undefined, isVoice);
          setAnswers((a) => ({ ...a, price: 30 }));
          askPregnant();
          return;
        }
        submitNumber(text, isVoice, "price");
        return;
      default:
        break;
    }
  }, [lang, place, answers, feeds]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTranscript = useCallback((txt: string) => {
    stopSpeech();
    speechPendingRef.current = 0;
    setSpeaking(false);
    const text = txt.trim();
    if (text) handleUserAnswer(text, true);
    else toast.error("Could not understand. Please try again.");
  }, [handleUserAnswer]);

  const handleVoice = async (b64: string, mime: string) => {
    // Fallback when browser speech recognition is unavailable (e.g. Firefox)
    if (!supabase) {
      toast.error("Voice needs Chrome or Edge, or Supabase configured.");
      return;
    }
    if (busy || transcribing || speaking || stepRef.current === "locating" || stepRef.current === "optimizing") return;
    stopSpeech();
    await waitForSpeechIdle();
    setTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe", {
        body: {
          audioBase64: b64,
          mimeType: mime,
          language: langRef.current,
          step: stepRef.current,
        },
      });
      if (error) throw error;
      if ((data as { blocked?: boolean })?.blocked) {
        toast.message("Please use respectful language.");
        return;
      }
      const txt = ((data as { transcript?: string })?.transcript || "").trim();
      if (txt) handleUserAnswer(txt, true);
      else toast.error("Could not understand. Please try again.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const restart = () => {
    stopSpeech();
    speechPendingRef.current = 0;
    setSpeaking(false);
    setMessages([]);
    setAnswers({});
    setFeeds([]);
    setPlace(null);
    setLang("en");
    setStep("language");
    bot(t("chooseLanguage", "en"), undefined, "en");
  };

  const micDisabled = busy || transcribing || speaking || ["locating", "optimizing", "done"].includes(step);
  const showVoiceBar = !["locating", "done"].includes(step);

  const fmt = (n: number, d = 0) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });

  const RequirementTable = ({ req }: { req: RequirementBreakdown }) => (
    <div className="mt-2 overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1 pr-2"></th>
            <th className="text-right py-1 px-2">{t("maintenance", lang)}</th>
            <th className="text-right py-1 px-2">{t("milkProd", lang)}</th>
            <th className="text-right py-1 pl-2 font-bold">{t("total", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {([
            ["TDN (g)", req.maintenance.tdn, req.production.tdn, req.total.tdn, 0],
            ["CP (g)", req.maintenance.cp, req.production.cp, req.total.cp, 0],
            ["Ca (g)", req.maintenance.ca, req.production.ca, req.total.ca, 1],
            ["P (g)", req.maintenance.p, req.production.p, req.total.p, 1],
          ] as [string, number, number, number, number][]).map(([label, m, p, tot, d]) => (
            <tr key={label} className="border-b border-border/50">
              <td className="py-1 pr-2 font-medium">{label}</td>
              <td className="text-right py-1 px-2">{fmt(m, d)}</td>
              <td className="text-right py-1 px-2">{p > 0 ? fmt(p, d) : "—"}</td>
              <td className="text-right py-1 pl-2 font-bold">{fmt(tot, d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const PlanCard = ({ plan }: { plan: NonNullable<Msg["plan"]> }) => {
    const r = plan.result;
    const savings = r.currentCost - r.totalCost;
    return (
      <div className="mt-2">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1 pr-2">{t("colFeed", lang)}</th>
              <th className="text-right py-1 px-2">{t("colQty", lang)}</th>
              <th className="text-right py-1 pl-2">{t("colCost", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {r.lines.map((l) => (
              <tr key={l.feed.id} className="border-b border-border/50">
                <td className="py-1 pr-2">
                  {l.feed.name}
                  {l.suggested && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                      {t("newTag", lang)}
                    </span>
                  )}
                </td>
                <td className="text-right py-1 px-2">{l.qty < 0.25 ? `${fmt(l.qty * 1000)} g` : fmt(l.qty, 1)}</td>
                <td className="text-right py-1 pl-2">₹{fmt(l.cost, 1)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-1 pr-2">{t("total", lang)}</td>
              <td></td>
              <td className="text-right py-1 pl-2">₹{fmt(r.totalCost, 1)}</td>
            </tr>
          </tbody>
        </table>
        {r.currentCost > 0 && savings > 1 && (
          <div className="mt-2 text-xs text-primary font-semibold">
            {t("savingsLbl", lang, { x: fmt(savings, 0), m: fmt(savings * 30, 0) })}
          </div>
        )}
        <div className="mt-2 text-[11px] text-muted-foreground">
          {t("needLbl", lang)}: TDN {fmt(r.requirement.tdn)}g · CP {fmt(r.requirement.cp)}g · Ca {fmt(r.requirement.ca, 1)}g · P {fmt(r.requirement.p, 1)}g
          <br />
          {t("givesLbl", lang)}: TDN {fmt(r.supply.tdn)}g · CP {fmt(r.supply.cp)}g · Ca {fmt(r.supply.ca, 1)}g · P {fmt(r.supply.p, 1)}g
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-muted overflow-hidden">
      <div className="bg-header text-header-foreground px-3 py-2.5 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate("/")} className="p-1.5 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center">
          <Wheat className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium leading-tight">{t("title", lang)}</div>
          {place && <div className="text-xs opacity-75 truncate">📍 {place.label}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {step === "language" && (
          <div className="text-center text-sm text-muted-foreground py-2">
            {t("chooseLanguage", "en")} · अपनी भाषा चुनें
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card rounded-bl-md"
              }`}
            >
              {m.text}
              {m.requirement && <RequirementTable req={m.requirement} />}
              {m.plan && <PlanCard plan={m.plan} />}
            </div>
          </div>
        ))}
        {transcribing && (
          <div className="flex justify-end">
            <div className="bg-primary/15 text-primary text-xs px-3 py-1.5 rounded-full">
              {t("transcribing", lang)}
            </div>
          </div>
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-card rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0">
        {showVoiceBar && (
          <div className="px-3 pb-6 pt-2 flex flex-col items-center gap-3">
            {speaking && !transcribing && (
              <p className="text-xs text-muted-foreground text-center">{t("speakingQuestion", lang)}</p>
            )}
            {!speaking && !transcribing && !micDisabled && (
              <p className="text-sm text-primary font-medium text-center">{t("orSpeak", lang)}</p>
            )}
            {transcribing && (
              <p className="text-sm text-primary text-center">{t("transcribing", lang)}</p>
            )}
            <VoiceRecorder
              speechLang={lang}
              onTranscript={handleTranscript}
              onRecorded={handleVoice}
              disabled={micDisabled}
              large
            />
          </div>
        )}
        {step === "done" && (
          <div className="px-3 pb-6 flex justify-center">
            <button
              type="button"
              onClick={restart}
              className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm"
            >
              {t("restartBtn", lang)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RationAdvisor;
