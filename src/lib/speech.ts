import { prepareTextForSpeech, TTS_LANG } from "@/lib/languages";

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

function getVoice(lang: string | null): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const target = TTS_LANG[lang || "hi"] || "hi-IN";
  const prefix = target.slice(0, 2).toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === target)
    || voices.find((v) => v.lang.toLowerCase().startsWith(prefix))
    || voices.find((v) => v.default)
    || voices[0]
    || null
  );
}

async function waitForVoices(): Promise<void> {
  if (!("speechSynthesis" in window)) return;
  if (window.speechSynthesis.getVoices().length > 0) return;
  await new Promise<void>((resolve) => {
    const synth = window.speechSynthesis;
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve();
    };
    synth.addEventListener("voiceschanged", done);
    synth.getVoices();
    setTimeout(done, 800);
  });
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

async function speakViaServer(text: string, lang: string | null, token: number): Promise<boolean> {
  const spoken = prepareTextForSpeech(text);
  if (!spoken || token !== activeToken) return false;

  try {
    const resp = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: spoken, lang: lang || "hi" }),
    });
    if (!resp.ok || token !== activeToken) return false;
    const blob = await resp.blob();
    if (!blob.size) return false;
    return playBlob(blob, token);
  } catch {
    return false;
  }
}

async function speakViaBrowser(text: string, lang: string | null, token: number): Promise<void> {
  if (token !== activeToken || !("speechSynthesis" in window)) return;

  const spoken = prepareTextForSpeech(text);
  if (!spoken) return;

  await waitForVoices();
  const synth = window.speechSynthesis;
  synth.cancel();
  synth.resume();

  const parts = spoken.match(/.{1,170}(?:[।.!?;:,|\s]|$)/g)?.map((s) => s.trim()).filter(Boolean) || [spoken];

  const keepAlive = window.setInterval(() => {
    if (token !== activeToken) return;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      synth.resume();
    }
  }, 10000);

  try {
    for (const part of parts) {
      if (token !== activeToken) return;
      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = TTS_LANG[lang || "hi"] || "hi-IN";
        const voice = getVoice(lang);
        if (voice) u.voice = voice;
        u.rate = 0.92;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        synth.resume();
        synth.speak(u);
      });
      await delay(60);
    }
  } finally {
    window.clearInterval(keepAlive);
  }
}

async function runSpeech(text: string, lang: string | null, token: number): Promise<void> {
  if (!text.trim() || token !== activeToken) return;

  // Server TTS first (reliable on Vercel). Retry once, then browser fallback.
  if (await speakViaServer(text, lang, token)) return;
  if (token !== activeToken) return;
  await delay(200);
  if (await speakViaServer(text, lang, token)) return;
  if (token !== activeToken) return;
  await speakViaBrowser(text, lang, token);
}

export function isSpeechSupported(): boolean {
  return typeof Audio !== "undefined" || (typeof window !== "undefined" && "speechSynthesis" in window);
}

export function preloadSpeechVoices(): Promise<void> {
  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  return Promise.resolve();
}

export function stopSpeech(): void {
  activeToken += 1;
  cleanupAudio();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  }
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

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", () => undefined);
  preloadSpeechVoices();
}
