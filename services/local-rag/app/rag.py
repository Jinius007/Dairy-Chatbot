from __future__ import annotations

import re
from pathlib import Path

import fitz  # pymupdf
import httpx

from app.config import (
    CHROMA_COLLECTION,
    CHROMA_HOST,
    CHROMA_PORT,
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    EMBED_MODEL,
    OLLAMA_BASE_URL,
    RAG_TOP_K,
)

_client = None
_collection = None


def get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection
    import chromadb

    _client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
    _collection = _client.get_or_create_collection(
        name=CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


async def embed_texts(texts: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    async with httpx.AsyncClient(timeout=120.0) as client:
        for text in texts:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": EMBED_MODEL, "prompt": text},
            )
            resp.raise_for_status()
            vectors.append(resp.json()["embedding"])
    return vectors


def chunk_text(text: str, source: str) -> list[dict]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    chunks: list[dict] = []
    start = 0
    idx = 0
    while start < len(text):
        end = min(len(text), start + CHUNK_SIZE)
        if end < len(text):
            space = text.rfind(" ", start, end)
            if space > start + CHUNK_SIZE // 2:
                end = space
        piece = text[start:end].strip()
        if piece:
            chunks.append({"id": f"{source}::{idx}", "text": piece, "source": source})
            idx += 1
        start = max(end - CHUNK_OVERLAP, end)
        if start >= len(text):
            break
    return chunks


def extract_pdf(path: Path) -> str:
    doc = fitz.open(path)
    parts: list[str] = []
    for page in doc:
        parts.append(page.get_text("text"))
    doc.close()
    return "\n".join(parts)


async def ingest_path(root: Path, reset: bool = False) -> dict:
    col = get_collection()
    if reset:
        import chromadb

        global _client, _collection
        if _client:
            _client.delete_collection(CHROMA_COLLECTION)
        _collection = None
        col = get_collection()

    pdfs = sorted(root.rglob("*.pdf"))
    total_chunks = 0
    for pdf in pdfs:
        rel = str(pdf.relative_to(root)).replace("\\", "/")
        text = extract_pdf(pdf)
        chunks = chunk_text(text, rel)
        if not chunks:
            continue
        ids = [c["id"] for c in chunks]
        docs = [c["text"] for c in chunks]
        metas = [{"source": c["source"]} for c in chunks]
        embeddings = await embed_texts(docs)
        col.upsert(ids=ids, documents=docs, metadatas=metas, embeddings=embeddings)
        total_chunks += len(chunks)
    return {"pdfs": len(pdfs), "chunks": total_chunks}


async def retrieve(query: str, top_k: int | None = None) -> list[dict]:
    k = top_k or RAG_TOP_K
    col = get_collection()
    if col.count() == 0:
        return []
    q_emb = (await embed_texts([query]))[0]
    result = col.query(query_embeddings=[q_emb], n_results=min(k, max(col.count(), 1)))
    out: list[dict] = []
    for i, doc in enumerate(result["documents"][0]):
        out.append(
            {
                "text": doc,
                "source": (result["metadatas"][0][i] or {}).get("source", ""),
                "distance": (result["distances"][0][i] if result.get("distances") else None),
            }
        )
    return out


def format_context(chunks: list[dict]) -> str:
    if not chunks:
        return "(No indexed documents yet — run ingest first.)"
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(f"[{i}] ({c['source']})\n{c['text']}")
    return "\n\n".join(parts)
