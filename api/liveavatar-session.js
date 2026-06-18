/** Create a LiveAvatar LITE session wired to the ElevenLabs conversational agent. */
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.LIVEAVATAR_API_KEY;
  const avatarId = process.env.LIVEAVATAR_AVATAR_ID;
  const secretId = process.env.ELEVENLABS_LIVEAVATAR_SECRET_ID;
  const agentId =
    process.env.ELEVENLABS_AGENT_ID || "agent_0101ks38f27hec4tdtact1ejxx7t";
  const isSandbox = process.env.LIVEAVATAR_SANDBOX === "true";

  if (!apiKey || !avatarId || !secretId) {
    return new Response(
      JSON.stringify({
        error: "LiveAvatar lip-sync is not configured on the server.",
        code: "NOT_CONFIGURED",
        setup: [
          "Create a LiveAvatar account at https://liveavatar.com",
          "Upload public/pashu-advisor-avatar.jpeg as a custom Image Avatar",
          "Register your ElevenLabs API key: POST https://api.liveavatar.com/v1/secrets",
          "Set Vercel env: LIVEAVATAR_API_KEY, LIVEAVATAR_AVATAR_ID, ELEVENLABS_LIVEAVATAR_SECRET_ID",
        ],
      }),
      { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  try {
    const resp = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        mode: "LITE",
        avatar_id: avatarId,
        is_sandbox: isSandbox,
        video_settings: { quality: "high", encoding: "H264" },
        elevenlabs_agent_config: {
          secret_id: secretId,
          agent_id: agentId,
        },
      }),
    });

    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return new Response(
        JSON.stringify({
          error: payload?.message || `LiveAvatar token failed (${resp.status})`,
          code: "TOKEN_FAILED",
        }),
        { status: resp.status, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const data = payload?.data;
    if (!data?.session_token) {
      return new Response(JSON.stringify({ error: "LiveAvatar returned no session token", code: "TOKEN_FAILED" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        sessionId: data.session_id,
        sessionToken: data.session_token,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "LiveAvatar session failed",
        code: "TOKEN_FAILED",
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
}
