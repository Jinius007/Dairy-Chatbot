import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { LANG_NAMES, detectLanguageCode } from "@/lib/languages";
import { speakText, stopSpeech } from "@/lib/speech";

export interface CallTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  language?: string | null;
  created_at: string;
  is_voice: true;
}

interface Props {
  open: boolean;
  onClose: (turns: CallTurn[]) => void;
  history?: { role: "user" | "assistant"; content: string }[];
}

type Phase = "idle" | "listening" | "thinking" | "speaking";

function splitLangHeader(text: unknown): { lang: string | null; body: string } {
  let source = typeof text === "string" ? text : "";
  let lang: string | null = null;
  // Match [[LANG:xx]], [LANG:xx], or bare LANG:xx — anywhere, case-insensitive.
  const re = /\[?\[?\s*LANG\s*:\s*([a-zA-Z]{2})\s*\]?\]?/i;
  const m = source.match(re);
  if (m) {
    lang = m[1].toLowerCase();
    const idx = m.index ?? 0;
    source = (source.slice(0, idx) + source.slice(idx + m[0].length)).replace(/^\s+/, "");
  }
  return { lang, body: source };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

function readTextPayload(data: unknown): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";
  const payload = data as Record<string, any>;
  if (typeof payload.text === "string") return payload.text;
  if (typeof payload.message === "string") return payload.message;
  const choiceText = payload.choices?.[0]?.message?.content;
  return typeof choiceText === "string" ? choiceText : "";
}

function getSupportedMimeType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
}

