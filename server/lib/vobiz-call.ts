import { cleanTtsText } from "./tts.ts";

import { detectLanguageCode, detectUserLanguage } from "./languages.ts";

import { ensureNativeScriptText } from "./native-script.ts";

import { sarvamTranscribe } from "./sarvam.ts";

import { handleChat } from "../src/handlers/chat.ts";

import { downloadVobizRecording, pickRecordingId } from "./vobiz-recording.ts";

import {

  appendCallTurn,

  getCallSession,

  getSessionLang,

  setSessionLang,

  type CallMessage,

} from "./vobiz-session.ts";

import {

  getPendingRecord,

  getPendingSpeech,

  setPendingRecord,

  setPendingSpeech,

} from "./vobiz-pending.ts";



export function splitLangHeader(text: string): { lang: string | null; body: string } {

  const m = text.match(/^\[\[LANG:([a-z]{2,4})\]\]\s*\n?([\s\S]*)$/i);

  if (m) return { lang: m[1].toLowerCase(), body: m[2].trim() };

  return { lang: null, body: text.trim() };

}



export function pickCallUuid(body: Record<string, unknown>, query: Record<string, unknown>): string {

  return String(

    body.CallUUID || body.call_uuid || body.CallId || body.call_id ||

    body.RequestUUID || body.request_uuid || query.CallUUID || query.CallId || "",

  ).trim();

}



export function pickSpeechText(body: Record<string, unknown>, query: Record<string, unknown>): string {

  const raw =

    body.Speech || body.speech || body.Transcription || body.transcript ||

    body.SpeechResult || body.speech_result ||

    query.Speech || query.speech || "";

  return String(raw).trim();

}



export function pickRecordUrl(body: Record<string, unknown>, query: Record<string, unknown>): string {

  const explicit =

    body.RecordUrl || body.RecordURL || body.RecordFile || body.RecordingURL || body.RecordingUrl ||

    body.record_url || body.recording_url ||

    query.RecordUrl || query.RecordURL || query.RecordFile || query.RecordingURL || "";

  const direct = String(explicit).trim();

  if (direct.startsWith("http")) return direct;



  for (const src of [body, query]) {

    for (const v of Object.values(src)) {

      const s = String(v ?? "").trim();

      if (s.startsWith("http") && /record|media|\.wav|\.mp3|\.m4a/i.test(s)) return s;

    }

  }

  return "";

}



export function logVobizForm(label: string, body: Record<string, unknown>, extra?: Record<string, unknown>): void {

  console.log(`vobiz ${label}:`, JSON.stringify({ ...body, ...extra }));

}



function stripLangHeader(text: string): string {

  return splitLangHeader(text).body;

}



function truncateForCall(text: string, max = 420): string {

  const clean = cleanTtsText(stripLangHeader(text));

  if (clean.length <= max) return clean;

  const cut = clean.lastIndexOf("।", max);

  if (cut > max * 0.45) return clean.slice(0, cut + 1).trim();

  const cutEn = clean.lastIndexOf(". ", max);

  if (cutEn > max * 0.45) return clean.slice(0, cutEn + 1).trim();

  return `${clean.slice(0, max).trim()}…`;

}



export async function transcribeFarmerAudio(
  recordUrl: string,
  langHint?: string | null,
  meta?: { body?: Record<string, unknown>; query?: Record<string, unknown> },
): Promise<{ transcript: string; lang: string }> {
  const recordingId = meta?.body && meta?.query ? pickRecordingId(meta.body, meta.query) : null;
  const { bytes, mime } = await downloadVobizRecording(recordUrl, recordingId);

  const stt = await sarvamTranscribe(bytes, mime, langHint || undefined);
  let transcript = stt.transcript;

  const detected = stt.languageCode || detectLanguageCode(transcript) || langHint || detectUserLanguage(transcript);

  transcript = await ensureNativeScriptText(transcript, detected);

  return { transcript: transcript.trim(), lang: detected };

}



export async function getCallChatReply(

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

  if (!res.ok) throw new Error("Chat failed");

  const data = await res.json() as { text?: string; error?: string };

  if (!data.text?.trim()) throw new Error(data.error || "Empty reply");



  const parsed = splitLangHeader(data.text);

  const lang = parsed.lang || forceLanguage || detectUserLanguage(parsed.body || data.text);

  return {

    reply: truncateForCall(parsed.body || data.text),

    lang,

  };

}



const replyCache = new Map<string, { reply: string; lang: string; expires: number }>();



function cacheReply(key: string, reply: string, lang: string): void {

  replyCache.set(key, { reply, lang, expires: Date.now() + 10 * 60 * 1000 });

}



function getCachedReply(key: string): { reply: string; lang: string } | null {

  const hit = replyCache.get(key);

  if (!hit || hit.expires <= Date.now()) {

    replyCache.delete(key);

    return null;

  }

  return { reply: hit.reply, lang: hit.lang };

}



export async function resolveFarmerSpeech(

  callUuid: string,

  body: Record<string, unknown>,

  query: Record<string, unknown>,

): Promise<{ speech: string; lang: string } | null> {

  const inline = pickSpeechText(body, query);

  const sessionLang = getSessionLang(callUuid);



  if (inline.length >= 3) {

    const lang = detectLanguageCode(inline) || sessionLang || detectUserLanguage(inline);

    setPendingSpeech(callUuid, inline, lang);

    return { speech: inline, lang };

  }



  const pendingSpeech = getPendingSpeech(callUuid, inline || undefined);

  if (pendingSpeech && pendingSpeech.length >= 3) {

    const lang = detectLanguageCode(pendingSpeech) || sessionLang || detectUserLanguage(pendingSpeech);

    return { speech: pendingSpeech, lang };

  }



  const recordUrl = pickRecordUrl(body, query) || getPendingRecord(callUuid);

  if (!recordUrl) return null;



  setPendingRecord(callUuid, recordUrl, sessionLang || undefined);

  const { transcript, lang } = await transcribeFarmerAudio(recordUrl, sessionLang || undefined, { body, query });

  setPendingSpeech(callUuid, transcript, lang);

  return { speech: transcript, lang };

}



/** Full turn: speech → chat (with history) → TTS-ready reply text. */

export async function processSpeechToReply(

  callUuid: string,

  speech: string,

  langHint?: string | null,

): Promise<{ reply: string; lang: string }> {

  const normalized = speech.trim();

  if (!normalized) throw new Error("Empty speech");



  const cacheKey = `${callUuid}:${normalized.slice(0, 160)}`;

  const cached = getCachedReply(cacheKey);

  if (cached) return cached;



  const lang = langHint || detectLanguageCode(normalized) || getSessionLang(callUuid) || detectUserLanguage(normalized);

  setSessionLang(callUuid, lang);



  const session = getCallSession(callUuid);

  const messages: CallMessage[] = [

    ...session.messages,

    { role: "user", content: normalized },

  ];



  console.log(`vobiz farmer speech (${lang}):`, normalized.slice(0, 200));



  const { reply, lang: replyLang } = await getCallChatReply(messages, lang);

  appendCallTurn(callUuid, normalized, reply, replyLang);

  cacheReply(cacheKey, reply, replyLang);

  return { reply, lang: replyLang };

}


