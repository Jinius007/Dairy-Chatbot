import { useCallback, useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, Loader2, PhoneCall, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { LANG_NAMES, detectLanguageCode, resolveTtsLanguage } from "@/lib/languages";
import { speakText, stopSpeech, unlockAudioPlayback } from "@/lib/speech";
import { startCallBargeInWithStream, type CallBargeInHandle } from "@/lib/call-barge-in";
import { getSessionId } from "@/lib/session";
import { logConversationTurn } from "@/lib/log-turn";
import {
  containsAbusiveLanguage,
  filterAbusiveLanguage,
} from "@/lib/content-safety";
import {
  callConnectingMessage,
  callInterruptedMessage,
  callListeningMessage,
  callProcessingMessage,
  callSpeakingMessage,
  waitTranscribingMessage,
} from "@/lib/wait-messages";

export const ADVISOR_AVATAR_PATH = "/advisor-smile.jpeg";

const GREETING_HI =
  "नमस्ते! मैं AI पशु सलाहकार हूँ। अपनी भाषा में बोलिए, मैं उसी में जवाब दूँगी।";

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
  const payload = data as Record<string, unknown>;
  if (typeof payload.text === "string") return payload.text;
  if (typeof payload.message === "string") return payload.message;
  const choices = payload.choices as { message?: { content?: string } }[] | undefined;
  const choiceText = choices?.[0]?.message?.content;
  return typeof choiceText === "string" ? choiceText : "";
}

function getSupportedMimeType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
}

