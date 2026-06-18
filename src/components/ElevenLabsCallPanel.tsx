import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Loader2, Mic, PhoneOff, Volume2, X } from "lucide-react";
import { ADVISOR_AVATAR_PATH, ELEVENLABS_AGENT_ID } from "@/lib/elevenlabs";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

function statusLabel(status: string, isSpeaking: boolean, isListening: boolean, message?: string): string {
  if (status === "connecting") return "Connecting to advisor…";
  if (status === "error") return message?.trim() || "Connection failed — please try again";
  if (status !== "connected") return "Starting call…";
  if (isSpeaking) return "Advisor is speaking…";
  if (isListening) return "Listening to you…";
  return "Live call";
}

function AdvisorCallSession({ onClose }: { onClose: () => void }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const conversation = useConversation({
    onError: (err) => {
      console.error("ElevenLabs call error:", err);
      toast.error(typeof err === "string" ? err : "Voice call error. Please try again.");
    },
    onDisconnect: () => onCloseRef.current(),
  });

  const { status, message, isSpeaking, isListening, startSession, endSession } = conversation;
  const [speakLevel, setSpeakLevel] = useState(0);
  const endedRef = useRef(false);

  useEffect(() => {
    let active = true;
    endedRef.current = false;

    void (async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) return;
        startSession({ agentId: ELEVENLABS_AGENT_ID });
      } catch {
        if (!active) return;
        toast.error("Microphone access is required for the voice call.");
        onCloseRef.current();
      }
    })();

    return () => {
      active = false;
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

  useEffect(() => {
    if (status !== "connected") {
      setSpeakLevel(0);
      return;
    }

    let frame = 0;
    const tick = () => {
      const level = conversation.getOutputVolume();
      setSpeakLevel((prev) => prev * 0.6 + level * 0.4);
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

  return (
    <div className="pashu-call-overlay" role="dialog" aria-modal="true" aria-label="Live voice call">
      <div className="pashu-call-overlay-backdrop" onClick={handleClose} aria-hidden="true" />

      <div className="pashu-call-overlay-panel pashu-call-overlay-panel--live">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/25 text-white hover:bg-black/40 transition"
          aria-label="Close call"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="text-center text-sm font-semibold text-primary tracking-tight">PashuMitra live advisor</p>

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

        <div className="pashu-call-status">
          {status === "connecting" || (status !== "connected" && status !== "error") ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : isSpeaking ? (
            <Volume2 className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <Mic className={`w-4 h-4 text-primary${isListening ? " animate-pulse" : ""}`} />
          )}
          <span>{statusLabel(status, isSpeaking, isListening, message)}</span>
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
          className="mt-5 mx-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive text-destructive-foreground font-semibold shadow-md hover:opacity-90 transition"
        >
          <PhoneOff className="w-4 h-4" />
          End call
        </button>
      </div>
    </div>
  );
}

/** Full-screen live advisor call powered by ElevenLabs React SDK. */
export function ElevenLabsCallPanel({ open, onClose }: Props) {
  const stableClose = useCallback(() => onClose(), [onClose]);

  if (!open) return null;

  return (
    <ConversationProvider agentId={ELEVENLABS_AGENT_ID}>
      <AdvisorCallSession onClose={stableClose} />
    </ConversationProvider>
  );
}
