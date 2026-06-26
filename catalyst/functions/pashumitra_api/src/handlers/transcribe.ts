import {
  containsAbusiveLanguage,
  filterAbusiveLanguage,
} from "../../lib/content-safety.ts";
import { sarvamTranscribe } from "../../lib/sarvam.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeBase64Audio(audioBase64: string): Uint8Array {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function handleTranscribe(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioBase64, mimeType, language } = await req.json();
    if (!audioBase64) throw new Error("audioBase64 required");

    const audioBytes = decodeBase64Audio(audioBase64);
    const transcript = await sarvamTranscribe(audioBytes, mimeType, language);

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
}
