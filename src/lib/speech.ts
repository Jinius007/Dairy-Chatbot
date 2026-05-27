import { prepareTextForSpeech, TTS_LANG } from "@/lib/languages";

let voicesCache: SpeechSynthesisVoice[] = [];
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;
let speechChain: Promise<void> = Promise.resolve();
let activeToken = 0;

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getSynth(): SpeechSynthesis | null {
  return isSpeechSupported() ? window.speechSynthesis : null;
}

function refreshVoiceCache(): SpeechSynthesisVoice[] {
  const synth = getSynth();
  if (!synth) return [];
  const voices = synth.getVoices();
  if (voices.length > 0) voicesCache = voices;
  return voicesCache;
}

/** Browsers often return an empty voice list until voiceschanged fires. */
export function preloadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([]);

  const synth = window.speechSynthesis;
  const cached = refreshVoiceCache();
  if (cached.length > 0) return Promise.resolve(cached);

  if (voicesReady) return voicesReady;

  voicesReady = new Promise((resolve) => {
    const finish = () => {
      const voices = refreshVoiceCache();
      resolve(voices);
      if (voices.length === 0) voicesReady = null;
    };

    const onVoicesChanged = () => {
      if (refreshVoiceCache().length > 0) {
        synth.removeEventListener("voiceschanged", onVoicesChanged);
        finish();
      }
    };

    synth.addEventListener("voiceschanged", onVoicesChanged);
    synth.getVoices();
    window.setTimeout(() => {
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      finish();
    }, 3000);
  });

  return voicesReady;
}

if (typeof window !== "undefined" && isSpeechSupported()) {
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoiceCache);
  preloadSpeechVoices();
}

export function getSpeechVoice(lang: string | null): SpeechSynthesisVoice | null {
  const target = TTS_LANG[lang || "hi"] || "hi-IN";
  const prefix = target.slice(0, 2).toLowerCase();
  const voices = refreshVoiceCache();
  return (
    voices.find((voice) => voice.lang === target)
    || voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix))
    || voices.find((voice) => voice.lang.toLowerCase().includes(prefix))
    || voices.find((voice) => voice.default)
    || voices[0]
    || null
  );
}

function chunkSpeechText(text: string): string[] {
  const chunks = text.match(/.{1,170}(?:[।.!?;:,，、\s]|$)/g)?.map((part) => part.trim()).filter(Boolean);
  return chunks?.length ? chunks : [text];
}

export type SpeakOptions = {
  lang?: string | null;
  rate?: number;
  pitch?: number;
};

async function unstickSynth(): Promise<void> {
  const synth = getSynth();
  if (!synth) return;
  synth.cancel();
  synth.resume();
  await delay(60);
  synth.resume();
}

async function warmSynth(lang: string | null): Promise<void> {
  const synth = getSynth();
  if (!synth) return;
  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 0.01;
    utterance.lang = TTS_LANG[lang || "hi"] || "hi-IN";
    const voice = getSpeechVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.resume();
    synth.speak(utterance);
    window.setTimeout(resolve, 250);
  });
  synth.cancel();
  synth.resume();
  await delay(40);
}

async function speakChunk(
  part: string,
  lang: string | null,
  options: SpeakOptions,
  token: number,
): Promise<boolean> {
  const synth = getSynth();
  if (!synth || token !== activeToken) return false;

  for (let attempt = 0; attempt < 4; attempt++) {
    if (token !== activeToken) return false;

    await unstickSynth();
    if (attempt > 0) await warmSynth(lang);

    const started = await new Promise<boolean>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(part);
      utterance.lang = TTS_LANG[lang || "hi"] || "hi-IN";
      const voice = getSpeechVoice(lang);
      if (voice) utterance.voice = voice;
      utterance.rate = options.rate ?? 0.92;
      utterance.pitch = options.pitch ?? 1;

      let didStart = false;
      let settled = false;
      const settle = (ok: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(startTimer);
        window.clearTimeout(endTimer);
        resolve(ok);
      };

      const startTimer = window.setTimeout(() => {
        if (!didStart) settle(false);
      }, 900);

      const endTimer = window.setTimeout(() => {
        settle(didStart);
      }, Math.max(8000, part.length * 120));

      utterance.onstart = () => { didStart = true; };
      utterance.onend = () => settle(true);
      utterance.onerror = () => settle(false);

      synth.resume();
      synth.speak(utterance);
    });

    if (token !== activeToken) return false;
    if (started) return true;
    await delay(120 * (attempt + 1));
  }

  return false;
}

async function runSpeech(text: string, options: SpeakOptions, token: number): Promise<void> {
  if (!isSpeechSupported() || token !== activeToken) return;

  await preloadSpeechVoices();
  const spokenText = prepareTextForSpeech(text);
  if (!spokenText || token !== activeToken) return;

  const chunks = chunkSpeechText(spokenText);
  const lang = options.lang ?? null;

  await warmSynth(lang);
  if (token !== activeToken) return;

  const keepAlive = window.setInterval(() => {
    if (token !== activeToken) return;
    const synth = getSynth();
    if (!synth) return;
    if (synth.speaking || synth.pending) synth.resume();
  }, 4000);

  try {
    for (const part of chunks) {
      if (token !== activeToken) return;
      const ok = await speakChunk(part, lang, options, token);
      if (!ok && token === activeToken) {
        await delay(180);
        await speakChunk(part, lang, options, token);
      }
      await delay(80);
    }
  } finally {
    window.clearInterval(keepAlive);
  }
}

export function stopSpeech(): void {
  activeToken += 1;
  const synth = getSynth();
  if (!synth) return;
  synth.cancel();
  synth.resume();
}

/**
 * Queue speech so overlapping requests don't cancel each other unpredictably.
 */
export function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!isSpeechSupported() || !text.trim()) return Promise.resolve();

  const token = ++activeToken;
  const task = speechChain
    .catch(() => undefined)
    .then(() => runSpeech(text, options, token));

  speechChain = task.catch(() => undefined);
  return task;
}
