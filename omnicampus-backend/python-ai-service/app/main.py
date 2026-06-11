"""
OmniCampus AI Service — FastAPI Application Entry‑Point.

Creates the FastAPI app, registers routers, adds CORS middleware,
and exposes a ``/health`` endpoint.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import HealthResponse
from app.routers import ingest, query
from app.services import vectorstore

# ── Logging ──────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Verify ChromaDB is reachable on startup."""
    ok = vectorstore.health_check()
    if ok:
        logger.info("ChromaDB connection verified ✓")
    else:
        logger.warning("ChromaDB is NOT reachable — ingestion/query will fail!")
    yield  # ← application runs here
    logger.info("Shutting down OmniCampus AI Service.")


# ── App ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="OmniCampus AI Service",
    description="RAG‑powered academic assistant microservice.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow everything (internal microservice)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(ingest.router)
app.include_router(query.router)


# ── Health endpoint ──────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health():
    """Liveness / readiness probe."""
    chroma_ok = vectorstore.health_check()
    return HealthResponse(
        status="ok" if chroma_ok else "degraded",
        chroma_status="connected" if chroma_ok else "unreachable",
    )
