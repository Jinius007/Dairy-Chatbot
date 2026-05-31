/** Save conversation turns to Supabase — runs on Vercel, no Supabase CLI needed. */
export const config = { runtime: "edge" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Logging not configured on server" }), {
      status: 503,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const question = String(body.question || "").trim();
    const answer = String(body.answer || "").trim();
    const session_id = String(body.session_id || "").trim();
    if (!question || !answer || !session_id) {
      return new Response(JSON.stringify({ error: "question, answer, session_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const row = {
      session_id,
      conversation_id: body.conversation_id ? String(body.conversation_id) : null,
      question: question.slice(0, 50000),
      answer: answer.slice(0, 50000),
      duration_ms: typeof body.duration_ms === "number" ? Math.round(body.duration_ms) : null,
      language: body.language ? String(body.language) : null,
      is_voice: Boolean(body.is_voice),
      mode: body.mode === "call" || body.mode === "voice" ? body.mode : "chat",
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/conversation_turns`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("conversation_turns insert failed:", res.status, t);
      return new Response(JSON.stringify({ error: "Insert failed" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("log-turn error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
