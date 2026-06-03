import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { HerdAnimalBlock } from "@/components/HerdAnimalBlock";
import { ArrowLeft, Volume2, Pause, Play, Square, Wheat, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { LANG_NAMES, prepareTextForSpeech } from "@/lib/languages";
import {
  RATION_ADVISORY_INTRO,
  LANG_ORDER,
  getWelcomeForLang,
  loadRationAdvisoryLang,
  saveRationAdvisoryLang,
} from "@/lib/ration-advisory-welcome";
import { speakText, stopSpeech, pauseSpeech, resumeSpeech, isSpeechPaused, unlockAudioPlayback } from "@/lib/speech";
import { filterAbusiveLanguage } from "@/lib/content-safety";
import { parseAnimalFromVoice, parseHerdCount, applyStatusMilkDefaults } from "@/lib/parse-animal-voice";
import { computeHerdRation } from "@/lib/herd-ration-compute";
import {
  type RationAdvisorySession,
  type AnimalFormData,
  loadSession,
  saveSession,
  clearSessionStorage,
  createAnimals,
  allAnimalsFilled,
  isAnimalFilled,
} from "@/lib/ration-advisory-session";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RationAdvisoryView({ open, onClose }: Props) {
  const [session, setSession] = useState<RationAdvisorySession>(loadSession);
  const [welcomeLang, setWelcomeLang] = useState<string | null>(loadRationAdvisoryLang());
  const [welcomeSpeaking, setWelcomeSpeaking] = useState(false);
  const [welcomePaused, setWelcomePaused] = useState(false);
  const [herdCountInput, setHerdCountInput] = useState("");
  const [transcribingBlock, setTranscribingBlock] = useState<number | null>(null);
  const [transcribingCount, setTranscribingCount] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const persist = useCallback((next: RationAdvisorySession) => {
    setSession(next);
    saveSession(next);
  }, []);

  useEffect(() => {
    if (!open) return;
    let s = loadSession();
    const lang = loadRationAdvisoryLang();
    if (s.step === "welcome" && lang) {
      s = { ...s, step: "herd_count" };
      saveSession(s);
    }
    setSession(s);
    setWelcomeLang(lang);
    if (s.herdCount) setHerdCountInput(String(s.herdCount));
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.step, session.animals, open]);

  const stopSpeak = useCallback(() => {
    stopSpeech();
    setWelcomeSpeaking(false);
    setWelcomePaused(false);
  }, []);

  const speakWelcome = useCallback(async (text: string, lang: string) => {
    stopSpeak();
    setWelcomeSpeaking(true);
    setWelcomePaused(false);
    try {
      await unlockAudioPlayback();
      await speakText(prepareTextForSpeech(text), { lang, priority: true, forceLang: true });
    } catch {
      /* gesture unlock */
    } finally {
      setWelcomeSpeaking(false);
      setWelcomePaused(false);
    }
  }, [stopSpeak]);

  const toggleWelcomePause = useCallback(() => {
    if (welcomePaused || isSpeechPaused()) {
      if (resumeSpeech()) setWelcomePaused(false);
    } else if (pauseSpeech()) {
      setWelcomePaused(true);
    }
  }, [welcomePaused]);

  const pickWelcomeLang = (code: string) => {
    setWelcomeLang(code);
    saveRationAdvisoryLang(code);
    void speakWelcome(getWelcomeForLang(code), code);
    persist({ ...session, step: "herd_count" });
  };

  const startHerdProfile = (count: number) => {
    if (count < 1 || count > 50) {
      toast.error("Enter 1–50 animals");
      return;
    }
    persist({
      step: "animals",
      herdCount: count,
      animals: createAnimals(count),
      ration: null,
    });
  };

  const confirmHerdCount = () => {
    const n = parseInt(herdCountInput, 10);
    if (n >= 1 && n <= 50) startHerdProfile(n);
    else toast.error("Enter a number between 1 and 50");
  };

  const handleCountVoice = async (b64: string, mime: string) => {
    if (!supabase) return;
    setTranscribingCount(true);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe", {
        body: { audioBase64: b64, mimeType: mime },
      });
      if (error) throw error;
      const txt = filterAbusiveLanguage((data as { transcript?: string })?.transcript || "");
      const n = parseHerdCount(txt);
      if (n) {
        setHerdCountInput(String(n));
        startHerdProfile(n);
      } else toast.error("Could not hear a number — try again or type it");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setTranscribingCount(false);
    }
  };

  const updateAnimal = (index: number, patch: Partial<AnimalFormData>) => {
    const animals = session.animals.map((a) => {
      if (a.index !== index) return a;
      const merged = { ...a, ...patch, approved: false };
      if (patch.status !== undefined) {
        merged.milkLitres = applyStatusMilkDefaults(merged.status, merged.milkLitres);
      }
      return merged;
    });
    persist({ ...session, animals, ration: null });
  };

  const handleBlockVoice = async (index: number, b64: string, mime: string) => {
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }
    setTranscribingBlock(index);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe", {
        body: { audioBase64: b64, mimeType: mime },
      });
      if (error) throw error;
      const txt = filterAbusiveLanguage((data as { transcript?: string })?.transcript || "");
      if (!txt) {
        toast.error("Could not transcribe — try again");
        return;
      }
      const parsed = parseAnimalFromVoice(txt);
      updateAnimal(index, {
        ...parsed,
        milkLitres: parsed.status
          ? applyStatusMilkDefaults(parsed.status, parsed.milkLitres ?? "")
          : parsed.milkLitres,
      });
      toast.message(`Animal #${index} details updated — please check`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setTranscribingBlock(null);
    }
  };

  const goToReview = () => {
    if (!allAnimalsFilled(session.animals)) {
      toast.error("Fill all animal blocks first (use mic or type)");
      return;
    }
    persist({ ...session, step: "review" });
  };

  const confirmAndCompute = () => {
    const animals = session.animals.map((a) => ({ ...a, approved: true }));
    const ration = computeHerdRation(animals);
    persist({ ...session, animals, step: "ration", ration });
  };

  const clearSession = () => {
    stopSpeak();
    clearSessionStorage();
    saveRationAdvisoryLang(null);
    setWelcomeLang(null);
    setHerdCountInput("");
    setSession({ step: "welcome", herdCount: null, animals: [], ration: null });
    toast.message("Ration advisory reset");
  };

  if (!open) return null;

  const step = session.step;
  const filledCount = session.animals.filter(isAnimalFilled).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
      <header className="bg-emerald-800 text-white px-3 py-2.5 flex items-center gap-3 shadow shrink-0">
        <button onClick={() => { stopSpeak(); onClose(); }} className="p-1" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
          <Wheat className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">Ration Advisory</div>
          <div className="text-xs opacity-80">Balanced feed plan for your herd</div>
        </div>
        <button onClick={clearSession} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20" title="Start over">
          Reset
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto chat-bg px-3 py-4 space-y-4">
        {/* Welcome + language */}
        {(step === "welcome" || step === "herd_count") && (
          <div className="rounded-lg bg-bubble-in text-bubble-in-foreground px-3 py-3 shadow-sm">
            <div className="whitespace-pre-wrap text-sm leading-relaxed mb-3">{RATION_ADVISORY_INTRO}</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {LANG_ORDER.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => pickWelcomeLang(code)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                    welcomeLang === code
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background/80 border-border hover:border-primary"
                  }`}
                >
                  {LANG_NAMES[code] || code}
                </button>
              ))}
            </div>
            {welcomeLang && (
              <div lang={welcomeLang} className="border-t border-border/50 pt-3 text-sm leading-relaxed whitespace-pre-wrap">
                {getWelcomeForLang(welcomeLang)}
                <div className="mt-2 flex items-center gap-2">
                  {welcomeSpeaking ? (
                    <>
                      <button type="button" onClick={toggleWelcomePause} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        {welcomePaused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
                      </button>
                      <button type="button" onClick={stopSpeak} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Square className="w-3.5 h-3.5" /> Stop
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => speakWelcome(getWelcomeForLang(welcomeLang), welcomeLang)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Volume2 className="w-3.5 h-3.5" /> Listen
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Herd count */}
        {(step === "herd_count" && welcomeLang) && (
          <div className="rounded-lg bg-card border shadow-sm p-4">
            <h2 className="font-medium text-sm mb-1">How many dairy animals in your herd?</h2>
            <p className="text-xs text-muted-foreground mb-3">Kitne pashu hain aapke paas? Type or speak the number.</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={herdCountInput}
                  onChange={(e) => setHerdCountInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmHerdCount()}
                  placeholder="e.g. 5"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={confirmHerdCount}
                className="px-4 py-2 rounded-md bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
              >
                Continue
              </button>
              {transcribingCount ? (
                <span className="text-xs text-muted-foreground animate-pulse py-2">…</span>
              ) : (
                <VoiceRecorder onRecorded={handleCountVoice} disabled={transcribingCount} />
              )}
            </div>
          </div>
        )}

        {/* Animal blocks — profile */}
        {step === "animals" && (
          <>
            <div className="rounded-lg bg-emerald-800/10 border border-emerald-800/20 px-3 py-2 text-sm">
              <strong>{session.herdCount} animals</strong> — tap the mic on each block and speak details for that animal.
              <span className="block text-xs text-muted-foreground mt-0.5">
                Filled: {filledCount}/{session.animals.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {session.animals.map((a) => (
                <HerdAnimalBlock
                  key={a.index}
                  data={a}
                  lang={welcomeLang}
                  onChange={(patch) => updateAnimal(a.index, patch)}
                  onVoice={(b64, mime) => handleBlockVoice(a.index, b64, mime)}
                  transcribing={transcribingBlock === a.index}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goToReview}
              disabled={!allAnimalsFilled(session.animals)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-700 text-white font-medium disabled:opacity-50 hover:bg-emerald-800"
            >
              Review &amp; approve details
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Review */}
        {step === "review" && (
          <>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm">
              Please check every animal below. If something is wrong, go back and edit. When all is correct, confirm to get your ration.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {session.animals.map((a) => (
                <HerdAnimalBlock key={a.index} data={a} lang={welcomeLang} onChange={() => {}} onVoice={() => {}} readOnly />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => persist({ ...session, step: "animals" })}
                className="flex-1 py-3 rounded-lg border border-border font-medium text-sm hover:bg-muted"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={confirmAndCompute}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800"
              >
                <Check className="w-4 h-4" /> Confirm &amp; get ration
              </button>
            </div>
          </>
        )}

        {/* Ration results */}
        {step === "ration" && session.ration && (
          <>
            <div className="rounded-lg bg-emerald-800 text-white p-4 shadow-md">
              <h2 className="font-semibold text-base mb-1">Whole herd — prepare today</h2>
              <p className="text-xs opacity-90 mb-3">Poori mandli ke liye aaj itna mix/tayyar karein (daily total):</p>
              <ul className="space-y-1.5 text-sm">
                {session.ration.herdTotals.map((t) => (
                  <li key={t.name} className="flex justify-between gap-3">
                    <span>{t.name}</span>
                    <span className="font-semibold tabular-nums">{t.kg} kg/day</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 pt-3 border-t border-white/20 text-sm font-medium">
                Total cost ≈ ₹{session.ration.totalDailyCost}/day (₹{(session.ration.totalDailyCost * 30).toLocaleString()}/month)
              </p>
              <p className="text-[11px] opacity-75 mt-2">Prices indicative — verify locally. Clean water 40–50 L/animal/day.</p>
            </div>

            <h3 className="text-sm font-medium px-1">Per animal — daily share from above</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {session.animals.map((a) => {
                const r = session.ration!.perAnimal.find((p) => p.index === a.index);
                return (
                  <HerdAnimalBlock
                    key={a.index}
                    data={a}
                    lang={welcomeLang}
                    onChange={() => {}}
                    onVoice={() => {}}
                    readOnly
                    showRation={r?.ration}
                    dailyCost={r?.dailyCost}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => persist({ ...session, step: "animals", ration: null })}
              className="w-full py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted"
            >
              Edit animals &amp; recalculate
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function RationAdvisoryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-white/10 rounded-full transition"
      title="Ration Advisory — detailed feed plan"
      aria-label="Open Ration Advisory"
    >
      <Wheat className="w-5 h-5" />
    </button>
  );
}
