import { useCallback, useState } from "react";
import { ArrowLeft, MessageSquare, PhoneCall, Wheat } from "lucide-react";
import { toast } from "sonner";
import { LANG_NAMES } from "@/lib/languages";
import {
  RATION_ADVISORY_INTRO,
  saveRationAdvisoryLang,
} from "@/lib/ration-advisory-welcome";
import { matchLangCode } from "@/lib/rationVoice";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { isBackendConfigured } from "@/lib/backend-config";
import { transcribeAudio } from "@/lib/transcribe-api";
import { filterAbusiveLanguage } from "@/lib/content-safety";
import type { PoshanLang } from "@/lib/poshan-conversation";

interface Props {
  open: boolean;
  onClose: () => void;
  onStartChat: (lang: PoshanLang) => void;
  onStartCall: (lang: PoshanLang) => void;
}

export function RationAdvisoryView({ open, onClose, onStartChat, onStartCall }: Props) {
  const [lang, setLang] = useState<PoshanLang | null>(null);
  const [transcribingLang, setTranscribingLang] = useState(false);

  const pickLang = useCallback((code: PoshanLang) => {
    setLang(code);
    saveRationAdvisoryLang(code);
  }, []);

  const handleWelcomeVoice = async (b64: string, mime: string) => {
    if (!isBackendConfigured()) {
      toast.error("Backend is not configured.");
      return;
    }
    setTranscribingLang(true);
    try {
      const data = await transcribeAudio(b64, mime);
      const txt = filterAbusiveLanguage(data.transcript || "");
      if (!txt) {
        toast.error("Could not hear — tap a language or try again");
        return;
      }
      const code = matchLangCode(txt) || data.language;
      if (code === "en") pickLang("en");
      else if (code) pickLang("hi");
      else toast.error("Say Hindi or English, or tap below");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setTranscribingLang(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
      <header className="bg-emerald-800 text-white px-3 py-2.5 flex items-center gap-3 shadow shrink-0">
        <button type="button" onClick={onClose} className="p-1" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
          <Wheat className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">पशु पोषण / Ration Advisory</div>
          <div className="text-xs opacity-80">
            {lang ? LANG_NAMES[lang] : "भाषा / Language"}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto chat-bg px-3 py-4">
        <div className="max-w-lg mx-auto w-full space-y-4">
          <div className="rounded-lg bg-bubble-in px-3 py-3 shadow-sm">
            <div className="whitespace-pre-wrap text-sm leading-relaxed mb-3">{RATION_ADVISORY_INTRO}</div>
            <div className="flex gap-2 mb-3">
              {(["hi", "en"] as PoshanLang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => pickLang(code)}
                  className={`flex-1 text-sm px-3 py-2.5 rounded-xl border font-medium transition-colors ${
                    lang === code
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background/80 border-border hover:border-primary"
                  }`}
                >
                  {code === "hi" ? "हिन्दी" : "English"}
                </button>
              ))}
            </div>
            {!lang && (
              <div className="flex flex-col items-center gap-2 border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground text-center">
                  बोलकर भाषा चुनें / Or speak Hindi or English
                </p>
                <VoiceRecorder onRecorded={handleWelcomeVoice} disabled={transcribingLang} large />
                {transcribingLang && (
                  <p className="text-xs text-primary">Listening… / सुन रहे हैं…</p>
                )}
              </div>
            )}
          </div>

          {lang && (
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground px-2">
                {lang === "en"
                  ? "How would you like to continue?"
                  : "Aage kaise baat karna chahenge?"}
              </p>
              <button
                type="button"
                onClick={() => { onStartChat(lang); onClose(); }}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-5 h-5" />
                {lang === "en" ? "Chat (text & voice note)" : "चैट — लिखें या बोलें"}
              </button>
              <button
                type="button"
                onClick={() => { onStartCall(lang); onClose(); }}
                className="w-full py-3.5 rounded-xl border border-border bg-card font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-muted"
              >
                <PhoneCall className="w-5 h-5 text-primary" />
                {lang === "en" ? "Live voice call" : "लाइव आवाज़ कॉल"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
