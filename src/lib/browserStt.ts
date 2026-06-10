import { TTS_LANG } from "@/lib/languages";

/** Map ration language codes → Web Speech API BCP-47 tags (Chrome / Edge). */
const STT_LOCALE: Record<string, string> = {
  ...TTS_LANG,
  as: "as-IN",
  ur: "ur-PK",
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

export function isBrowserSttSupported(): boolean {
  return getSpeechRecognition() !== null;
}

export function browserSttLocale(langCode: string): string {
  return STT_LOCALE[langCode] || "hi-IN";
}

export interface BrowserSttSession {
  promise: Promise<string>;
  stop: () => void;
}

/**
 * Listen for one farmer utterance using the browser's built-in speech recognition.
 * No API keys — works in Chrome / Edge on desktop and Android.
 */
export function startBrowserSttListen(langCode: string, maxMs = 20000): BrowserSttSession {
  const SR = getSpeechRecognition();
  if (!SR) {
    return {
      promise: Promise.reject(new Error("Browser speech recognition is not supported")),
      stop: () => undefined,
    };
  }

  let rec: SpeechRecognition | null = null;

  const promise = new Promise<string>((resolve, reject) => {
    rec = new SR();
    rec.lang = browserSttLocale(langCode);
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    let settled = false;
    const parts: string[] = [];

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
      }
      fn();
    };

    const timer = window.setTimeout(() => {
      try {
        rec?.stop();
      } catch {
        finish(() => reject(new Error("Listening timed out")));
      }
    }, maxMs);

    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0]?.transcript?.trim();
        if (chunk) parts.push(chunk);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      finish(() => reject(new Error(event.error || "Speech recognition failed")));
    };

    rec.onend = () => {
      const text = parts.join(" ").replace(/\s+/g, " ").trim();
      finish(() => (text ? resolve(text) : reject(new Error("no-speech"))));
    };

    try {
      rec.start();
    } catch (e) {
      finish(() => reject(e instanceof Error ? e : new Error("Could not start microphone")));
    }
  });

  return {
    promise,
    stop: () => {
      try {
        rec?.stop();
      } catch {
        // ignore
      }
    },
  };
}

/** @deprecated Use startBrowserSttListen */
export function listenWithBrowserStt(langCode: string, maxMs = 20000): Promise<string> {
  return startBrowserSttListen(langCode, maxMs).promise;
}
