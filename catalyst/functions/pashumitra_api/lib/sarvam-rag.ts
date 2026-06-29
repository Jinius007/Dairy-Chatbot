/**
 * Sarvam RAG — curated corpus retrieval + Sarvam chat generation.
 *
 * Ingest: npm run ingest:sarvam-rag (optional --vision for Indic PDF OCR via Sarvam Vision)
 * Retrieve: keyword section match over bundled knowledge (rag-retrieval.ts)
 * Generate: Sarvam chat with retrieved context in system prompt (chat.ts)
 */
export { retrieveRagContext } from "./rag-retrieval.ts";
