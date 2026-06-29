/**
 * Backend routing — Zoho Catalyst API (chat, transcribe, TTS, logging, YouTube).
 * Set VITE_CATALYST_API_URL in Slate / .env.local.
 */

/** Slate users often paste the whole `.env` line — strip that. */
function normalizeCatalystApiUrl(raw: string): string {
  let base = raw.trim();
  if (!base) return base;

  // "VITE_CATALYST_API_URL=https://..." pasted into the value field
  base = base.replace(/^VITE_CATALYST_API_URL\s*=\s*/i, "");
  base = base.replace(/^["']|["']$/g, "").trim();
  return base.replace(/\/$/, "");
}

function readCatalystApiUrl(): string {
  return normalizeCatalystApiUrl(import.meta.env.VITE_CATALYST_API_URL ?? "");
}

/** Misconfiguration hint for Slate banner (null = OK). */
export function getBackendConfigIssue(): string | null {
  const raw = import.meta.env.VITE_CATALYST_API_URL?.trim() ?? "";
  const base = readCatalystApiUrl();

  if (!base) {
    return "VITE_CATALYST_API_URL is not set.";
  }

  if (/^VITE_CATALYST_API_URL\s*=/i.test(raw)) {
    return "Slate value includes the variable name — use URL only in the value field, then rebuild. (Using normalized URL for now.)";
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

/** True when API calls may proceed (normalized URL looks usable). */
export function isBackendConfigured(): boolean {
  const base = readCatalystApiUrl();
  if (!base) return false;
  if (import.meta.env.PROD) {
    return base.startsWith("https://") && base.includes("catalystserverless");
  }
  return true;
}

function catalystBase(): string {
  if (!isBackendConfigured()) {
    throw new Error(getBackendConfigIssue() ?? "VITE_CATALYST_API_URL is not configured");
  }
  return readCatalystApiUrl();
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

/** Romanized Indic → native script (Sarvam transliteration). */
export function getNativeScriptUrl(): string {
  return `${catalystBase()}/native-script`;
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
