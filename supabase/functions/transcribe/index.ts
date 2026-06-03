import {
  CONTENT_SAFETY_RULES,
  containsAbusiveLanguage,
  filterAbusiveLanguage,
} from "../_shared/content-safety.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioBase64, mimeType } = await req.json();
    if (!audioBase64) throw new Error("audioBase64 required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
      console.error("transcribe error:", response.status, t);
      return new Response(JSON.stringify({ error: "Transcription failed" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let transcript = data.choices?.[0]?.message?.content?.trim() || "";
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
