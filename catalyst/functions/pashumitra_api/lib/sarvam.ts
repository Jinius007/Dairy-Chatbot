const SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions";
const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";
const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";

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

export function hasSarvamApiKey(): boolean {
  return Boolean(env("SARVAM_API_KEY"));
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

export function getSttMode(languageCode?: string): "transcribe" | "codemix" {
  if (!languageCode || languageCode === "en") return "transcribe";
  return "codemix";
}

export async function sarvamTransliterateToNative(text: string, languageCode: string): Promise<string> {
  const target = appLangToSarvam(languageCode);
  if (!target || languageCode === "en") return text;

  const res = await fetch("https://api.sarvam.ai/transliterate", {
    method: "POST",
    headers: {
      "api-subscription-key": getSarvamApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      source_language_code: "en-IN",
      target_language_code: target,
      numerals_format: "international",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Sarvam transliterate error ${res.status}`);
  }

  const data = await res.json() as { transliterated_text?: string };
  return (data.transliterated_text || text).trim();
}

export async function sarvamTranscribe(
  audioBytes: Uint8Array,
  mimeType?: string,
  languageCode?: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: mimeToBlobType(mimeType) }), mimeToFilename(mimeType));
  form.append("model", getSarvamSttModel());
  form.append("mode", getSttMode(languageCode));
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

export function getSarvamTtsSpeaker(): string {
  return env("SARVAM_TTS_SPEAKER") || "suhani";
}

export function getSarvamCallSpeaker(): string {
  return env("SARVAM_TTS_CALL_SPEAKER") || "suhani";
}

export function getSarvamTtsPace(callMode = false): number {
  const raw = env(callMode ? "SARVAM_TTS_CALL_PACE" : "SARVAM_TTS_PACE");
  const n = raw ? Number(raw) : callMode ? 0.8 : 0.84;
  if (!Number.isFinite(n)) return callMode ? 0.8 : 0.84;
  return Math.min(2, Math.max(0.5, n));
}

function decodeBase64Audio(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Sarvam Bulbul v3 — natural Indian voices (mp3 for browser + chunk concat). */
export async function sarvamSynthesizeSpeech(
  text: string,
  languageCode: string,
  opts?: { callMode?: boolean; speaker?: string; temperature?: number },
): Promise<Uint8Array> {
  const callMode = opts?.callMode ?? false;
  const speaker = opts?.speaker ?? (callMode ? getSarvamCallSpeaker() : getSarvamTtsSpeaker());
  const res = await fetch(SARVAM_TTS_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": getSarvamApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      target_language_code: languageCode,
      model: "bulbul:v3",
      speaker,
      pace: getSarvamTtsPace(callMode),
      temperature: opts?.temperature ?? (callMode ? 0.62 : 0.65),
      speech_sample_rate: callMode ? "8000" : "24000",
      output_audio_codec: "mp3",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Sarvam TTS error ${res.status}`);
  }

  const data = await res.json() as { audios?: string[] };
  const b64 = data.audios?.[0];
  if (!b64) throw new Error("Sarvam TTS returned no audio");
  return decodeBase64Audio(b64);
}
