/**
 * Backend routing — Zoho Catalyst API (chat, transcribe, TTS, logging, YouTube).
 * Set VITE_CATALYST_API_URL in Slate / .env.local.
 */
export function isBackendConfigured(): boolean {
  return Boolean(import.meta.env.VITE_CATALYST_API_URL?.trim());
}

function catalystBase(): string {
  const base = import.meta.env.VITE_CATALYST_API_URL?.trim();
  if (!base) throw new Error("VITE_CATALYST_API_URL is not configured");
  return base.replace(/\/$/, "");
}

/** Chat + call LLM completions (SSE). */
export function getChatCompletionsUrl(): string {
  return `${catalystBase()}/chat`;
}

export function getChatRequestHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}

/** Voice STT. */
export function getTranscribeUrl(): string {
  return `${catalystBase()}/transcribe`;
}

export function getTranscribeHeaders(): Record<string, string> {
  return getChatRequestHeaders();
}

/** TTS proxy (Bhashini + Google fallback). */
export function getTtsUrl(): string {
  return `${catalystBase()}/tts`;
}

/** Conversation turn logging (Catalyst Data Store). */
export function getLogTurnUrl(): string {
  return `${catalystBase()}/log-turn`;
}

/** YouTube verified search. */
export function getYoutubeSearchUrl(): string {
  return `${catalystBase()}/youtube-search`;
}
