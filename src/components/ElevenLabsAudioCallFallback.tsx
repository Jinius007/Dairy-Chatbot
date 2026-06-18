import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Loader2, Mic, PhoneOff, Volume2, X } from "lucide-react";
import { ADVISOR_AVATAR_PATH, ELEVENLABS_AGENT_ID } from "@/lib/elevenlabs";
import { toast } from "sonner";

type Props = {
  onClose: () => void;
};

/** Audio-only fallback when LiveAvatar lip-sync is not configured on the server. */
function AudioCallSession({ onClose }: Props) {
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

  const handleClose = useCallback(() => {
    if (!endedRef.current) {
      endedRef.current = true;
      endSession();
    }
    onCloseRef.current();
  }, [endSession]);

  return (
    <>
      <p className="text-center text-xs text-muted-foreground px-4 mb-2 leading-relaxed">
        Lip-sync video is not configured yet — audio call only. Add LiveAvatar env vars on Vercel for
        photorealistic avatar video.
      </p>

      <div className="pashu-advisor-stage pashu-advisor-stage--idle">
        <img src={ADVISOR_AVATAR_PATH} alt="PashuMitra advisor" className="pashu-advisor-image" />
      </div>

      <div className="pashu-call-status">
        {status === "connecting" ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : isSpeaking ? (
          <Volume2 className="w-4 h-4 text-primary animate-pulse" />
        ) : (
          <Mic className={`w-4 h-4 text-primary${isListening ? " animate-pulse" : ""}`} />
        )}
        <span>
          {status === "error"
            ? message?.trim() || "Connection failed"
            : isSpeaking
              ? "Advisor is speaking…"
              : isListening
                ? "Listening to you…"
                : "Connecting…"}
        </span>
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="mt-5 mx-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive text-destructive-foreground font-semibold shadow-md hover:opacity-90 transition"
      >
        <PhoneOff className="w-4 h-4" />
        End call
      </button>
    </>
  );
}

export function ElevenLabsAudioCallFallback({ onClose }: Props) {
  return (
    <div className="pashu-call-overlay" role="dialog" aria-modal="true" aria-label="Live voice call">
      <div className="pashu-call-overlay-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="pashu-call-overlay-panel pashu-call-overlay-panel--live">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/25 text-white hover:bg-black/40 transition"
          aria-label="Close call"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="text-center text-sm font-semibold text-primary tracking-tight">PashuMitra live advisor</p>

        <ConversationProvider agentId={ELEVENLABS_AGENT_ID}>
          <AudioCallSession onClose={onClose} />
        </ConversationProvider>
      </div>
    </div>
  );
}
