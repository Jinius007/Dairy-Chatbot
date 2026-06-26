/** Bhashini.ai language names — https://tts.bhashini.ai/openapi/ */
export const BHASHINI_LANG: Record<string, string> = {
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  or: "Odia",
  as: "Assamese",
  ur: "Urdu",
  en: "English",
};

export function bhashiniLanguage(code?: string): string {
  if (!code) return "Auto";
  return BHASHINI_LANG[code] || "Auto";
}

/** Parse Bhashini ASR JSON response (field names vary by version). */
export function parseBhashiniAsrText(body: unknown): string {
  if (typeof body === "string") return body.trim();
  if (!body || typeof body !== "object") return "";
  const o = body as Record<string, unknown>;
  for (const key of ["text", "transcript", "transcription", "output", "result"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  if (Array.isArray(o.results)) {
    const parts = o.results
      .map((r) => (typeof r === "object" && r && "text" in r ? String((r as { text: unknown }).text) : ""))
      .filter(Boolean);
    if (parts.length) return parts.join(" ").trim();
  }
  return "";
}
