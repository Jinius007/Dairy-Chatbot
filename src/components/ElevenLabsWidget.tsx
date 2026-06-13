import { useEffect } from "react";
import {
  ELEVENLABS_AGENT_ID,
  ELEVENLABS_BRANCH_ID,
  ELEVENLABS_WIDGET_ID,
  ensureElevenLabsWidgetScript,
} from "@/lib/elevenlabs";

/** Hidden ElevenLabs host; started via CallButton.startConversation(). */
export function ElevenLabsWidget() {
  useEffect(() => {
    void ensureElevenLabsWidgetScript();
  }, []);

  return (
    <elevenlabs-convai
      id={ELEVENLABS_WIDGET_ID}
      agent-id={ELEVENLABS_AGENT_ID}
      branch-id={ELEVENLABS_BRANCH_ID}
      dismissible="true"
      avatar-orb-color-1="#861F3F"
      avatar-orb-color-2="#C49A6C"
      className="pashu-elevenlabs-widget"
    />
  );
}
