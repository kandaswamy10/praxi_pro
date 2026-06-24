// src/ai/service.js
// Unified AI caller with provider routing, fallback chain, and JSON parsing.

const ENDPOINTS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  huggingface: 'https://api-inference.huggingface.co/models',
  anthropic: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  google: 'https://generativelanguage.googleapis.com/v1beta/models',
};

// Default per-feature config (all free / no key required by default)
export const DEFAULT_AI_CONFIG = {
  features: {
    topicClassify:   { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free', temperature: 0.2, maxTokens: 1500 },
    topicOrder:      { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free', temperature: 0.2, maxTokens: 1500 },
    nextTopic:       { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free', temperature: 0.3, maxTokens: 256  },
    quizGenerate:    { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free',      temperature: 0.6, maxTokens: 1000 },
    billExtract:     { provider: 'huggingface', model: 'mistralai/Mistral-7B-Instruct-v0.2',    temperature: 0.1, maxTokens: 512  },
    offerCompare:    { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free',      temperature: 0.4, maxTokens: 800  },
    urlClassify:     { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free', temperature: 0.1, maxTokens: 32   },
    chat:            { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free', temperature: 0.8, maxTokens: 2048 },
  },
  apiKeys: {},
};

// Fallback chain — tried in order when primary fails
const FALLBACK_CHAIN = [
  { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free', requiresKey: false },
  { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free',     requiresKey: false },
  { provider: 'huggingface', model: 'mistralai/Mistral-7B-Instruct-v0.2',   requiresKey: true  },
  { provider: 'anthropic',   model: 'claude-haiku-4-5-20251001',             requiresKey: true  },
];

// ── BUILD REQUEST ─────────────────────────────────────────────────────────────

function buildRequest(provider, model, systemPrompt, userPrompt, config) {
  const { temperature, maxTokens } = config;
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  switch (provider) {
    case 'openrouter':
      return {
        url: ENDPOINTS.openrouter,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY || config.apiKey || ''}`,
          'HTTP-Referer': import.meta.env.VITE_APP_URL || 'https://praxi-pro.app',
          'X-Title': 'Praxi Pro',
        },
        body: { model, messages, temperature, max_tokens: maxTokens },
      };

    case 'openai':
    case 'mistral':
      return {
        url: ENDPOINTS[provider],
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: { model, messages, temperature, max_tokens: maxTokens },
      };

    case 'anthropic':
      return {
        url: ENDPOINTS.anthropic,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: { model, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }], max_tokens: maxTokens },
      };

    case 'huggingface':
      return {
        url: `${ENDPOINTS.huggingface}/${model}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_HF_TOKEN || config.apiKey || ''}`,
        },
        body: { inputs: `${systemPrompt}\n\n${userPrompt}`, parameters: { max_new_tokens: maxTokens, temperature } },
      };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ── EXTRACT TEXT ──────────────────────────────────────────────────────────────

function extractText(provider, data) {
  try {
    if (provider === 'anthropic') return data.content?.map(b => b.text || '').join('') ?? '';
    if (provider === 'huggingface') return data[0]?.generated_text ?? '';
    if (provider === 'google') return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    // OpenAI-compatible (openrouter, openai, mistral)
    return data.choices?.[0]?.message?.content ?? '';
  } catch {
    return '';
  }
}

// ── JSON PARSER ───────────────────────────────────────────────────────────────

export function parseJSON(raw) {
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonStart = clean.search(/[[\{]/);
  const jsonStr = jsonStart > 0 ? clean.slice(jsonStart) : clean;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`AI returned invalid JSON: ${e.message}\nRaw (first 300 chars): ${raw.slice(0, 300)}`);
  }
}

// ── CORE CALLER ───────────────────────────────────────────────────────────────

async function callProvider(provider, model, systemPrompt, userPrompt, config) {
  const req = buildRequest(provider, model, systemPrompt, userPrompt, config);
  const response = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(req.body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${provider} HTTP ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return extractText(provider, data);
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

export async function callAI(featureKey, userPrompt, systemPrompt, aiConfig = DEFAULT_AI_CONFIG) {
  const featureConf = aiConfig.features[featureKey] ?? DEFAULT_AI_CONFIG.features[featureKey];
  const apiKey = aiConfig.apiKeys?.[featureConf.provider];

  // Try primary provider first
  try {
    return await callProvider(featureConf.provider, featureConf.model, systemPrompt, userPrompt, { ...featureConf, apiKey });
  } catch (primaryErr) {
    console.warn(`Primary AI provider failed (${featureConf.provider}):`, primaryErr.message);
  }

  // Fallback chain
  const errors = [];
  for (const fallback of FALLBACK_CHAIN) {
    if (fallback.requiresKey && !aiConfig.apiKeys?.[fallback.provider]) continue;
    try {
      return await callProvider(
        fallback.provider, fallback.model, systemPrompt, userPrompt,
        { ...featureConf, apiKey: aiConfig.apiKeys?.[fallback.provider] }
      );
    } catch (e) {
      errors.push(`${fallback.provider}/${fallback.model}: ${e.message}`);
    }
  }

  throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
}

// ── FEATURE PROMPTS ───────────────────────────────────────────────────────────

export const prompts = {
  topicClassify: {
    system: `You are a learning path expert. Classify and order topics for a learning goal.
Respond ONLY with valid JSON. No preamble, no markdown fences.`,
    user: (goal, topics) => `
Goal: "${goal.title}" (category: ${goal.category})

Topics:
${JSON.stringify(topics.map(t => ({ id: t.id, title: t.title, url: t.url })), null, 2)}

Return a JSON array. Each item:
{
  "id": "string (preserve original)",
  "title": "string",
  "domain": "string",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedMins": number,
  "dependencies": ["id array of prerequisite topics"],
  "reason": "one sentence"
}`,
  },

  nextTopic: {
    system: `You are a learning coach. Recommend the single best next topic.
Respond ONLY with valid JSON. No preamble.`,
    user: (goal, completedIds, remaining) => `
Goal: "${goal.title}"
Completed topic IDs: ${JSON.stringify(completedIds)}
Remaining topics: ${JSON.stringify(remaining.map(t => ({ id: t.id, title: t.title, dependencies: t.dependencies })))}

Return: { "nextTopicId": "string", "reason": "1-2 sentences" }`,
  },

  quizGenerate: {
    system: `You are an expert educator. Generate a quiz to test comprehension.
Respond ONLY with valid JSON. No preamble, no markdown fences.`,
    user: (topic) => `
Topic: "${topic.title}"
Domain: ${topic.domain}
Difficulty: ${topic.difficulty}
${topic.url ? `URL: ${topic.url}` : ''}

Generate exactly 5 multiple-choice questions.
Return a JSON array:
[{
  "id": "q1",
  "question": "string",
  "options": ["A","B","C","D"],
  "correctIndex": 0,
  "explanation": "string"
}]`,
  },

  urlClassify: {
    system: `Classify this URL into exactly one of: meeting, course, bill, other.
Respond with ONLY the single word.`,
    user: (url) => url,
  },
};
