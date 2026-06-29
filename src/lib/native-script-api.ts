import { getChatRequestHeaders, getNativeScriptUrl } from "@/lib/backend-config";
import { needsNativeScriptConversion } from "@/lib/languages";

const NATIVE_SCRIPT_TIMEOUT_MS = 12_000;

/** Convert romanized Indic text to native script via Catalyst + Sarvam (only when needed). */
export async function ensureNativeScriptText(
  text: string,
  language: string | null | undefined,
  signal?: AbortSignal,
): Promise<string> {
  if (!text?.trim() || !language || language === "en") return text;
  if (!needsNativeScriptConversion(text, language)) return text;
  try {
    const timeout = AbortSignal.timeout(NATIVE_SCRIPT_TIMEOUT_MS);
    const combined = signal
      ? AbortSignal.any([signal, timeout])
      : timeout;
    const res = await fetch(getNativeScriptUrl(), {
      method: "POST",
      headers: getChatRequestHeaders(),
      body: JSON.stringify({ text, language }),
      signal: combined,
    });
    if (!res.ok) return text;
    const data = await res.json() as { text?: string };
    return (data.text || text).trim() || text;
  } catch {
    return text;
  }
}
