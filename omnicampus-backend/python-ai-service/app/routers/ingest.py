"""
OmniCampus AI Service — Ingestion Router.

Exposes ``POST /ingest`` which kicks off a background task to:
  1. Parse the document.
  2. Chunk the text.
  3. Generate embeddings.
  4. Store in ChromaDB.
  5. Call back the Node.js server with the result.
"""

from __future__ import annotations

import logging
from os.path import basename

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.models.schemas import IngestRequest
from app.services import embedder, parser, vectorstore

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Ingestion"])


# ── Background worker ───────────────────────────────────────────────────


def _run_ingestion(req: IngestRequest) -> None:  # noqa: C901 – acceptable complexity
    """Synchronous function executed as a FastAPI background task."""
    material_id = req.material_id
    callback_url = (
        f"{settings.NODE_CALLBACK_URL}/api/materials/internal/ingestion-complete"
    )
    headers = {"X-Internal-Key": settings.INTERNAL_SERVICE_KEY}

    try:
        # 1 ─ Parse
        logger.info("Ingestion started for material_id=%s", material_id)
        text = parser.parse_document(req.file_path, req.file_type)

        if not text.strip():
            raise ValueError("No text could be extracted from the document.")

        # 2 ─ Chunk
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " "],
        )
        chunks = splitter.split_text(text)
        logger.info("Split into %d chunks.", len(chunks))

        # 3 ─ Embed
        embeddings = embedder.generate_embeddings(chunks)

        # 4 ─ Store
        source_file = basename(req.file_path)
        ids = [f"{material_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "material_id": material_id,
                "subject_id": req.subject_id,
                "semester_id": req.semester_id,
                "source_file": source_file,
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]

        vectorstore.add_documents(
            collection_name=req.collection_name,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids,
        )

        # 5 ─ Callback → success
        payload = {
            "material_id": material_id,
            "chunk_count": len(chunks),
            "status": "success",
        }
        _send_callback(callback_url, payload, headers)
        logger.info(
            "Ingestion complete for material_id=%s (%d chunks).",
            material_id,
            len(chunks),
        )

    except Exception as exc:
        logger.exception("Ingestion failed for material_id=%s", material_id)
        payload = {
            "material_id": material_id,
            "status": "error",
            "error": str(exc),
        }
        _send_callback(callback_url, payload, headers)


def _send_callback(url: str, payload: dict, headers: dict) -> None:
    """POST the ingestion result to the Node.js backend."""
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            logger.info("Callback sent successfully: %s", payload.get("status"))
    except Exception as exc:
        # Log but do not re‑raise — the ingestion itself already succeeded/failed.
        logger.error("Failed to send callback to %s: %s", url, exc)


# ── Endpoint ─────────────────────────────────────────────────────────────


@router.post("/ingest")
async def ingest_document(
    req: IngestRequest,
    background_tasks: BackgroundTasks,
):
    """Accept an ingestion request and process it in the background.

    Returns immediately so the Node.js caller is not blocked.
    """
    logger.info(
        "Received ingestion request: material_id=%s, file=%s",
        req.material_id,
        req.file_path,
    )

    # Validate the file type early so obvious errors surface right away.
    if req.file_type.lower().strip().lstrip(".") not in ("pdf", "docx", "pptx", "txt"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {req.file_type}",
        )

    background_tasks.add_task(_run_ingestion, req)

    return {
        "status": "ingestion_started",
        "material_id": req.material_id,
    }
