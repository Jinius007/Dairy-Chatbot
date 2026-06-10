import {
  CONTENT_SAFETY_RULES,
  containsAbusiveLanguage,
  filterAbusiveLanguage,
} from "../_shared/content-safety.ts";
import { bhashiniLanguage, parseBhashiniAsrText } from "../_shared/bhashini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STEP_HINTS: Record<string, string> = {
  species: "The farmer is answering whether their animal is a cow (गाय / gaay) or buffalo (भैंस / bhains).",
  milking: "The farmer is answering whether the animal is currently giving milk (yes/no or doodh deti hai).",
  pregnant: "The farmer is answering whether the animal is pregnant (garbh / haan / nahi).",
  calvings: "The farmer is giving how many times the animal has calved (a number word like teen, aath).",
};

async function transcribeWithBhashini(
  audioBase64: string,
  mimeType: string,
  languageCode?: string,
): Promise<string | null> {
  const apiKey = Deno.env.get("BHASHINI_API_KEY");
  if (!apiKey) return null;

  const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const ext = (mimeType || "audio/webm").includes("mp4") ? "mp4" : "webm";
  const blob = new Blob([bytes], { type: mimeType || "audio/webm" });

  const form = new FormData();
  form.append("file", blob, `audio.${ext}`);
  form.append("language", bhashiniLanguage(languageCode));

  const resp = await fetch("https://tts.bhashini.ai/v2/asr", {
    method: "POST",
    headers: { "X-API-KEY": apiKey },
    body: form,
  });

  if (!resp.ok) {
    const detail = await resp.text();
    console.error("Bhashini ASR error:", resp.status, detail);
    return null;
  }

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const data = await resp.json();
    return parseBhashiniAsrText(data) || null;
  }
  const text = (await resp.text()).trim();
  return text || null;
}

async function transcribeWithGemini(
  audioBase64: string,
  mimeType: string,
  languageCode?: string,
  step?: string,
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const langHint = languageCode
    ? `The farmer is speaking in ${bhashiniLanguage(languageCode)} (code ${languageCode}). `
    : "";
  const stepHint = step && STEP_HINTS[step] ? `${STEP_HINTS[step]} ` : "";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a multilingual speech-to-text transcriber for the 12 major Indian languages plus English: " +
            "Hindi (Devanagari), Bengali, Tamil, Telugu, Marathi (Devanagari), Gujarati, Kannada, Malayalam, " +
            "Punjabi (Gurmukhi), Odia, Assamese, Urdu (Nastaliq), English (Latin). " +
            langHint +
            stepHint +
            "Transcribe the audio EXACTLY as spoken, in the NATIVE SCRIPT of the spoken language. " +
            "If the speaker mixes languages, transcribe each part in its own native script. " +
            "Output ONLY the transcript with no commentary, no quotes, no language label. " +
            CONTENT_SAFETY_RULES +
            " If the speech is abusive, output exactly: [BLOCKED]",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this audio." },
            {
              type: "input_audio",
              input_audio: { data: audioBase64, format: (mimeType || "audio/webm").includes("mp4") ? "mp4" : "webm" },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("Gemini transcribe error:", response.status, t);
    throw new Error("Transcription failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioBase64, mimeType, language, step } = await req.json();
    if (!audioBase64) throw new Error("audioBase64 required");

    let transcript = await transcribeWithBhashini(audioBase64, mimeType, language);
    if (!transcript) {
      transcript = await transcribeWithGemini(audioBase64, mimeType, language, step);
    }

    if (transcript === "[BLOCKED]" || containsAbusiveLanguage(transcript)) {
      return new Response(JSON.stringify({ transcript: "", blocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    transcript = filterAbusiveLanguage(transcript);
    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
