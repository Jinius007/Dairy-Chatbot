import { detectLanguageCode } from "../../lib/languages.ts";
import { ensureNativeScriptText } from "../../lib/native-script.ts";

const jsonHeaders = { "Content-Type": "application/json" };

export async function handleNativeScript(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const { text, language } = await req.json() as { text?: string; language?: string };
    if (!text?.trim()) {
      return new Response(JSON.stringify({ text: "" }), { headers: jsonHeaders });
    }
    const lang = language || detectLanguageCode(text) || "hi";
    const converted = await ensureNativeScriptText(text, lang);
    return new Response(JSON.stringify({ text: converted, language: lang }), { headers: jsonHeaders });
  } catch (e) {
    console.error("native-script error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}
