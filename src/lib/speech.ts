import { prepareTextForSpeech, resolveSpeechLang, TTS_LANG } from "@/lib/languages";

let activeToken = 0;
let speechChain: Promise<void> = Promise.resolve();
let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function cleanupAudio() {
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function ttsUrl(): string {
  if (typeof window === "undefined") return "/api/tts";
  return `${window.location.origin}/api/tts`;
}

function playBlob(blob: Blob, token: number): Promise<boolean> {
  if (token !== activeToken) return Promise.resolve(false);
  cleanupAudio();
  const url = URL.createObjectURL(blob);
  objectUrl = url;

  return new Promise((resolve) => {
    const el = new Audio(url);
    el.setAttribute("playsinline", "true");
    audio = el;
    const finish = (ok: boolean) => {
      cleanupAudio();
      resolve(ok && token === activeToken);
    };
    el.onended = () => finish(true);
    el.onerror = () => finish(false);
    el.play().then(() => undefined).catch(() => finish(false));
  });
}

async function speakViaServer(text: string, lang: string, token: number): Promise<boolean> {
  const spoken = prepareTextForSpeech(text);
  if (!spoken || token !== activeToken) return false;

  try {
    const resp = await fetch(ttsUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: spoken, lang }),
    });
    if (!resp.ok || token !== activeToken) return false;
    const blob = await resp.blob();
    if (!blob.size || blob.type.includes("json")) return false;
    return playBlob(blob, token);
  } catch {
    return false;
  }
}

async function speakViaBrowser(text: string, lang: string, token: number): Promise<void> {
  if (token !== activeToken || !("speechSynthesis" in window)) return;
  const spoken = prepareTextForSpeech(text);
  if (!spoken) return;

  const synth = window.speechSynthesis;
  synth.cancel();
  synth.resume();

  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = TTS_LANG[lang] || "hi-IN";
    u.rate = 0.92;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

async function runSpeech(text: string, lang: string | null, token: number): Promise<void> {
  if (!text.trim() || token !== activeToken) return;

  const resolved = resolveSpeechLang(text, lang);

  if (await speakViaServer(text, resolved, token)) return;
  if (token !== activeToken) return;
  await delay(250);
  if (await speakViaServer(text, resolved, token)) return;
  if (token !== activeToken) return;

  // Browser fallback only for English — Windows Chrome lacks Indic voices.
  if (resolved === "en") {
    await speakViaBrowser(text, resolved, token);
  }
}

export function isSpeechSupported(): boolean {
  return typeof Audio !== "undefined";
}

export function preloadSpeechVoices(): Promise<void> {
  return Promise.resolve();
}

export function stopSpeech(): void {
  activeToken += 1;
  cleanupAudio();
  window.speechSynthesis?.cancel();
}

export type SpeakOptions = { lang?: string | null };

export function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!text.trim()) return Promise.resolve();

  const token = ++activeToken;
  const task = speechChain
    .catch(() => undefined)
    .then(() => runSpeech(text, options.lang ?? null, token));

  speechChain = task.catch(() => undefined);
  return task;
}
