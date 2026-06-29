/** Robust SSE parser for Sarvam/OpenAI-style chat streams. */

const STREAM_IDLE_MS = 45_000;

export type SseChatStreamResult = {
  text: string;
  finishReason: string | null;
};

type SseChoiceChunk = {
  choices?: {
    delta?: { content?: string };
    message?: { content?: string };
    finish_reason?: string | null;
  }[];
};

async function readChunkWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idleMs: number,
  signal?: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new DOMException("Stream idle timeout", "AbortError"));
    }, idleMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    reader.read().then(
      (result) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(result);
      },
      (err) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

function appendSseChunk(full: string, parsed: SseChoiceChunk): string {
  const delta = parsed.choices?.[0]?.delta?.content;
  const message = parsed.choices?.[0]?.message?.content;
  if (typeof delta === "string") return full + delta;
  if (typeof message === "string") return full + message;
  return full;
}

function finishReasonFrom(parsed: SseChoiceChunk): string | null {
  const reason = parsed.choices?.[0]?.finish_reason;
  return typeof reason === "string" ? reason : null;
}

function processSseLine(
  line: string,
  state: { full: string; finishReason: string | null; done: boolean },
  onChunk?: (full: string) => void,
): void {
  if (!line.startsWith("data: ")) return;
  const json = line.slice(6).trim();
  if (!json) return;
  if (json === "[DONE]") {
    state.done = true;
    return;
  }
  const parsed = JSON.parse(json) as SseChoiceChunk;
  const prevLen = state.full.length;
  state.full = appendSseChunk(state.full, parsed);
  const reason = finishReasonFrom(parsed);
  if (reason) state.finishReason = reason;
  if (onChunk && state.full.length > prevLen) onChunk(state.full);
}

function drainSseBuffer(
  buffer: string,
  state: { full: string; finishReason: string | null; done: boolean },
  onChunk?: (full: string) => void,
): string {
  let rest = buffer;
  let nl: number;
  while ((nl = rest.indexOf("\n")) !== -1) {
    let line = rest.slice(0, nl);
    rest = rest.slice(nl + 1);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    try {
      processSseLine(line, state, onChunk);
    } catch {
      rest = line + "\n" + rest;
      break;
    }
    if (state.done) break;
  }
  return rest;
}

/** Read an SSE chat stream, flushing partial lines and trailing decoder bytes. */
export async function readSseChatStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
  onChunk?: (full: string) => void,
): Promise<SseChatStreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const state = { full: "", finishReason: null as string | null, done: false };

  while (!state.done) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await readChunkWithIdleTimeout(reader, STREAM_IDLE_MS, signal);
    if (done) {
      buffer += decoder.decode(undefined, { stream: false });
      buffer = drainSseBuffer(buffer, state, onChunk);
      const tail = buffer.trim();
      if (tail && !state.done) {
        try {
          processSseLine(tail, state, onChunk);
        } catch {
          /* ignore malformed tail */
        }
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    buffer = drainSseBuffer(buffer, state, onChunk);
  }

  return { text: state.full, finishReason: state.finishReason };
}
