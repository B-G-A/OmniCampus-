"""
OmniCampus AI Service — Query Router.

Endpoints:
  POST   /query                         — RAG or external query
  DELETE /collection/{collection_name}  — drop an entire collection
  DELETE /documents                     — remove chunks by material_id
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import DeleteDocumentsRequest, QueryRequest, QueryResponse
from app.services import embedder, llm, vectorstore

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Query"])


# ── Query endpoint ───────────────────────────────────────────────────────


@router.post("/query", response_model=QueryResponse)
async def query_materials(req: QueryRequest):
    """Answer a student's question using RAG (with optional external fallback)."""

    # 1 ─ Embed the question
    try:
        query_embedding = embedder.generate_single_embedding(req.message)
    except Exception as exc:
        logger.error("Failed to embed query: %s", exc)
        raise HTTPException(status_code=502, detail="Embedding service unavailable.") from exc

    # 2 ─ Search ChromaDB
    try:
        results = vectorstore.query_collection(
            collection_name=req.collection_name,
            query_embedding=query_embedding,
            subject_id=req.subject_id,
            top_k=settings.TOP_K_CHUNKS,
        )
    except Exception as exc:
        logger.error("ChromaDB query failed: %s", exc)
        raise HTTPException(status_code=502, detail="Vector store query failed.") from exc

    # 3 ─ Check relevance
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    has_results = bool(documents)
    is_relevant = has_results and distances[0] <= settings.RELEVANCE_THRESHOLD

    if not is_relevant:
        # No relevant material found
        if not req.allow_external:
            # Ask the user whether to try an external search
            return QueryResponse(
                found_in_materials=False,
                prompt_external=True,
            )
        # External fallback approved
        try:
            answer = llm.generate_general_response(
                query=req.message,
                chat_history=req.chat_history,
            )
        except Exception as exc:
            logger.error("External LLM call failed: %s", exc)
            raise HTTPException(status_code=502, detail="LLM service unavailable.") from exc

        return QueryResponse(
            answer=answer,
            found_in_materials=False,
            used_external=True,
        )

    # 4 ─ Build context from relevant chunks
    context_parts: list[str] = []
    source_set: set[str] = set()

    for doc, meta in zip(documents, metadatas):
        source = meta.get("source_file", "unknown")
        source_set.add(source)
        context_parts.append(f"[Source: {source}]\n{doc}")

    context = "\n\n---\n\n".join(context_parts)

    # 5 ─ Generate RAG answer
    try:
        answer = llm.generate_rag_response(
            query=req.message,
            context=context,
            chat_history=req.chat_history,
        )
    except Exception as exc:
        logger.error("RAG LLM call failed: %s", exc)
        raise HTTPException(status_code=502, detail="LLM service unavailable.") from exc

    return QueryResponse(
        answer=answer,
        sources=sorted(source_set),
        found_in_materials=True,
    )


# ── Collection management endpoints ─────────────────────────────────────


@router.delete("/collection/{collection_name}")
async def delete_collection(collection_name: str):
    """Delete an entire ChromaDB collection."""
    try:
        vectorstore.delete_collection(collection_name)
    except Exception as exc:
        logger.error("Failed to delete collection '%s': %s", collection_name, exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"status": "deleted", "collection_name": collection_name}


@router.delete("/documents")
async def delete_documents(req: DeleteDocumentsRequest):
    """Delete all chunks for a specific material_id from a collection."""
    try:
        vectorstore.delete_by_material_id(
            collection_name=req.collection_name,
            material_id=req.material_id,
        )
    except Exception as exc:
        logger.error(
            "Failed to delete material_id='%s' from '%s': %s",
            req.material_id,
            req.collection_name,
            exc,
        )
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"status": "deleted", "material_id": req.material_id}
