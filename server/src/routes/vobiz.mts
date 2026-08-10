import type { Request, Response } from "express";

import { normalizeVobizLang } from "../../lib/vobiz-i18n.ts";

import { getAudio } from "../../lib/vobiz-audio-cache.ts";

import {

  listenLoopBlock,

  playPhraseBlock,

  readStaticAsset,

  textToPlayBlock,

  xmlAttrEscape,

} from "../../lib/vobiz-play.ts";

import { getPhraseBytes, warmVobizPhrasesBackground } from "../../lib/vobiz-phrases.ts";

import {

  logVobizForm,

  pickCallUuid,

  pickRecordUrl,

  pickSpeechText,

  processSpeechToReply,

  resolveFarmerSpeech,

} from "../../lib/vobiz-call.ts";

import { clearCallSession, getSessionLang } from "../../lib/vobiz-session.ts";

import { setPendingRecord, setPendingSpeech } from "../../lib/vobiz-pending.ts";



const DEFAULT_BASE =

  "https://project-rainfall-60075686570.development.catalystserverless.in/server/pashumitra_api";



const MAX_REPLY_ATTEMPTS = 8;



export function publicBaseUrl(_req: Request): string {

  const fromEnv =

    process.env.VOBIZ_PUBLIC_BASE_URL ||

    process.env.CATALYST_PUBLIC_BASE_URL ||

    process.env.CATALYST_API_PUBLIC_URL;

  return (fromEnv || DEFAULT_BASE).replace(/\/$/, "");

}



