import { prepareTextForSpeech, TTS_LANG } from "@/lib/languages";

let activeToken = 0;

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

function chunkText(text: string): string[] {
  const chunks = text.match(/.{1,170}(?:[।.!?;:,|\s]|$)/g)?.map((s) => s.trim()).filter(Boolean);
  return chunks?.length ? chunks : [text];
}

function speakChunk(text: string, lang: string | null, token: number): Promise<void> {
  if (token !== activeToken || !("speechSynthesis" in window)) return Promise.resolve();

  const synth = window.speechSynthesis;
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = TTS_LANG[lang || "hi"] || "hi-IN";
    const voice = getVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.resume();
    synth.speak(utterance);
  });
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function preloadSpeechVoices(): Promise<void> {
  if (!isSpeechSupported()) return Promise.resolve();
  window.speechSynthesis.getVoices();
  return Promise.resolve();
}

export function stopSpeech(): void {
  activeToken += 1;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  }
}

export type SpeakOptions = { lang?: string | null };

/** Read text aloud using the browser voice (same approach as the original working version). */
export async function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!text.trim() || !isSpeechSupported()) return;

  const token = ++activeToken;
  const lang = options.lang ?? null;
  const spoken = prepareTextForSpeech(text);
  if (!spoken) return;

  const synth = window.speechSynthesis;
  synth.cancel();
  synth.resume();

  if (synth.getVoices().length === 0) {
    await new Promise<void>((resolve) => {
      const onVoices = () => {
        synth.removeEventListener("voiceschanged", onVoices);
        resolve();
      };
      synth.addEventListener("voiceschanged", onVoices);
      window.setTimeout(resolve, 500);
    });
  }

  for (const part of chunkText(spoken)) {
    if (token !== activeToken) return;
    await speakChunk(part, lang, token);
  }
}

if (typeof window !== "undefined" && isSpeechSupported()) {
  window.speechSynthesis.addEventListener("voiceschanged", () => undefined);
  preloadSpeechVoices();
}
