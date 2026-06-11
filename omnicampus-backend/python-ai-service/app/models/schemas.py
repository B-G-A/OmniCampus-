"""
OmniCampus AI Service — Pydantic request / response schemas.

Every model used as a FastAPI request body or response body is defined
here so the OpenAPI docs are always accurate and validation is automatic.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Ingestion ────────────────────────────────────────────────────────────


class IngestRequest(BaseModel):
    """Payload sent by the Node.js backend to trigger document ingestion."""

    file_path: str = Field(..., description="Absolute path to the uploaded file on disk.")
    file_type: str = Field(..., description="File extension without dot: pdf, docx, pptx, txt.")
    material_id: str = Field(..., description="Unique ID of the material record in the DB.")
    subject_id: str = Field(..., description="Subject the material belongs to.")
    semester_id: str = Field(..., description="Semester the material belongs to.")
    collection_name: str = Field(..., description="ChromaDB collection to store chunks in.")


# ── Querying ─────────────────────────────────────────────────────────────


class QueryRequest(BaseModel):
    """User query against ingested course materials."""

    message: str = Field(..., description="The student's question.")
    collection_name: str = Field(..., description="ChromaDB collection to search.")
    subject_id: str = Field(..., description="Filter results to this subject.")
    allow_external: bool = Field(
        default=False,
        description="If True, fall back to general LLM when materials lack an answer.",
    )
    chat_history: list[dict] = Field(
        default_factory=list,
        description="Previous conversation turns (list of {role, content} dicts).",
    )


class QueryResponse(BaseModel):
    """Structured response returned to the frontend."""

    answer: str | None = None
    sources: list[str] = Field(default_factory=list)
    found_in_materials: bool = False
    used_external: bool = False
    prompt_external: bool = False


# ── Document Deletion ────────────────────────────────────────────────────


class DeleteDocumentsRequest(BaseModel):
    """Request to remove all chunks for a specific material from ChromaDB."""

    material_id: str
    collection_name: str


# ── Callbacks ────────────────────────────────────────────────────────────


class IngestionCallback(BaseModel):
    """Payload POSTed back to the Node.js server after ingestion completes."""

    material_id: str
    chunk_count: int = 0
    status: str = Field(..., description="'success' or 'error'")
    error: str | None = None


# ── Health ───────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """Health‐check response for the /health endpoint."""

    status: str
    chroma_status: str
