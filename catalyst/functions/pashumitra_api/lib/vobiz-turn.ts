import { filterToAllowedUrls } from "./allowed-urls.ts";
import {
  containsAbusiveLanguage,
  filterAbusiveLanguage,
} from "./content-safety.ts";
import { detectLanguageCode, detectUserLanguage } from "./languages.ts";
import { ensureNativeScriptText } from "./native-script.ts";
import { hasSarvamApiKey, sarvamTranscribe } from "./sarvam.ts";
import { bhashiniTranscribe, hasBhashiniApiKey } from "./bhashini.ts";
import { downloadVobizRecording, pickRecordingId } from "./vobiz-recording.ts";
import { textToPlayBlock } from "./vobiz-play.ts";
import { splitLangHeader } from "./vobiz-call.ts";
import { handleChat } from "../src/handlers/chat.ts";
import {
  appendCallTurn,
  getCallSession,
  getSessionLang,
  setSessionLang,
  type CallMessage,
} from "./vobiz-session.ts";

export type PhoneTurnResult = {
  replyText: string;
  replyLang: string;
  replyPlayXml: string;
  userText: string;
  userLang: string;
};

function truncateForCall(text: string, max = 420): string {
  const clean = text.replace(/^\[\[LANG:[a-z]{2,4}\]\]\s*\n?/i, "").trim();
  if (clean.length <= max) return clean;
  const cut = clean.lastIndexOf("।", max);
  if (cut > max * 0.45) return clean.slice(0, cut + 1).trim();
  const cutEn = clean.lastIndexOf(". ", max);
  if (cutEn > max * 0.45) return clean.slice(0, cutEn + 1).trim();
  return `${clean.slice(0, max).trim()}…`;
}

async function downloadRecording(
  recordUrl: string,
  body?: Record<string, unknown>,
  query?: Record<string, unknown>,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const recordingId = body && query ? pickRecordingId(body, query) : null;
  return downloadVobizRecording(recordUrl, recordingId);
}

/** Sarvam Saaras STT (primary) + Bhashini ASR fallback — same stack as web CallView. */
export async function transcribePhoneAudio(
  recordUrl: string,
  langHint?: string | null,
  meta?: { body?: Record<string, unknown>; query?: Record<string, unknown> },
): Promise<{ transcript: string; lang: string }> {
  if (!hasSarvamApiKey() && !hasBhashiniApiKey()) {
    throw new Error("SARVAM_API_KEY or BHASHINI_API_KEY required on Catalyst for phone STT");
  }

  const { bytes, mime } = await downloadRecording(recordUrl, meta?.body, meta?.query);
  let transcript = "";
  let sttError: unknown;
  let sttLang: string | undefined;

  if (hasSarvamApiKey()) {
    try {
      const stt = await sarvamTranscribe(bytes, mime, langHint || undefined);
      transcript = stt.transcript;
      sttLang = stt.languageCode;
    } catch (e) {
      sttError = e;
      console.warn("Sarvam phone STT failed, trying Bhashini:", e instanceof Error ? e.message : e);
    }
  }

  if (!transcript.trim() && hasBhashiniApiKey()) {
    transcript = await bhashiniTranscribe(bytes, mime, langHint || undefined);
  }

  if (!transcript.trim()) {
    throw sttError instanceof Error ? sttError : new Error("Empty transcript from STT");
  }

  const detected = sttLang || detectLanguageCode(transcript) || langHint || detectUserLanguage(transcript);
  transcript = await ensureNativeScriptText(transcript, detected);
  return { transcript: filterAbusiveLanguage(transcript.trim()), lang: detected };
}

async function getCallChatReply(
  messages: CallMessage[],
  forceLanguage?: string | null,
): Promise<{ reply: string; lang: string }> {
  const req = new Request("http://internal/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      stream: false,
      mode: "call",
      forceLanguage: forceLanguage || null,
    }),
  });
  const res = await handleChat(req);
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Chat failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json() as { text?: string; error?: string };
  if (!data.text?.trim()) throw new Error(data.error || "Empty chat reply");

  const parsed = splitLangHeader(data.text);
  let body = filterAbusiveLanguage(parsed.body || data.text);
  const lang = parsed.lang || forceLanguage || detectUserLanguage(body);
  if (lang && lang !== "en") {
    body = await ensureNativeScriptText(body, lang);
  }
  body = filterToAllowedUrls(body);
  return { reply: truncateForCall(body), lang };
}

/**
 * One phone turn — mirrors web CallView:
 * STT → language lock → chat (call + RAG) → Bulbul TTS callMode.
 */
export async function processPhoneCallTurn(
  callUuid: string,
  base: string,
  input: { speech?: string; recordUrl?: string },
  langHint = "hi",
  meta?: { body?: Record<string, unknown>; query?: Record<string, unknown> },
): Promise<PhoneTurnResult> {
  if (!hasSarvamApiKey() && !hasBhashiniApiKey()) {
    throw new Error("SARVAM_API_KEY or BHASHINI_API_KEY required on Catalyst for phone calls");
  }

  let userText = (input.speech || "").trim();
  let userLang = langHint || getSessionLang(callUuid) || "hi";

  if (userText.length < 3 && input.recordUrl) {
    const stt = await transcribePhoneAudio(input.recordUrl, userLang, meta);
    userText = stt.transcript;
    userLang = stt.lang;
  }

  if (!userText || userText.length < 3) {
    throw new Error("Could not understand speech — please speak again after the tone");
  }
  if (containsAbusiveLanguage(userText)) {
    throw new Error("Please use respectful language");
  }

  setSessionLang(callUuid, userLang);
  const session = getCallSession(callUuid);
  const messages: CallMessage[] = [...session.messages, { role: "user", content: userText }];

  console.log(`vobiz phone turn (${userLang}):`, userText.slice(0, 220));

  const { reply, lang: replyLang } = await getCallChatReply(messages, userLang);
  if (!reply.trim()) throw new Error("Empty advisor reply");

  appendCallTurn(callUuid, userText, reply, replyLang);
  const replyPlayXml = await textToPlayBlock(base, reply, replyLang);

  return { replyText: reply, replyLang, replyPlayXml, userText, userLang };
}
