/**
 * Sarvam RAG — curated corpus retrieval + Sarvam chat generation.
 *
 * Retrieval order:
 * 1. Bundled keyword RAG (NDDB/DAHD/ICAR corpus)
 * 2. Optional Catalyst QuickML semantic RAG (when QUICKML_RAG_URL is configured)
 *
 * Ingest: npm run ingest:sarvam-rag (optional --vision for Indic PDF OCR via Sarvam Vision)
 * Generate: Sarvam chat with retrieved context in system prompt (chat.ts)
 */
import { retrieveKeywordRagContext } from "./rag-retrieval.ts";
import { retrieveQuickMlRagContext } from "./quickml-rag.ts";

export async function retrieveRagContext(query: string, topK = 7): Promise<string> {
  const local = retrieveKeywordRagContext(query, topK);
  const quickMl = await retrieveQuickMlRagContext(query);
  if (quickMl) {
    return `${local}\n\n--- QuickML semantic retrieval (Catalyst knowledge base) ---\n${quickMl}`;
  }
  return local;
}

export { retrieveKeywordRagContext } from "./rag-retrieval.ts";
