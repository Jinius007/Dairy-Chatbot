/**
 * ElevenLabs-style barge-in without ElevenLabs:
 * - Mic stays open while the advisor speaks (detection only — no recording)
 * - TTS reference level is subtracted from mic level so agent voice does not trigger interrupt
 * - On interrupt: client flushes TTS immediately (speech.ts flushCallPlayback)
 *
 * We do NOT use SpeechRecognition during TTS — it transcribes the advisor's own voice
 * from the speaker ("नमस्ते…") and causes false interrupts.
 */
import {
  attachCallMicAnalyser,
  getCallReferenceLevel,
  isCallPlaybackActive,
} from "@/lib/speech";

export type CallBargeInHandle = {
  stop: () => void;
};

export type EchoAwareBargeInOptions = {
  stream: MediaStream;
  onInterrupt: () => void;
  /** Ignore spikes until TTS has started (ms). */
  armDelayMs?: number;
};

/**
 * Echo-aware voice-activity barge-in.
 * Fires when mic energy exceeds advisor TTS reference + margin (farmer is speaking).
 */
export function startEchoAwareBargeIn(options: EchoAwareBargeInOptions): CallBargeInHandle {
  const { stream, onInterrupt, armDelayMs = 450 } = options;
  let frame = 0;
  let stopped = false;
  let fired = false;
  let detachMic: (() => void) | null = null;
  let micAnalyser: AnalyserNode | null = null;
  const armedAt = Date.now() + armDelayMs;
  let spikeSince = 0;
  let echoGain = 0.88;

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
    if (stopped || fired) return;
    const now = Date.now();
    if (now < armedAt) {
      frame = requestAnimationFrame(tick);
      return;
    }
    if (!isCallPlaybackActive()) {
      frame = requestAnimationFrame(tick);
      return;
    }

    const micLevel = micRms();
    const refLevel = getCallReferenceLevel();

    if (refLevel > 0.012) {
      echoGain = echoGain * 0.992 + 0.92 * 0.008;
      const echoFloor = refLevel * echoGain + 0.018;
      const userExcess = micLevel - echoFloor;
      if (userExcess > 0.042 && micLevel > 0.055) {
        spikeSince ||= now;
        if (now - spikeSince > 320) {
          fired = true;
          onInterrupt();
          return;
        }
      } else {
        spikeSince = 0;
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

/** @deprecated Use startEchoAwareBargeIn — STT during TTS causes false interrupts. */
export function startCallBargeInWithStream(
  _langCode: string,
  stream: MediaStream,
  onInterrupt: () => void,
): CallBargeInHandle {
  return startEchoAwareBargeIn({ stream, onInterrupt });
}
