# Catalyst knowledge repository

All farmer-facing facts for RAG live in this folder (Catalyst-hosted).

| File | Content |
|------|---------|
| `knowledge.ts` | Core NDDB dairy knowledge + imports below |
| `dahd-schemes.ts` | Curated DAHD / GoI schemes (dahd.gov.in) |
| `extension-material.generated.ts` | **Auto-generated** from extension PDFs + DKP + DAHD |
| `sources/manifest.json` | Build manifest (titles, sources, char counts) |
| `ration-knowledge.ts` | NDDB RBP / LCF ration programme |
| `balanced-ration-guide.ts` | Balanced ration formulation guide |
| `cooperative-policy.ts` | Cooperative-only milk marketing policy |

## Rebuild extension knowledge

Place NDDB extension PDFs in (default):

`%USERPROFILE%\Downloads\Material for AI Chatbot`

Or set `KNOWLEDGE_MATERIAL_DIR` to your folder path.

```bash
npm run build:knowledge
```

This ingests:

- All PDFs in Booklets / Pamphlets / Poster / Trifold subfolders
- `List of Extension Material & Youtube.xlsx` (DKP + YouTube links)
- DAHD scheme pages (dahd.gov.in)
- Dairy Knowledge Portal section indexes (dairyknowledge.in)

Hindi/Gujarati PDFs with custom fonts become **catalog entries** with DKP links; English PDFs are full-text extracted.

Then deploy:

```bash
npm run build:catalyst-api
cd catalyst && catalyst deploy --only functions
```

Or: `npm run build:catalyst && npm run deploy:catalyst`

RAG retrieval: `../rag-retrieval.ts` — keyword section matching (no vector DB).
