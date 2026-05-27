import { prepareTextForSpeech, TTS_LANG } from "@/lib/languages";

const TTS_LANG_CODE: Record<string, string> = {
  hi: "hi", bn: "bn", ta: "ta", te: "te", mr: "mr", gu: "gu", kn: "kn",
  ml: "ml", pa: "pa", or: "hi", as: "hi", ur: "ur", en: "en",
};

let activeToken = 0;
let audio: HTMLAudioElement | null = null;
let unlocked = false;

function unlockAudio(): void {
  if (unlocked || typeof Audio === "undefined") return;
  unlocked = true;
  const silent = new Audio();
  silent.play().catch(() => undefined);
}

function stopAudio(): void {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audio = null;
}

function splitForSpeech(text: string): string[] {
  const clean = prepareTextForSpeech(text);
  if (!clean) return [];
  if (clean.length <= 180) return [clean];
  return clean.match(/.{1,180}(?:[।.!?;:\s]|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean.slice(0, 180)];
}

function googleTtsUrl(text: string, lang: string | null): string {
  const tl = TTS_LANG_CODE[lang || "hi"] || "hi";
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(text)}`;
}

function playUrl(url: string, token: number): Promise<boolean> {
  if (token !== activeToken) return Promise.resolve(false);
  stopAudio();

  return new Promise((resolve) => {
    const el = new Audio(url);
    el.setAttribute("playsinline", "true");
    audio = el;
    const done = (ok: boolean) => {
      if (audio === el) stopAudio();
      resolve(ok && token === activeToken);
    };
    el.onended = () => done(true);
    el.onerror = () => done(false);
    el.play().then(() => undefined).catch(() => done(false));
  });
}

function speakBrowser(text: string, lang: string | null, token: number): Promise<void> {
  if (token !== activeToken || !("speechSynthesis" in window)) return Promise.resolve();
  const spoken = prepareTextForSpeech(text);
  if (!spoken) return Promise.resolve();

  const synth = window.speechSynthesis;
  synth.cancel();
  synth.resume();

  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = TTS_LANG[lang || "hi"] || "hi-IN";
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function isSpeechSupported(): boolean {
  return typeof Audio !== "undefined" || (typeof window !== "undefined" && "speechSynthesis" in window);
}

export function preloadSpeechVoices(): Promise<void> {
  unlockAudio();
  return Promise.resolve();
}

export function stopSpeech(): void {
  activeToken += 1;
  stopAudio();
  window.speechSynthesis?.cancel();
}

export type SpeakOptions = { lang?: string | null };

/** Read text aloud — used by chat speaker button, voice replies, and live call. */
export async function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!text.trim()) return;

  unlockAudio();
  const token = ++activeToken;
  const lang = options.lang ?? null;
  const parts = splitForSpeech(text);
  if (!parts.length) return;

  for (const part of parts) {
    if (token !== activeToken) return;
    const ok = await playUrl(googleTtsUrl(part, lang), token);
    if (!ok && token === activeToken) {
      await speakBrowser(part, lang, token);
    }
  }
}
