#!/usr/bin/env python3
"""Ingest PDF folder into Chroma via the local RAG API."""
from __future__ import annotations

import argparse
import os
import sys

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest extension PDFs into local RAG")
    parser.add_argument("path", help="Folder with Booklets/Pamphlets/Posters PDFs")
    parser.add_argument("--api", default=os.getenv("RAG_API_URL", "http://localhost:8090"))
    parser.add_argument("--reset", action="store_true", help="Clear collection before ingest")
    parser.add_argument("--token", default=os.getenv("RAG_API_TOKEN", ""))
    args = parser.parse_args()

    headers = {"Content-Type": "application/json"}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    with httpx.Client(timeout=600.0) as client:
        resp = client.post(
            f"{args.api.rstrip('/')}/ingest",
            headers=headers,
            json={"path": args.path, "reset": args.reset},
        )
        resp.raise_for_status()
        print(resp.json())
    return 0


if __name__ == "__main__":
    sys.exit(main())
