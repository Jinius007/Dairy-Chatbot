import type { Request, Response } from "express";

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

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const catalyst = require("zcatalyst-sdk-node");
    const app = catalyst.initialize(req);
    const table = app.datastore().table("conversation_turns");
    await table.insertRow(row);
    res.status(200).json({ ok: true });
    return;
  } catch (e) {
    console.warn("Catalyst Data Store insert failed:", e);
  }

  res.status(503).json({
    error: "Logging not configured — create Catalyst Data Store table conversation_turns",
  });
}
