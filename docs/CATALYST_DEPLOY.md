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

Slate (`https://dairy-mitr-znhzndph.onslate.in`) and your Catalyst function URL are **different origins**. The browser blocks requests until Catalyst whitelists your Slate domain.

**Also check the function is deployed** — if `GET /server/pashumitra_api/` returns `The domain is not found`, deploy first (step 2 below). A missing function shows the same CORS error in the browser.

1. [Catalyst Console](https://console.catalyst.zoho.com) → **Project-Rainfall**
2. **Cloud Scale** → **Authentication** → **Whitelisting**
   - If Whitelisting is locked, enable **Hosted Authentication** first (you do not need to use login in the app).
3. **Authorized Domains** → **Add Domain**
4. Domain: `dairy-mitr-znhzndph.onslate.in` (hostname only, no `https://`)
5. Enable **CORS** → **Configure**
6. Add a second domain (same steps): `project-rainfall-60075686570.development.catalystserverless.com` with **CORS** on (Catalyst cross-domain docs require both frontend and backend domains).

Verify from your PC:

```powershell
npm run verify:catalyst-api
```

Or manually:

```bash
curl -i https://project-rainfall-60075686570.development.catalystserverless.com/server/pashumitra_api/
```

Expected: `200` with JSON `{"ok":true,"service":"pashumitra_api",...}` — not `404 The domain is not found`.

## First-time deploy checklist

Run these **in order** in your terminal (login is interactive — cannot be done from CI):

```powershell
# 1. Log in to Zoho (browser opens)
cd catalyst
catalyst login
catalyst whoami          # must NOT say "Not logged in"

# 2. Link project (first time only — pick Project-Rainfall, Development)
catalyst init

# 3. Create function in Console if it does not exist yet
#    Catalyst Console -> Serverless -> Functions -> Create Function
#    Type: Advanced I/O | Stack: Node 20 | Name: pashumitra_api

# 4. Build + deploy from repo root
cd ..
npm run deploy:catalyst

# 5. Verify (must pass before Slate will work)
npm run verify:catalyst-api
```

### If verify still returns 404

| Cause | Fix |
|-------|-----|
| Function never created in Console | Create **Advanced I/O** function named exactly `pashumitra_api` |
| **API Gateway** enabled | Cloud Scale → **API Gateway** → disable it **or** create an API rule targeting `pashumitra_api` ([known 404 cause](https://stackoverflow.com/questions/78292630)) |
| Wrong function URL | Copy URL from deploy output or Console → Functions → pashumitra_api |
| Not logged in / wrong project | `catalyst whoami` and `.catalystrc` must show **Project-Rainfall** |

### If verify returns 404 fixed but CORS still fails

Whitelisting is separate from deploy. Both domains need **CORS ON** under Authentication → Whitelisting (see step 0 above).

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
