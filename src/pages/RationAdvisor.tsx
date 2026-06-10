import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Plus, Search, Trash2, Volume2, Wheat, X } from "lucide-react";
import { LANG_NAMES } from "@/lib/languages";
import { speakText, stopSpeech } from "@/lib/speech";
import { t } from "@/lib/rationI18n";
import { FEED_BY_ID, FeedItem, searchFeeds } from "@/lib/feedLibrary";
import {
  AnimalProfile,
  RequirementBreakdown,
  Species,
  computeRequirement,
} from "@/lib/nutrientRequirements";
import { RationFeedInput, RationResult, optimizeRation } from "@/lib/rationOptimizer";
import { detectLocation, mineralMixtureIdForLocation } from "@/lib/location";

// ----------------------------------------------------------------------------
// Conversation model
// ----------------------------------------------------------------------------

type Step =
  | "language"
  | "locating"
  | "locationConfirm"
  | "locationManual"
  | "species"
  | "herd"
  | "weight"
  | "calvings"
  | "milking"
  | "months"
  | "yield"
  | "fat"
  | "snf"
  | "price"
  | "pregnant"
  | "pregMonth"
  | "photo"
  | "feeds"
  | "done";

interface Msg {
  id: string;
  role: "bot" | "user";
  text?: string;
  image?: string;
  requirement?: RequirementBreakdown;
  plan?: { result: RationResult; title: string; better?: boolean };
}

interface Answers {
  species: Species;
  herd: number;
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
  qty: number;
  price: number;
}

const uid = () => Math.random().toString(36).slice(2);

