/**
 * AI Gateway — Centralized AI provider with automatic failover.
 *
 * Provider chain: Ollama (primary) → Gemini (fallback) → Grok (fallback)
 * The frontend never knows which provider generated the response.
 *
 * Features:
 * - Health monitoring for each provider
 * - Automatic failover with configurable timeouts
 * - Request queuing to prevent overload
 * - Detailed logging for debugging
 * - Graceful degradation (never crashes)
 */

const axios = require('axios');
const env = require('../config/env');

// ── Provider Configuration ──────────────────────────────────────────────────

const PROVIDERS = {
  ollama: {
    name: 'Ollama',
    baseUrl: env.OLLAMA_URL || 'http://localhost:11434',
    model: env.OLLAMA_MODEL || 'tinyllama',
    timeout: 60000,
    enabled: true,
    healthy: false,
    lastCheck: null,
    failCount: 0,
  },
  gemini: {
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL || 'gemini-2.0-flash',
    timeout: 30000,
    enabled: !!env.GEMINI_API_KEY,
    healthy: false,
    lastCheck: null,
    failCount: 0,
  },
  grok: {
    name: 'Grok',
    baseUrl: env.GROK_BASE_URL || 'https://api.x.ai/v1',
    apiKey: env.GROK_API_KEY,
    model: env.GROK_MODEL || 'grok-3-mini',
    timeout: 30000,
    enabled: !!env.GROK_API_KEY,
    healthy: false,
    lastCheck: null,
    failCount: 0,
  },
};

// ── Request Queue ───────────────────────────────────────────────────────────

const MAX_CONCURRENT = 5;
let activeRequests = 0;
const requestQueue = [];

const enqueue = (fn) => {
  return new Promise((resolve, reject) => {
    const task = { fn, resolve, reject };
    if (activeRequests < MAX_CONCURRENT) {
      _runTask(task);
    } else {
      requestQueue.push(task);
    }
  });
};

const _runTask = async (task) => {
  activeRequests++;
  try {
    const result = await task.fn();
    task.resolve(result);
  } catch (err) {
    task.reject(err);
  } finally {
    activeRequests--;
    if (requestQueue.length > 0) {
      _runTask(requestQueue.shift());
    }
  }
};

// ── Health Monitoring ───────────────────────────────────────────────────────

const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

const checkOllamaHealth = async () => {
  try {
    const res = await axios.get(`${PROVIDERS.ollama.baseUrl}/api/tags`, { timeout: 5000 });
    PROVIDERS.ollama.healthy = res.status === 200;
    PROVIDERS.ollama.failCount = 0;
  } catch {
    PROVIDERS.ollama.healthy = false;
    PROVIDERS.ollama.failCount++;
  }
  PROVIDERS.ollama.lastCheck = new Date();
};

const checkGeminiHealth = async () => {
  if (!PROVIDERS.gemini.enabled) return;
  try {
    const url = `${PROVIDERS.gemini.baseUrl}/models?key=${PROVIDERS.gemini.apiKey}`;
    const res = await axios.get(url, { timeout: 5000 });
    PROVIDERS.gemini.healthy = res.status === 200;
    PROVIDERS.gemini.failCount = 0;
  } catch {
    PROVIDERS.gemini.healthy = false;
    PROVIDERS.gemini.failCount++;
  }
  PROVIDERS.gemini.lastCheck = new Date();
};

