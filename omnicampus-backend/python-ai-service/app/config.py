"""
OmniCampus AI Service — Application Configuration.

Loads all environment variables from a .env file and exposes them
through a typed `settings` singleton.  Defaults are provided for every
value so the service can start with just GOOGLE_API_KEY set.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the project root (one level above app/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)


class _Settings:
    """Typed wrapper around environment variables."""

    # ── Ollama ───────────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
<<<<<<< HEAD
    OLLAMA_LLM_MODEL: str = os.getenv("OLLAMA_LLM_MODEL", "llama3")
=======
    OLLAMA_LLM_MODEL: str = os.getenv("OLLAMA_LLM_MODEL", "tinyllama")
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
    OLLAMA_EMBED_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

    # ── ChromaDB ─────────────────────────────────────────────────────
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

    # ── Node.js callback ─────────────────────────────────────────────
    NODE_CALLBACK_URL: str = os.getenv("NODE_CALLBACK_URL", "http://localhost:5000")
    INTERNAL_SERVICE_KEY: str = os.getenv("INTERNAL_SERVICE_KEY", "")

    # ── RAG tuning ───────────────────────────────────────────────────
    RELEVANCE_THRESHOLD: float = float(os.getenv("RELEVANCE_THRESHOLD", "0.75"))
    TOP_K_CHUNKS: int = int(os.getenv("TOP_K_CHUNKS", "5"))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "800"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))


settings = _Settings()
