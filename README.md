# Pashu Mitra (Dairy Sakha)

Farmer-facing dairy advisory app — **Catalyst Slate frontend + Zoho Catalyst API + Sarvam AI**.

## Stack (this branch)

| Layer | Service |
|-------|---------|
| Frontend | Catalyst Slate (Vite/React) |
| API | Catalyst Advanced I/O (`pashumitra_api`) |
| LLM + STT | Sarvam AI |
| RAG | Keyword retrieval over `catalyst/.../lib/knowledge/` |
| TTS | Bhashini + Google fallback (Catalyst `/tts`) |
| Logging | Catalyst Data Store (`conversation_turns`) |

## Quick start

```bash
npm install
cp .env.example .env.local   # set VITE_CATALYST_API_URL
npm run build:catalyst-api
npm run dev:catalyst         # Catalyst serve + Vite
```

Deploy: see [docs/CATALYST_DEPLOY.md](docs/CATALYST_DEPLOY.md).

## Required env

**Frontend (Slate / `.env.local`):**

```
VITE_CATALYST_API_URL=https://YOUR-PROJECT.catalystserverless.com/server/pashumitra_api
```

**Catalyst function secrets:** `SARVAM_API_KEY` (required), optional `BHASHINI_API_KEY`, `YOUTUBE_API_KEY`.
