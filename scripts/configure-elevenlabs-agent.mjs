/**
 * Enables runtime overrides + barge-in (interruptions) on the PashuMitra ElevenLabs agent.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... node scripts/configure-elevenlabs-agent.mjs
 */
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || "agent_0101ks38f27hec4tdtact1ejxx7t";
const API_KEY = process.env.ELEVENLABS_API_KEY;

const FIRST_MESSAGE_HI =
  "नमस्ते! मैं PashuMitra हूँ — आपका पशु और डेयरी सलाहकार। अपनी भाषा में बोलिए, मैं उसी में जवाब दूँगा।";

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
  const set = new Set([...existing, ...CLIENT_EVENTS]);
  return [...set];
}

async function main() {
  if (!API_KEY) {
    console.error("Missing ELEVENLABS_API_KEY. Set it in the environment and re-run.");
    process.exit(1);
  }

  console.log(`Fetching agent ${AGENT_ID}…`);
  const current = await api(AGENT_ID);

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
      },
      agent: {
        ...(current.conversation_config?.agent || {}),
        first_message: FIRST_MESSAGE_HI,
        disable_first_message_interruptions: true,
      },
      turn: {
        ...(current.conversation_config?.turn || {}),
        turn_eagerness: "eager",
        turn_timeout: 7,
      },
    },
  };

  console.log("Patching agent (overrides + interruptions + eager turn-taking)…");
  const updated = await api(AGENT_ID, { method: "PATCH", body: patch });

  const overrides = updated.platform_settings?.overrides?.conversation_config_override?.agent;
  const events = updated.conversation_config?.conversation?.client_events || [];
  console.log("Done.");
  console.log("  first_message override:", overrides?.first_message);
  console.log("  language override:", overrides?.language);
  console.log("  interruptions event:", events.includes("interruption") ? "enabled" : "MISSING");
  console.log("  disable_first_message_interruptions:", updated.conversation_config?.agent?.disable_first_message_interruptions);
  console.log("  turn_eagerness:", updated.conversation_config?.turn?.turn_eagerness);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
