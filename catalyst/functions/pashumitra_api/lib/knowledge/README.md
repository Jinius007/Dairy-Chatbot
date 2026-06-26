# Catalyst knowledge repository

All farmer-facing facts for RAG live in this folder (Catalyst-hosted).

| File | Content |
|------|---------|
| `knowledge.ts` | Main NDDB extension knowledge base |
| `ration-knowledge.ts` | NDDB RBP / LCF ration programme |
| `balanced-ration-guide.ts` | Balanced ration formulation guide |
| `cooperative-policy.ts` | Cooperative-only milk marketing policy |

RAG retrieval: `../rag-retrieval.ts` — keyword section matching (no vector DB, no embeddings).

After editing, rebuild and redeploy:

```bash
npm run build:catalyst-api
cd catalyst && catalyst deploy --only functions
```
