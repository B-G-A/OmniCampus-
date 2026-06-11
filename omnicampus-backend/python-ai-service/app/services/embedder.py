"""
OmniCampus AI Service — Embedding Generator.

Wraps the Ollama local embedding API with retry logic.
"""

from __future__ import annotations

import logging
import time
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────

_MAX_RETRIES = 3
_INITIAL_BACKOFF_S = 2.0  # doubles on each retry
_BATCH_SIZE = 100


# ── Public API ───────────────────────────────────────────────────────────


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts, batching automatically to respect API limits.

    Returns a flat list of embedding vectors in the same order as *texts*.
    """
    all_embeddings: list[list[float]] = []

    for start in range(0, len(texts), _BATCH_SIZE):
        batch = texts[start : start + _BATCH_SIZE]
        embeddings = _embed_with_retry(batch)
        all_embeddings.extend(embeddings)
        logger.debug(
            "Embedded batch %d–%d / %d",
            start,
            start + len(batch) - 1,
            len(texts),
        )

    return all_embeddings


def generate_single_embedding(text: str) -> list[float]:
    """Embed a single piece of text and return its vector."""
    result = _embed_with_retry([text])
    return result[0]


# ── Internals ────────────────────────────────────────────────────────────


def _embed_with_retry(texts: list[str]) -> list[list[float]]:
    """Call Ollama embedding API with exponential‑backoff retry."""
    backoff = _INITIAL_BACKOFF_S
    last_error: Exception | None = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            # 1. Try modern batched /api/embed first
            url = f"{settings.OLLAMA_BASE_URL}/api/embed"
            payload = {
                "model": settings.OLLAMA_EMBED_MODEL,
                "input": texts
            }
            try:
                response = httpx.post(url, json=payload, timeout=60.0)
                if response.status_code == 200:
                    data = response.json()
                    if "embeddings" in data:
                        return data["embeddings"]
            except Exception as e:
                logger.debug("Batched embedding /api/embed failed, trying fallback: %s", e)

            # 2. Fallback to /api/embeddings sequentially
            embeddings = []
            for text in texts:
                url_single = f"{settings.OLLAMA_BASE_URL}/api/embeddings"
                payload_single = {
                    "model": settings.OLLAMA_EMBED_MODEL,
                    "prompt": text
                }
                res_single = httpx.post(url_single, json=payload_single, timeout=30.0)
                res_single.raise_for_status()
                data_single = res_single.json()
                embeddings.append(data_single["embedding"])
            return embeddings

        except Exception as exc:
            last_error = exc
            logger.warning(
                "Embedding attempt %d/%d failed: %s — retrying in %.1fs",
                attempt,
                _MAX_RETRIES,
                exc,
                backoff,
            )
            time.sleep(backoff)
            backoff *= 2

    # All retries exhausted
    raise RuntimeError(
        f"Embedding failed after {_MAX_RETRIES} attempts"
    ) from last_error
