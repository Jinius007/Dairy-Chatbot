import { prepareTextForSpeech, TTS_LANG } from "@/lib/languages";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

let speechChain: Promise<void> = Promise.resolve();
let activeToken = 0;
let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

export function preloadSpeechVoices(): Promise<void> {
  return Promise.resolve();
}

function cleanupAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

async function fetchServerAudio(text: string, lang: string | null): Promise<string[] | null> {
  if (!isSupabaseConfigured) return null;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speak`;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify({ text, lang: lang || "hi" }),
  });

  if (!resp.ok) return null;

  const data = await resp.json().catch(() => null);
  if (!data) return null;

  if (Array.isArray(data.audioParts) && data.audioParts.length > 0) {
    return data.audioParts as string[];
  }
  if (typeof data.audioBase64 === "string" && data.audioBase64) {
    return [data.audioBase64];
  }
  return null;
}

async function playAudioBase64(base64: string, mimeType: string, token: number): Promise<boolean> {
  if (token !== activeToken) return false;

  cleanupAudio();
  const blob = base64ToBlob(base64, mimeType);
  const objectUrl = URL.createObjectURL(blob);
  activeObjectUrl = objectUrl;

  return new Promise((resolve) => {
    const audio = new Audio(objectUrl);
    activeAudio = audio;

    const done = (ok: boolean) => {
      if (activeAudio === audio) cleanupAudio();
      resolve(ok && token === activeToken);
    };

    audio.onended = () => done(true);
    audio.onerror = () => done(false);

    audio.play()
      .then(() => undefined)
      .catch(() => done(false));
  });
}

async function speakViaServer(text: string, lang: string | null, token: number): Promise<boolean> {
  const parts = await fetchServerAudio(text, lang);
  if (!parts || token !== activeToken) return false;

  for (const part of parts) {
    if (token !== activeToken) return false;
    const ok = await playAudioBase64(part, "audio/mpeg", token);
    if (!ok) return false;
    await delay(60);
  }
  return true;
}

async function speakViaBrowser(text: string, lang: string | null, token: number): Promise<void> {
  if (!("speechSynthesis" in window) || token !== activeToken) return;

  const synth = window.speechSynthesis;
  const spokenText = prepareTextForSpeech(text);
  if (!spokenText) return;

  synth.cancel();
  synth.resume();

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = TTS_LANG[lang || "hi"] || "hi-IN";
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

async function runSpeech(text: string, lang: string | null, token: number): Promise<void> {
  if (!text.trim() || token !== activeToken) return;

  const serverOk = await speakViaServer(text, lang, token);
  if (serverOk || token !== activeToken) return;

  await speakViaBrowser(text, lang, token);
}

export function stopSpeech(): void {
  activeToken += 1;
  cleanupAudio();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  }
}

export type SpeakOptions = {
  lang?: string | null;
};

export function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!isSpeechSupported() || !text.trim()) return Promise.resolve();

  const token = ++activeToken;
  const task = speechChain
    .catch(() => undefined)
    .then(() => runSpeech(text, options.lang ?? null, token));

  speechChain = task.catch(() => undefined);
  return task;
}
