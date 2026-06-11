/**
 * AI Proxy service — Axios-based client for the Python FastAPI AI service.
 *
 * Provides methods for document ingestion, RAG querying, collection
 * management, and health checks.
 */

const axios = require('axios');
const env = require('../config/env');

// ── Shared Axios instance ───────────────────────────────────────────────────
const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Helpers ─────────────────────────────────────────────────────────────────
const handleError = (error, context) => {
  const msg = error.response?.data?.detail || error.response?.data?.message || error.message;
  console.error(`❌  AI Service error [${context}]: ${msg}`);
  throw new Error(`AI service error (${context}): ${msg}`);
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Send a document for ingestion into the vector store.
 * Uses a generous 120-second timeout because large documents take time.
 */
const ingestDocument = async ({ filePath, fileType, materialId, subjectId, semesterId, collectionName }) => {
  try {
    const response = await aiClient.post(
      '/ingest',
      { filePath, fileType, materialId, subjectId, semesterId, collectionName },
      { timeout: 120_000 }
    );
    return response.data;
  } catch (error) {
    handleError(error, 'ingestDocument');
  }
};

/**
 * Query the RAG pipeline.
 * 30-second timeout — queries should be fast once the index is built.
 */
const queryRAG = async ({ message, collectionName, subjectId, allowExternal = false, chatHistory = [] }) => {
  try {
    const response = await aiClient.post(
      '/query',
      { message, collectionName, subjectId, allowExternal, chatHistory },
      { timeout: 30_000 }
    );
    return response.data;
  } catch (error) {
    handleError(error, 'queryRAG');
  }
};

/**
 * Delete an entire vector collection (used when archiving a semester).
 */
const deleteCollection = async (collectionName) => {
  try {
    const response = await aiClient.delete(`/collection/${encodeURIComponent(collectionName)}`, {
      timeout: 30_000,
    });
    return response.data;
  } catch (error) {
    handleError(error, 'deleteCollection');
  }
};

/**
 * Delete all vector-store documents associated with a specific material.
 */
const deleteDocuments = async (materialId, collectionName) => {
  try {
    const response = await aiClient.delete('/documents', {
      data: { materialId, collectionName },
      timeout: 30_000,
    });
    return response.data;
  } catch (error) {
    handleError(error, 'deleteDocuments');
  }
};

/**
 * Simple health check against the AI service.
 */
const healthCheck = async () => {
  try {
    const response = await aiClient.get('/health', { timeout: 5_000 });
    return response.data;
  } catch (error) {
    handleError(error, 'healthCheck');
  }
};

module.exports = {
  ingestDocument,
  queryRAG,
  deleteCollection,
  deleteDocuments,
  healthCheck,
};
