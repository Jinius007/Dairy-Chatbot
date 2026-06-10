import {
  CONTENT_SAFETY_RULES,
  containsAbusiveLanguage,
  filterAbusiveLanguage,
} from "../_shared/content-safety.ts";
import { bhashiniLanguage } from "../_shared/bhashini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STEP_HINTS: Record<string, string> = {
  language: "The farmer is choosing their language (Hindi, Bengali, Tamil, etc.).",
  locationConfirm: "The farmer is confirming yes or no whether the detected location is correct.",
  locationManual: "The farmer is saying their village and district name.",
  species: "The farmer is answering cow (गाय / gaay) or buffalo (भैंस / bhains).",
  calvings: "The farmer is saying how many times the animal has calved (a number like teen, aath, or not yet).",
  milking: "The farmer is answering whether the animal gives milk now (yes/no or doodh deti hai).",
  months: "The farmer is saying months since calving (e.g. aath mahine, rendu masam).",
  yield: "The farmer is saying daily milk yield in litres (e.g. das litre, padi litre).",
  fat: "The farmer is saying milk fat percent (e.g. char pratishat) or don't know.",
  snf: "The farmer is saying SNF percent or skip/don't know.",
  price: "The farmer is saying milk price per litre in rupees (e.g. tees rupaye) or don't know.",
  pregnant: "The farmer is answering whether the animal is pregnant (garbh / haan / nahi).",
  pregMonth: "The farmer is saying pregnancy month number (1-9, e.g. saat mahina).",
  feedName: "The farmer is naming a feed they give (e.g. bhusa, berseem, chokar).",
  feedMore: "The farmer is naming another feed or saying done/bas when finished.",
};

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

    const transcript = await transcribeWithGemini(audioBase64, mimeType, language, step);

    if (transcript === "[BLOCKED]" || containsAbusiveLanguage(transcript)) {
      return new Response(JSON.stringify({ transcript: "", blocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ transcript: filterAbusiveLanguage(transcript) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
