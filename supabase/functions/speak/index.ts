const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EDGE_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

const VOICE_MAP: Record<string, { voice: string; locale: string }> = {
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

function escapeSsml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function chunkText(text: string, max = 380): string[] {
  if (text.length <= max) return [text];
  const parts = text.match(new RegExp(`.{1,${max}}(?:[।.!?;:\\s]|$)`, "g"));
  return parts?.map((p) => p.trim()).filter(Boolean) ?? [text.slice(0, max)];
}

async function synthesizeChunk(text: string, lang: string): Promise<ArrayBuffer> {
  const cfg = VOICE_MAP[lang] || VOICE_MAP.hi;
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
    const detail = await response.text().catch(() => "");
    throw new Error(`TTS failed (${response.status}): ${detail.slice(0, 120)}`);
  }

  return response.arrayBuffer();
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, lang = "hi" } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clean = text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[`*_#>~]/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) {
      return new Response(JSON.stringify({ error: "empty text after cleanup" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const language = typeof lang === "string" ? lang.toLowerCase() : "hi";
    const chunks = chunkText(clean);
    const audioParts: string[] = [];

    for (const part of chunks) {
      const audio = await synthesizeChunk(part, language);
      audioParts.push(toBase64(audio));
    }

    return new Response(
      JSON.stringify({
        audioBase64: audioParts.length === 1 ? audioParts[0] : null,
        audioParts,
        mimeType: "audio/mpeg",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("speak error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
