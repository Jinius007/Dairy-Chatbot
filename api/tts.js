export const config = { runtime: "edge" };

const EDGE_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

const VOICES = {
  hi: { voice: "hi-IN-SwaraNeural", locale: "hi-IN" },
  bn: { voice: "bn-IN-TanishaaNeural", locale: "bn-IN" },
  ta: { voice: "ta-IN-PallaviNeural", locale: "ta-IN" },
  te: { voice: "te-IN-ShrutiNeural", locale: "te-IN" },
  mr: { voice: "mr-IN-AarohiNeural", locale: "mr-IN" },
  gu: { voice: "gu-IN-DhwaniNeural", locale: "gu-IN" },
  kn: { voice: "kn-IN-SapnaNeural", locale: "kn-IN" },
  ml: { voice: "ml-IN-SobhanaNeural", locale: "ml-IN" },
  pa: { voice: "pa-IN-VaaniNeural", locale: "pa-IN" },
  or: { voice: "hi-IN-SwaraNeural", locale: "hi-IN" },
  as: { voice: "hi-IN-SwaraNeural", locale: "hi-IN" },
  ur: { voice: "ur-PK-UzmaNeural", locale: "ur-PK" },
  en: { voice: "en-IN-NeerjaNeural", locale: "en-IN" },
};

function detectLang(text) {
  for (const char of text) {
    const cp = char.codePointAt(0) || 0;
    if (cp >= 0x0980 && cp <= 0x09ff) return /[ৰৱ]/.test(char) ? "as" : "bn";
    if (cp >= 0x0900 && cp <= 0x097f) return /[ळऱ]/.test(char) ? "mr" : "hi";
    if (cp >= 0x0b80 && cp <= 0x0bff) return "ta";
    if (cp >= 0x0c00 && cp <= 0x0c7f) return "te";
    if (cp >= 0x0a80 && cp <= 0x0aff) return "gu";
    if (cp >= 0x0c80 && cp <= 0x0cff) return "kn";
    if (cp >= 0x0d00 && cp <= 0x0d7f) return "ml";
    if (cp >= 0x0a00 && cp <= 0x0a7f) return "pa";
    if (cp >= 0x0b00 && cp <= 0x0b7f) return "or";
    if (cp >= 0x0600 && cp <= 0x06ff) return "ur";
  }
  return /[a-z]/i.test(text) ? "en" : "hi";
}

function cleanForSpeech(text) {
  return String(text || "")
    .replace(/\[?\[?\s*LANG\s*:\s*[a-zA-Z]{2}\s*\]?\]?/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>~[\]]/g, "")
    .replace(/^\s*[-–—•]\s+/gm, "")
    .replace(/(\d)\s*[-–—]\s*(?=\d)/g, "$1 to ")
    .replace(/\s+[-–—]\s+/g, ", ")
    .replace(/[-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeSsml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function chunkText(text, max = 360) {
  if (text.length <= max) return [text];
  const parts = text.match(new RegExp(`.{1,${max}}(?:[।.!?;:\\s]|$)`, "g"));
  return parts?.map((p) => p.trim()).filter(Boolean) || [text.slice(0, max)];
}

async function synthesize(text, lang) {
  const cfg = VOICES[lang] || VOICES.hi;
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${cfg.locale}'><voice name='${cfg.voice}'>${escapeSsml(text)}</voice></speak>`;

  const response = await fetch(
    `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TOKEN}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
      },
      body: ssml,
    },
  );

  if (!response.ok) {
    throw new Error(`TTS upstream error ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function concatAudio(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
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
    const { text, lang } = await request.json();
    const clean = cleanForSpeech(text);
    if (!clean) {
      return new Response(JSON.stringify({ error: "Empty text" }), { status: 400 });
    }

    const language = VOICES[lang] ? lang : detectLang(clean);
    const parts = chunkText(clean);
    const audioChunks = [];

    for (const part of parts) {
      audioChunks.push(await synthesize(part, language));
    }

    const audio = concatAudio(audioChunks);
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("tts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "TTS failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
