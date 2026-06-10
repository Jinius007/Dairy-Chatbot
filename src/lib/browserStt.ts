import { TTS_LANG } from "@/lib/languages";

/** Map ration language codes → Web Speech API BCP-47 tags (Chrome / Edge). */
const STT_LOCALE: Record<string, string> = {
  ...TTS_LANG,
  as: "as-IN",
  ur: "ur-PK",
};

/** Alternate tags Chrome on Windows sometimes needs. */
const LOCALE_ALIASES: Record<string, string[]> = {
  "hi-IN": ["hi"],
  "bn-IN": ["bn"],
  "ta-IN": ["ta"],
  "te-IN": ["te"],
  "mr-IN": ["mr"],
  "gu-IN": ["gu"],
  "kn-IN": ["kn"],
  "ml-IN": ["ml"],
  "pa-IN": ["pa"],
  "or-IN": ["or"],
  "en-IN": ["en-US", "en-GB"],
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

/**
 * STT language for Ration Advisor mic.
 * Uses Hindi unless the farmer explicitly chose English.
 */
export function rationAdvisorSttLang(selectedLang: string, step: string): string {
  if (selectedLang === "en") return "en";
  if (step === "language") return "hi";
  return selectedLang || "hi";
}

/** Ordered BCP-47 locales to try (primary + aliases + Hindi fallback). */
export function sttLocalesForLang(langCode: string): string[] {
  const primary = browserSttLocale(langCode);
  const out: string[] = [primary];
  for (const alias of LOCALE_ALIASES[primary] || []) {
    if (!out.includes(alias)) out.push(alias);
  }
  if (langCode !== "hi" && !out.includes("hi-IN")) out.push("hi-IN");
  if (!out.includes("hi")) out.push("hi");
  return out;
}

export interface BrowserSttSession {
  promise: Promise<string>;
  stop: () => void;
}

/** Listen using an explicit BCP-47 locale string. */
export function startBrowserSttListenForLocale(locale: string, maxMs = 20000): BrowserSttSession {
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
    rec.lang = locale;
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

export function startBrowserSttListen(langCode: string, maxMs = 20000): BrowserSttSession {
  return startBrowserSttListenForLocale(browserSttLocale(langCode), maxMs);
}

/**
 * Try primary locale then fallbacks (e.g. hi-IN → hi) so Hindi speech is not captured as English.
 */
export async function listenWithSttFallbacks(langCode: string, maxMs = 20000): Promise<string> {
  const locales = sttLocalesForLang(langCode);
  let lastError: Error | null = null;

  for (const locale of locales) {
    const session = startBrowserSttListenForLocale(locale, maxMs);
    try {
      const text = await session.promise;
      if (text.trim()) return text;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (lastError.message !== "no-speech") break;
    }
  }

  throw lastError || new Error("no-speech");
}
