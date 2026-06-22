import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Loader2, Mic, PhoneOff, Volume2, X } from "lucide-react";
import {
  ADVISOR_AVATAR_PATH,
  ELEVENLABS_AGENT_ID,
  buildBargeInUpdate,
  buildElevenLabsStartOverrides,
  buildLanguageLockUpdate,
  ELEVENLABS_LANGUAGE_RULES,
  isElevenLabsInterruption,
  isFinalElevenLabsTranscript,
  parseElevenLabsUserTranscript,
} from "@/lib/elevenlabs";
import {
  SLOW_RESPONSE_MS,
  callConnectingMessage,
  callInterruptedMessage,
  callListeningMessage,
  callProcessingMessage,
  callSpeakingMessage,
} from "@/lib/wait-messages";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

function audioChunkLevel(base64Audio: string): number {
  try {
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.length < 4) return 0;

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let sum = 0;
    const samples = Math.floor(bytes.length / 2);
    for (let i = 0; i < samples; i++) {
      const sample = view.getInt16(i * 2, true) / 32768;
      sum += sample * sample;
    }
    return Math.sqrt(sum / samples);
  } catch {
    return 0;
  }
}

function AdvisorCallSession({ onClose }: { onClose: () => void }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const audioLevelRef = useRef(0);
  const languageLockedRef = useRef<string | null>(null);
  const userLangRef = useRef("hi");
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasListeningRef = useRef(false);
  const interruptedRef = useRef(false);

  const [userLang, setUserLang] = useState("hi");
  const [processingSlow, setProcessingSlow] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [speakLevel, setSpeakLevel] = useState(0);
  const endedRef = useRef(false);

  const sendContextualUpdateRef = useRef<(text: string) => void>(() => {});

  const conversation = useConversation({
    overrides: buildElevenLabsStartOverrides(),
    onConnect: () => {
      sendContextualUpdateRef.current(ELEVENLABS_LANGUAGE_RULES);
    },
    onError: (err) => {
      console.error("ElevenLabs call error:", err);
      toast.error(typeof err === "string" ? err : "Voice call error. Please try again.");
    },
    onDisconnect: () => onCloseRef.current(),
    onAudio: (base64Audio) => {
      audioLevelRef.current = audioChunkLevel(base64Audio);
    },
    onMessage: (msg) => {
      if (isElevenLabsInterruption(msg)) {
        interruptedRef.current = true;
        setInterrupted(true);
        setProcessingSlow(false);
        if (processingTimerRef.current) {
          clearTimeout(processingTimerRef.current);
          processingTimerRef.current = null;
        }
        return;
      }

      const transcript = parseElevenLabsUserTranscript(msg);
      if (!transcript) return;

      const lock = buildLanguageLockUpdate(transcript);
      if (lock) {
        if (languageLockedRef.current !== lock.code) {
          languageLockedRef.current = lock.code;
          userLangRef.current = lock.code;
          setUserLang(lock.code);
          sendContextualUpdateRef.current(lock.text);
        }
      }

      if (!isFinalElevenLabsTranscript(msg)) return;

      if (interruptedRef.current) {
        interruptedRef.current = false;
        setInterrupted(false);
        sendContextualUpdateRef.current(buildBargeInUpdate(transcript));
        return;
      }

      if (!lock) return;
    },
  });

  const { status, message, isSpeaking, isListening, startSession, endSession, sendContextualUpdate } = conversation;
  sendContextualUpdateRef.current = sendContextualUpdate ?? (() => {});

  useEffect(() => {
    let active = true;
    endedRef.current = false;
    languageLockedRef.current = null;
    interruptedRef.current = false;
    userLangRef.current = "hi";
    setUserLang("hi");
    setProcessingSlow(false);
    setInterrupted(false);

    void (async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) return;
        startSession({
          agentId: ELEVENLABS_AGENT_ID,
          overrides: buildElevenLabsStartOverrides(),
        });
      } catch {
        if (!active) return;
        toast.error("Microphone access is required for the voice call.");
        onCloseRef.current();
      }
    })();

    return () => {
      active = false;
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
      if (!endedRef.current) {
        endedRef.current = true;
        endSession();
      }
    };
  }, [endSession, startSession]);

  useEffect(() => {
    if (status === "error") {
      toast.error(message?.trim() || "Voice call could not start. Please try again.");
    }
  }, [message, status]);

  // Show localized wait when farmer finished speaking but advisor hasn't started yet.
  useEffect(() => {
    if (status !== "connected") {
      setProcessingSlow(false);
      wasListeningRef.current = false;
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      return;
    }

    if (isListening) wasListeningRef.current = true;

    if (isSpeaking) {
      setProcessingSlow(false);
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      return;
    }

    if (wasListeningRef.current && !isListening && !isSpeaking) {
      if (!processingTimerRef.current) {
        processingTimerRef.current = setTimeout(() => {
          setProcessingSlow(true);
          processingTimerRef.current = null;
        }, SLOW_RESPONSE_MS);
      }
    }
  }, [isListening, isSpeaking, status]);

  useEffect(() => {
    if (status !== "connected") {
      setSpeakLevel(0);
      return;
    }

    let frame = 0;
    const tick = () => {
      const outputLevel = conversation.getOutputVolume();
      const chunkLevel = audioLevelRef.current;
      audioLevelRef.current *= 0.82;
      const level = Math.max(outputLevel, chunkLevel);
      setSpeakLevel((prev) => prev * 0.55 + level * 0.45);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [conversation, status]);

  const handleClose = useCallback(() => {
    if (!endedRef.current) {
      endedRef.current = true;
      endSession();
    }
    onCloseRef.current();
  }, [endSession]);

  const active = isSpeaking || speakLevel > 0.06;
  const mouthScale = 1 + Math.min(speakLevel * 0.55, 0.28);
  const glowStrength = Math.min(0.2 + speakLevel * 0.8, 1);

  const statusText = (() => {
    if (status === "connecting" || (status !== "connected" && status !== "error")) {
      return callConnectingMessage(userLang);
    }
    if (status === "error") return message?.trim() || "Connection failed — please try again";
    if (interrupted) return callInterruptedMessage(userLang);
    if (processingSlow && !isSpeaking) return callProcessingMessage(userLang);
    if (isSpeaking) return callSpeakingMessage(userLang);
    if (isListening) return callListeningMessage(userLang);
    return callListeningMessage(userLang);
  })();

  return (
    <>
      <div className="pashu-call-body">
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
        {status === "connecting" || (status !== "connected" && status !== "error") ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : isSpeaking ? (
          <Volume2 className="w-4 h-4 text-primary animate-pulse" />
        ) : (
          <Mic className={`w-4 h-4 text-primary${isListening ? " animate-pulse" : ""}`} />
        )}
        <span>{statusText}</span>
      </div>

      {status === "connected" && (
        <div className="pashu-call-wave-bars" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className={`pashu-call-wave-bar${active ? "" : " pashu-call-wave-bar--idle"}`}
              style={{
                animationDelay: `${i * 0.1}s`,
                opacity: active ? 0.5 + speakLevel * 0.5 : 0.25,
                transform: active ? undefined : `scaleY(${0.25 + speakLevel * 0.15})`,
              }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleClose}
        className="pashu-call-end-btn mx-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive text-destructive-foreground font-semibold shadow-md hover:opacity-90 transition"
      >
        <PhoneOff className="w-4 h-4" />
        End call
      </button>
    </>
  );
}

/** Live advisor call — ElevenLabs agent voice with lip-sync animation on the custom avatar. */
export function ElevenLabsCallPanel({ open, onClose }: Props) {
  const stableClose = useCallback(() => onClose(), [onClose]);

  if (!open) return null;

  return (
    <div className="pashu-call-overlay" role="dialog" aria-modal="true" aria-label="Live voice call">
      <div className="pashu-call-overlay-backdrop" onClick={stableClose} aria-hidden="true" />

      <div className="pashu-call-overlay-panel pashu-call-overlay-panel--live">
        <button
          type="button"
          onClick={stableClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/25 text-white hover:bg-black/40 transition"
          aria-label="Close call"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="pashu-call-title">PashuMitra live advisor</p>

        <ConversationProvider agentId={ELEVENLABS_AGENT_ID} overrides={buildElevenLabsStartOverrides()}>
          <AdvisorCallSession onClose={stableClose} />
        </ConversationProvider>
      </div>
    </div>
  );
}
