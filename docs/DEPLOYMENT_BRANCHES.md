# Two-branch deployment strategy

Keep **production safe** while experimenting with local LLM + RAG.

| Branch | Purpose | Vercel | Chat backend |
|---|---|---|---|
| **`master`** | Production (current live app) | Production domain | Gemini via Supabase `chat` |
| **`feature/local-rag-ollama`** | Self-hosted RAG pilot | Preview only (or separate project) | Ollama on your GPU |

## Rollback if local RAG breaks

1. In Vercel → **Production** → ensure branch is **`master`** (not `feature/local-rag-ollama`).
2. **Redeploy** latest `master` (Deployments → … → Redeploy).
3. Do **not** set `VITE_LOCAL_RAG_CHAT_URL` on production — leave it unset so chat uses Supabase/Gemini.

Nothing on `master` requires the RAG Docker stack.

## Deploy local-RAG branch safely (optional preview)

1. Vercel → Settings → Git → add **`feature/local-rag-ollama`** as preview branch only.
2. On that preview deployment, set:
   ```env
   VITE_LOCAL_RAG_CHAT_URL=https://your-gpu-tunnel.example/chat
   VITE_LOCAL_RAG_API_TOKEN=...
   ```
3. Keep production env on **`master`** without those variables.

Or use a **second Vercel project** pointing at the same repo but pinned to `feature/local-rag-ollama`.

## Merge to master later (only when RAG is stable)

Merge only when org GPU + RAG API are production-ready. The `chat-api.ts` helper is **backward compatible**: without `VITE_LOCAL_RAG_CHAT_URL`, behaviour is identical to today’s Gemini path.
