# Catalyst + Sarvam deployment

## Knowledge + RAG

| Piece | Location |
|-------|----------|
| Material PDFs | `Material for AI Chatbot/` (project root) |
| Ingest script | `npm run ingest:sarvam-rag` → bundled corpus |
| RAG retrieval | `lib/sarvam-rag.ts` + `lib/rag-retrieval.ts` (keyword sections) |
| Vision OCR (optional) | Sarvam Document Digitization for Indic PDFs |
| Keyword fallback | same corpus — no external vector DB |
| Unified entry | `lib/sarvam-rag.ts` → used by `chat.ts` |
| LLM / STT | Sarvam (`lib/sarvam.ts`) |

**Production:** Sarvam RAG — keyword retrieval over NDDB material + DAHD schemes + ICAR health + DKP index, with Sarvam chat generation.  
**Optional:** `--vision` ingest for full Hindi/Gujarati PDF text via Sarvam Document Digitization.  
**Optional:** Catalyst **QuickML RAG** — upload the same docs to QuickML Knowledge Base; set `QUICKML_RAG_URL` + `QUICKML_OAUTH_TOKEN` on the function for semantic retrieval (Sarvam still generates multilingual answers).

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

Only add your **Slate origin** domain — do **not** add `catalystserverless.in` or `.com` (Console rejects those).

Verify from your PC:

```powershell
npm run verify:catalyst-api
```

Or manually (note **`.in`** for India data center):

```bash
curl -i https://project-rainfall-60075686570.development.catalystserverless.in/server/pashumitra_api/
```

Expected: `200` with JSON `{"ok":true,"service":"pashumitra_api",...}` — not `404 The domain is not found`.

## First-time deploy checklist

Run these **in order** in **Windows Terminal or PowerShell** (not the Cursor agent terminal — `catalyst login` needs a real browser + TTY):

```powershell
# 1. Log in to Zoho (browser opens)
cd catalyst
catalyst login
catalyst whoami          # must show your email — NOT "Not logged in"

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

### If verify returns 404 "The domain is not found" (deploy succeeded)

This almost always means **API Gateway is enabled**. When APIG is on, direct `/server/function_name` URLs stop working until you create API rules.

**Fix (pick one):**

```powershell
cd catalyst
catalyst apig:disable
cd ..
npm run verify:catalyst-api
```

Or in Console: **Cloud Scale → API Gateway → Disable** (type DISABLE to confirm).

### If verify still returns 404 after disabling APIG

| Cause | Fix |
|-------|-----|
| Function never created in Console | Create **Advanced I/O** function named exactly `pashumitra_api` |
| **API Gateway** enabled | Cloud Scale → **API Gateway** → disable it **or** create an API rule targeting `pashumitra_api` ([known 404 cause](https://stackoverflow.com/questions/78292630)) |
| Wrong function URL | Copy URL from deploy output or Console → Functions → pashumitra_api |
| Not logged in / wrong project | `catalyst whoami` and `.catalystrc` must show **Project-Rainfall** |
| `catalyst login` hangs or does nothing | Run in **Windows Terminal** outside Cursor; India accounts use **accounts.zoho.in** |
| Deploy stuck at "Checking Catalyst login" | Agent/CI shells cannot login — run `catalyst login` manually first |

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

Function URL (India DC — use **`.in`**, not `.com`):
`https://project-rainfall-60075686570.development.catalystserverless.in/server/pashumitra_api`

Copy the exact URL from your `catalyst deploy` output — TLD varies by data center (`.in`, `.com`, `.eu`, etc.).

## 3. Data Store (conversation logging)

Create table **`conversation_turns`** — schema in `catalyst/datastore/conversation_turns.schema.json`.

If missing, `/log-turn` returns 503 (chat still works).

## 4. Deploy frontend (Slate)

1. Catalyst console → **Slate** → React / Vite app
2. Build: `npm run build`, output: `dist`
3. Env — **name** and **value** are separate fields in Slate; paste only the URL into **value**:

| Name | Value |
|------|-------|
| `VITE_CATALYST_API_URL` | `https://project-rainfall-60075686570.development.catalystserverless.in/server/pashumitra_api` |

Do **not** paste `VITE_CATALYST_API_URL=https://...` as the value (that breaks fetch URLs).

4. Rebuild Slate after env changes (Build / Sync).

**Do not** use `http://localhost:8080/catalyst-api` or `/catalyst-api` on Slate — that path only works with the local Vite dev proxy. Slate static hosting returns **405** for POST requests to `/catalyst-api/transcribe`.

### Troubleshooting: 405 on `/catalyst-api/transcribe`

| Symptom | Cause | Fix |
|---------|-------|-----|
| **CORS blocked: multiple `Access-Control-Allow-Origin` values** | Catalyst gateway + function both set CORS | Redeploy `pashumitra_api` (function must not send `Access-Control-*`; gateway handles it) |
| Network tab URL starts with `VITE_CATALYST_API_URL=` | Whole env line pasted as Slate **value** | Value field = URL only; name field = `VITE_CATALYST_API_URL` |
| Network tab shows `…onslate.in/catalyst-api/transcribe` → **405** | Slate built with local dev URL | Set full `https://…catalystserverless.in/server/pashumitra_api` in Slate env, rebuild |
| Network tab shows `…catalystserverless.in/…/transcribe` → **404** | Wrong TLD (`.com` vs `.in`) | Copy exact URL from `catalyst deploy` output |
| **500** on transcribe | Missing `SARVAM_API_KEY` on function | Catalyst Console → Functions → pashumitra_api → Environment |

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
