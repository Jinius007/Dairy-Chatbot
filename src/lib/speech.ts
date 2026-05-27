import { prepareTextForSpeech, TTS_LANG } from "@/lib/languages";

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Browsers often return an empty voice list until voiceschanged fires. */
export function preloadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([]);
  if (voicesReady) return voicesReady;

  voicesReady = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const finish = () => resolve(synth.getVoices());

    const tryLoad = () => {
      if (synth.getVoices().length > 0) {
        synth.removeEventListener("voiceschanged", tryLoad);
        finish();
        return true;
      }
      return false;
    };

    if (tryLoad()) return;

    synth.addEventListener("voiceschanged", tryLoad);
    synth.getVoices();
    window.setTimeout(() => {
      synth.removeEventListener("voiceschanged", tryLoad);
      finish();
    }, 2500);
  });

  return voicesReady;
}

export function getSpeechVoice(lang: string | null): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const target = TTS_LANG[lang || "hi"] || "hi-IN";
  const prefix = target.slice(0, 2).toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === target)
    || voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix))
    || voices.find((voice) => voice.lang.toLowerCase().includes(prefix))
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
  /** Pass a ref token to cancel in-flight speech when it changes. */
  tokenRef?: { current: number };
};

export function stopSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

/**
 * Reliable browser TTS with voice preloading, chunking, and Chrome keep-alive.
 */
export async function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!isSpeechSupported() || !text.trim()) return;

  await preloadSpeechVoices();

  const synth = window.speechSynthesis;
  const token = options.tokenRef ? ++options.tokenRef.current : 0;
  const spokenText = prepareTextForSpeech(text);
  if (!spokenText) return;

  synth.cancel();
  synth.resume();

  const chunks = chunkSpeechText(spokenText);
  const lang = options.lang ?? null;

  return new Promise((resolve) => {
    let cancelled = false;
    let index = 0;

    const keepAlive = window.setInterval(() => {
      if (options.tokenRef && options.tokenRef.current !== token) return;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 14000);

    const cleanup = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearInterval(keepAlive);
      resolve();
    };

    const speakNext = () => {
      if (cancelled || (options.tokenRef && options.tokenRef.current !== token)) return cleanup();
      if (index >= chunks.length) return cleanup();

      const part = chunks[index++].trim();
      if (!part) return speakNext();

      const utterance = new SpeechSynthesisUtterance(part);
      utterance.lang = TTS_LANG[lang || "hi"] || "hi-IN";
      const voice = getSpeechVoice(lang);
      if (voice) utterance.voice = voice;
      utterance.rate = options.rate ?? 0.92;
      utterance.pitch = options.pitch ?? 1;
      utterance.onend = () => window.setTimeout(speakNext, 120);
      utterance.onerror = () => window.setTimeout(speakNext, 120);

      window.setTimeout(() => {
        synth.resume();
        synth.speak(utterance);
      }, 40);
    };

    speakNext();
  });
}
