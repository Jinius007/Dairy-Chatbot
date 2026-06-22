/**
 * ElevenLabs-style barge-in without ElevenLabs:
 * 1. Flush TTS immediately on interrupt (speech.ts)
 * 2. Do NOT record during advisor speech — record only after flush
 * 3. Detect farmer speech via STT + energy VAD in parallel
 * 4. Filter STT so advisor TTS echo ("नमस्ते…") does not false-trigger
 */
import { browserSttLocale } from "@/lib/browserStt";
import { attachCallMicAnalyser, getCallReferenceLevel } from "@/lib/speech";

export type CallBargeInHandle = {
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function normalizeSpeech(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when STT likely picked up the advisor's own TTS from the speaker. */
export function isAdvisorEchoTranscript(transcript: string, advisorText: string): boolean {
  const t = normalizeSpeech(transcript);
  const a = normalizeSpeech(advisorText);
  if (t.length < 2) return true;
  if (a.includes(t)) return true;
  const words = t.split(" ").filter((w) => w.length > 1);
  if (words.length === 0) return true;
  const overlap = words.filter((w) => a.includes(w)).length;
  if (overlap / words.length >= 0.65) return true;
  return false;
}

export type CallBargeInOptions = {
  stream: MediaStream;
  langCode: string;
  advisorText: string;
  onInterrupt: () => void;
  /** True while call UI is in speaking phase (covers gaps between TTS chunks). */
  isSpeaking: () => boolean;
};

function chainStop(...handles: CallBargeInHandle[]): CallBargeInHandle {
  return {
    stop: () => handles.forEach((h) => h.stop()),
  };
}

function startSttBargeIn(options: CallBargeInOptions, fireOnce: () => void): CallBargeInHandle {
  const SR = getSpeechRecognition();
  if (!SR) return { stop: () => undefined };

  const { langCode, advisorText, isSpeaking } = options;
  let rec: SpeechRecognition | null = null;
  let stopped = false;
  const sttArmedAt = Date.now() + 750;

  try {
    rec = new SR();
    rec.lang = browserSttLocale(langCode);
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      if (stopped || Date.now() < sttArmedAt || !isSpeaking()) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript?.trim() || "";
        if (text.length < 3) continue;
        if (isAdvisorEchoTranscript(text, advisorText)) continue;
        if (result.isFinal || text.length >= 4) {
          fireOnce();
          return;
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
    };

    rec.onend = () => {
      if (!stopped && isSpeaking()) {
        try {
          rec?.start();
        } catch {
          /* ignore */
        }
      }
    };

    rec.start();
  } catch {
    return { stop: () => undefined };
  }

  return {
    stop: () => {
      stopped = true;
      try {
        rec?.abort();
      } catch {
        try {
          rec?.stop();
        } catch {
          /* ignore */
        }
      }
      rec = null;
    },
  };
}

function startEnergyBargeIn(options: CallBargeInOptions, fireOnce: () => void): CallBargeInHandle {
  const { stream, isSpeaking } = options;
  let frame = 0;
  let stopped = false;
  let detachMic: (() => void) | null = null;
  let micAnalyser: AnalyserNode | null = null;
  let spikeSince = 0;
  let baseline = 0.015;
  const calibrateUntil = Date.now() + 500;

  const micRms = (): number => {
    if (!micAnalyser) return 0;
    const data = new Uint8Array(micAnalyser.fftSize);
    micAnalyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) {
      const n = (v - 128) / 128;
      sum += n * n;
    }
    return Math.sqrt(sum / data.length);
  };

  const tick = () => {
    if (stopped) return;
    if (!isSpeaking()) {
      frame = requestAnimationFrame(tick);
      return;
    }

    const micLevel = micRms();
    const refLevel = getCallReferenceLevel();
    const now = Date.now();

    if (now < calibrateUntil) {
      baseline = Math.max(baseline, micLevel * 0.35 + baseline * 0.65);
    } else {
      baseline = baseline * 0.985 + micLevel * 0.015;
    }

    const spike = micLevel - baseline;
    const loudUser = micLevel > 0.065;
    const clearSpike = spike > 0.028 && micLevel > 0.042;
    const overEcho =
      refLevel > 0.01 && micLevel > refLevel * 1.35 + 0.022 && micLevel > 0.048;

    if (loudUser || clearSpike || overEcho) {
      spikeSince ||= now;
      if (now - spikeSince > 180) {
        fireOnce();
        return;
      }
    } else {
      spikeSince = 0;
    }

    frame = requestAnimationFrame(tick);
  };

  void attachCallMicAnalyser(stream).then((mic) => {
    if (!mic || stopped) {
      mic?.detach();
      return;
    }
    micAnalyser = mic.analyser;
    detachMic = mic.detach;
    frame = requestAnimationFrame(tick);
  });

  return {
    stop: () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      detachMic?.();
      detachMic = null;
      micAnalyser = null;
    },
  };
}

export function startCallBargeInWithStream(
  langCode: string,
  stream: MediaStream,
  advisorText: string,
  onInterrupt: () => void,
  isSpeaking: () => boolean,
): CallBargeInHandle {
  let fired = false;
  const fireOnce = () => {
    if (fired) return;
    fired = true;
    onInterrupt();
  };

  const opts: CallBargeInOptions = {
    stream,
    langCode,
    advisorText,
    onInterrupt,
    isSpeaking,
  };

  return chainStop(startSttBargeIn(opts, fireOnce), startEnergyBargeIn(opts, fireOnce));
}
