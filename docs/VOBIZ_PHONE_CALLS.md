# Vobiz phone calls — Sarvam + Bhashini + Catalyst

Production phone calls with **no ngrok**, **no VANI**, **no local voice-agent**. Everything runs on **Catalyst** + **Vobiz**.

```
Farmer dials Vobiz DID
    → Catalyst /vobiz/answer (Hindi greeting + Record)
    → Catalyst /vobiz/recorded → /vobiz/process
         ├─ STT: Sarvam Saaras (primary) → Bhashini ASR (fallback)
         ├─ Brain: Catalyst /chat (RAG, mode=call)
         └─ TTS: Sarvam Bulbul (primary) → Bhashini TTS (fallback)
    → Play reply + listen for next question
```

Same knowledge as the web app. Short farmer clips on Vobiz are transcribed and discarded — not stored in your app.

---

## Vobiz console URLs (paste exactly)

Base: `https://project-rainfall-60075686570.development.catalystserverless.in/server/pashumitra_api`

| Field | URL |
|-------|-----|
| **Answer URL** | `…/vobiz/answer` |
| **Fallback Answer URL** | `…/vobiz/fallback` |
| **Hangup URL** | `…/vobiz/hangup` |

All **POST**. Remove any ngrok or old Stream URLs.

---

## Catalyst secrets (required)

Set in Zoho Catalyst → Functions → `pashumitra_api` → Environment:

| Variable | Required | Purpose |
|----------|----------|---------|
| `SARVAM_API_KEY` | **Yes** | STT + TTS + chat |
| `VOBIZ_AUTH_ID` | **Yes** | Download farmer recording from Vobiz |
| `VOBIZ_AUTH_TOKEN` | **Yes** | Paired with auth id |
| `BHASHINI_API_KEY` | Recommended | STT/TTS fallback ([bhashini.ai](https://www.bhashini.ai)) |

Then deploy:

```bash
npm run deploy:catalyst
```

---

## Verify before calling

```bash
# Answer XML (should include <Play> greeting and <Record>)
curl -s -X POST "https://project-rainfall-60075686570.development.catalystserverless.in/server/pashumitra_api/vobiz/answer"

# Health
curl -s "https://project-rainfall-60075686570.development.catalystserverless.in/server/pashumitra_api/vobiz/ping"
```

---

## Call flow (one turn)

1. **Answer** — Bulbul Hindi greeting + record farmer question (~45 s max)
2. **Recorded** — instant “please wait” + redirect to `/vobiz/process` (avoids Vobiz timeout)
3. **Process** — download clip with Vobiz auth → Sarvam/Bhashini STT → `/chat` RAG → TTS → `<Play>` reply
4. **Loop** — prompt + record again until hangup

If Vobiz sends **Speech** text in the webhook (some configs), STT is skipped.

---

## Language stack

| Step | Primary | Fallback |
|------|---------|----------|
| STT | Sarvam `saaras:v3` codemix | Bhashini `/v2/asr` |
| LLM + RAG | Sarvam + Catalyst KB | — |
| TTS (call) | Sarvam Bulbul `callMode` | Bhashini → Google |

Reply language follows the farmer (same as web CallView).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No ring / busy | Vobiz Answer URL must be Catalyst `/vobiz/answer`, not ngrok |
| Greeting then “maaf kijiye” | Set `VOBIZ_AUTH_ID` + `VOBIZ_AUTH_TOKEN` on Catalyst; redeploy |
| Empty transcript | Check `SARVAM_API_KEY`; add `BHASHINI_API_KEY` as backup |
| Slow turn | Normal 5–15 s per question (STT + RAG + TTS on serverless) |

---

## Deprecated (do not use)

- `voice-agent/` + ngrok
- NIC AI-VANI / BYOB
- Samvaad dashboard
- `VOBIZ_USE_STREAM` / `VOICE_AGENT_WSS_URL` unless you explicitly run a Stream agent

See also: [VOBIZ_INTEGRATION.md](./VOBIZ_INTEGRATION.md)
