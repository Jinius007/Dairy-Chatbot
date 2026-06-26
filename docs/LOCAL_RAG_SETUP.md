# Local LLM + RAG (Ollama + Gemma) — data stays on your GPU

Branch **`feature/local-rag-ollama`** replaces **Gemini chat only** with a self-hosted stack.  
**`master`** is unchanged. TTS (Bhashini), voice transcribe (Gemini today), Vercel, Supabase logging can stay as-is until you migrate those too.

---

## Architecture (data sovereignty)

```
Farmer phone/browser
        │
        │  HTTPS (only if you expose RAG API on org network)
        ▼
┌─────────────────────────────────────────────────────────┐
│  YOUR GPU SERVER (free GPU now → org GPU later)         │
│                                                         │
│  ┌─────────────┐    embed + retrieve    ┌────────────┐  │
│  │  RAG API    │ ─────────────────────► │  ChromaDB  │  │
│  │  :8090      │                        │  (vectors) │  │
│  └──────┬──────┘                        └────────────┘  │
│         │                                               │
│         │  prompt + retrieved PDF chunks               │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │   Ollama    │  gemma2:9b (LLM)                     │
│  │   :11434    │  nomic-embed-text (embeddings)       │
│  └─────────────┘                                        │
│                                                         │
│  PDF material (Booklets, Pamphlets, Posters…) on disk   │
└─────────────────────────────────────────────────────────┘
```

**Nothing in the RAG path goes to Google/OpenAI** if you:
1. Set `VITE_LOCAL_RAG_CHAT_URL` on the frontend
2. Run RAG + Ollama on a machine you control
3. Do **not** route chat through Supabase `chat` edge function

---

## Ollama + Gemma vs alternatives

| Approach | Best for | Swap GPU later? |
|---|---|---|
| **Ollama + Gemma 2** (default here) | Dev, pilot, single GPU, simple ops | Change `OLLAMA_BASE_URL` only |
| **Ollama + Llama 3.1 8B** | Slightly better reasoning | Same |
| **vLLM / TGI** | Production, many concurrent farmers | Point RAG API at vLLM OpenAI-compatible URL |
| **Fine-tuned model** | NDDB-specific Hindi/regional quality | Replace `LLM_MODEL` name |

**Gemma 2 9B** is a good pilot model on a free 16–24 GB GPU. For **12 Indian languages**, plan to evaluate **Llama 3.1**, **Sarvam**, or a **fine-tuned** model on your PDFs later — RAG architecture stays the same.

---

## Quick start (your extension material)

### 1. Start stack (Docker)

```powershell
cd services/local-rag

# Point to your PDF folder (Booklets, Pamphlets, Posters, Trifold)
$env:RAG_MATERIAL_PATH = "C:\Users\sinjini\Downloads\Material for AI Chatbot"

docker compose up -d
```

### 2. Pull models on the GPU machine

```bash
docker exec -it local-rag-ollama-1 ollama pull gemma2:9b
docker exec -it local-rag-ollama-1 ollama pull nomic-embed-text
```

### 3. Ingest PDFs into vector DB

Path must be **inside the RAG container** (mounted as `/data/material`):

```bash
python scripts/ingest_materials.py /data/material --api http://localhost:8090 --reset
```

Or from host via API (if rag-api can see the path — use mounted path):

```bash
curl -X POST http://localhost:8090/ingest -H "Content-Type: application/json" \
  -d "{\"path\": \"/data/material\", \"reset\": true}"
```

Your folder has **~45 PDFs** (Hindi/Gujarati booklets, ration balancing, EVM, mastitis, silage, etc.) plus `List of Extension Material & Youtube.xlsx` (not ingested yet — add XLSX support later if needed).

### 4. Point the React app at local RAG

`.env.local`:

```env
VITE_LOCAL_RAG_CHAT_URL=http://localhost:8090/chat
# VITE_LOCAL_RAG_API_TOKEN=secret   # if RAG_API_TOKEN set on server
```

Rebuild frontend: `npm run dev` or deploy with these env vars.

---

## Swap free GPU → organisation GPU later

Only environment variables change — **no app code change**:

| Variable | Dev / free GPU | Org production GPU |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | `http://gpu-server.nddb.internal:11434` |
| `LLM_MODEL` | `gemma2:9b` | same or `nddb-pashu:latest` |
| `VITE_LOCAL_RAG_CHAT_URL` | `http://localhost:8090/chat` | `https://pashu-rag.nddb.coop/chat` |

