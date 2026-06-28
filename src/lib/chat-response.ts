/** Parse [[LANG:xx]] header and stream chat completions from Catalyst. */

export function splitLangHeader(text: string): { lang: string | null; body: string } {
  let source = String(text || "");
  let lang: string | null = null;
  const re = /\[?\[?\s*LANG\s*:\s*([a-zA-Z]{2})\s*\]?\]?/i;
  const m = source.match(re);
  if (m) {
    lang = m[1].toLowerCase();
    const idx = m.index ?? 0;
    source = (source.slice(0, idx) + source.slice(idx + m[0].length)).replace(/^\s+/, "");
  }
  return { lang, body: source };
}

function extractNonStreamText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  if (typeof data.text === "string") return data.text;
  if (typeof data.message === "string") return data.message;
  const choices = data.choices as { message?: { content?: string } }[] | undefined;
  const fromChoice = choices?.[0]?.message?.content;
  return typeof fromChoice === "string" ? fromChoice : "";
}

async function readSseChatStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
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
      if (json === "[DONE]") return full;
      try {
        const parsed = JSON.parse(json) as {
          choices?: { delta?: { content?: string }; message?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        const message = parsed.choices?.[0]?.message?.content;
        if (typeof delta === "string") full += delta;
        else if (typeof message === "string") full += message;
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  return full;
}

export type ChatCompletionOptions = {
  messages: { role: string; content: string }[];
  mode?: "chat" | "call" | "voice" | "ration_advisory";
  forceLanguage?: string | null;
  signal?: AbortSignal;
  url: string;
  headers?: Record<string, string>;
};

/** Stream chat (default for web + call — matches working ChatView path). */
export async function fetchChatCompletionText(options: ChatCompletionOptions): Promise<string> {
  const {
    messages,
    mode = "chat",
    forceLanguage = null,
    signal,
    url,
    headers = { "Content-Type": "application/json" },
  } = options;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages,
      stream: true,
      mode,
      forceLanguage,
    }),
    signal,
  });

  if (!resp.ok) {
    const errPayload = await resp.json().catch(() => ({}));
    const msg = (errPayload as { error?: string }).error || `Chat failed (${resp.status})`;
    throw new Error(msg);
  }

  if (resp.body) {
    const streamed = await readSseChatStream(resp.body, signal);
    if (streamed.trim()) return streamed;
  }

  const payload = await resp.json().catch(() => ({}));
  return extractNonStreamText(payload);
}
