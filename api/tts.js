/** Bhashini.ai TTS proxy — https://tts.bhashini.ai/openapi/ */
export const config = { runtime: "edge" };

const BHASHINI_LANG = {
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  or: "Odia",
  as: "Assamese",
  ur: "Urdu",
  en: "English",
};

/** Bhashini v2 only voices these languages reliably (see bhashini.ai/tts). */
const BHASHINI_SUPPORTED = new Set(["hi", "bn", "ta", "te", "mr", "kn", "ml", "en"]);

/** Google Translate TTS codes for languages Bhashini does not support. */
const GOOGLE_TTS_LANG = {
  gu: "gu",
  pa: "pa",
  ur: "ur",
  or: "hi",
  as: "bn",
};

function cleanText(text) {
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

function chunkText(text, max = 180) {
  if (text.length <= max) return [text];
  const parts = [];
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

function concatAudio(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function synthesizeBhashini(text, lang, apiKey) {
  const language = BHASHINI_LANG[lang] || BHASHINI_LANG.hi;
  const headers = { "Content-Type": "application/json" };
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

async function synthesizeGoogle(text, lang) {
  const tl = GOOGLE_TTS_LANG[lang] || lang;
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
  });

  if (!resp.ok) {
    throw new Error(`Google TTS error ${resp.status}`);
  }

  return new Uint8Array(await resp.arrayBuffer());
}

async function synthesize(text, lang, apiKey) {
  const code = String(lang || "hi").toLowerCase();
  const useBhashini = BHASHINI_SUPPORTED.has(code);
  const parts = chunkText(text);
  const audioChunks = [];

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

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { text, lang = "hi" } = await request.json();
    const clean = cleanText(text);
    if (!clean) {
      return new Response(JSON.stringify({ error: "Empty text" }), { status: 400 });
    }

    const apiKey = process.env.BHASHINI_API_KEY;
    const audio = await synthesize(clean, lang, apiKey);

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "TTS failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
