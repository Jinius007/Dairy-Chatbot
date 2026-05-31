/** Log Q&A turns to Supabase via Vercel (server-side service role). */
export type LogMode = "chat" | "voice" | "call";

export interface LogTurnPayload {
  session_id: string;
  conversation_id?: string | null;
  question: string;
  answer: string;
  duration_ms?: number | null;
  language?: string | null;
  is_voice?: boolean;
  mode?: LogMode;
}

export async function logConversationTurn(payload: LogTurnPayload): Promise<void> {
  const question = payload.question?.trim();
  const answer = payload.answer?.trim();
  if (!question || !answer || !payload.session_id) return;

  try {
    const res = await fetch("/api/log-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: payload.session_id,
        conversation_id: payload.conversation_id ?? null,
        question,
        answer,
        duration_ms: payload.duration_ms ?? null,
        language: payload.language ?? null,
        is_voice: payload.is_voice ?? false,
        mode: payload.mode ?? "chat",
      }),
    });
    if (!res.ok) console.warn("log-turn failed:", res.status);
  } catch (e) {
    console.warn("log-turn error:", e);
  }
}
