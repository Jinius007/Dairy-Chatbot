/** Bhashini + Google Translate TTS — Catalyst-hosted (no Vercel). */
import { BHASHINI_LANG } from "./bhashini.ts";

const BHASHINI_SUPPORTED = new Set(["hi", "bn", "ta", "te", "mr", "kn", "ml", "en"]);

const GOOGLE_TTS_LANG: Record<string, string> = {
  gu: "gu",
  pa: "pa",
  ur: "ur",
  or: "hi",
  as: "bn",
};

export function cleanTtsText(text: string): string {
  return String(text || "")
    .replace(/\[?\[?\s*LANG\s*:\s*[a-zA-Z]{2}\s*\]?\]?/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>~[\]]/g, "")
    .replace(/^\s*[-–—•]\s+/gm, "")
    .replace(/(\d)\s*[-–—]\s*(?=\d)/g, "$1 to ")
    .replace(/\s+[-–—]\s+/g, ", ")
    .replace(/[-–—]+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text: string, max = 180): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.5) cut = max;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
}

function concatAudio(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function synthesizeBhashini(text: string, lang: string, apiKey?: string): Promise<Uint8Array> {
  const language = BHASHINI_LANG[lang] || BHASHINI_LANG.hi;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-API-KEY"] = apiKey;

  const resp = await fetch("https://tts.bhashini.ai/v2/synthesize", {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      language,
      voiceName: "Female1",
      speechRate: 1.0,
      voiceStyle: "Neutral",
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(detail || `Bhashini TTS error ${resp.status}`);
  }

  return new Uint8Array(await resp.arrayBuffer());
}

async function synthesizeGoogle(text: string, lang: string): Promise<Uint8Array> {
  const tl = GOOGLE_TTS_LANG[lang] || lang;
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
  });

  if (!resp.ok) throw new Error(`Google TTS error ${resp.status}`);
  return new Uint8Array(await resp.arrayBuffer());
}

export async function synthesizeSpeech(text: string, lang = "hi"): Promise<Uint8Array> {
  const code = String(lang || "hi").toLowerCase();
  const apiKey = Deno.env.get("BHASHINI_API_KEY");
  const useBhashini = BHASHINI_SUPPORTED.has(code);
  const parts = chunkText(text);
  const audioChunks: Uint8Array[] = [];

  for (const part of parts) {
    if (useBhashini) {
      try {
        audioChunks.push(await synthesizeBhashini(part, code, apiKey));
        continue;
      } catch {
        // Fall through to Google if Bhashini rejects this language/voice.
      }
    }
    audioChunks.push(await synthesizeGoogle(part, code));
  }

  return concatAudio(audioChunks);
}
