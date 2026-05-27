// 12 major Indian languages + English
export const LANG_NAMES: Record<string, string> = {
  hi: "हिन्दी",       // Hindi
  bn: "বাংলা",        // Bengali
  ta: "தமிழ்",        // Tamil
  te: "తెలుగు",       // Telugu
  mr: "मराठी",        // Marathi
  gu: "ગુજરાતી",      // Gujarati
  kn: "ಕನ್ನಡ",        // Kannada
  ml: "മലയാളം",       // Malayalam
  pa: "ਪੰਜਾਬੀ",       // Punjabi
  or: "ଓଡ଼ିଆ",         // Odia
  as: "অসমীয়া",       // Assamese
  ur: "اردو",          // Urdu
  en: "English",
};

export const TTS_LANG: Record<string, string> = {
  hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN",
  gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", or: "or-IN",
  as: "as-IN", ur: "ur-IN", en: "en-IN",
};

export const LANG_CODES = Object.keys(LANG_NAMES);

export function detectLanguageCode(text: string): string | null {
  const counts: Record<string, number> = {};
  const add = (code: string) => { counts[code] = (counts[code] || 0) + 1; };

  for (const char of text) {
    const cp = char.codePointAt(0) || 0;
    if (cp >= 0x0900 && cp <= 0x097f) add(/[ळऱ]/.test(char) ? "mr" : "hi");
    else if (cp >= 0x0980 && cp <= 0x09ff) add(/[ৰৱ]/.test(char) ? "as" : "bn");
    else if (cp >= 0x0b00 && cp <= 0x0b7f) add("or");
    else if (cp >= 0x0a00 && cp <= 0x0a7f) add("pa");
    else if (cp >= 0x0a80 && cp <= 0x0aff) add("gu");
    else if (cp >= 0x0b80 && cp <= 0x0bff) add("ta");
    else if (cp >= 0x0c00 && cp <= 0x0c7f) add("te");
    else if (cp >= 0x0c80 && cp <= 0x0cff) add("kn");
    else if (cp >= 0x0d00 && cp <= 0x0d7f) add("ml");
    else if (cp >= 0x0600 && cp <= 0x06ff) add("ur");
  }

  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (best) return best;
  return /[a-z]/i.test(text) ? "en" : null;
}

export function prepareTextForSpeech(text: string): string {
  return text
    .replace(/\[?\[?\s*LANG\s*:\s*[a-zA-Z]{2}\s*\]?\]?/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>~[\]]/g, "")
    .replace(/^\s*[-–—•]\s+/gm, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/(\d)\s*[-–—]\s*(?=\d)/g, "$1 to ")
    .replace(/\s+[-–—]\s+/g, ", ")
    .replace(/[-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split long replies into TTS-sized chunks (Bhashini truncates long input). */
export function splitForTts(text: string, maxLen = 180): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLen) return [trimmed];

  const sentences = trimmed
    .split(/(?<=[.!?।\u0964\u0965])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return hardSplitForTts(trimmed, maxLen);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > maxLen) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...hardSplitForTts(sentence, maxLen));
      continue;
    }
    const combined = current ? `${current} ${sentence}` : sentence;
    if (combined.length > maxLen) {
      if (current) chunks.push(current);
      current = sentence;
    } else {
      current = combined;
    }
  }

  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function hardSplitForTts(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const combined = current ? `${current} ${word}` : word;
    if (combined.length > maxLen) {
      if (current) chunks.push(current);
      if (word.length > maxLen) {
        for (let i = 0; i < word.length; i += maxLen) {
          chunks.push(word.slice(i, i + maxLen));
        }
        current = "";
      } else {
        current = word;
      }
    } else {
      current = combined;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
