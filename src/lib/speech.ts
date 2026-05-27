import { prepareTextForSpeech, LANG_NAMES } from "@/lib/languages";

let activeToken = 0;
let speechChain: Promise<void> = Promise.resolve();
let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let unlocked = false;

// Tiny silent WAV to unlock mobile/desktop audio during live call
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

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
      const el = new Audio(url);
      el.setAttribute("playsinline", "true");
      audio = el;
      const finish = async (ok: boolean) => {
        if (!ok && retry) {
          await unlockAudioPlayback();
          resolve(await attempt(false));
          return;
        }
        cleanupAudio();
        resolve(ok && token === activeToken);
      };
      el.onended = () => finish(true);
      el.onerror = () => finish(false);
      el.play().then(() => undefined).catch(() => finish(false));
    });

  return attempt(true);
}

async function speakViaBhashini(text: string, lang: string | null, token: number): Promise<boolean> {
  const spoken = prepareTextForSpeech(text);
  if (!spoken || token !== activeToken) return false;

  const code = lang && lang in LANG_NAMES ? lang : "hi";

  try {
    await unlockAudioPlayback();
    const resp = await fetch(ttsEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: spoken, lang: code }),
    });
    if (!resp.ok || token !== activeToken) return false;
    const blob = await resp.blob();
    if (!blob.size || blob.type.includes("json")) return false;
    return playBlob(blob, token);
  } catch {
    return false;
  }
}

async function runSpeech(text: string, lang: string | null, token: number): Promise<void> {
  if (!text.trim() || token !== activeToken) return;
  if (await speakViaBhashini(text, lang, token)) return;
  if (token !== activeToken) return;
  await delay(300);
  await speakViaBhashini(text, lang, token);
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
}

export type SpeakOptions = {
  lang?: string | null;
  /** Skip queue — use for live call replies */
  priority?: boolean;
};

export function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!text.trim()) return Promise.resolve();

  const token = ++activeToken;
  const run = () => runSpeech(text, options.lang ?? null, token);

  if (options.priority) {
    return run();
  }

  const task = speechChain.catch(() => undefined).then(run);
  speechChain = task.catch(() => undefined);
  return task;
}
