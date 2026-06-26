const SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions";
const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";

function env(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) return process.env[key];
  // @ts-expect-error Deno shim in bundled Catalyst build
  if (typeof Deno !== "undefined") return Deno.env.get(key);
  return undefined;
}

export function getSarvamApiKey(): string {
  const key = env("SARVAM_API_KEY");
  if (!key) throw new Error("SARVAM_API_KEY not configured");
  return key;
}

export function getSarvamChatModel(): string {
  return env("SARVAM_CHAT_MODEL") || "sarvam-30b";
}

export function getSarvamSttModel(): string {
  return env("SARVAM_STT_MODEL") || "saaras:v3";
}

export async function sarvamChatCompletion(body: Record<string, unknown>): Promise<Response> {
  return fetch(SARVAM_CHAT_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": getSarvamApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const APP_TO_SARVAM_LANG: Record<string, string> = {
  hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN", gu: "gu-IN",
  kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", or: "od-IN", as: "as-IN", ur: "ur-IN", en: "en-IN",
};

export function appLangToSarvam(code?: string): string | undefined {
  if (!code) return undefined;
  return APP_TO_SARVAM_LANG[code];
}

function mimeToFilename(mimeType?: string): string {
  if (mimeType?.includes("mp4") || mimeType?.includes("m4a")) return "audio.mp4";
  if (mimeType?.includes("wav")) return "audio.wav";
  if (mimeType?.includes("ogg")) return "audio.ogg";
  return "audio.webm";
}

function mimeToBlobType(mimeType?: string): string {
  if (mimeType?.includes("mp4")) return "audio/mp4";
  if (mimeType?.includes("wav")) return "audio/wav";
  if (mimeType?.includes("ogg")) return "audio/ogg";
  return "audio/webm";
}

export async function sarvamTranscribe(
  audioBytes: Uint8Array,
  mimeType?: string,
  languageCode?: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: mimeToBlobType(mimeType) }), mimeToFilename(mimeType));
  form.append("model", getSarvamSttModel());
  form.append("mode", "transcribe");
  const sarvamLang = appLangToSarvam(languageCode);
  if (sarvamLang) form.append("language_code", sarvamLang);

  const res = await fetch(SARVAM_STT_URL, {
    method: "POST",
    headers: { "api-subscription-key": getSarvamApiKey() },
    body: form,
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Sarvam STT error:", res.status, t);
    throw new Error("Transcription failed");
  }

  const data = await res.json() as { transcript?: string };
  return (data.transcript || "").trim();
}
