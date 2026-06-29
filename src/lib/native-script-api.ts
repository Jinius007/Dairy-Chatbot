import { getChatRequestHeaders, getNativeScriptUrl } from "@/lib/backend-config";

/** Convert romanized Indic text to native script via Catalyst + Sarvam. */
export async function ensureNativeScriptText(
  text: string,
  language: string | null | undefined,
): Promise<string> {
  if (!text?.trim() || !language || language === "en") return text;
  try {
    const res = await fetch(getNativeScriptUrl(), {
      method: "POST",
      headers: getChatRequestHeaders(),
      body: JSON.stringify({ text, language }),
    });
    if (!res.ok) return text;
    const data = await res.json() as { text?: string };
    return (data.text || text).trim() || text;
  } catch {
    return text;
  }
}
