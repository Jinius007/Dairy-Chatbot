import { needsNativeScriptConversion } from "./languages.ts";
import { appLangToSarvam, sarvamTransliterateToNative } from "./sarvam.ts";

/** Convert romanized Indic reply/transcript to native script when needed. */
export async function ensureNativeScriptText(
  text: string,
  language: string | null | undefined,
): Promise<string> {
  if (!text?.trim() || !language || language === "en") return text;
  if (!needsNativeScriptConversion(text, language)) return text;
  if (!appLangToSarvam(language)) return text;
  try {
    return await sarvamTransliterateToNative(text, language);
  } catch (e) {
    console.warn("native script conversion failed:", e);
    return text;
  }
}
