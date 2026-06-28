import type { Request, Response } from "express";
import { cleanTtsText, synthesizeSpeech } from "../../lib/tts.ts";

export async function handleTts(req: Request, res: Response): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { text, lang = "hi", callMode = false } = req.body ?? {};
    const clean = cleanTtsText(String(text || ""));
    if (!clean) {
      res.status(400).json({ error: "Empty text" });
      return;
    }

    const { audio, contentType } = await synthesizeSpeech(clean, String(lang), {
      callMode: Boolean(callMode),
    });
    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(audio));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "TTS failed" });
  }
}
