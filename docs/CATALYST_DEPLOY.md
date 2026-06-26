# Catalyst + Sarvam deployment

## Knowledge + RAG

| Piece | Location |
|-------|----------|
| Knowledge repo | `catalyst/functions/pashumitra_api/lib/knowledge/` |
| RAG retrieval | `catalyst/functions/pashumitra_api/lib/rag-retrieval.ts` |
| Chat handler | `catalyst/functions/pashumitra_api/src/handlers/chat.ts` |
| LLM / STT | Sarvam (`lib/sarvam.ts`) |

Keyword match over knowledge sections → top chunks injected into Sarvam prompt. No vector DB or external wiki grounding.

## Architecture

| Layer | Service |
|-------|---------|
| Frontend | Catalyst Slate |
| Chat / STT | Catalyst → Sarvam + RAG |
| TTS / logs / YouTube | Catalyst `/tts`, `/log-turn`, `/youtube-search` |

The React app requires **`VITE_CATALYST_API_URL`** — all API traffic goes to Catalyst.

## Prerequisites

1. [Zoho Catalyst](https://catalyst.zoho.com/) project
2. [Sarvam API key](https://dashboard.sarvam.ai/)
3. Catalyst CLI: `npm install -g zcatalyst-cli`

## 0. Enable CORS for Slate (required)

Slate (`https://dairy-mitr-znhzndph.onslate.in`) and your Catalyst function URL are **different origins**. Catalyst blocks browser requests until you whitelist the Slate domain.

1. [Catalyst Console](https://console.catalyst.zoho.com) → your project (**Project-Rainfall**)
2. **Cloud Scale** → **Authentication** → **Whitelisting**
   - If Whitelisting is locked, enable any auth type first (e.g. Hosted Authentication) — you do not need to use it in the app.
3. **Authorized Domains** → **Add Domain**
4. Domain: `dairy-mitr-znhzndph.onslate.in` (hostname only, no `https://`)
5. Enable **CORS** → **Configure**

For local Vite dev against the **cloud** API (not the proxy), also add `localhost`.

Without this step, the browser shows: *No 'Access-Control-Allow-Origin' header* on `/transcribe`, `/tts`, etc.

## 1. Build the API bundle

```bash
npm install
npm run build:catalyst-api
cd catalyst/functions/pashumitra_api && npm install
```

## 2. Deploy function

```bash
cd catalyst
catalyst init          # first time only
catalyst deploy --only functions
```

Function environment variables:

| Secret | Purpose |
|--------|---------|
| `SARVAM_API_KEY` | Chat LLM + voice STT |
| `SARVAM_CHAT_MODEL` | `sarvam-30b` (default) |
| `SARVAM_STT_MODEL` | `saaras:v3` (default) |
| `BHASHINI_API_KEY` | Optional TTS quality |
| `YOUTUBE_API_KEY` | Optional verified video search |

Function URL example:  
`https://YOUR-PROJECT.development.catalystserverless.com/server/pashumitra_api`

## 3. Data Store (conversation logging)

Create table **`conversation_turns`** — schema in `catalyst/datastore/conversation_turns.schema.json`.

If missing, `/log-turn` returns 503 (chat still works).

## 4. Deploy frontend (Slate)

1. Catalyst console → **Slate** → React / Vite app
2. Build: `npm run build`, output: `dist`
3. Env:

```
VITE_CATALYST_API_URL=https://YOUR-PROJECT.catalystserverless.com/server/pashumitra_api
```

4. Rebuild Slate after env changes (Build / Sync).

## 5. Local dev

```bash
npm run dev:catalyst
```

`.env.local`:

```
VITE_CATALYST_API_URL=http://localhost:8080/catalyst-api
```

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/chat` | POST | Sarvam LLM + keyword RAG (SSE) |
| `/transcribe` | POST | Sarvam STT |
| `/tts` | POST | Bhashini/Google TTS |
| `/log-turn` | POST | Catalyst Data Store logging |
| `/youtube-search` | POST | Verified NDDB/co-op videos |
