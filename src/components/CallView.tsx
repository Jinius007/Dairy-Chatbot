import { useCallback, useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, Loader2, PhoneCall, Milk } from "lucide-react";
import { toast } from "sonner";
import { ELEVENLABS_CALL_URL } from "@/lib/elevenlabs";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { LANG_NAMES, detectLanguageCode, resolveTtsLanguage } from "@/lib/languages";
import { speakText, stopSpeech, unlockAudioPlayback } from "@/lib/speech";
import { getSessionId } from "@/lib/session";
import { logConversationTurn } from "@/lib/log-turn";
import {
  containsAbusiveLanguage,
  filterAbusiveLanguage,
} from "@/lib/content-safety";

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
  conversationId?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

type Phase = "idle" | "listening" | "thinking" | "speaking";

type TranscriptItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  language?: string | null;
};

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

export function CallView({ open, onClose, conversationId, history = [] }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const appendTranscript = (item: TranscriptItem) => {
    setTranscript((prev) => [...prev, item]);
  };

  useEffect(() => {
    transcriptScrollRef.current?.scrollTo({
      top: transcriptScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript, phase]);

  const stopSilenceMonitor = () => {
    if (analyserFrameRef.current) cancelAnimationFrame(analyserFrameRef.current);
    analyserFrameRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  };

  const speak = useCallback(
    (text: string, lang: string | null) => speakText(text, { lang, priority: true }),
    [],
  );

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
    const startedAt = Date.now();
    try {
      const buf = await blob.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const { data: tData, error: tErr } = await supabase.functions.invoke("transcribe", {
        body: { audioBase64: b64, mimeType: mime },
      });
      if (tErr) throw tErr;
      if ((tData as any)?.blocked) {
        toast.message("Please use respectful language.");
        scheduleListening(500);
        return;
      }
      const transcript = filterAbusiveLanguage(
        typeof (tData as any)?.transcript === "string" ? (tData as any).transcript.trim() : "",
      );
      if (!transcript || containsAbusiveLanguage(transcript)) {
        toast.message("Didn't catch that — please speak again.");
        scheduleListening(500);
        return;
      }
      const detectedLang = detectLanguageCode(transcript);
      const userTurn: CallTurn = {
        id: crypto.randomUUID(), role: "user", content: transcript,
        language: detectedLang, is_voice: true, created_at: new Date().toISOString(),
      };
      turnsRef.current.push(userTurn);
      appendTranscript({ id: userTurn.id, role: "user", content: transcript, language: detectedLang });
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
        body: JSON.stringify({
          messages: historyRef.current,
          stream: false,
          mode: "call",
          forceLanguage: detectedLang,
        }),
      });
      const payload = await chatRes.json().catch(() => ({}));
      if (!chatRes.ok) throw new Error(payload?.error || `Chat failed (${chatRes.status})`);
      const raw = readTextPayload(payload);
      const parsed = splitLangHeader(raw);
      const body = filterAbusiveLanguage(parsed.body);
      const lang = resolveTtsLanguage(body, parsed.lang || detectedLang);
      const answer = body.trim();
      if (!answer) throw new Error("No answer was generated. Please try again.");
      const assistantTurn: CallTurn = {
        id: crypto.randomUUID(), role: "assistant", content: answer,
        language: lang, is_voice: true, created_at: new Date().toISOString(),
      };
      historyRef.current.push({ role: "assistant", content: answer });
      turnsRef.current.push(assistantTurn);
      appendTranscript({ id: assistantTurn.id, role: "assistant", content: answer, language: lang });

      void logConversationTurn({
        session_id: getSessionId(),
        conversation_id: conversationId ?? null,
        question: transcript,
        answer,
        duration_ms: Date.now() - startedAt,
        language: lang,
        is_voice: true,
        mode: "call",
      });

      if (closedRef.current) return;

      // Stop mic capture so TTS can play through speakers (Chrome blocks otherwise)
      stopSilenceMonitor();
      try {
        if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      } catch {}
      mediaRef.current = null;

      await unlockAudioPlayback();
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
      stopSpeech();
      scheduleListening(100);
    }
  };

  useEffect(() => {
    if (!open) return;
    closedRef.current = false;
    turnsRef.current = [];
    historyRef.current = [...history];
    setTranscript(
      history.map((m, i) => ({
        id: `history-${i}`,
        role: m.role,
        content: m.content,
      })),
    );
    setSeconds(0);
    setPhaseBoth("idle");
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000) as unknown as number;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        await unlockAudioPlayback();
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
    stopSpeech();
    stopSilenceMonitor();
    try { mediaRef.current?.state === "recording" && mediaRef.current.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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
    <div className="fixed inset-0 z-50 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-b from-[hsl(352,72%,22%)] via-[hsl(352,67%,28%)] to-[hsl(352,75%,16%)] text-white">
      {/* Header */}
      <div className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 text-center">
        <div className="text-xs opacity-80">PashuMitra • Live Call</div>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-lg">🐄</span>
          <span className="text-base font-semibold">PashuMitra AI</span>
          <span className="text-xs opacity-70 font-mono">{mm}:{ss}</span>
        </div>
      </div>

      {/* Status + avatar */}
      <div className="shrink-0 flex flex-col items-center px-4 py-2">
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center transition ${
          phase === "listening" ? "ring-4 ring-secondary/80 animate-pulse" :
          phase === "speaking" ? "ring-4 ring-white/40" :
          phase === "thinking" ? "ring-4 ring-secondary/50" : ""
        }`}>
          {phase === "thinking" ? <Loader2 className="w-8 h-8 animate-spin" /> : <Milk className="w-9 h-9 sm:w-10 sm:h-10" strokeWidth={1.75} />}
        </div>
        <div className="text-center text-xs sm:text-sm opacity-90 mt-2 px-2">{statusText}</div>
      </div>

      {/* Full transcript */}
      <div
        ref={transcriptScrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2 no-scrollbar"
      >
        {transcript.length === 0 && phase === "listening" && (
          <p className="text-center text-xs opacity-60 py-4">Your conversation will appear here as you talk…</p>
        )}
        {transcript.map((item) => {
          const out = item.role === "user";
          return (
            <div key={item.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                out ? "bg-white/20 border border-white/15 rounded-br-md" : "bg-white/12 border border-white/10 rounded-bl-md"
              }`}>
                {!out && item.language && (
                  <div className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">
                    {LANG_NAMES[item.language] || item.language}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">{item.content}</div>
              </div>
            </div>
          );
        })}
        {phase === "thinking" && (
          <div className="flex justify-start">
            <div className="bg-white/15 rounded-2xl rounded-tl-sm px-3 py-2 inline-flex gap-1">
              <span className="w-1.5 h-1.5 bg-white/70 rounded-full typing-dot" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-white/70 rounded-full typing-dot" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-white/70 rounded-full typing-dot" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-6 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleMicTap}
          disabled={phase === "thinking" || phase === "idle"}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shadow-lg disabled:opacity-40"
          aria-label="Send / interrupt"
          title="Tap to send now, or to interrupt"
        >
          <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <button
          onClick={hangUp}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg"
          aria-label="End call"
        >
          <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>
    </div>
  );
}

export function CallButton() {
  return (
    <a
      href={ELEVENLABS_CALL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="relative p-2.5 rounded-xl border border-white/30 bg-gradient-to-b from-white/40 via-white/20 to-white/5 shadow-[0_4px_0_rgba(0,0,0,0.18),0_6px_14px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:from-white/50 hover:to-white/10 active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.18),0_3px_8px_rgba(0,0,0,0.18)]"
      title="Start live voice call"
      aria-label="Start live voice call"
    >
      <PhoneCall
        className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
        strokeWidth={2.25}
        fill="currentColor"
        fillOpacity={0.22}
      />
    </a>
  );
}