const checkGrokHealth = async () => {
  if (!PROVIDERS.grok.enabled) return;
  try {
    const url = `${PROVIDERS.grok.baseUrl}/models`;
    const res = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${PROVIDERS.grok.apiKey}` },
      timeout: 5000,
    });
    PROVIDERS.grok.healthy = res.status === 200;
    PROVIDERS.grok.failCount = 0;
  } catch {
    PROVIDERS.grok.healthy = false;
    PROVIDERS.grok.failCount++;
  }
  PROVIDERS.grok.lastCheck = new Date();
};

const runHealthChecks = async () => {
  await Promise.allSettled([checkOllamaHealth(), checkGeminiHealth(), checkGrokHealth()]);
};

// Initial health check
runHealthChecks().catch(() => { });

// Periodic health checks
setInterval(() => {
  runHealthChecks().catch(() => { });
}, HEALTH_CHECK_INTERVAL);

// ── Provider Calls ──────────────────────────────────────────────────────────

const callOllama = async (messages, options = {}) => {
  const url = `${PROVIDERS.ollama.baseUrl}/api/chat`;
  const payload = {
    model: options.model || PROVIDERS.ollama.model,
    messages,
    stream: false,
    ...(options.format ? { format: options.format } : {}),
    options: { temperature: options.temperature || 0.2 },
  };

  const response = await axios.post(url, payload, { timeout: PROVIDERS.ollama.timeout });
  return response.data.message?.content?.trim() || '';
};

const callGemini = async (messages, options = {}) => {
  if (!PROVIDERS.gemini.apiKey) throw new Error('Gemini API key not configured');

  const model = options.model || PROVIDERS.gemini.model;
  const url = `${PROVIDERS.gemini.baseUrl}/models/${model}:generateContent?key=${PROVIDERS.gemini.apiKey}`;

  // Convert chat format to Gemini format
  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const payload = {
    contents,
    generationConfig: {
      temperature: options.temperature || 0.2,
      maxOutputTokens: options.maxTokens || 4096,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await axios.post(url, payload, { timeout: PROVIDERS.gemini.timeout });
  const candidates = response.data?.candidates;
  if (candidates && candidates[0]?.content?.parts?.[0]?.text) {
    return candidates[0].content.parts[0].text.trim();
  }
  throw new Error('Empty response from Gemini');
};

const callGrok = async (messages, options = {}) => {
  if (!PROVIDERS.grok.apiKey) throw new Error('Grok API key not configured');

  const url = `${PROVIDERS.grok.baseUrl}/chat/completions`;
  const payload = {
    model: options.model || PROVIDERS.grok.model,
    messages,
    temperature: options.temperature || 0.2,
    max_tokens: options.maxTokens || 4096,
  };

  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${PROVIDERS.grok.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: PROVIDERS.grok.timeout,
  });

  return response.data?.choices?.[0]?.message?.content?.trim() || '';
};

// ── Failover Chain ──────────────────────────────────────────────────────────

/**
 * Generate a response with automatic failover across providers.
 * @param {Array} messages - Chat messages in [{role, content}] format
 * @param {Object} options - { model, temperature, format, maxTokens }
 * @returns {Object} { response, provider, latency }
 */
const generate = async (messages, options = {}) => {
  return enqueue(async () => {
    const startTime = Date.now();
    const errors = [];
    const providerChain = [
      { name: 'ollama', fn: callOllama, provider: PROVIDERS.ollama },
      { name: 'gemini', fn: callGemini, provider: PROVIDERS.gemini },
      { name: 'grok', fn: callGrok, provider: PROVIDERS.grok },
    ];

    for (const { name, fn, provider } of providerChain) {
      if (!provider.enabled) continue;

      try {
        const response = await fn(messages, options);
        const latency = Date.now() - startTime;

        provider.healthy = true;
        provider.failCount = 0;

        console.log(`✅ AI Gateway: ${name} responded in ${latency}ms`);

        return { response, provider: name, latency };
      } catch (err) {
        provider.failCount++;
        if (provider.failCount >= 3) provider.healthy = false;

        const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
        errors.push({ provider: name, error: errorMsg });
        console.warn(`⚠️  AI Gateway: ${name} failed — ${errorMsg}`);
      }
    }

    // All providers failed — return graceful degradation
    console.error('❌ AI Gateway: All providers failed', errors);
    return {
      response: "I'm sorry, the AI service is temporarily unavailable. Please try again in a few moments.",
      provider: 'fallback',
      latency: Date.now() - startTime,
      errors,
    };
  });
};

/**
 * Generate a JSON response with automatic failover.
 * Attempts to parse the AI response as JSON with repair logic.
 */
const generateJSON = async (messages, options = {}) => {
  const result = await generate(messages, { ...options, format: 'json' });

  if (result.provider === 'fallback') {
    return { ...result, parsed: null };
  }

  try {
    // Try direct parse
    let parsed = JSON.parse(result.response);
    return { ...result, parsed };
  } catch {
    // Try extracting JSON from response
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let cleaned = jsonMatch[0];
        // Fix trailing commas
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        const parsed = JSON.parse(cleaned);
        return { ...result, parsed };
      } catch {
        // JSON repair failed
      }
    }
    return { ...result, parsed: null };
  }
};

// ── Status ──────────────────────────────────────────────────────────────────

const getStatus = () => {
  return Object.entries(PROVIDERS).map(([key, p]) => ({
    name: p.name,
    key,
    enabled: p.enabled,
    healthy: p.healthy,
    failCount: p.failCount,
    lastCheck: p.lastCheck,
  }));
};

module.exports = {
  generate,
  generateJSON,
  getStatus,
  runHealthChecks,
  PROVIDERS,
};
