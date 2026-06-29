/** Parse [[LANG:xx]] header and stream chat completions from Catalyst. */

import { readSseChatStream } from "@/lib/chat-stream";
import { createTimeoutSignal, anyAbortSignal } from "@/lib/abort-utils";

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

const CHAT_STREAM_TIMEOUT_MS = 120_000;

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

  const combinedSignal = signal
    ? anyAbortSignal([signal, createTimeoutSignal(CHAT_STREAM_TIMEOUT_MS)])
    : createTimeoutSignal(CHAT_STREAM_TIMEOUT_MS);

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages,
      stream: true,
      mode,
      forceLanguage,
    }),
    signal: combinedSignal,
  });

  if (!resp.ok) {
    const errPayload = await resp.json().catch(() => ({}));
    const msg = (errPayload as { error?: string }).error || `Chat failed (${resp.status})`;
    throw new Error(msg);
  }

  if (resp.body) {
    const { text } = await readSseChatStream(resp.body, combinedSignal);
    if (text.trim()) return text;
  }

  const payload = await resp.json().catch(() => ({}));
  return extractNonStreamText(payload);
}
