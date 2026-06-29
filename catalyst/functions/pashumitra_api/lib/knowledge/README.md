# Catalyst knowledge repository

Farmer-facing facts for **Sarvam RAG** live here as a bundled markdown corpus.

## Sources

| Source | Location |
|--------|----------|
| NDDB extension PDFs | `Material for AI Chatbot/` (project root) |
| DAHD schemes | dahd.gov.in (scraped at ingest) |
| NDDB Dairy Knowledge Portal | dairyknowledge.in section indexes |
| ICAR animal health | [Central Health Key](https://www.icar.org/guidelines/icar-central-health-key/), [DAHD SVTG 2024](https://dahd.gov.in/sites/default/files/2024-10/StandardVeterinaryTreatment.pdf), [CaDDES](https://nivedi.res.in/nicra/CaDDES/), Gaushala manual |
| Hindi/Gujarati PDFs (optional) | Sarvam Document Digitization (Vision OCR) |
| Curated bundles | `knowledge.ts`, `icar-livestock-health.ts`, `dahd-schemes.ts`, ration guides |

## Sarvam RAG pipeline

1. **Ingest** — extract text (web scrape + ICAR/DAHD PDFs + optional Sarvam Vision for Indic PDFs)
2. **Retrieve** — keyword section match over bundled corpus (`rag-retrieval.ts`)
3. **Generate** — Sarvam chat with retrieved context in the system prompt (`chat.ts`)

```bash
npm run build:knowledge          # NDDB material + DAHD → extension-material.generated.ts
npm run ingest:sarvam-rag        # ICAR/DAHD health PDFs + web → sarvam-rag.generated.ts
npm run ingest:sarvam-rag -- --vision   # also OCR Hindi/Gujarati PDFs (needs SARVAM_API_KEY)
npm run build:catalyst-api
npm run deploy:catalyst
```

Runtime: `lib/sarvam-rag.ts` → `lib/rag-retrieval.ts`

## Rebuild keyword bundle only

```bash
npm run build:knowledge
```

Uses `Material for AI Chatbot` via `scripts/build-knowledge-repo.mjs`.
