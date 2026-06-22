import { LANG_NAMES } from "@/lib/languages";
import { detectLanguageCode } from "@/lib/languages";

export const ELEVENLABS_AGENT_ID = "agent_0101ks38f27hec4tdtact1ejxx7t";
export const ADVISOR_AVATAR_PATH = "/pashu-advisor-avatar.jpeg";

/** Hindi greeting only — all later replies follow the farmer's detected language. */
export const ELEVENLABS_FIRST_MESSAGE_HI =
  "नमस्ते! मैं PashuMitra हूँ — आपका पशु और डेयरी सलाहकार। अपनी भाषा में बोलिए, मैं उसी में जवाब दूँगा।";

/**
 * Appended via contextual updates + optional override.
 * Enable `first_message` and `language` overrides in the ElevenLabs agent dashboard.
 */
export const ELEVENLABS_LANGUAGE_RULES = `LANGUAGE RULES (CRITICAL — NON-NEGOTIABLE):
- Your ONLY opening greeting is in Hindi (already spoken). After that, NEVER default to Hindi.
- As soon as the farmer speaks their first sentence, detect their language from speech (Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, English, or Hindi).
- From the farmer's FIRST utterance onward, reply ONLY in that same language and native script. Do NOT ask which language they prefer.
- If the farmer switches language mid-call, switch with them immediately.
- BARGE-IN: If the farmer starts speaking while you are still talking, STOP immediately, listen to their full new question, and answer ONLY that latest question in their language. Do not finish the old answer.
- Use simple village-friendly words. Keep answers short (2–4 speakable sentences on a call).
- Supported codes: hi, bn, ta, te, mr, gu, kn, ml, pa, or, as, ur, en.`;

const LANG_LABEL: Record<string, string> = {
  ...LANG_NAMES,
  hi: "Hindi / हिन्दी",
  bn: "Bengali / বাংলা",
  ta: "Tamil / தமிழ்",
  te: "Telugu / తెలుగు",
  mr: "Marathi / मराठी",
  gu: "Gujarati / ગુજરાતી",
  kn: "Kannada / ಕನ್ನಡ",
  ml: "Malayalam / മലയാളം",
  pa: "Punjabi / ਪੰਜਾਬੀ",
  or: "Odia / ଓଡ଼ିଆ",
  as: "Assamese / অসমীয়া",
  ur: "Urdu / اردو",
  en: "English",
};

export function elevenLabsLangCode(code: string): string {
  const supported = ["hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "as", "ur", "en"];
  return supported.includes(code) ? code : "hi";
}

export function buildLanguageLockUpdate(transcript: string): { code: string; text: string } | null {
  const trimmed = transcript.trim();
  if (trimmed.length < 2) return null;
  const code = elevenLabsLangCode(detectLanguageCode(trimmed) || "hi");
  const label = LANG_LABEL[code] || code;
  return {
    code,
    text:
      `LANGUAGE LOCK: The farmer just spoke in ${label} (code ${code}). ` +
      `From your NEXT reply onward you MUST speak and write ONLY in ${label}. ` +
      `Do NOT use Hindi unless the farmer is speaking Hindi. ` +
      `Do NOT ask them to choose a language. Use simple farmer words.`,
  };
}

export type ElevenLabsOverrides = {
  agent?: {
    firstMessage?: string;
    language?: string;
    prompt?: { prompt?: string };
  };
};

/** Stable override object — do not recreate per render (causes session churn). */
export const ELEVENLABS_START_OVERRIDES: ElevenLabsOverrides = {
  agent: {
    firstMessage: ELEVENLABS_FIRST_MESSAGE_HI,
    language: "hi",
  },
};

/** Session start: Hindi first message only. Language rules sent via contextual update on connect. */
export function buildElevenLabsStartOverrides(): ElevenLabsOverrides {
  return ELEVENLABS_START_OVERRIDES;
}

export function isElevenLabsInterruption(msg: unknown): boolean {
  if (!msg || typeof msg !== "object") return false;
  const type = String((msg as Record<string, unknown>).type ?? "").toLowerCase();
  return type === "interruption";
}

/** Extract user transcript text from ElevenLabs onMessage payloads. */
export function parseElevenLabsUserTranscript(msg: unknown): string | null {
  if (!msg || typeof msg !== "object") return null;
  const o = msg as Record<string, unknown>;

  const type = String(o.type ?? "").toLowerCase();
  if (type === "agent_response" || type === "agent_response_correction") return null;

  const source = String(o.source ?? o.role ?? "").toLowerCase();
  const isUser =
    source === "user" ||
    type === "user_transcript" ||
    type === "user_transcription" ||
    type === "tentative_user_transcript";

  if (!isUser) return null;

  const text =
    (typeof o.message === "string" && o.message) ||
    (typeof o.text === "string" && o.text) ||
    (typeof (o.user_transcription_event as Record<string, unknown> | undefined)?.user_transcript === "string" &&
      (o.user_transcription_event as Record<string, string>).user_transcript) ||
    "";

  return text.trim() || null;
}

export function isFinalElevenLabsUserTranscript(msg: unknown): boolean {
  if (!msg || typeof msg !== "object") return true;
  const o = msg as Record<string, unknown>;
  const type = String(o.type ?? "").toLowerCase();
  if (type === "agent_response" || type === "agent_response_correction") return false;
  if (o.is_final === false || o.isFinal === false) return false;
  if (type === "tentative_user_transcript") return false;
  if (type.includes("tentative") || type.includes("partial")) return false;
  return true;
}

/** @deprecated use isFinalElevenLabsUserTranscript */
export const isFinalElevenLabsTranscript = isFinalElevenLabsUserTranscript;

export function buildBargeInUpdate(transcript: string): string {
  const lock = buildLanguageLockUpdate(transcript);
  const langPart = lock
    ? lock.text
    : "The farmer interrupted with a new question.";
  return `${langPart} They interrupted you mid-answer — discard the unfinished reply and answer ONLY their latest question.`;
}
