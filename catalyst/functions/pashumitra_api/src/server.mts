import type { Request, Response } from "express";
import express from "express";
import { handleChat } from "./handlers/chat.ts";
import { handleTranscribe } from "./handlers/transcribe.ts";
import { handleLogTurn } from "./routes/log-turn.mts";
import { handleTts } from "./routes/tts.mts";
import { handleYoutubeSearch } from "./routes/youtube-search.mts";

const app = express();
app.use(express.json({ limit: "20mb" }));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

app.use((_req, res, next) => {
  res.set(corsHeaders);
  next();
});

async function relayWebHandler(
  handler: (req: Request) => Promise<Response>,
  req: Request,
  res: Response,
): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const url = `${req.protocol}://${req.get("host") || "localhost"}${req.originalUrl}`;
  const init: RequestInit = {
    method: req.method,
    headers: { "Content-Type": "application/json" },
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = JSON.stringify(req.body ?? {});
  }

  const webRes = await handler(new Request(url, init));
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });

  if (!webRes.body) {
    res.end();
    return;
  }

  const reader = webRes.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

app.options("/chat", (_req, res) => res.status(204).end());
app.post("/chat", (req, res) => void relayWebHandler(handleChat, req, res).catch((e) => {
  console.error("chat route error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

app.options("/transcribe", (_req, res) => res.status(204).end());
app.post("/transcribe", (req, res) => void relayWebHandler(handleTranscribe, req, res).catch((e) => {
  console.error("transcribe route error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

app.options("/log-turn", (_req, res) => res.status(204).end());
app.post("/log-turn", (req, res) => void handleLogTurn(req, res).catch((e) => {
  console.error("log-turn error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

app.options("/tts", (_req, res) => res.status(204).end());
app.post("/tts", (req, res) => void handleTts(req, res).catch((e) => {
  console.error("tts error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

app.options("/youtube-search", (_req, res) => res.status(204).end());
app.post("/youtube-search", (req, res) => void handleYoutubeSearch(req, res).catch((e) => {
  console.error("youtube-search error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "pashumitra_api", llm: "sarvam", rag: "catalyst-keyword", knowledge: "catalyst/lib/knowledge" });
});

module.exports = app;
