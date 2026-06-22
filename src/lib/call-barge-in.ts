/**
 * ElevenLabs-style barge-in without their SDK:
 * - Mic stays active while the advisor speaks
 * - Browser STT (like server VAD + ASR) fires when the farmer talks
 * - Client flushes TTS immediately (see speech.ts flushCallPlayback)
 */
import { browserSttLocale } from "@/lib/browserStt";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export type CallBargeInHandle = {
  stop: () => void;
};

/**
 * Watch for farmer speech while advisor TTS plays.
 * Fires once per session until stopped (ElevenLabs "interruption" event equivalent).
 */
export function startCallBargeIn(langCode: string, onInterrupt: () => void): CallBargeInHandle {
  const SR = getSpeechRecognition();
  if (!SR) {
    return startEnergyBargeIn(onInterrupt);
  }

  let rec: SpeechRecognition | null = null;
  let stopped = false;
  let fired = false;

  try {
    rec = new SR();
    rec.lang = browserSttLocale(langCode);
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      if (stopped || fired) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript?.trim() || "";
        if (text.length < 2) continue;
        // Interim: quick trigger on 3+ chars; final: any real word
        if (result.isFinal || text.length >= 3) {
          fired = true;
          onInterrupt();
          return;
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
    };

    rec.onend = () => {
      if (!stopped && !fired) {
        try {
          rec?.start();
        } catch {
          /* restart once failed — energy fallback already running if needed */
        }
      }
    };

    rec.start();
  } catch {
    return startEnergyBargeIn(onInterrupt);
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

/** Fallback when SpeechRecognition unavailable — energy spike on mic stream. */
function startEnergyBargeIn(onInterrupt: () => void, stream?: MediaStream): CallBargeInHandle {
  let frame = 0;
  let stopped = false;
  let fired = false;
  let ctx: AudioContext | null = null;

  const mic = stream;
  if (!mic?.active) {
    return { stop: () => undefined };
  }

  (async () => {
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();
      await ctx.resume();
      const source = ctx.createMediaStreamSource(mic);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let baseline = 0.01;
      let spikeSince = 0;
      const calibrateUntil = Date.now() + 500;

      const tick = () => {
        if (stopped || fired) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) {
          const n = (v - 128) / 128;
          sum += n * n;
        }
        const volume = Math.sqrt(sum / data.length);
        const now = Date.now();
        if (now < calibrateUntil) {
          baseline = Math.max(baseline, volume * 0.4 + baseline * 0.6);
        } else {
          baseline = baseline * 0.99 + volume * 0.01;
        }
        if (volume - baseline > 0.025 && volume > 0.04) {
          spikeSince ||= now;
          if (now - spikeSince > 200) {
            fired = true;
            onInterrupt();
            return;
          }
        } else {
          spikeSince = 0;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    } catch {
      /* no fallback */
    }
  })();

  return {
    stop: () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      ctx?.close().catch(() => undefined);
    },
  };
}

export function startCallBargeInWithStream(
  langCode: string,
  stream: MediaStream,
  onInterrupt: () => void,
): CallBargeInHandle {
  const stt = startCallBargeIn(langCode, onInterrupt);
  const energy = startEnergyBargeIn(onInterrupt, stream);
  return {
    stop: () => {
      stt.stop();
      energy.stop();
    },
  };
}
