import {
  containsAbusiveLanguage,
  filterAbusiveLanguage,
} from "../../lib/content-safety.ts";
import { sarvamTranscribe } from "../../lib/sarvam.ts";

const jsonHeaders = { "Content-Type": "application/json" };

function decodeBase64Audio(audioBase64: string): Uint8Array {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function handleTranscribe(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const { audioBase64, mimeType, language } = await req.json();
    if (!audioBase64) throw new Error("audioBase64 required");

    const audioBytes = decodeBase64Audio(audioBase64);
    const transcript = await sarvamTranscribe(audioBytes, mimeType, language);

    if (transcript === "[BLOCKED]" || containsAbusiveLanguage(transcript)) {
      return new Response(JSON.stringify({ transcript: "", blocked: true }), {
        headers: jsonHeaders,
      });
    }
    return new Response(JSON.stringify({ transcript: filterAbusiveLanguage(transcript) }), {
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: jsonHeaders,
    });
  }
}