// Widely available market feeds offered to the optimizer for the "even
// cheaper" plan (district feed library approximation).
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
  const [input, setInput] = useState("");
  const [place, setPlace] = useState<{ district: string; state: string; label: string } | null>(null);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [feeds, setFeeds] = useState<FarmerFeed[]>([]);
  const [feedSearch, setFeedSearch] = useState("");
  const [pendingFeed, setPendingFeed] = useState<FeedItem | null>(null);
  const [pendingQty, setPendingQty] = useState("");
  const [pendingPrice, setPendingPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, step, feeds, pendingFeed]);

  useEffect(() => () => stopSpeech(), []);

  const bot = (text: string, extra?: Partial<Msg>) =>
    setMessages((m) => [...m, { id: uid(), role: "bot", text, ...extra }]);
  const user = (text: string, extra?: Partial<Msg>) =>
    setMessages((m) => [...m, { id: uid(), role: "user", text, ...extra }]);

  // ------------------------------------------------------------------
  // Flow
  // ------------------------------------------------------------------

  const startLocation = async (chosenLang: string) => {
    setStep("locating");
    bot(t("intro", chosenLang));
    bot(t("detectingLocation", chosenLang));
    const loc = await detectLocation();
    if (loc) {
      setPlace(loc);
      bot(t("locationConfirm", chosenLang, { place: loc.label }));
      setStep("locationConfirm");
    } else {
      bot(t("locationManual", chosenLang));
      setStep("locationManual");
    }
  };

  const chooseLanguage = (code: string) => {
    setLang(code);
    user(LANG_NAMES[code]);
    void startLocation(code);
  };

  const confirmLocation = (ok: boolean) => {
    user(ok ? t("yes", lang) : t("no", lang));
    if (ok && place) {
      bot(t("locationSet", lang, { place: place.label }));
      askSpecies();
    } else {
      setPlace(null);
      bot(t("locationManual", lang));
      setStep("locationManual");
    }
  };

  const submitManualLocation = (text: string) => {
    user(text);
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

  const chooseSpecies = (s: Species) => {
    setAnswers((a) => ({ ...a, species: s }));
    user(s === "cattle" ? t("cow", lang) : t("buffalo", lang));
    bot(t("askHerd", lang));
    setStep("herd");
  };

  const submitNumber = (raw: string) => {
    const v = parseFloat(raw.replace(/[^\d.]/g, ""));
    switch (step) {
      case "herd": {
        if (!valid(v, 1, 500, "3")) return;
        setAnswers((a) => ({ ...a, herd: v }));
        user(String(v));
        if (v > 1) bot(t("herdNote", lang));
        bot(t("askWeight", lang));
        bot(t("weightHint", lang));
        setStep("weight");
        break;
      }
      case "weight": {
        if (!valid(v, 50, 1000, "400")) return;
        setAnswers((a) => ({ ...a, weight: v }));
        user(`${v} kg`);
        bot(t("askCalvings", lang));
        setStep("calvings");
        break;
      }
      case "months": {
        if (!valid(v, 0, 24, "8")) return;
        setAnswers((a) => ({ ...a, months: v }));
        user(String(v));
        bot(t("askYield", lang));
        setStep("yield");
        break;
      }
      case "yield": {
        if (!valid(v, 0.5, 60, "10")) return;
        setAnswers((a) => ({ ...a, yield: v }));
        user(`${v} L`);
        bot(t("askFat", lang));
        setStep("fat");
        break;
      }
      case "fat": {
        const min = answers.species === "buffalo" ? 5 : 3;
        const max = answers.species === "buffalo" ? 14 : 6;
        if (!valid(v, min, max, answers.species === "buffalo" ? "7" : "4")) return;
        setFat(v);
        break;
      }
      case "snf": {
        if (!valid(v, 6, 12, "8.5")) return;
        setAnswers((a) => ({ ...a, snf: v }));
        user(`${v} %`);
        askPrice();
        break;
      }
      case "price": {
        if (!valid(v, 10, 150, "34")) return;
        setAnswers((a) => ({ ...a, price: v }));
        user(`₹${v}`);
        askPregnant();
        break;
      }
    }
    setInput("");
  };

  const valid = (v: number, min: number, max: number, example: string): boolean => {
    if (Number.isFinite(v) && v >= min && v <= max) return true;
    bot(t("invalidNumber", lang, { x: example }));
    return false;
  };

  const chooseCalvings = (n: number) => {
    setAnswers((a) => ({ ...a, calvings: n }));
    user(n === 0 ? t("notCalved", lang) : String(n));
    if (n === 0) {
      // Heifer — no milk questions
      setAnswers((a) => ({ ...a, calvings: 0, inMilk: false, months: 0, yield: 0, fat: 0, price: 30 }));
      askPregnant();
    } else {
      bot(t("askMilking", lang));
      setStep("milking");
    }
  };

  const chooseMilking = (milking: boolean) => {
    user(milking ? t("inMilk", lang) : t("dryAnimal", lang));
    if (milking) {
      setAnswers((a) => ({ ...a, inMilk: true }));
      bot(t("askMonths", lang));
      setStep("months");
    } else {
      setAnswers((a) => ({ ...a, inMilk: false, months: 0, yield: 0, fat: 0, price: 30 }));
      askPregnant();
    }
  };

  const setFat = (v: number) => {
    setAnswers((a) => ({ ...a, fat: v }));
    user(`${v} %`);
    bot(t("askSnf", lang));
    setStep("snf");
  };

  const skipSnf = () => {
    user(t("skip", lang));
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

  const choosePregnant = (preg: boolean) => {
    setAnswers((a) => ({ ...a, pregnant: preg }));
    user(preg ? t("yes", lang) : t("no", lang));
    if (preg) {
      bot(t("askPregMonth", lang));
      setStep("pregMonth");
    } else {
      setAnswers((a) => ({ ...a, pregnant: false, pregMonth: 0 }));
      askPhoto();
    }
  };

  const choosePregMonth = (m: number) => {
    setAnswers((a) => ({ ...a, pregMonth: m }));
    user(String(m));
    askPhoto();
  };

  const askPhoto = () => {
    bot(t("askPhoto", lang));
    setStep("photo");
  };

  const onPhoto = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      user("📷", { image: String(reader.result) });
      showRequirement();
    };
    reader.readAsDataURL(file);
  };

  const skipPhoto = () => {
    user(t("skip", lang));
    showRequirement();
  };

  const buildProfile = (a: Partial<Answers>): AnimalProfile => ({
    species: a.species || "cattle",
    weight: a.weight || 400,
    adult: (a.calvings ?? 0) >= 1,
    pregnant: !!a.pregnant,
    pregnancyMonth: a.pregMonth || 0,
    inMilk: !!a.inMilk,
    milkYield: a.yield || 0,
    milkFat: a.fat || (a.species === "buffalo" ? 7 : 4),
    monthsAfterCalving: a.months || 0,
    milkPrice: a.price || 30,
  });

  const showRequirement = () => {
    const profile = buildProfile(answers);
    const req = computeRequirement(profile);
    bot(t("reqIntro", lang), { requirement: req });
    bot(t("nutrientNote", lang));
    bot(t("askFeeds", lang));
    setStep("feeds");
  };

  // ------------------------------------------------------------------
  // Feeds & optimization
  // ------------------------------------------------------------------

  const addFeed = () => {
    if (!pendingFeed) return;
    const qty = parseFloat(pendingQty);
    const price = parseFloat(pendingPrice);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const finalPrice = Number.isFinite(price) && price > 0 ? price : pendingFeed.rate;
    setFeeds((f) => [
      ...f.filter((x) => x.feed.id !== pendingFeed.id),
      { feed: pendingFeed, qty, price: finalPrice },
    ]);
    setPendingFeed(null);
    setPendingQty("");
    setPendingPrice("");
    setFeedSearch("");
  };

  const makePlan = () => {
    if (feeds.length === 0) {
      bot(t("needOneFeed", lang));
      return;
    }
    setBusy(true);
    user(t("makePlan", lang));
    user(
      feeds.map((f) => `${f.feed.name}: ${f.qty} kg @ ₹${f.price}`).join("\n")
    );
    bot(t("optimizing", lang));

    // Defer so the UI paints before the solver runs
    setTimeout(() => {
      try {
        const profile = buildProfile(answers);
        const req = computeRequirement(profile);
        const mineralId = mineralMixtureIdForLocation(place?.district || "", place?.state || "");
        const mineral = FEED_BY_ID[mineralId] || FEED_BY_ID["mineral_mixture_bis"];

        // Plan A: optimize the farmer's own feeds (+/-25%), mineral forced in
        const inputsA: RationFeedInput[] = feeds.map((f) => ({
          feed: f.feed,
          currentQty: f.qty,
          price: f.price,
        }));
        if (!inputsA.some((i) => i.feed.category === "mineral")) {
          inputsA.push({ feed: mineral, currentQty: 0, price: mineral.rate, suggested: true });
        }
        const planA = optimizeRation(inputsA, profile, req);

        // Plan B: same feeds (free quantities) + locally available market feeds
        const marketIds = new Set(MARKET_FEED_IDS);
        feeds.forEach((f) => marketIds.delete(f.feed.id));
        const inputsB: RationFeedInput[] = [
          ...feeds.map((f) => ({ feed: f.feed, currentQty: 0, price: f.price })),
          ...[...marketIds]
            .map((id) => FEED_BY_ID[id])
            .filter(Boolean)
            .map((feed) => ({ feed, currentQty: 0, price: feed.rate, suggested: true })),
        ];
        if (!inputsB.some((i) => i.feed.category === "mineral")) {
          inputsB.push({ feed: mineral, currentQty: 0, price: mineral.rate, suggested: true });
        }
        const currentCost = feeds.reduce((acc, f) => acc + f.qty * f.price, 0);
        const planB = optimizeRation(inputsB, profile, req);
        planB.currentCost = Math.round(currentCost * 100) / 100;

        if (planA.feasible) {
          if (planA.relaxed.length > 0) bot(t("notMetWarn", lang));
          bot(t("planTitle", lang), { plan: { result: planA, title: t("planTitle", lang) } });
        } else {
          bot(t("infeasible", lang));
        }
        if (planB.feasible && (!planA.feasible || planB.totalCost < planA.totalCost - 1)) {
          bot(t("planBetter", lang), { plan: { result: planB, title: t("planBetter", lang), better: true } });
        }
        bot(t("mineralNote", lang));
        bot(t("disclaimer", lang));
        setStep("done");
      } finally {
        setBusy(false);
      }
    }, 80);
  };

  const restart = () => {
    stopSpeech();
    setMessages([]);
    setAnswers({});
    setFeeds([]);
    setPendingFeed(null);
    setStep("species");
    bot(t("askSpecies", lang));
  };

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  const Chip = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={busy}
      className="px-4 py-2 rounded-full border border-primary/40 bg-card text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition shadow-sm"
    >
      {label}
    </button>
  );

  const renderChips = () => {
    switch (step) {
      case "language":
        return Object.entries(LANG_NAMES).map(([code, name]) => (
          <Chip key={code} label={name} onClick={() => chooseLanguage(code)} />
        ));
      case "locationConfirm":
        return (
          <>
            <Chip label={t("yes", lang)} onClick={() => confirmLocation(true)} />
            <Chip label={t("no", lang)} onClick={() => confirmLocation(false)} />
          </>
        );
      case "species":
        return (
          <>
            <Chip label={t("cow", lang)} onClick={() => chooseSpecies("cattle")} />
            <Chip label={t("buffalo", lang)} onClick={() => chooseSpecies("buffalo")} />
          </>
        );
      case "herd":
        return [1, 2, 3, 5, 10].map((n) => (
          <Chip key={n} label={String(n)} onClick={() => submitNumber(String(n))} />
        ));
      case "weight": {
        const opts = answers.species === "buffalo" ? [350, 400, 450, 500, 550] : [300, 350, 400, 450, 500];
        return opts.map((n) => <Chip key={n} label={`${n} kg`} onClick={() => submitNumber(String(n))} />);
      }
      case "calvings":
        return (
          <>
            <Chip label={t("notCalved", lang)} onClick={() => chooseCalvings(0)} />
            {[1, 2, 3, 4, 5].map((n) => (
              <Chip key={n} label={String(n)} onClick={() => chooseCalvings(n)} />
            ))}
          </>
        );
      case "milking":
        return (
          <>
            <Chip label={t("inMilk", lang)} onClick={() => chooseMilking(true)} />
            <Chip label={t("dryAnimal", lang)} onClick={() => chooseMilking(false)} />
          </>
        );
      case "months":
        return [1, 2, 3, 4, 6, 8, 10, 12].map((n) => (
          <Chip key={n} label={String(n)} onClick={() => submitNumber(String(n))} />
        ));
      case "yield":
        return [4, 6, 8, 10, 12, 15, 20].map((n) => (
          <Chip key={n} label={`${n} L`} onClick={() => submitNumber(String(n))} />
        ));
      case "fat": {
        const opts = answers.species === "buffalo" ? [6, 6.5, 7, 7.5, 8] : [3.5, 4, 4.5, 5];
        return (
          <>
            {opts.map((n) => (
              <Chip key={n} label={`${n}%`} onClick={() => submitNumber(String(n))} />
            ))}
            <Chip
              label={t("dontKnow", lang)}
              onClick={() => submitNumber(answers.species === "buffalo" ? "7" : "4")}
            />
          </>
        );
      }
      case "snf":
        return (
          <>
            {[8, 8.5, 9].map((n) => (
              <Chip key={n} label={`${n}%`} onClick={() => submitNumber(String(n))} />
            ))}
            <Chip label={t("skip", lang)} onClick={skipSnf} />
          </>
        );
      case "price":
        return [25, 30, 34, 40, 50].map((n) => (
          <Chip key={n} label={`₹${n}`} onClick={() => submitNumber(String(n))} />
        ));
      case "pregnant":
        return (
          <>
            <Chip label={t("yes", lang)} onClick={() => choosePregnant(true)} />
            <Chip label={t("no", lang)} onClick={() => choosePregnant(false)} />
          </>
        );
      case "pregMonth":
        return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Chip key={n} label={String(n)} onClick={() => choosePregMonth(n)} />
        ));
      case "photo":
        return (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <Camera className="w-4 h-4" /> {t("uploadPhoto", lang)}
            </button>
            <Chip label={t("skip", lang)} onClick={skipPhoto} />
          </>
        );
      case "done":
        return <Chip label={t("restartBtn", lang)} onClick={restart} />;
      default:
        return null;
    }
  };

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
        {r.currentCost > 0 && (
          <div className="mt-2 text-xs space-y-0.5">
            <div>
              {t("currentCostLbl", lang)}: <b>₹{fmt(r.currentCost, 1)}</b> · {t("planCostLbl", lang)}: <b>₹{fmt(r.totalCost, 1)}</b>
            </div>
            {savings > 1 && (
              <div className="text-primary font-semibold">
                {t("savingsLbl", lang, { x: fmt(savings, 0), m: fmt(savings * 30, 0) })}
              </div>
            )}
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

  const grouped = (cat: "roughage" | "concentrate" | "mineral") =>
    searchFeeds(feedSearch, cat).slice(0, feedSearch ? 12 : 6);

  // Rendered via function call (not as a component) so React does not remount
  // it on every parent render — keeps the search/qty inputs focused.
  const renderFeedPicker = () => (
    <div className="mx-3 mb-2 rounded-2xl border bg-card shadow-sm p-3 space-y-2">
      <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={feedSearch}
          onChange={(e) => setFeedSearch(e.target.value)}
          placeholder={t("searchFeed", lang)}
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
        />
      </div>

      {pendingFeed ? (
        <div className="rounded-xl border border-primary/40 p-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">{pendingFeed.name}</div>
            <button onClick={() => setPendingFeed(null)} className="text-muted-foreground p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 text-xs">
              {t("qtyLabel", lang)}
              <input
                autoFocus
                inputMode="decimal"
                value={pendingQty}
                onChange={(e) => setPendingQty(e.target.value)}
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background"
                placeholder="5"
              />
            </label>
            <label className="flex-1 text-xs">
              {t("priceLabel", lang)}
              <input
                inputMode="decimal"
                value={pendingPrice}
                onChange={(e) => setPendingPrice(e.target.value)}
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background"
                placeholder={String(pendingFeed.rate)}
              />
            </label>
          </div>
          <button
            onClick={addFeed}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> {t("addBtn", lang)}
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {(["roughage", "concentrate", "mineral"] as const).map((cat) => {
            const items = grouped(cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  {t(cat === "roughage" ? "groupRoughage" : cat === "concentrate" ? "groupConcentrate" : "groupMineral", lang)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setPendingFeed(f);
                        setPendingPrice(String(f.rate));
                      }}
                      className="px-2.5 py-1 rounded-full border text-xs hover:bg-primary/10 hover:border-primary/50 transition"
                    >
                      {f.name} <span className="text-muted-foreground">₹{f.rate}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {feeds.length > 0 && (
        <div className="pt-1 border-t">
          <div className="text-[11px] font-semibold text-muted-foreground mb-1">{t("yourFeeds", lang)}</div>
          <div className="space-y-1">
            {feeds.map((f) => (
              <div key={f.feed.id} className="flex items-center justify-between text-xs bg-muted/60 rounded-lg px-2 py-1.5">
                <span className="font-medium truncate">{f.feed.name}</span>
                <span className="shrink-0 ml-2 text-muted-foreground">
                  {f.qty} kg · ₹{f.price}/kg
                  <button
                    onClick={() => setFeeds((x) => x.filter((y) => y.feed.id !== f.feed.id))}
                    className="ml-2 text-destructive align-middle"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline" />
                  </button>
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={makePlan}
            disabled={busy}
            className="mt-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-60"
          >
            {t("makePlan", lang)}
          </button>
        </div>
      )}
    </div>
  );

  const showTextInput =
    ["herd", "weight", "months", "yield", "fat", "snf", "price"].includes(step) ||
    step === "locationManual";

  return (
    <div className="h-full w-full flex flex-col bg-muted overflow-hidden">
      {/* Header */}
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

      {/* Messages */}
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
              {m.image && <img src={m.image} alt="" className="rounded-xl mb-1 max-h-56 object-cover" />}
              {m.text}
              {m.requirement && <RequirementTable req={m.requirement} />}
              {m.plan && <PlanCard plan={m.plan} />}
              {m.role === "bot" && m.text && (
                <button
                  onClick={() => void speakText(m.text || "", { lang })}
                  className="ml-2 inline-flex align-middle text-muted-foreground hover:text-primary"
                  title="Listen"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
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

      {/* Quick reply chips */}
      <div className="shrink-0">
        <div className="flex flex-wrap gap-2 px-3 pb-2 justify-center">{renderChips()}</div>

        {step === "feeds" && renderFeedPicker()}

        {showTextInput && (
          <div className="px-3 pb-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim()) return;
                if (step === "locationManual") {
                  submitManualLocation(input.trim());
                  setInput("");
                } else {
                  submitNumber(input.trim());
                }
              }}
              className="flex items-center gap-2 bg-card rounded-full px-4 py-2 shadow-sm"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                inputMode={step === "locationManual" ? "text" : "decimal"}
                placeholder={t("typeAnswer", lang)}
                className="flex-1 bg-transparent outline-none text-sm min-w-0"
              />
              <button type="submit" className="text-primary font-semibold text-sm shrink-0">
                ➤
              </button>
            </form>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0] || null)}
      />
    </div>
  );
};

export default RationAdvisor;
