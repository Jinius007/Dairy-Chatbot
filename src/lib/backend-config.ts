/**
 * Backend routing — Zoho Catalyst API (chat, transcribe, TTS, logging, YouTube).
 * Set VITE_CATALYST_API_URL in Slate / .env.local.
 */

/** Misconfiguration hint for Slate banner (null = OK). */
export function getBackendConfigIssue(): string | null {
  const base = import.meta.env.VITE_CATALYST_API_URL?.trim();
  if (!base) {
    return "VITE_CATALYST_API_URL is not set.";
  }

  if (import.meta.env.PROD) {
    if (base.includes("/catalyst-api") || base.startsWith("/")) {
      return "Slate is using the local Vite proxy (/catalyst-api). Set the full Catalyst URL (https://…catalystserverless.in/server/pashumitra_api) and rebuild.";
    }
    if (!base.startsWith("https://")) {
      return "Production requires an https:// Catalyst function URL, not localhost.";
    }
    if (!base.includes("catalystserverless")) {
      return "VITE_CATALYST_API_URL should be your Catalyst function URL (*.catalystserverless.in or .com).";
    }
  }

  return null;
}

export function isBackendConfigured(): boolean {
  return getBackendConfigIssue() === null;
}

function catalystBase(): string {
  const issue = getBackendConfigIssue();
  if (issue) throw new Error(issue);
  const base = import.meta.env.VITE_CATALYST_API_URL!.trim();
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
