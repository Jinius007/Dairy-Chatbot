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

  return Buffer.from(await response.arrayBuffer());
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, lang = "hi" } = req.body || {};
    const clean = cleanForSpeech(text);
    if (!clean) return res.status(400).json({ error: "Empty text" });

    const language = String(lang).toLowerCase();
    const chunks = chunkText(clean);
    const buffers = [];

    for (const part of chunks) {
      buffers.push(await synthesize(part, language));
    }

    const audio = Buffer.concat(buffers);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audio);
  } catch (e) {
    console.error("tts error:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "TTS failed" });
  }
}
