from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.config import API_TOKEN, LLM_MODEL, OLLAMA_BASE_URL
from app.llm import build_messages, chat_once, sse_wrap, stream_chat
from app.rag import get_collection, ingest_path

app = FastAPI(title="PashuMitra Local RAG", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_token(authorization: str | None = Header(default=None)) -> None:
    if not API_TOKEN:
        return
    if not authorization or authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    stream: bool = True
    mode: str = "chat"
    forceLanguage: str | None = None


class IngestRequest(BaseModel):
    path: str
    reset: bool = False


@app.get("/health")
async def health() -> dict[str, Any]:
    try:
        count = get_collection().count()
    except Exception as e:
        count = -1
        return {"ok": False, "error": str(e), "ollama": OLLAMA_BASE_URL, "model": LLM_MODEL}
    return {"ok": True, "chunks": count, "ollama": OLLAMA_BASE_URL, "model": LLM_MODEL}


@app.post("/ingest")
async def ingest(body: IngestRequest, _: None = Depends(verify_token)) -> dict:
    root = Path(body.path)
    if not root.is_dir():
        raise HTTPException(status_code=400, detail=f"Not a directory: {body.path}")
    stats = await ingest_path(root, reset=body.reset)
    return {"ok": True, **stats}


@app.post("/chat")
@app.post("/v1/chat/completions")
async def chat(body: ChatRequest, _: None = Depends(verify_token)) -> Any:
    history = [m.model_dump() for m in body.messages]
    ollama_messages = await build_messages(history, body.mode, body.forceLanguage)

    if body.stream:
        async def event_stream():
            async for token in stream_chat(ollama_messages):
                yield sse_wrap(token)
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    text = await chat_once(ollama_messages)
    return JSONResponse({"text": text, "choices": [{"message": {"content": text}}]})