export function CallView({ open, onClose, conversationId, history = [] }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [speakLevel, setSpeakLevel] = useState(0);
  const [userLang, setUserLang] = useState("hi");
  const [interrupted, setInterrupted] = useState(false);

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
  const greetedRef = useRef(false);
  const bargeWatchRef = useRef<CallBargeInHandle | null>(null);
  const bargeTriggeredRef = useRef(false);
  const speechGenRef = useRef(0);
  const chatAbortRef = useRef<AbortController | null>(null);
  const userLangRef = useRef("hi");
  const interruptListenTimerRef = useRef<number | null>(null);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const appendTranscript = (item: TranscriptItem) => {
    setTranscript((prev) => [...prev, item]);
  };

  useEffect(() => {
    transcriptScrollRef.current?.scrollTo({
      top: transcriptScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript, phase]);

  useEffect(() => {
    if (phase !== "speaking") {
      setSpeakLevel(0);
      return;
    }
    let frame = 0;
    const tick = () => {
      const t = Date.now() / 1000;
      setSpeakLevel(0.25 + 0.55 * Math.abs(Math.sin(t * 7.5)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const stopSilenceMonitor = () => {
    if (analyserFrameRef.current) cancelAnimationFrame(analyserFrameRef.current);
    analyserFrameRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  };

  const clearBargeWatch = () => {
    bargeWatchRef.current?.stop();
    bargeWatchRef.current = null;
  };

  const clearInterruptListenTimer = () => {
    if (interruptListenTimerRef.current) {
      window.clearTimeout(interruptListenTimerRef.current);
      interruptListenTimerRef.current = null;
    }
  };

  const interruptAndListen = useCallback(() => {
    if (closedRef.current || bargeTriggeredRef.current) return;
    bargeTriggeredRef.current = true;
    speechGenRef.current += 1;
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    stopSpeech();
    clearBargeWatch();
    processingRef.current = false;
    setInterrupted(true);
    setPhaseBoth("listening");

    // Fresh recording only after TTS stops — avoids capturing advisor audio in user transcript.
    clearInterruptListenTimer();
    interruptListenTimerRef.current = window.setTimeout(() => {
      interruptListenTimerRef.current = null;
      if (!closedRef.current) startListening();
    }, 220);
  }, []);

  const speak = useCallback(
    (text: string, lang: string | null) =>
      speakText(text, { lang, priority: true, preferFemale: true, callMode: true }),
    [],
  );

  const resumeListening = useCallback((delay = 300) => {
    if (closedRef.current) return;
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    setPhaseBoth("idle");
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (!closedRef.current && !processingRef.current) startListening();
    }, delay);
  }, []);

  const playAdvisorSpeech = useCallback(
    async (text: string, lang: string | null) => {
      const gen = ++speechGenRef.current;
      bargeTriggeredRef.current = false;
      setInterrupted(false);

      const stream = streamRef.current;
      if (stream?.active) {
        clearBargeWatch();
        bargeWatchRef.current = startCallBargeInWithStream(userLangRef.current, stream, () => {
          interruptAndListen();
        });
      }

      setPhaseBoth("speaking");
      try {
        await speak(text, lang);
      } finally {
        clearBargeWatch();
      }
      if (
        !closedRef.current &&
        speechGenRef.current === gen &&
        phaseRef.current === "speaking" &&
        !bargeTriggeredRef.current
      ) {
        resumeListening(280);
      }
    },
    [interruptAndListen, resumeListening, speak],
  );

  const processBlob = async (blob: Blob, mime: string) => {
    if (!supabase || !isSupabaseConfigured) {
      toast.error("Supabase is not configured on this deployment.");
      resumeListening(500);
      return;
    }
    if (closedRef.current || processingRef.current) return;
    processingRef.current = true;
    setInterrupted(false);
    setPhaseBoth("thinking");
    const startedAt = Date.now();
    try {
      const buf = await blob.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const { data: tData, error: tErr } = await supabase.functions.invoke("transcribe", {
        body: { audioBase64: b64, mimeType: mime },
      });
      if (tErr) throw tErr;
      if ((tData as { blocked?: boolean })?.blocked) {
        toast.message("Please use respectful language.");
        resumeListening(500);
        return;
      }
      const userText = filterAbusiveLanguage(
        typeof (tData as { transcript?: string })?.transcript === "string"
          ? (tData as { transcript: string }).transcript.trim()
          : "",
      );
      if (!userText || containsAbusiveLanguage(userText)) {
        toast.message("Didn't catch that — please speak again.");
        resumeListening(500);
        return;
      }
      const detectedLang = detectLanguageCode(userText);
      setUserLang(detectedLang);
      userLangRef.current = detectedLang;
      const userTurn: CallTurn = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
        language: detectedLang,
        is_voice: true,
        created_at: new Date().toISOString(),
      };
      turnsRef.current.push(userTurn);
      appendTranscript({ id: userTurn.id, role: "user", content: userText, language: detectedLang });
      historyRef.current.push({ role: "user", content: userText });

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const chatCtrl = new AbortController();
      chatAbortRef.current = chatCtrl;
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
        signal: chatCtrl.signal,
      });
      if (chatAbortRef.current === chatCtrl) chatAbortRef.current = null;
      if (chatCtrl.signal.aborted || closedRef.current) return;
      const payload = await chatRes.json().catch(() => ({}));
      if (!chatRes.ok) throw new Error((payload as { error?: string })?.error || `Chat failed (${chatRes.status})`);
      const raw = readTextPayload(payload);
      const parsed = splitLangHeader(raw);
      const body = filterAbusiveLanguage(parsed.body);
      const lang = resolveTtsLanguage(body, parsed.lang || detectedLang);
      const answer = body.trim();
      if (!answer) throw new Error("No answer was generated. Please try again.");
      const assistantTurn: CallTurn = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
        language: lang,
        is_voice: true,
        created_at: new Date().toISOString(),
      };
      historyRef.current.push({ role: "assistant", content: answer });
      turnsRef.current.push(assistantTurn);
      appendTranscript({ id: assistantTurn.id, role: "assistant", content: answer, language: lang });

      void logConversationTurn({
        session_id: getSessionId(),
        conversation_id: conversationId ?? null,
        question: userText,
        answer,
        duration_ms: Date.now() - startedAt,
        language: lang,
        is_voice: true,
        mode: "call",
      });

      if (closedRef.current) return;

      stopSilenceMonitor();
      try {
        if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      } catch {
        /* ignore */
      }
      mediaRef.current = null;

      await unlockAudioPlayback();
      await playAdvisorSpeech(answer, lang);
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      if (!closedRef.current) resumeListening(800);
    } finally {
      processingRef.current = false;
    }
  };

  function startListening() {
    if (closedRef.current) return;
    if (processingRef.current || phaseRef.current === "thinking") return;
    if (phaseRef.current === "speaking" && !bargeTriggeredRef.current) return;
    const stream = streamRef.current;
    if (!stream || !stream.active) return;
    if (mediaRef.current?.state === "recording") return;
    setInterrupted(false);
    bargeTriggeredRef.current = false;
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
      const recorded = new Blob(chunksRef.current, { type: blobType });
      if (recorded.size < 800) {
        if (!closedRef.current) resumeListening(400);
        return;
      }
      void processBlob(recorded, blobType);
    };
    rec.start(250);
    mediaRef.current = rec;
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) throw new Error("AudioContext unavailable");
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
        if (volume > 0.03) {
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

  useEffect(() => {
    if (!open) return;
    closedRef.current = false;
    greetedRef.current = false;
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
    setUserLang("hi");
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000) as unknown as number;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        await unlockAudioPlayback();

        if (!greetedRef.current && history.length === 0) {
          greetedRef.current = true;
          appendTranscript({ id: "greeting", role: "assistant", content: GREETING_HI, language: "hi" });
          historyRef.current.push({ role: "assistant", content: GREETING_HI });
          await playAdvisorSpeech(GREETING_HI, "hi");
        } else if (!closedRef.current) {
          startListening();
        }
      } catch (e) {
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
      clearBargeWatch();
      clearInterruptListenTimer();
      try {
        if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      } catch {
        /* ignore */
      }
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
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    stopSpeech();
    stopSilenceMonitor();
    clearBargeWatch();
    clearInterruptListenTimer();
    try {
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    onClose(turnsRef.current);
  };

  if (!open) return null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const active = phase === "speaking" || speakLevel > 0.06;
  const mouthScale = 1 + Math.min(speakLevel * 0.55, 0.28);
  const glowStrength = Math.min(0.2 + speakLevel * 0.8, 1);
  const compactAvatar = transcript.length > 1;

  const statusText = (() => {
    if (interrupted && phase === "listening") return callInterruptedMessage(userLang);
    if (phase === "idle") return callConnectingMessage(userLang);
    if (phase === "thinking") return waitTranscribingMessage(userLang);
    if (phase === "speaking") return callSpeakingMessage(userLang);
    if (phase === "listening") return callListeningMessage(userLang);
    return callProcessingMessage(userLang);
  })();

  return (
    <div className="pashu-call-overlay" role="dialog" aria-modal="true" aria-label="Live voice call">
      <div className="pashu-call-overlay-backdrop" aria-hidden="true" />

      <div className="pashu-call-overlay-panel pashu-call-overlay-panel--live pashu-call-overlay-panel--with-transcript">
        <button
          type="button"
          onClick={hangUp}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/10 text-foreground hover:bg-black/15 transition"
          aria-label="Close call"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="pashu-call-title">
          PashuMitra live advisor
          <span className="ml-2 font-mono text-xs opacity-70">{mm}:{ss}</span>
        </p>

        <div
          className={`pashu-call-body${compactAvatar ? " pashu-call-body--compact" : ""}`}
        >
          <div
            className={`pashu-advisor-stage${active ? " pashu-advisor-stage--speaking" : " pashu-advisor-stage--idle"}`}
            style={{
              ["--speak-level" as string]: String(glowStrength),
              ["--mouth-scale" as string]: String(mouthScale),
            }}
          >
            <div className="pashu-advisor-glow" aria-hidden="true" />
            <div className="pashu-advisor-ring" aria-hidden="true" />
            <div className="pashu-advisor-ring pashu-advisor-ring--outer" aria-hidden="true" />
            <img src={ADVISOR_AVATAR_PATH} alt="PashuMitra advisor" className="pashu-advisor-image" />
            <div className="pashu-advisor-mouth-sync" aria-hidden="true">
              <span className="pashu-advisor-mouth-sync-inner" />
            </div>
          </div>
        </div>

        <div className="pashu-call-status">
          {phase === "thinking" || phase === "idle" ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : phase === "speaking" ? (
            <Volume2 className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <Mic className={`w-4 h-4 text-primary${phase === "listening" ? " animate-pulse" : ""}`} />
          )}
          <span>{statusText}</span>
        </div>

        {phase === "speaking" && (
          <div className="pashu-call-wave-bars" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className="pashu-call-wave-bar"
                style={{ animationDelay: `${i * 0.1}s`, opacity: 0.5 + speakLevel * 0.5 }}
              />
            ))}
          </div>
        )}

        <div ref={transcriptScrollRef} className="pashu-call-transcript no-scrollbar">
          {transcript.length === 0 && phase === "listening" && (
            <p className="text-center text-xs text-muted-foreground py-3">
              Your conversation will appear here as you talk…
            </p>
          )}
          {transcript.map((item) => {
            const out = item.role === "user";
            return (
              <div key={item.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    out
                      ? "bg-primary/15 border border-primary/20 rounded-br-md text-foreground"
                      : "bg-muted/80 border border-border rounded-bl-md text-foreground"
                  }`}
                >
                  {!out && item.language && (
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
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
              <div className="bg-muted/80 rounded-2xl rounded-tl-sm px-3 py-2 inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full typing-dot" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full typing-dot" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full typing-dot" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center w-full">
          <button
            type="button"
            onClick={hangUp}
            className="pashu-call-end-btn flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive text-destructive-foreground font-semibold shadow-md hover:opacity-90 transition"
          >
            <PhoneOff className="w-4 h-4" />
            End call
          </button>
        </div>
      </div>
    </div>
  );
}

export function CallButton() {
  const [callOpen, setCallOpen] = useState(false);
  const [callSession, setCallSession] = useState(0);
  const openCall = useCallback(() => {
    setCallSession((s) => s + 1);
    setCallOpen(true);
  }, []);
  const closeCall = useCallback(() => setCallOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={openCall}
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
      </button>
      <CallView key={callSession} open={callOpen} onClose={closeCall} />
    </>
  );
}
