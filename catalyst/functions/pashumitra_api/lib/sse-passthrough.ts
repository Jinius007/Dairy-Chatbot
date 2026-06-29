const sseHeaders = { "Content-Type": "text/event-stream" };

/** Return SSE immediately; run slow prep + upstream stream in the background. */
export function createSsePassthroughStream(
  prepare: () => Promise<Response>,
): Response {
  const ts = new TransformStream<Uint8Array, Uint8Array>();
  const enc = new TextEncoder();

  void (async () => {
    const writer = ts.writable.getWriter();
    const heartbeat = setInterval(() => {
      void writer.write(enc.encode(": ping\n\n")).catch(() => clearInterval(heartbeat));
    }, 4000);

    try {
      await writer.write(enc.encode(": ok\n\n"));
      const upstream = await prepare();

      if (!upstream.ok || !upstream.body) {
        const detail = await upstream.text().catch(() => "AI service error");
        const msg = upstream.status === 429
          ? "[[LANG:hi]]\nBahut requests aa rahe hain — thodi der baad try karein."
          : `[[LANG:hi]]\nMaaf kijiye, jawab nahi aa paya (${upstream.status}). Dubara koshish karein.`;
        console.error("chat upstream error:", upstream.status, detail.slice(0, 200));
        await writer.write(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: msg } }] })}\n\n`));
        await writer.write(enc.encode("data: [DONE]\n\n"));
        return;
      }

      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } catch (e) {
      console.error("sse passthrough error:", e);
      const errMsg = "[[LANG:hi]]\nMaaf kijiye, server mein samasya hai. Kripya dubara koshish karein.";
      await writer.write(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: errMsg } }] })}\n\n`));
      await writer.write(enc.encode("data: [DONE]\n\n"));
    } finally {
      clearInterval(heartbeat);
      try {
        await writer.close();
      } catch {
        /* closed */
      }
    }
  })();

  return new Response(ts.readable, { headers: sseHeaders });
}
