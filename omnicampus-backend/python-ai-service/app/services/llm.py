"""
OmniCampus AI Service — LLM (Ollama) Integration.

Provides generation paths through local Ollama chat API.
"""

from __future__ import annotations

import logging
import httpx
<<<<<<< HEAD
=======
import json
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)

from app.config import settings

logger = logging.getLogger(__name__)

# ── System prompts ───────────────────────────────────────────────────────

_RAG_SYSTEM_PROMPT = (
    "You are OmniCampus AI, an academic assistant for students.\n"
    "You must answer questions ONLY using the provided course materials context below.\n"
    "Do not use any external knowledge. If the context does not contain enough information\n"
    "to answer the question, say exactly: \"This information is not available in the uploaded course materials.\"\n"
    "Always cite the source file name when referencing specific content.\n"
    "Be concise, clear, and academically appropriate.\n"
    "\n"
    "Context from course materials:\n"
    "<context>\n"
    "{context}\n"
    "</context>"
)

_GENERAL_SYSTEM_PROMPT = (
    "You are a helpful academic assistant. Answer the following question thoroughly."
)

# ── Helpers ──────────────────────────────────────────────────────────────

_HISTORY_WINDOW = 4  # keep the last N chat turns for context


def _trim_history(chat_history: list[dict]) -> list[dict]:
    """Return only the most recent conversation turns."""
    return chat_history[-_HISTORY_WINDOW:] if chat_history else []


def _build_ollama_messages(
    system_prompt: str,
    chat_history: list[dict],
    query: str,
<<<<<<< HEAD
) -> list[dict]:
=======
    user_context: dict = None,
) -> list[dict]:
    if user_context:
        ctx_str = json.dumps(user_context, indent=2)
        system_prompt += f"\n\nStudent Profile (Use this if the student asks about their personal data, attendance, or marks):\n{ctx_str}"
        
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
    """Build the final messages payload for Ollama's chat API."""
    messages = [{"role": "system", "content": system_prompt}]

    for msg in _trim_history(chat_history):
        role = msg.get("role", "user")
        if role in ("model", "bot", "ai"):
            role = "assistant"
        content = msg.get("content", "")
        if content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": query})
    return messages


def _call_ollama_chat(messages: list[dict]) -> str:
    """Send a POST request to Ollama's chat endpoint."""
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": settings.OLLAMA_LLM_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.2,
        }
    }
    
    try:
        response = httpx.post(url, json=payload, timeout=60.0)
        response.raise_for_status()
        data = response.json()
        
        # Ollama's chat response matches {"message": {"role": "assistant", "content": "..."}}
        answer = data["message"]["content"].strip()
        return answer
    except Exception as exc:
        logger.error("Failed to query Ollama chat API: %s", exc)
        raise RuntimeError(f"Ollama chat query failed: {exc}") from exc


# ── Public API ───────────────────────────────────────────────────────────


def generate_rag_response(
    query: str,
    context: str,
    chat_history: list[dict],
<<<<<<< HEAD
) -> str:
    """Generate an answer grounded in the supplied *context* chunks."""
    system_instruction = _RAG_SYSTEM_PROMPT.format(context=context)
    messages = _build_ollama_messages(system_instruction, chat_history, query)
=======
    user_context: dict = None,
) -> str:
    """Generate an answer grounded in the supplied *context* chunks."""
    system_instruction = _RAG_SYSTEM_PROMPT.format(context=context)
    messages = _build_ollama_messages(system_instruction, chat_history, query, user_context)
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
    
    answer = _call_ollama_chat(messages)
    logger.info("RAG response generated (%d chars).", len(answer))
    return answer


def generate_general_response(
    query: str,
    chat_history: list[dict],
<<<<<<< HEAD
) -> str:
    """Generate an answer without course‑material context (external mode)."""
    messages = _build_ollama_messages(_GENERAL_SYSTEM_PROMPT, chat_history, query)
=======
    user_context: dict = None,
) -> str:
    """Generate an answer without course‑material context (external mode)."""
    messages = _build_ollama_messages(_GENERAL_SYSTEM_PROMPT, chat_history, query, user_context)
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
    
    answer = _call_ollama_chat(messages)
    logger.info("General response generated (%d chars).", len(answer))
    return answer
<<<<<<< HEAD
=======


def generate_related_topics(query: str, context: str) -> list[str]:
    """Generate a list of 3 short related topics or follow-up questions."""
    prompt = (
        "Based on the following query and context, generate exactly 3 short follow-up questions or related topics "
        "that a student might find helpful to explore next. Return them as a comma-separated list without numbering or bullets.\n\n"
        f"Query: {query}\n\nContext:\n{context}"
    )
    messages = [{"role": "user", "content": prompt}]
    
    try:
        response = _call_ollama_chat(messages)
        topics = [t.strip() for t in response.split(",") if t.strip()]
        return topics[:3]
    except Exception as exc:
        logger.warning("Failed to generate related topics: %s", exc)
        return []
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
