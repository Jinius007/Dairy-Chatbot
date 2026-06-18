export const ELEVENLABS_AGENT_ID = "agent_0101ks38f27hec4tdtact1ejxx7t";
export const ELEVENLABS_BRANCH_ID = "agtbrch_2101ks38f491f3ash1f97b2txpfw";
export const ELEVENLABS_WIDGET_SCRIPT =
  "https://unpkg.com/@elevenlabs/convai-widget-embed";
export const ELEVENLABS_WIDGET_ID = "pashu-elevenlabs-call-widget";
export const ADVISOR_AVATAR_PATH = "/pashu-advisor-avatar.jpeg";

/** Public HTTPS URL for ElevenLabs avatar-image-url (required for lip-sync avatar). */
export function getAdvisorAvatarUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${ADVISOR_AVATAR_PATH}`;
  }
  return ADVISOR_AVATAR_PATH;
}

let scriptPromise: Promise<void> | null = null;

export function ensureElevenLabsWidgetScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("elevenlabs-convai")) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const existing = document.querySelector(`script[src="${ELEVENLABS_WIDGET_SCRIPT}"]`);
  if (existing) {
    scriptPromise = customElements.whenDefined("elevenlabs-convai").then(() => undefined);
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ELEVENLABS_WIDGET_SCRIPT;
    script.async = true;
    script.type = "text/javascript";
    script.onload = () => {
      customElements.whenDefined("elevenlabs-convai").then(() => resolve()).catch(reject);
    };
    script.onerror = () => reject(new Error("Failed to load ElevenLabs voice widget"));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export interface ElevenLabsConvaiElement extends HTMLElement {
  startConversation?: () => void;
  endConversation?: () => void;
}

export function getElevenLabsWidget(): ElevenLabsConvaiElement | null {
  return document.getElementById(ELEVENLABS_WIDGET_ID) as ElevenLabsConvaiElement | null;
}

export async function startElevenLabsCall(): Promise<boolean> {
  await ensureElevenLabsWidgetScript();
  const widget = getElevenLabsWidget();
  if (!widget?.startConversation) return false;
  widget.startConversation();
  return true;
}

export async function endElevenLabsCall(): Promise<void> {
  getElevenLabsWidget()?.endConversation?.();
}
