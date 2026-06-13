import { useEffect } from "react";
import {
  ELEVENLABS_AGENT_ID,
  ELEVENLABS_BRANCH_ID,
  ELEVENLABS_WIDGET_ID,
  ensureElevenLabsWidgetScript,
} from "@/lib/elevenlabs";

/** ElevenLabs voice launcher in the chat header. */
export function ElevenLabsWidget() {
  useEffect(() => {
    void ensureElevenLabsWidgetScript();
  }, []);

  return (
    <div className="pashu-elevenlabs-header-slot shrink-0">
      <elevenlabs-convai
        id={ELEVENLABS_WIDGET_ID}
        agent-id={ELEVENLABS_AGENT_ID}
        branch-id={ELEVENLABS_BRANCH_ID}
        variant="compact"
        dismissible="true"
        avatar-orb-color-1="#861F3F"
        avatar-orb-color-2="#C49A6C"
        className="pashu-elevenlabs-widget"
      />
    </div>
  );
}
