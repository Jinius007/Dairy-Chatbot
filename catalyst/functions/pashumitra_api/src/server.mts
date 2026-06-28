import type { Request, Response } from "express";
import express from "express";
import { handleChat } from "./handlers/chat.ts";
import { handleTranscribe } from "./handlers/transcribe.ts";
import { handleLogTurn } from "./routes/log-turn.mts";
import { handleTts } from "./routes/tts.mts";
import { handleYoutubeSearch } from "./routes/youtube-search.mts";
import {
  handleVobizAnswer,
  handleVobizAudio,
  handleVobizError,
  handleVobizFallback,
  handleVobizHangup,
  handleVobizListen,
  handleVobizMenu,
  handleVobizPhrase,
  handleVobizPing,
  handleVobizProcess,
  handleVobizRecorded,
  handleVobizSpeech,
  handleVobizReply,
  handleVobizStaticClip,
  handleVobizStaticGreeting,
  handleVobizWebhook,
} from "./routes/vobiz.mts";

const app = express();

// CORS is handled by Catalyst gateway for whitelisted Slate domains — do not set
// Access-Control-* here or handlers (duplicate values break the browser).

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Vobiz sends form-urlencoded — parse before JSON middleware.
app.use("/vobiz", express.urlencoded({ extended: false }));
app.use(express.json({ limit: "20mb" }));

async function relayWebHandler(
  handler: (req: Request) => Promise<Response>,
  req: Request,
  res: Response,
): Promise<void> {
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
    const lower = key.toLowerCase();
    if (lower === "transfer-encoding" || lower.startsWith("access-control-")) return;
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

app.post("/chat", (req, res) => void relayWebHandler(handleChat, req, res).catch((e) => {
  console.error("chat route error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

app.post("/transcribe", (req, res) => void relayWebHandler(handleTranscribe, req, res).catch((e) => {
  console.error("transcribe route error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

app.post("/log-turn", (req, res) => void handleLogTurn(req, res).catch((e) => {
  console.error("log-turn error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

app.post("/tts", (req, res) => void handleTts(req, res).catch((e) => {
  console.error("tts error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

app.post("/youtube-search", (req, res) => void handleYoutubeSearch(req, res).catch((e) => {
  console.error("youtube-search error:", e);
  res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
}));

// Vobiz voice — must return XML in ~1–2 s or error 7012 (Error Reaching Action URL).
app.all("/vobiz/answer", (req, res) => handleVobizAnswer(req, res));
app.all("/vobiz/listen", (req, res) => handleVobizListen(req, res));
app.get("/vobiz/phrase/:name.mp3", (req, res) => void handleVobizPhrase(req, res).catch(() => {
  res.status(404).send("Phrase unavailable");
}));
app.all("/vobiz/ping", (req, res) => handleVobizPing(req, res));
app.all("/vobiz/fallback", (req, res) => handleVobizFallback(req, res));
app.all("/vobiz/speech", (req, res) => {
  try {
    handleVobizSpeech(req, res);
  } catch (e) {
    console.error("vobiz speech error:", e);
    handleVobizError(req, res);
  }
});
app.all("/vobiz/recorded", (req, res) => {
  try {
    handleVobizRecorded(req, res);
  } catch (e) {
    console.error("vobiz recorded error:", e);
    handleVobizError(req, res);
  }
});
app.all("/vobiz/reply", (req, res) => void handleVobizReply(req, res).catch((e) => {
  console.error("vobiz reply error:", e);
  handleVobizError(req, res);
}));
app.all("/vobiz/process", (req, res) => void handleVobizProcess(req, res).catch((e) => {
  console.error("vobiz process error:", e);
  handleVobizError(req, res);
}));
app.all("/vobiz/menu", (req, res) => handleVobizMenu(req, res));
app.get("/vobiz/static/greeting.mp3", (req, res) => handleVobizStaticGreeting(req, res));
app.get("/vobiz/static/:clip.mp3", (req, res) => handleVobizStaticClip(req, res));
app.get("/vobiz/audio/:id", (req, res) => handleVobizAudio(req, res));
app.all("/vobiz/hangup", (req, res) => handleVobizHangup(req, res));
app.all("/vobiz/webhook", (req, res) => handleVobizWebhook(req, res));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "pashumitra_api", llm: "sarvam", rag: "catalyst-keyword", knowledge: "catalyst/lib/knowledge" });
});

module.exports = app;
