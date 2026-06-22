import { prepareTextForSpeech, resolveTtsLanguage, splitForTts, TTS_LANG } from "@/lib/languages";
import { filterAbusiveLanguage } from "@/lib/content-safety";

let activeToken = 0;
let speechChain: Promise<void> = Promise.resolve();
let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let unlocked = false;
let pendingPlayResolve: ((ok: boolean) => void) | null = null;

// Tiny silent WAV to unlock mobile/desktop audio during live call
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function finishPendingPlay(ok: boolean) {
  if (!pendingPlayResolve) return;
  const resolve = pendingPlayResolve;
  pendingPlayResolve = null;
  resolve(ok);
}

function cleanupAudio() {
  finishPendingPlay(false);
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
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

function ttsEndpoint(): string {
  if (typeof window === "undefined") return "/api/tts";
  return `${window.location.origin}/api/tts`;
}

/** Call once after mic permission — needed for TTS during live call. */
export async function unlockAudioPlayback(): Promise<void> {
  if (unlocked) return;
  try {
    const el = new Audio(SILENT_WAV);
    el.setAttribute("playsinline", "true");
    await el.play();
    unlocked = true;
  } catch {
    // ignore — will retry before speak
  }
}

function playBlob(blob: Blob, token: number): Promise<boolean> {
  if (token !== activeToken) return Promise.resolve(false);
  cleanupAudio();
  const url = URL.createObjectURL(blob);
  objectUrl = url;

  const attempt = (retry: boolean): Promise<boolean> =>
    new Promise((resolve) => {
      pendingPlayResolve = resolve;
      const el = new Audio(url);
      el.setAttribute("playsinline", "true");
      audio = el;
      const finish = async (ok: boolean) => {
        if (pendingPlayResolve !== resolve) return;
        pendingPlayResolve = null;
        if (!ok && retry && token === activeToken) {
          await unlockAudioPlayback();
          resolve(await attempt(false));
          return;
        }
        if (audio === el) {
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          audio = null;
        }
        if (objectUrl === url) {
          URL.revokeObjectURL(url);
          objectUrl = null;
        }
        resolve(ok && token === activeToken);
      };
      el.onended = () => finish(true);
      el.onerror = () => finish(false);
      el.play().then(() => undefined).catch(() => finish(false));
    });

  return attempt(true);
}

async function fetchTtsBlob(text: string, lang: string, token: number): Promise<Blob | null> {
  try {
    const resp = await fetch(ttsEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });
    if (!resp.ok || token !== activeToken) return null;
    const blob = await resp.blob();
    if (!blob.size || blob.type.includes("json")) return null;
    return blob;
  } catch {
    return null;
  }
}

async function speakViaBhashini(
  text: string,
  lang: string | null,
  token: number,
  forceLang = false,
): Promise<boolean> {
  const spoken = prepareTextForSpeech(text);
  if (!spoken || token !== activeToken) return false;

  const code = forceLang && lang ? lang : resolveTtsLanguage(spoken, lang);
  const chunks = splitForTts(spoken);
  if (chunks.length === 0) return false;

  await unlockAudioPlayback();

  for (let i = 0; i < chunks.length; i++) {
    if (token !== activeToken) return false;
    const blob = await fetchTtsBlob(chunks[i], code, token);
    if (!blob || token !== activeToken) return false;
    const played = await playBlob(blob, token);
    if (!played || token !== activeToken) return false;
    if (i < chunks.length - 1) await delay(120);
  }

  return true;
}

function pickFemaleVoice(locale: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const prefix = locale.split("-")[0].toLowerCase();
  const matching = voices.filter(
    (v) => v.lang.toLowerCase().startsWith(prefix) || v.lang.toLowerCase().startsWith(locale.toLowerCase()),
  );
  const femaleHint = /female|woman|zira|heera|lekha|swara|neural.*f/i;
  return matching.find((v) => femaleHint.test(v.name)) || matching[0] || null;
}

async function speakViaBrowserSynth(
  text: string,
  lang: string | null,
  token: number,
  forceLang = false,
  preferFemale = false,
): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || token !== activeToken) {
    return false;
  }
  const spoken = prepareTextForSpeech(filterAbusiveLanguage(text));
  if (!spoken) return false;

  const code = forceLang && lang ? lang : resolveTtsLanguage(spoken, lang);
  const locale = TTS_LANG[code] || "hi-IN";

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(spoken);
    utter.lang = locale;
    utter.rate = 0.92;
    if (preferFemale) {
      const voice = pickFemaleVoice(locale);
      if (voice) utter.voice = voice;
    }
    utter.onend = () => resolve(token === activeToken);
    utter.onerror = () => resolve(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  });
}

async function runSpeech(
  text: string,
  lang: string | null,
  token: number,
  forceLang = false,
  preferFemale = false,
): Promise<void> {
  const cleaned = filterAbusiveLanguage(text);
  if (!cleaned.trim() || token !== activeToken) return;
  if (await speakViaBhashini(cleaned, lang, token, forceLang)) return;
  if (token !== activeToken) return;
  if (await speakViaBrowserSynth(cleaned, lang, token, forceLang, preferFemale)) return;
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
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  speechChain = Promise.resolve();
}

export function pauseSpeech(): boolean {
  if (!audio || audio.paused) return false;
  audio.pause();
  return true;
}

export function resumeSpeech(): boolean {
  if (!audio || !audio.paused) return false;
  void audio.play().catch(() => undefined);
  return true;
}

export function isSpeechPaused(): boolean {
  return !!audio && audio.paused;
}

export type SpeakOptions = {
  lang?: string | null;
  /** Skip queue — use for live call replies */
  priority?: boolean;
  /** Use lang exactly (e.g. ration advisory welcome after language pick) */
  forceLang?: boolean;
  /** Prefer a female voice for browser TTS fallback */
  preferFemale?: boolean;
};

export function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!text.trim()) return Promise.resolve();

  const token = ++activeToken;
  const run = () =>
    runSpeech(text, options.lang ?? null, token, options.forceLang ?? false, options.preferFemale ?? false);

  if (options.priority) {
    const task = run();
    speechChain = task.catch(() => undefined);
    return task;
  }

  const task = speechChain.catch(() => undefined).then(run);
  speechChain = task.catch(() => undefined);
  return task;
}

/** Resolves when all queued TTS has finished (or been cancelled). */
export function waitForSpeechIdle(): Promise<void> {
  return speechChain.catch(() => undefined);
}

export function isSpeechPlaying(): boolean {
  return !!audio && !audio.paused;
}
