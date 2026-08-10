const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function env(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) return process.env[key];
  // @ts-expect-error Deno shim in bundled Catalyst build
  if (typeof Deno !== "undefined") return Deno.env.get(key);
  return undefined;
}

export function getGeminiApiKey(): string {
  const key = env("GEMINI_API_KEY") || env("GOOGLE_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  return key;
}

export function hasGeminiApiKey(): boolean {
  return Boolean(env("GEMINI_API_KEY") || env("GOOGLE_API_KEY"));
}

export function getGeminiChatModel(): string {
  return env("GEMINI_CHAT_MODEL") || "gemini-2.0-flash";
}

export type ChatMessage = { role: string; content: string };

type GeminiContent = { role: string; parts: { text: string }[] };

function buildGeminiRequest(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
): Record<string, unknown> {
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const m of messages) {
    if (!m.content?.trim()) continue;
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    const role = m.role === "assistant" ? "model" : "user";
    contents.push({ role, parts: [{ text: m.content }] });
  }

  const merged: GeminiContent[] = [];
  for (const c of contents) {
    const last = merged[merged.length - 1];
    if (last && last.role === c.role) {
      last.parts[0].text += `\n\n${c.parts[0].text}`;
    } else {
      merged.push({ role: c.role, parts: [{ text: c.parts[0].text }] });
    }
  }
  if (merged.length > 0 && merged[0].role === "model") {
    merged.unshift({ role: "user", parts: [{ text: "(conversation continues)" }] });
  }

  return {
    ...(systemParts.length
      ? { systemInstruction: { parts: [{ text: systemParts.join("\n\n") }] } }
      : {}),
    contents: merged,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };
}

function openAiSseChunk(text: string): Uint8Array {
  const line = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
  return new TextEncoder().encode(line);
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const o = payload as Record<string, unknown>;
  const candidates = o.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
  const part = candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof part === "string" ? part : "";
}

async function geminiStreamToOpenAiSse(upstream: Response): Promise<Response> {
  if (!upstream.body) {
    return new Response(null, { status: upstream.status, statusText: upstream.statusText });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json) as unknown;
              const chunk = extractGeminiText(parsed);
              if (chunk) controller.enqueue(openAiSseChunk(chunk));
            } catch {
              /* ignore partial json */
            }
          }
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/** OpenAI-compatible chat completion backed by Google Gemini. */
export async function geminiChatCompletion(body: Record<string, unknown>): Promise<Response> {
  const messages = (body.messages as ChatMessage[]) || [];
  const temperature = typeof body.temperature === "number" ? body.temperature : 0.4;
  const maxTokens = typeof body.max_tokens === "number" ? body.max_tokens : 1200;
  const stream = body.stream === true;
  const model = typeof body.model === "string" && body.model.trim() ? body.model : getGeminiChatModel();
  const key = getGeminiApiKey();
  const payload = buildGeminiRequest(messages, temperature, maxTokens);
  const action = stream ? "streamGenerateContent" : "generateContent";
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:${action}?key=${encodeURIComponent(key)}${stream ? "&alt=sse" : ""}`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) return upstream;
  if (stream) return geminiStreamToOpenAiSse(upstream);

  const data = await upstream.json();
  const text = extractGeminiText(data);
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: text } }],
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

/** Parse chat text from Gemini or legacy OpenAI/Sarvam JSON bodies. */
export function extractChatText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  const fromGemini = extractGeminiText(data);
  if (fromGemini.trim()) return fromGemini;
  if (typeof d.message === "string" && d.message.trim()) return d.message;
  if (typeof d.response === "string" && d.response.trim()) return d.response;
  if (typeof d.content === "string" && d.content.trim()) return d.content;
  const fromChoice = (d.choices as { message?: { content?: string } }[] | undefined)?.[0]?.message?.content;
  if (typeof fromChoice === "string" && fromChoice.trim()) return fromChoice;
  if (typeof d.text === "string") return d.text;
  if (typeof d.output === "string") return d.output;
  return "";
}
