import type { Request, Response } from "express";

/** Best-effort Q&A logging — succeeds even when no DB is configured. */
export async function handleLogTurn(req: Request, res: Response): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const question = String(req.body?.question || "").trim();
  const answer = String(req.body?.answer || "").trim();
  const session_id = String(req.body?.session_id || "").trim();
  if (!question || !answer || !session_id) {
    res.status(400).json({ error: "question, answer, session_id required" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      const row = {
        session_id,
        conversation_id: req.body?.conversation_id ? String(req.body.conversation_id) : null,
        question: question.slice(0, 50000),
        answer: answer.slice(0, 50000),
        duration_ms: typeof req.body?.duration_ms === "number" ? Math.round(req.body.duration_ms) : null,
        language: req.body?.language ? String(req.body.language) : null,
        is_voice: Boolean(req.body?.is_voice),
        mode: req.body?.mode === "call" || req.body?.mode === "voice" ? req.body.mode : "chat",
      };
      const resp = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/conversation_turns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(row),
      });
      if (resp.ok) {
        res.status(200).json({ ok: true });
        return;
      }
      console.warn("Supabase log-turn failed:", resp.status, await resp.text());
    } catch (e) {
      console.warn("Supabase log-turn error:", e);
    }
  }

  res.status(200).json({ ok: true, logged: false });
}
