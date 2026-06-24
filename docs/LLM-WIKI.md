# Praxi Pro — LLM Wiki
> AI Prompt Strategies, Schema Contracts & Parsing Patterns
> Version 1.0 · June 2026

---

## Table of Contents
1. [Provider Configuration](#1-provider-configuration)
2. [Universal Calling Pattern](#2-universal-calling-pattern)
3. [Feature Prompts & Schemas](#3-feature-prompts--schemas)
   - 3.1 Topic Classification & Ordering
   - 3.2 Dependency Detection
   - 3.3 Next-Topic Suggestion
   - 3.4 Quiz Generation
   - 3.5 Bill/Receipt Extraction
   - 3.6 Offer Comparison
   - 3.7 Voice Transcription Correction
   - 3.8 URL Type Detection
4. [JSON Response Parsing](#4-json-response-parsing)
5. [Fallback Chain](#5-fallback-chain)
6. [Error Taxonomy](#6-error-taxonomy)
7. [Prompt Engineering Principles](#7-prompt-engineering-principles)
8. [Model Selection Guide](#8-model-selection-guide)
9. [Free Model Constraints](#9-free-model-constraints)
10. [AI Chat (Free-form)](#10-ai-chat-free-form)

---

## 1. Provider Configuration

### Default Setup (no API key required)
```javascript
const DEFAULT_AI_CONFIG = {
  provider: 'openrouter',
  model: 'meta-llama/llama-3.1-8b-instruct:free',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: null,   // free tier; no key needed for :free models
};
```

### Provider Payload Shapes

**OpenRouter / OpenAI / Mistral (OpenAI-compatible)**
```javascript
{
  model: config.model,
  max_tokens: config.maxTokens,
  temperature: config.temperature,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
}
```

**Anthropic**
```javascript
{
  model: config.model,
  max_tokens: config.maxTokens,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }]
}
```

**Google Gemini**
```javascript
{
  contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
  generationConfig: { maxOutputTokens: config.maxTokens, temperature: config.temperature }
}
```

**Hugging Face Inference**
```javascript
{
  inputs: `${systemPrompt}\n\n${userPrompt}`,
  parameters: { max_new_tokens: config.maxTokens, temperature: config.temperature }
}
```

---

## 2. Universal Calling Pattern

```javascript
const callAI = async (featureKey, userPrompt, systemPrompt) => {
  const config = getFeatureConfig(featureKey);
  const headers = buildHeaders(config);
  const body = buildBody(config, systemPrompt, userPrompt);

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return extractText(config.provider, data);
};

const extractText = (provider, data) => {
  if (provider === 'anthropic') return data.content.map(b => b.text || '').join('');
  if (provider === 'huggingface') return data[0]?.generated_text ?? '';
  if (provider === 'google') return data.candidates[0].content.parts[0].text;
  return data.choices[0].message.content; // OpenAI-compatible
};
```

---

## 3. Feature Prompts & Schemas

### 3.1 Topic Classification & Ordering

**System prompt:**
```
You are a learning path expert. Given a learning goal and a list of topics, you:
1. Classify each topic (domain, difficulty, estimated study time)
2. Identify dependencies between topics
3. Return a topologically ordered list

Respond ONLY with valid JSON. No preamble, no markdown fences.
```

**User prompt template:**
```javascript
const buildTopicPrompt = (goal, topics) => `
Goal: "${goal.title}" (category: ${goal.category})

Topics to process:
${JSON.stringify(topics.map(t => ({ id: t.id, title: t.title, url: t.url })), null, 2)}

Return a JSON array of topics with this exact schema:
[{
  "id": "string (preserve original)",
  "title": "string",
  "domain": "string",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedMins": number,
  "dependencies": ["topic_id_array"],
  "reason": "1-sentence explanation of placement"
}]
`;
```

**Expected response schema:**
```json
[
  {
    "id": "t1",
    "title": "JavaScript Fundamentals",
    "domain": "Programming",
    "difficulty": "beginner",
    "estimatedMins": 120,
    "dependencies": [],
    "reason": "Foundation required before any framework"
  },
  {
    "id": "t2",
    "title": "React Hooks",
    "domain": "Frontend",
    "difficulty": "intermediate",
    "estimatedMins": 90,
    "dependencies": ["t1"],
    "reason": "Requires JS fundamentals"
  }
]
```

---

### 3.2 Next-Topic Suggestion

**System prompt:**
```
You are a learning coach. Given a learner's completed topics and remaining topics,
recommend the single best next topic to study.
Respond ONLY with valid JSON. No preamble.
```

**User prompt template:**
```javascript
const buildNextTopicPrompt = (goal, completedIds, remaining) => `
Goal: "${goal.title}"

Completed topics: ${JSON.stringify(completedIds)}

Remaining topics (with dependencies):
${JSON.stringify(remaining, null, 2)}

Return JSON:
{
  "nextTopicId": "string",
  "reason": "1-2 sentence explanation"
}
`;
```

---

### 3.3 Quiz Generation

**System prompt:**
```
You are an expert educator. Generate a quiz to test comprehension of a topic.
Respond ONLY with valid JSON. No preamble, no markdown fences.
```

**User prompt template:**
```javascript
const buildQuizPrompt = (topic) => `
Topic: "${topic.title}"
Domain: ${topic.domain}
Difficulty: ${topic.difficulty}
${topic.url ? `Reference URL: ${topic.url}` : ''}

Generate exactly 5 multiple-choice questions.
Return a JSON array:
[{
  "id": "q1",
  "question": "string",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "Why this answer is correct"
}]
`;
```

**Validation:** Ensure `correctIndex` is 0–3 and `options` has exactly 4 items.

---

### 3.4 Bill/Receipt Extraction

**Provider:** Hugging Face (vision model: `microsoft/phi-3-vision-128k-instruct`)

**System prompt:**
```
You are a document extraction expert. Extract bill details from the provided image or URL content.
Respond ONLY with valid JSON. No preamble.
```

**User prompt template:**
```javascript
const buildBillExtractionPrompt = (source) => `
Extract the following from this bill/receipt (${source}):
{
  "provider": "company name",
  "plan": "plan or service name",
  "amount": number,
  "currency": "INR|USD|EUR etc",
  "dueDate": "YYYY-MM-DD or null",
  "recurrence": "one-time|monthly|yearly|weekly",
  "category": "utility|subscription|insurance|loan|other",
  "confidence": "high|medium|low"
}
`;
```

---

### 3.5 Offer Comparison

**System prompt:**
```
You are a financial advisor helping users find better deals on their bills and subscriptions.
Given a bill, suggest up to 3 cheaper or better alternatives.
Respond ONLY with valid JSON. No preamble.
```

**User prompt template:**
```javascript
const buildOfferPrompt = (bill) => `
Current bill:
- Provider: ${bill.provider}
- Plan: ${bill.currentPlan}
- Amount: ${bill.amount} ${bill.currency}/month
- Category: ${bill.category}

Suggest up to 3 alternatives. Return JSON array:
[{
  "provider": "string",
  "plan": "string",
  "amount": number,
  "savings": number,
  "url": "string",
  "confidence": "high|medium|low",
  "reason": "1-sentence pitch"
}]
`;
```

---

### 3.6 Voice Transcription Correction

**System prompt:**
```
You are a text cleanup assistant. The user spoke into a voice input.
Clean up the transcription for use as an event title or topic name.
Fix grammar, capitalisation, and remove filler words.
Return ONLY the cleaned text. No JSON, no explanation.
```

**User prompt:** raw Web Speech API transcript

---

### 3.7 URL Type Detection (fallback)

Used when regex pattern matching fails.

**System prompt:**
```
Classify the following URL into one of these categories:
- meeting (video call: Zoom, Meet, Teams, Webex)
- course (educational content: Coursera, Udemy, YouTube, Medium, blogs)
- bill (invoice, payment, receipt page)
- other

Respond with ONLY the category word. Nothing else.
```

**User prompt:** the URL string

---

## 4. JSON Response Parsing

### Standard Parser
```javascript
const parseJSON = (raw) => {
  // Strip markdown code fences
  const clean = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Handle responses that start with explanation text
  const jsonStart = clean.search(/[[{]/);
  const jsonStr = jsonStart > 0 ? clean.slice(jsonStart) : clean;

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}\nRaw: ${raw.slice(0, 200)}`);
  }
};
```

### Schema Validators
```javascript
const validateTopics = (arr) => {
  if (!Array.isArray(arr)) throw new Error('Expected array');
  arr.forEach((t, i) => {
    if (!t.id) throw new Error(`Topic ${i} missing id`);
    if (!['beginner','intermediate','advanced'].includes(t.difficulty))
      throw new Error(`Topic ${i} invalid difficulty`);
    if (!Array.isArray(t.dependencies))
      throw new Error(`Topic ${i} dependencies not array`);
  });
  return arr;
};

const validateQuiz = (arr) => {
  if (!Array.isArray(arr) || arr.length !== 5) throw new Error('Expected 5 questions');
  arr.forEach((q, i) => {
    if (q.options?.length !== 4) throw new Error(`Q${i} needs 4 options`);
    if (![0,1,2,3].includes(q.correctIndex)) throw new Error(`Q${i} invalid correctIndex`);
  });
  return arr;
};
```

---

## 5. Fallback Chain

```javascript
const FALLBACK_PROVIDERS = [
  { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free', requiresKey: false },
  { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free', requiresKey: false },
  { provider: 'huggingface', model: 'mistralai/Mistral-7B-Instruct-v0.2', requiresKey: true },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', requiresKey: true },
];

const callWithFallback = async (featureKey, userPrompt, systemPrompt) => {
  const errors = [];
  for (const fallback of FALLBACK_PROVIDERS) {
    if (fallback.requiresKey && !user.aiConfig.apiKeys[fallback.provider]) continue;
    try {
      return await callAI(featureKey, userPrompt, systemPrompt, fallback);
    } catch (e) {
      errors.push(`${fallback.provider}/${fallback.model}: ${e.message}`);
    }
  }
  throw new Error(`All providers failed:\n${errors.join('\n')}`);
};
```

---

## 6. Error Taxonomy

| Error Code | Cause | Recovery |
|------------|-------|----------|
| `AI_NO_PROVIDERS` | No providers available or all keys missing | Show setup guide banner |
| `AI_JSON_PARSE` | Model returned non-JSON | Retry once; show raw text fallback |
| `AI_RATE_LIMIT` | 429 from provider | Wait 5s, retry once |
| `AI_AUTH` | Invalid API key | Prompt user to update key in Settings |
| `AI_CONTEXT_LIMIT` | Prompt too long | Truncate topic list and retry |
| `AI_VISION_UNAVAILABLE` | Vision model unreachable | Ask user to manually enter bill details |

---

## 7. Prompt Engineering Principles

### Always specify output format first
Put the JSON schema at the end of the prompt, after context. Models attend to recent tokens more strongly.

### Use explicit constraints
- "Respond ONLY with valid JSON" prevents preamble/postamble
- "No markdown fences" prevents ` ```json ` wrapping
- "Exactly 5 items" prevents length drift on quiz generation

### Include the schema inline
Show the exact shape expected, not just a description. Models mimic provided schemas faithfully.

### Keep system prompts short
Under 150 tokens. Long system prompts compete with user content for context window space on small models (8B).

### Temperature guidance
| Task | Temperature |
|------|------------|
| Classification/extraction | 0.1–0.2 (deterministic) |
| Ordering/ranking | 0.2–0.3 |
| Quiz generation | 0.5–0.7 (varied questions) |
| Offer suggestions | 0.3–0.5 |
| Free-form chat | 0.7–0.9 |

### Token budget
| Feature | max_tokens |
|---------|-----------|
| Topic classification (up to 20 topics) | 1500 |
| Next topic suggestion | 256 |
| Quiz (5 questions) | 1000 |
| Bill extraction | 512 |
| Offer comparison | 800 |
| URL type detection | 32 |
| Free-form chat | 2048 |

---

## 8. Model Selection Guide

| Use Case | Recommended Free Model | Why |
|----------|----------------------|-----|
| Classification, ordering, extraction | `meta-llama/llama-3.1-8b-instruct:free` | Fast, instruction-following |
| Quiz generation | `mistralai/mistral-7b-instruct:free` | Better at structured educational content |
| Vision (receipts) | `microsoft/phi-3-vision-128k-instruct` (HF) | Vision-capable, free tier |
| Offer comparison | `mistralai/mistral-7b-instruct:free` | Strong reasoning |
| Free-form chat | `meta-llama/llama-3.1-8b-instruct:free` | Balanced capability |

Paid upgrades:
- `anthropic/claude-haiku-4-5-20251001` — fastest paid option, excellent JSON adherence
- `openai/gpt-4o-mini` — strong structured output, competitive pricing
- `google/gemini-flash-1.5` — fast, large context window

---

## 9. Free Model Constraints

- OpenRouter free models (`:free` suffix) have no guaranteed rate limits but may be slow during peak hours
- No API key required for OpenRouter free tier — requests use shared quota
- Hugging Face free tier: cold starts (first request ~5–10s), 1000 req/day
- Free models may refuse certain content (policy varies by model)
- Context window: Llama 3.1 8B = 128k tokens; Mistral 7B = 32k tokens
- Free models do not support function calling / tool use — use JSON prompt engineering instead

---

## 10. AI Chat (Free-form)

Accessible from the bottom bar (speech bubble icon) on any tab.

**System prompt:**
```
You are Praxi, the AI assistant for Praxi Pro — a personal and professional productivity app.
You help users plan their work, manage learning goals, track bills, and coordinate with their team.
Be concise, practical, and friendly. If the user asks you to add an event, goal, or bill,
respond with structured JSON they can confirm. Otherwise respond in plain conversational text.
```

**Structured action response** (when user says "add X"):
```json
{
  "action": "add_event|add_goal|add_bill",
  "data": { /* prefilled form fields */ },
  "message": "I've pre-filled a form for you — want me to add this?"
}
```

**Chat history** — pass full conversation array per request (no backend memory):
```javascript
const messages = [
  { role: 'system', content: PRAXI_SYSTEM_PROMPT },
  ...chatHistory,
  { role: 'user', content: userMessage }
];
```
