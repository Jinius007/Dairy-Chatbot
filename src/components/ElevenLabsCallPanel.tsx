import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
  SessionState,
} from "@heygen/liveavatar-web-sdk";
import { Loader2, Mic, PhoneOff, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { ElevenLabsAudioCallFallback } from "@/components/ElevenLabsAudioCallFallback";

type Props = {
  open: boolean;
  onClose: () => void;
};

type CallPhase = "loading" | "connecting" | "live" | "speaking" | "listening" | "error" | "fallback";

function phaseLabel(phase: CallPhase): string {
  if (phase === "loading") return "Preparing advisor…";
  if (phase === "connecting") return "Connecting video call…";
  if (phase === "speaking") return "Advisor is speaking…";
  if (phase === "listening") return "Listening to you…";
  if (phase === "live") return "Live call";
  return "Starting call…";
}

function LiveAvatarCallSession({ onClose }: { onClose: () => void }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const [phase, setPhase] = useState<CallPhase>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const tokenResp = await fetch("/api/liveavatar-session", { method: "POST" });
        const tokenPayload = await tokenResp.json().catch(() => ({}));

        if (tokenResp.status === 503 && tokenPayload?.code === "NOT_CONFIGURED") {
          if (!cancelled) setPhase("fallback");
          return;
        }

        if (!tokenResp.ok) {
          throw new Error(tokenPayload?.error || "Could not start lip-sync session");
        }

        const sessionToken = tokenPayload?.sessionToken as string | undefined;
        if (!sessionToken) throw new Error("Missing LiveAvatar session token");

        if (cancelled) return;

        setPhase("connecting");
        const session = new LiveAvatarSession(sessionToken, { voiceChat: true });
        sessionRef.current = session;

        session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
          if (state === SessionState.CONNECTED) setPhase("live");
          if (state === SessionState.DISCONNECTED) onCloseRef.current();
        });

        session.on(SessionEvent.SESSION_STREAM_READY, () => {
          const video = videoRef.current;
          if (video) {
            session.attach(video);
            void video.play().catch(() => undefined);
          }
        });

        session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => setPhase("speaking"));
        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => setPhase("listening"));
        session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => setPhase("listening"));

        session.on(SessionEvent.SESSION_DISCONNECTED, () => {
          if (!cancelled) onCloseRef.current();
        });

        await session.start();
        if (!cancelled) setPhase("listening");
      } catch (err) {
        if (cancelled) return;
        console.error("LiveAvatar call error:", err);
        const message = err instanceof Error ? err.message : "Video call failed";
        setErrorMessage(message);
        setPhase("error");
        toast.error(message);
      }
    })();

    return () => {
      cancelled = true;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) void session.stop().catch(() => undefined);
    };
  }, []);

  const handleClose = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) void session.stop().catch(() => undefined);
    onCloseRef.current();
  }, []);

  if (phase === "fallback") {
    return <ElevenLabsAudioCallFallback onClose={onClose} />;
  }

  return (
    <div className="pashu-call-overlay" role="dialog" aria-modal="true" aria-label="Live voice call">
      <div className="pashu-call-overlay-backdrop" onClick={handleClose} aria-hidden="true" />

      <div className="pashu-call-overlay-panel pashu-call-overlay-panel--live pashu-call-overlay-panel--video">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/25 text-white hover:bg-black/40 transition"
          aria-label="Close call"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="text-center text-sm font-semibold text-primary tracking-tight">PashuMitra live advisor</p>

        <div className="pashu-advisor-video-stage">
          <video
            ref={videoRef}
            className="pashu-advisor-video"
            autoPlay
            playsInline
            muted={false}
          />
          {(phase === "loading" || phase === "connecting") && (
            <div className="pashu-advisor-video-loading">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span>{phaseLabel(phase)}</span>
            </div>
          )}
        </div>

        <div className="pashu-call-status">
          {phase === "loading" || phase === "connecting" ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : phase === "speaking" ? (
            <Volume2 className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <Mic className={`w-4 h-4 text-primary${phase === "listening" ? " animate-pulse" : ""}`} />
          )}
          <span>{phase === "error" ? errorMessage || "Connection failed" : phaseLabel(phase)}</span>
        </div>

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

/** Live advisor call with photorealistic lip-sync via LiveAvatar + ElevenLabs agent. */
export function ElevenLabsCallPanel({ open, onClose }: Props) {
  const stableClose = useCallback(() => onClose(), [onClose]);

  if (!open) return null;

  return <LiveAvatarCallSession onClose={stableClose} />;
}
