/**
 * Configures the PashuMitra ElevenLabs agent for stable live calls.
 *
 * Fixes premature hang-ups by disabling end_call + silence timeout.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... node scripts/configure-elevenlabs-agent.mjs
 */
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || "agent_0101ks38f27hec4tdtact1ejxx7t";
const API_KEY = process.env.ELEVENLABS_API_KEY;

const FIRST_MESSAGE_HI =
  "नमस्ते! मैं PashuMitra हूँ — आपका पशु और डेयरी सलाहकार। अपनी भाषा में बोलिए, मैं उसी में जवाब दूँगा।";

const PROMPT_APPEND = `

CALL BEHAVIOUR (CRITICAL):
- After your greeting, STAY ON THE CALL and keep listening. Never hang up after the first message.
- NEVER use the end_call tool unless the farmer clearly says goodbye and wants to end (e.g. "dhanyavaad, band karo").
- If the farmer is silent for a few seconds, wait patiently — do NOT end the call.
- Detect the farmer's language from their first sentence and reply only in that language (not Hindi by default).
- Keep answers short (2–4 sentences) and practical for dairy farmers.
`;

const CLIENT_EVENTS = [
  "conversation_initiation_metadata",
  "asr_initiation_metadata",
  "ping",
  "audio",
  "interruption",
  "user_transcript",
  "tentative_user_transcript",
  "agent_response",
  "agent_response_correction",
  "agent_response_metadata",
  "vad_score",
  "agent_response_complete",
];

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${path}`, {
    method,
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} failed (${res.status}): ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

function mergeClientEvents(existing = []) {
  return [...new Set([...existing, ...CLIENT_EVENTS])];
}

function mergePrompt(existing = "") {
  if (existing.includes("NEVER use the end_call tool")) return existing;
  return `${existing.trim()}${PROMPT_APPEND}`;
}

async function main() {
  if (!API_KEY) {
    console.error("Missing ELEVENLABS_API_KEY. Set it in the environment and re-run.");
    process.exit(1);
  }

  console.log(`Fetching agent ${AGENT_ID}…`);
  const current = await api(AGENT_ID);

  const currentPrompt = current.conversation_config?.agent?.prompt || {};
  const currentBuiltIn = currentPrompt.built_in_tools || {};

  const patch = {
    platform_settings: {
      ...(current.platform_settings || {}),
      overrides: {
        ...(current.platform_settings?.overrides || {}),
        conversation_config_override: {
          ...(current.platform_settings?.overrides?.conversation_config_override || {}),
          agent: {
            ...(current.platform_settings?.overrides?.conversation_config_override?.agent || {}),
            first_message: true,
            language: true,
          },
        },
      },
    },
    conversation_config: {
      ...(current.conversation_config || {}),
      conversation: {
        ...(current.conversation_config?.conversation || {}),
        client_events: mergeClientEvents(current.conversation_config?.conversation?.client_events),
        max_duration_seconds: 600,
      },
      turn: {
        ...(current.conversation_config?.turn || {}),
        turn_eagerness: "eager",
        turn_timeout: 12,
        silence_end_call_timeout: -1,
      },
      agent: {
        ...(current.conversation_config?.agent || {}),
        first_message: FIRST_MESSAGE_HI,
        language: "hi",
        disable_first_message_interruptions: true,
        prompt: {
          ...currentPrompt,
          prompt: mergePrompt(currentPrompt.prompt || ""),
          built_in_tools: {
            ...currentBuiltIn,
            end_call: null,
          },
        },
      },
    },
  };

  console.log("Patching agent (disable end_call, silence timeout, enable overrides)…");
  const updated = await api(AGENT_ID, { method: "PATCH", body: patch });

  const overrides = updated.platform_settings?.overrides?.conversation_config_override?.agent;
  const events = updated.conversation_config?.conversation?.client_events || [];
  const endCall = updated.conversation_config?.agent?.prompt?.built_in_tools?.end_call;

  console.log("Done.");
  console.log("  first_message override:", overrides?.first_message);
  console.log("  language override:", overrides?.language);
  console.log("  silence_end_call_timeout:", updated.conversation_config?.turn?.silence_end_call_timeout);
  console.log("  end_call tool:", endCall === null || endCall === undefined ? "disabled" : "STILL ENABLED");
  console.log("  interruptions event:", events.includes("interruption") ? "enabled" : "MISSING");
  console.log("  first_message:", updated.conversation_config?.agent?.first_message?.slice(0, 60) + "…");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
