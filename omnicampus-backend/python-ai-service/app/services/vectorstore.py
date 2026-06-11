"""
OmniCampus AI Service — ChromaDB Vector Store.

Provides a thin, synchronous wrapper around a persistent ChromaDB client.
All collections are managed through this module so callers never touch
the raw client directly.
"""

from __future__ import annotations

import logging

import chromadb

from app.config import settings

logger = logging.getLogger(__name__)

# ── Persistent client (module‑level singleton) ───────────────────────────

_client: chromadb.ClientAPI = chromadb.PersistentClient(
    path=settings.CHROMA_PERSIST_DIR,
)


# ── Collection helpers ───────────────────────────────────────────────────


def get_or_create_collection(name: str) -> chromadb.Collection:
    """Return an existing collection or create a new one."""
    collection = _client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info("Collection '%s' ready (%d docs).", name, collection.count())
    return collection


# ── CRUD ─────────────────────────────────────────────────────────────────


def add_documents(
    collection_name: str,
    documents: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
    ids: list[str],
) -> None:
    """Upsert document chunks into the named collection."""
    collection = get_or_create_collection(collection_name)
    # ChromaDB's add silently skips existing IDs; use upsert to overwrite.
    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    logger.info(
        "Upserted %d chunks into collection '%s'.",
        len(ids),
        collection_name,
    )


def query_collection(
    collection_name: str,
    query_embedding: list[float],
    subject_id: str,
    top_k: int,
) -> dict:
    """Query the collection with a cosine‑similarity search.

    Filters results to the given *subject_id* via ChromaDB metadata
    filtering.  Returns the raw ChromaDB query result dict with keys
    ``ids``, ``documents``, ``metadatas``, ``distances``.
    """
    collection = get_or_create_collection(collection_name)

    where_filter = {"subject_id": subject_id}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )
    return results


def delete_collection(name: str) -> None:
    """Delete an entire collection from ChromaDB."""
    try:
        _client.delete_collection(name=name)
        logger.info("Deleted collection '%s'.", name)
    except ValueError:
        logger.warning("Collection '%s' does not exist — nothing to delete.", name)


def delete_by_material_id(collection_name: str, material_id: str) -> None:
    """Delete all chunks whose metadata ``material_id`` matches."""
    collection = get_or_create_collection(collection_name)
    collection.delete(where={"material_id": material_id})
    logger.info(
        "Deleted chunks with material_id='%s' from collection '%s'.",
        material_id,
        collection_name,
    )


# ── Health ───────────────────────────────────────────────────────────────


def health_check() -> bool:
    """Return True if ChromaDB is reachable and responsive."""
    try:
        _client.heartbeat()
        return True
    except Exception as exc:
        logger.error("ChromaDB health-check failed: %s", exc)
        return False