Run Ollama (or vLLM) on the org GPU box; keep Chroma + RAG API on the same VLAN so **embeddings and chat never leave the DC**.

---

## What still uses cloud today (optional next steps)

| Feature | Current | On-prem option |
|---|---|---|
| **Chat LLM** | Gemini via Supabase | ✅ This branch — Ollama |
| **Voice transcribe** | Gemini | Whisper / faster-whisper on same GPU |
| **TTS** | Bhashini `/api/tts` | Piper / Coqui / Google TTS on-prem |
| **Frontend host** | Vercel | Nginx on org server |
| **Logs DB** | Supabase Postgres | Org PostgreSQL |

For **full** air-gap: host the built `dist/` on internal nginx, set `VITE_LOCAL_RAG_CHAT_URL` to internal RAG only, and run Whisper locally for call STT.

---

## Files added on this branch

| Path | Purpose |
|---|---|
| `services/local-rag/` | Docker: Ollama + Chroma + FastAPI RAG |
| `src/lib/chat-api.ts` | Switch chat URL via env |
| `src/components/ChatView.tsx` | Uses `getChatCompletionsUrl()` |
| `src/components/CallView.tsx` | Same for live call replies |

---

## Health check

```bash
curl http://localhost:8090/health
# → { "ok": true, "chunks": 1234, "model": "gemma2:9b" }
```

---

## Free GPU options (pilot / dev)

Use a **remote GPU machine** for Ollama + this stack; point `OLLAMA_BASE_URL` and `VITE_LOCAL_RAG_CHAT_URL` at it.

| Option | Cost | GPU | Good for |
|---|---|---|---|
| **Google Colab** | Free (T4, session limits) | ~15 GB | Quick tests, ingest + few chats |
| **Kaggle Notebooks** | Free (~30 hr/week GPU) | P100/T4 | Same as Colab |
| **RunPod** | ~$0.20–0.50/hr | RTX 4090, A5000 | Stable pilot, 24/7 if budget allows |
| **Vast.ai** | Cheapest bid GPUs | Varies | Low-cost experiments |
| **Your own PC** | Free if you have NVIDIA | 8 GB+ VRAM | Best privacy; use Gemma 2 2B/9B q4 |

### Recommended pilot path (free)

1. **Colab or RunPod** with Ubuntu + NVIDIA drivers.
2. Install Docker + NVIDIA Container Toolkit (RunPod often has this preinstalled).
3. Clone repo, `cd services/local-rag`, set `RAG_MATERIAL_PATH` to uploaded PDFs.
4. `docker compose up -d`
5. `docker exec -it <ollama-container> ollama pull gemma2:9b` and `ollama pull nomic-embed-text`
6. Ingest: `python scripts/ingest_materials.py /data/material --api http://localhost:8090 --reset`
7. Expose port **8090** to your laptop:
   - **RunPod**: use built-in HTTP port proxy / public IP.
   - **Colab**: use **Cloudflare Tunnel** or **ngrok** (`ngrok http 8090`) — dev only, not for farmers in production.
8. Frontend `.env.local`:
   ```env
   VITE_LOCAL_RAG_CHAT_URL=https://<tunnel-or-runpod-url>/chat
   ```

### VRAM guide (Gemma via Ollama)

| Model | Quantized | Approx VRAM |
|---|---|---|
| `gemma2:2b` | default | ~2–3 GB (weak quality) |
| `gemma2:9b` | q4_K_M | ~6–8 GB (pilot default) |
| `llama3.1:8b` | q4 | ~5–6 GB |

If free GPU has only **8 GB**, use `gemma2:9b` or `llama3.1:8b` with q4 quantization.

### When you move to org GPU

Change only URLs — same Docker compose on the org server:

```env
OLLAMA_BASE_URL=http://internal-gpu:11434
VITE_LOCAL_RAG_CHAT_URL=https://pashu-rag.internal/chat
```

No frontend code change required.


- Put RAG API **behind VPN or org firewall**; do not expose `:8090` to the public internet without auth.
- Set `RAG_API_TOKEN` + `VITE_LOCAL_RAG_API_TOKEN` in production.
- Farmer messages are processed **only** on your GPU stack when local URL is configured.
