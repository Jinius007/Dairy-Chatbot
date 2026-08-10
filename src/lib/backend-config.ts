/**
 * Backend routing — Vercel serverless API at /api (same origin).
 * Set VITE_API_URL=/api in Vercel env (default works without env).
 */

function normalizeApiBase(raw: string): string {
  let base = raw.trim();
  base = base.replace(/^VITE_API_URL\s*=\s*/i, "");
  base = base.replace(/^["']|["']$/g, "").trim();
  return base.replace(/\/$/, "") || "/api";
}

function readApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return normalizeApiBase(fromEnv);
  return "/api";
}

/** Misconfiguration hint (null = OK). */
export function getBackendConfigIssue(): string | null {
  const raw = import.meta.env.VITE_API_URL?.trim() ?? "";
  if (/^VITE_API_URL\s*=/i.test(raw)) {
    return "Env value includes the variable name — use /api only in the value field.";
  }
  return null;
}

export function isBackendConfigured(): boolean {
  return Boolean(readApiBase());
}

function apiBase(): string {
  if (!isBackendConfigured()) {
    throw new Error(getBackendConfigIssue() ?? "API base URL is not configured");
  }
  return readApiBase();
}

export function getChatCompletionsUrl(): string {
  return `${apiBase()}/chat`;
}

export function getChatRequestHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}

export function getTranscribeUrl(): string {
  return `${apiBase()}/transcribe`;
}

export function getTranscribeHeaders(): Record<string, string> {
  return getChatRequestHeaders();
}

export function getNativeScriptUrl(): string {
  return `${apiBase()}/native-script`;
}

export function getTtsUrl(): string {
  return `${apiBase()}/tts`;
}

export function getLogTurnUrl(): string {
  return `${apiBase()}/log-turn`;
}

export function getYoutubeSearchUrl(): string {
  return `${apiBase()}/youtube-search`;
}

export function getApiBaseUrl(): string {
  return apiBase();
}
