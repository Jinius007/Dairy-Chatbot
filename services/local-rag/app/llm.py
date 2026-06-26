from __future__ import annotations

import json
from typing import AsyncIterator

import httpx

from app.config import LLM_MODEL, OLLAMA_BASE_URL
from app.prompts import CALL_MODE_ADDON, SYSTEM_PROMPT
from app.rag import format_context, retrieve


async def build_messages(
    history: list[dict],
    mode: str = "chat",
    force_language: str | None = None,
) -> list[dict]:
    last_user = next((m["content"] for m in reversed(history) if m.get("role") == "user"), "")
    chunks = await retrieve(last_user)
    context = format_context(chunks)

    system = SYSTEM_PROMPT + f"\n\nRETRIEVED CONTEXT:\n{context}\n"
    if mode == "call":
        system += CALL_MODE_ADDON
    if force_language:
        system += f"\nCRITICAL: Reply only in language code [[LANG:{force_language}]].\n"

    ollama_messages: list[dict] = [{"role": "system", "content": system}]
    for m in history:
        role = m.get("role")
        if role in ("user", "assistant"):
            ollama_messages.append({"role": role, "content": m.get("content", "")})
    return ollama_messages


async def chat_once(messages: list[dict]) -> str:
    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={"model": LLM_MODEL, "messages": messages, "stream": False},
        )
        resp.raise_for_status()
        return resp.json().get("message", {}).get("content", "")


async def stream_chat(messages: list[dict]) -> AsyncIterator[str]:
    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            "POST",
            f"{OLLAMA_BASE_URL}/api/chat",
            json={"model": LLM_MODEL, "messages": messages, "stream": True},
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    continue
                token = payload.get("message", {}).get("content")
                if token:
                    yield token


def sse_wrap(token: str) -> str:
    chunk = json.dumps({"choices": [{"delta": {"content": token}}]})
    return f"data: {chunk}\n\n"
