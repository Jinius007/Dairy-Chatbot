import { useEffect, useState } from "react";
import { PhoneOff, X } from "lucide-react";
import {
  ELEVENLABS_AGENT_ID,
  ELEVENLABS_BRANCH_ID,
  ELEVENLABS_WIDGET_ID,
  endElevenLabsCall,
  ensureElevenLabsWidgetScript,
  getAdvisorAvatarUrl,
  startElevenLabsCall,
} from "@/lib/elevenlabs";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** In-app ElevenLabs voice call with project avatar (lip-sync via ElevenLabs widget). */
export function ElevenLabsCallPanel({ open, onClose }: Props) {
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    void ensureElevenLabsWidgetScript();
    setAvatarUrl(getAdvisorAvatarUrl());
  }, []);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const started = await startElevenLabsCall();
        if (!started) toast.error("Voice call could not start. Please try again.");
      } catch {
        toast.error("Voice call is unavailable right now.");
      }
    })();
  }, [open]);

  const handleClose = () => {
    void endElevenLabsCall();
    onClose();
  };

  return (
    <>
      <div className={`pashu-elevenlabs-call-host${open ? " pashu-elevenlabs-call-host--active" : ""}`}>
        <elevenlabs-convai
          id={ELEVENLABS_WIDGET_ID}
          agent-id={ELEVENLABS_AGENT_ID}
          branch-id={ELEVENLABS_BRANCH_ID}
          avatar-image-url={avatarUrl || undefined}
          variant="full"
          dismissible="true"
          avatar-orb-color-1="#861F3F"
          avatar-orb-color-2="#C49A6C"
          start-call-text="Start call"
          end-call-text="End call"
          listening-text="Listening…"
          speaking-text="Speaking…"
          className="pashu-elevenlabs-call-widget"
        />
      </div>

      {open && (
        <div className="pashu-call-overlay" role="dialog" aria-modal="true" aria-label="Live voice call">
          <div className="pashu-call-overlay-backdrop" onClick={handleClose} aria-hidden="true" />
          <div className="pashu-call-overlay-panel">
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/20 text-white hover:bg-black/35 transition"
              aria-label="Close call"
            >
              <X className="w-5 h-5" />
            </button>

            <p className="text-center font-semibold text-primary mb-2">PashuMitra live call</p>

            <button
              type="button"
              onClick={handleClose}
              className="mt-6 mx-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive text-destructive-foreground font-semibold shadow-md hover:opacity-90 transition"
            >
              <PhoneOff className="w-4 h-4" />
              End call
            </button>
          </div>
        </div>
      )}
    </>
  );
}
