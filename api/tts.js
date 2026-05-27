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

    const language = BHASHINI_LANG[String(lang).toLowerCase()] || BHASHINI_LANG.hi;
    const headers = { "Content-Type": "application/json" };
    const apiKey = process.env.BHASHINI_API_KEY;
    if (apiKey) headers["X-API-KEY"] = apiKey;

    const resp = await fetch("https://tts.bhashini.ai/v2/synthesize", {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: clean,
        language,
        voiceName: "Female1",
        speechRate: 1.0,
        voiceStyle: "Conversational",
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return new Response(JSON.stringify({ error: detail || `Bhashini TTS error ${resp.status}` }), {
        status: resp.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const audio = await resp.arrayBuffer();
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
      headers: { "Content-Type": "application/json" },
    });
  }
}