function vobizXml(body: string): string {

  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${body}\n</Response>`;

}



function replyJobUrl(base: string, callUuid: string, attempt: number, lang: string): string {

  const q = new URLSearchParams({

    CallUUID: callUuid,

    n: String(attempt),

    lang: normalizeVobizLang(lang),

  });

  return xmlAttrEscape(`${base}/vobiz/reply?${q.toString()}`);

}



function sendXml(res: Response, body: string): void {

  res.status(200);

  res.setHeader("Content-Type", "application/xml; charset=utf-8");

  res.send(vobizXml(body));

}



function sessionLang(req: Request, body: Record<string, unknown>, query: Record<string, unknown>): string {

  const callUuid = pickCallUuid(body, query);

  const qLang = String(query.lang || body.lang || "").trim();

  return normalizeVobizLang(qLang || getSessionLang(callUuid) || "hi");

}



export function handleVobizStaticClip(req: Request, res: Response): void {

  const clip = String(req.params.clip || "greeting").replace(/\.mp3$/i, "");

  const bytes = readStaticAsset(clip);

  if (!bytes) {

    res.status(404).send(`Missing vobiz-${clip}.mp3 — run: npm run gen:vobiz-audio`);

    return;

  }

  res.status(200);

  res.setHeader("Content-Type", "audio/mpeg");

  res.setHeader("Cache-Control", "public, max-age=86400");

  res.send(bytes);

}



export function handleVobizStaticGreeting(req: Request, res: Response): void {

  req.params = { ...req.params, clip: "greeting" };

  handleVobizStaticClip(req, res);

}



export async function handleVobizPhrase(req: Request, res: Response): Promise<void> {

  const name = String(req.params.name || "greeting").replace(/\.mp3$/i, "");

  const lang = normalizeVobizLang(String(req.query.lang || "hi"));

  const bytes = await getPhraseBytes(name, lang);

  if (!bytes) {

    res.status(404).send("Phrase unavailable");

    return;

  }

  res.status(200);

  res.setHeader("Content-Type", "audio/mpeg");

  res.setHeader("Cache-Control", "public, max-age=86400");

  res.send(bytes);

}



function inboundCallXml(base: string, lang: string): string {

  return `${playPhraseBlock(base, "greeting", lang)}

  ${listenLoopBlock(base, lang)}`;

}



export function handleVobizFallback(req: Request, res: Response): void {

  const base = publicBaseUrl(req);

  const body = (req.body ?? {}) as Record<string, unknown>;

  const query = req.query as Record<string, unknown>;

  const lang = sessionLang(req, body, query);

  warmVobizPhrasesBackground(lang);

  sendXml(res, inboundCallXml(base, lang));

}



export function handleVobizPing(_req: Request, res: Response): void {

  const base = publicBaseUrl(_req);

  sendXml(

    res,

    `${playPhraseBlock(base, "prompt", "hi")}

  <Hangup />`,

  );

}



/** Return XML in under 1 s — never await STT/LLM/TTS here. */

export function handleVobizAnswer(req: Request, res: Response): void {

  const base = publicBaseUrl(req);

  const body = (req.body ?? {}) as Record<string, unknown>;

  const query = req.query as Record<string, unknown>;

  const lang = sessionLang(req, body, query);

  warmVobizPhrasesBackground(lang);

  logVobizForm("answer", body, { CallUUID: pickCallUuid(body, query) });

  sendXml(res, inboundCallXml(base, lang));

}



export function handleVobizListen(req: Request, res: Response): void {

  handleVobizAnswer(req, res);

}



function enqueueReplyRedirect(

  res: Response,

  base: string,

  callUuid: string,

  lang: string,

  speech?: string,

): void {

  if (speech) setPendingSpeech(callUuid, speech, lang);

  sendXml(

    res,

    `${playPhraseBlock(base, "wait", lang)}

  <Redirect method="POST">${replyJobUrl(base, callUuid, 0, lang)}</Redirect>`,

  );

}



export function handleVobizSpeech(req: Request, res: Response): void {

  const base = publicBaseUrl(req);

  const body = (req.body ?? {}) as Record<string, unknown>;

  const query = req.query as Record<string, unknown>;

  const callUuid = pickCallUuid(body, query);

  const lang = sessionLang(req, body, query);

  logVobizForm("speech", body, { CallUUID: callUuid });



  const speech = pickSpeechText(body, query);

  if (!speech || speech.length < 3) {

    sendXml(res, `${playPhraseBlock(base, "error", lang)}

  ${listenLoopBlock(base, lang)}`);

    return;

  }



  enqueueReplyRedirect(res, base, callUuid, lang, speech);

}



export async function handleVobizRecorded(req: Request, res: Response): Promise<void> {

  const base = publicBaseUrl(req);

  const body = (req.body ?? {}) as Record<string, unknown>;

  const query = req.query as Record<string, unknown>;

  const callUuid = pickCallUuid(body, query);

  const lang = sessionLang(req, body, query);

  logVobizForm("recorded", body, { CallUUID: callUuid });



  const speech = pickSpeechText(body, query);

  if (speech.length >= 3) {

    enqueueReplyRedirect(res, base, callUuid, lang, speech);

    return;

  }



  const recordUrl = pickRecordUrl(body, query);

  if (recordUrl) {

    setPendingRecord(callUuid, recordUrl, lang);

    enqueueReplyRedirect(res, base, callUuid, lang);

    return;

  }



  sendXml(res, `${playPhraseBlock(base, "error", lang)}

  ${listenLoopBlock(base, lang)}`);

}



export async function handleVobizReply(req: Request, res: Response): Promise<void> {

  const base = publicBaseUrl(req);

  const body = (req.body ?? {}) as Record<string, unknown>;

  const query = req.query as Record<string, unknown>;

  const callUuid = pickCallUuid(body, query);

  const attempt = Number(query.n ?? body.n ?? 0) || 0;

  const lang = sessionLang(req, body, query);

  logVobizForm("reply", body, { n: attempt, CallUUID: callUuid, lang });



  try {

    const resolved = await resolveFarmerSpeech(callUuid, body, query);

    if (!resolved?.speech) {

      if (attempt + 1 >= MAX_REPLY_ATTEMPTS) {

        sendXml(res, `${playPhraseBlock(base, "error", lang)}

  ${listenLoopBlock(base, lang)}`);

        return;

      }

      sendXml(

        res,

        `${playPhraseBlock(base, "retry", lang)}

  <Redirect method="POST">${replyJobUrl(base, callUuid, attempt + 1, lang)}</Redirect>`,

      );

      return;

    }



    const { reply, lang: replyLang } = await processSpeechToReply(

      callUuid,

      resolved.speech,

      resolved.lang || lang,

    );

    const replyPlay = await textToPlayBlock(base, reply, replyLang);

    sendXml(

      res,

      `${replyPlay}

  ${listenLoopBlock(base, replyLang)}`,

    );

  } catch (e) {

    console.error(`vobiz/reply attempt ${attempt} failed:`, e);

    if (attempt + 1 >= MAX_REPLY_ATTEMPTS) {

      sendXml(res, `${playPhraseBlock(base, "error", lang)}

  ${listenLoopBlock(base, lang)}`);

      return;

    }

    sendXml(

      res,

      `${playPhraseBlock(base, "retry", lang)}

  <Redirect method="POST">${replyJobUrl(base, callUuid, attempt + 1, lang)}</Redirect>`,

    );

  }

}



export async function handleVobizProcess(req: Request, res: Response): Promise<void> {

  return handleVobizReply(req, res);

}



export function handleVobizMenu(req: Request, res: Response): void {

  const base = publicBaseUrl(req);

  const body = (req.body ?? {}) as Record<string, unknown>;

  const query = req.query as Record<string, unknown>;

  const lang = sessionLang(req, body, query);

  const digit = String(body.Digits || query.Digits || "").trim();



  if (digit === "1" || digit === "2" || !digit) {

    sendXml(res, `${playPhraseBlock(base, "prompt", lang)}

  ${listenLoopBlock(base, lang)}`);

    return;

  }



  sendXml(

    res,

    `${playPhraseBlock(base, "goodbye", lang)}

  <Hangup />`,

  );

}



export function handleVobizAudio(req: Request, res: Response): void {

  const bytes = getAudio(String(req.params.id || ""));

  if (!bytes) {

    res.status(404).send("Audio expired");

    return;

  }

  res.status(200);

  res.setHeader("Content-Type", "audio/mpeg");

  res.setHeader("Cache-Control", "no-store");

  res.send(Buffer.from(bytes));

}



export function handleVobizHangup(req: Request, res: Response): void {

  const body = (req.body ?? {}) as Record<string, unknown>;

  const query = req.query as Record<string, unknown>;

  const callUuid = pickCallUuid(body, query);

  logVobizForm("hangup", body, { CallUUID: callUuid });

  if (callUuid) clearCallSession(callUuid);

  res.status(200).send("OK");

}



export function handleVobizWebhook(_req: Request, res: Response): void {

  res.status(200).json({ ok: true });

}



export function handleVobizError(req: Request, res: Response): void {

  const base = publicBaseUrl(req);

  sendXml(

    res,

    `${playPhraseBlock(base, "error", "hi")}

  <Redirect method="POST">${xmlAttrEscape(`${base}/vobiz/answer`)}</Redirect>`,

  );

}


