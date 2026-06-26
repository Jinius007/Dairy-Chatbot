/**
 * Chat backend URL — swap Gemini (Supabase) vs self-hosted RAG (org GPU) via env only.
 *
 * Local / org GPU (data stays on your servers):
 *   VITE_LOCAL_RAG_CHAT_URL=http://your-gpu-server:8090/v1/chat/completions
 *
 * Default (cloud Gemini via Supabase edge function):
 *   VITE_SUPABASE_URL + /functions/v1/chat
 */
export function getChatCompletionsUrl(): string {
  const local = import.meta.env.VITE_LOCAL_RAG_CHAT_URL?.trim();
  if (local) return local.replace(/\/$/, "");
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) throw new Error("Set VITE_LOCAL_RAG_CHAT_URL or VITE_SUPABASE_URL");
  return `${base.replace(/\/$/, "")}/functions/v1/chat`;
}

export function isLocalRagChat(): boolean {
  return Boolean(import.meta.env.VITE_LOCAL_RAG_CHAT_URL?.trim());
}

export function getChatRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isLocalRagChat()) {
    const token = import.meta.env.VITE_LOCAL_RAG_API_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key) {
    headers.apikey = key;
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}