export function CallView({ open, onClose, history = [] }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lastUser, setLastUser] = useState("");
  const [lastReply, setLastReply] = useState("");
  const [lastLang, setLastLang] = useState<string | null>(null);

  const turnsRef = useRef<CallTurn[]>([]);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([...history]);
  const timerRef = useRef<number | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const closedRef = useRef(false);
  const processingRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const maxRecordTimerRef = useRef<number | null>(null);
  const speechTokenRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserFrameRef = useRef<number | null>(null);

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const stopSilenceMonitor = () => {
    if (analyserFrameRef.current) cancelAnimationFrame(analyserFrameRef.current);
    analyserFrameRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  };

  const speak = useCallback((text: string, lang: string | null) => {
    speechTokenRef.current += 1;
    return speakText(text, { lang, tokenRef: speechTokenRef });
  }, []);

  const scheduleListening = useCallback((delay = 250) => {
    if (closedRef.current) return;
    if (phaseRef.current === "speaking") {
      return;
    }
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      startListening();
    }, delay);
  }, []);

  // Process one recorded turn: transcribe -> chat -> speak -> start next
  const processBlob = async (blob: Blob, mime: string) => {
    if (!supabase || !isSupabaseConfigured) {
      toast.error("Supabase is not configured on this deployment.");
      scheduleListening(500);
      return;
    }
    if (closedRef.current || processingRef.current) return;
    processingRef.current = true;
    setPhaseBoth("thinking");
    try {
      const buf = await blob.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const { data: tData, error: tErr } = await supabase.functions.invoke("transcribe", {
        body: { audioBase64: b64, mimeType: mime },
      });
      if (tErr) throw tErr;
      const transcript = typeof (tData as any)?.transcript === "string" ? (tData as any).transcript.trim() : "";
      if (!transcript) {
        toast.message("Didn't catch that — please speak again.");
        scheduleListening(500);
        return;
      }
      const detectedLang = detectLanguageCode(transcript);
      setLastUser(transcript);
      turnsRef.current.push({
        id: crypto.randomUUID(), role: "user", content: transcript,
        language: detectedLang, is_voice: true, created_at: new Date().toISOString(),
      });
      historyRef.current.push({ role: "user", content: transcript });

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const chatRes = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ messages: historyRef.current, stream: false, mode: "call", forceLanguage: detectedLang }),
      });
      const payload = await chatRes.json().catch(() => ({}));
      if (!chatRes.ok) throw new Error(payload?.error || `Chat failed (${chatRes.status})`);
      const raw = readTextPayload(payload);
      const parsed = splitLangHeader(raw);
      const lang = detectedLang || parsed.lang;
      const body = parsed.body;
      const answer = body.trim();
      if (!answer) throw new Error("No answer was generated. Please try again.");
      setLastReply(answer);
      setLastLang(lang);
      historyRef.current.push({ role: "assistant", content: answer });
      turnsRef.current.push({
        id: crypto.randomUUID(), role: "assistant", content: answer,
        language: lang, is_voice: true, created_at: new Date().toISOString(),
      });

      if (closedRef.current) return;
      setPhaseBoth("speaking");
      await speak(answer, lang);
      if (!closedRef.current) {
        setPhaseBoth("idle");
        scheduleListening(450);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong");
      if (!closedRef.current) scheduleListening(800);
    } finally {
      processingRef.current = false;
    }
  };

  function startListening() {
    if (closedRef.current) return;
    if (processingRef.current || phaseRef.current === "thinking" || phaseRef.current === "speaking") return;
    const stream = streamRef.current;
    if (!stream || !stream.active) return;
    if (mediaRef.current?.state === "recording") return;
    stopSilenceMonitor();
    const mimeType = getSupportedMimeType();
    const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const blobType = mimeType || rec.mimeType || "audio/webm";
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    rec.onstop = () => {
      stopSilenceMonitor();
      if (maxRecordTimerRef.current) window.clearTimeout(maxRecordTimerRef.current);
      maxRecordTimerRef.current = null;
      const blob = new Blob(chunksRef.current, { type: blobType });
      if (blob.size < 1200) {
        if (!closedRef.current) scheduleListening(500);
        return;
      }
      processBlob(blob, blobType);
    };
    rec.start();
    mediaRef.current = rec;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let speechStarted = false;
      let silenceStartedAt = 0;
      const startedAt = Date.now();
      const monitor = () => {
        if (closedRef.current || mediaRef.current !== rec || rec.state !== "recording") return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }
        const volume = Math.sqrt(sum / data.length);
        const now = Date.now();
        if (volume > 0.035) {
          speechStarted = true;
          silenceStartedAt = 0;
        } else if (speechStarted) {
          silenceStartedAt ||= now;
          if (now - silenceStartedAt > 1400 && now - startedAt > 1800) {
            rec.stop();
            return;
          }
        }
        analyserFrameRef.current = requestAnimationFrame(monitor);
      };
      analyserFrameRef.current = requestAnimationFrame(monitor);
    } catch {
      stopSilenceMonitor();
    }
    maxRecordTimerRef.current = window.setTimeout(() => {
      if (mediaRef.current === rec && rec.state === "recording") rec.stop();
    }, 20000);
    setPhaseBoth("listening");
  }

  const handleMicTap = () => {
    // Tap to stop recording and submit current turn
    if (phaseRef.current === "listening" && mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
    } else if (phaseRef.current === "speaking") {
      // Interrupt the assistant and start listening
      speechTokenRef.current += 1;
      stopSpeech();
      scheduleListening(100);
    }
  };

  useEffect(() => {
    if (!open) return;
    closedRef.current = false;
    turnsRef.current = [];
    historyRef.current = [...history];
    setSeconds(0);
    setLastUser("");
    setLastReply("");
    setLastLang(null);
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000) as unknown as number;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        startListening();
      } catch (e: any) {
        console.error(e);
        toast.error("Please allow microphone access to start the call.");
      }
    })();

    return () => {
      closedRef.current = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      if (maxRecordTimerRef.current) window.clearTimeout(maxRecordTimerRef.current);
      speechTokenRef.current += 1;
      stopSpeech();
      stopSilenceMonitor();
      try { mediaRef.current?.state === "recording" && mediaRef.current.stop(); } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hangUp = () => {
    closedRef.current = true;
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    if (maxRecordTimerRef.current) window.clearTimeout(maxRecordTimerRef.current);
    speechTokenRef.current += 1;
    stopSpeech();
    stopSilenceMonitor();
    try { mediaRef.current?.state === "recording" && mediaRef.current.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopSpeech();
    if (timerRef.current) window.clearInterval(timerRef.current);
    onClose(turnsRef.current);
  };

  if (!open) return null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const statusText =
    phase === "listening" ? "🎙️ Listening… speak now" :
    phase === "thinking" ? "Thinking…" :
    phase === "speaking" ? "Speaking… (tap mic to interrupt)" :
    "Connecting…";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 text-white p-8">
      <div className="text-center mt-12 w-full max-w-md">
        <div className="text-sm opacity-80">PashuMitra • Live Call</div>
        <div className="text-3xl font-light mt-2">🐄</div>
        <div className="text-2xl font-semibold mt-3">PashuMitra AI</div>
        <div className="text-sm opacity-80 mt-1">{mm}:{ss}</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        <div className={`w-32 h-32 rounded-full bg-white/10 flex items-center justify-center text-5xl mb-6 transition ${
          phase === "listening" ? "ring-4 ring-emerald-300 animate-pulse" :
          phase === "speaking" ? "ring-4 ring-blue-300" :
          phase === "thinking" ? "ring-4 ring-yellow-300" : ""
        }`}>
          {phase === "thinking" ? <Loader2 className="w-12 h-12 animate-spin" /> : "🐄"}
        </div>
        <div className="text-center text-sm opacity-90 min-h-[3rem] px-4">{statusText}</div>
        {lastUser && (
          <div className="mt-4 text-xs opacity-70 text-center max-w-sm line-clamp-2">You: {lastUser}</div>
        )}
        {lastReply && (
          <div className="mt-2 text-xs opacity-90 text-center max-w-sm line-clamp-3">
            {lastLang && <span className="opacity-60">[{LANG_NAMES[lastLang] || lastLang}] </span>}
            {lastReply}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 mb-12">
        <button
          onClick={handleMicTap}
          disabled={phase === "thinking" || phase === "idle"}
          className="w-16 h-16 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shadow-lg disabled:opacity-40"
          aria-label="Send / interrupt"
          title="Tap to send now, or to interrupt"
        >
          <Mic className="w-7 h-7" />
        </button>
        <button onClick={hangUp} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg" aria-label="End call">
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}

export function CallButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-2 hover:bg-white/10 rounded-full transition" title="Call PashuMitra">
      <Phone className="w-5 h-5" />
    </button>
  );
}
