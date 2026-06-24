# Praxi Pro — Technical Design Document
> *Plan. Learn. Relax.*
> Version 1.0 · June 2026

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Data Models](#3-data-models)
4. [State Architecture](#4-state-architecture)
5. [Authentication Flow](#5-authentication-flow)
6. [Storage Layer](#6-storage-layer)
7. [AI Integration](#7-ai-integration)
8. [Alarm System](#8-alarm-system)
9. [Bottom Input Bar](#9-bottom-input-bar)
10. [Learning Dependency Graph](#10-learning-dependency-graph)
11. [Team & Real-time Sync](#11-team--real-time-sync)
12. [Finance Group Splitting](#12-finance-group-splitting)
13. [Tab Configuration System](#13-tab-configuration-system)
14. [Productivity Score Formula](#14-productivity-score-formula)
15. [Ad System](#15-ad-system)
16. [Performance Considerations](#16-performance-considerations)
17. [Error Handling](#17-error-handling)
18. [Security Considerations](#18-security-considerations)

---

## 1. Architecture Overview

Praxi Pro v1 is a **single-file React artifact**. All UI, state, and logic lives in one component tree. There is no backend in v1 — persistence is handled by IndexedDB (local) or Google Drive API (cloud). AI features call third-party APIs client-side.

```
┌─────────────────────────────────────────────────┐
│                  React App                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Auth Layer│ │Tab Router│ │  Bottom Input Bar │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────────────────────────────────────────┐│
│  │              Content Views                   ││
│  │  Dashboard│Work│Learning│Personal│Finance    ││
│  └──────────────────────────────────────────────┘│
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │AI Service│ │ Storage  │ │   Alarm Engine   │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└────────────────────────┬────────────────────────┘
                         │ fetch()
        ┌────────────────┼────────────────┐
        │                │                │
   OpenRouter      Hugging Face     Google Drive API
```

---

## 2. Tech Stack

| Layer | v1 Technology | v2/v3 |
|-------|--------------|-------|
| UI | React 18 (functional + hooks) | React Native |
| Styling | Inline styles + central theme object | StyleSheet |
| Charts | recharts | Victory Native |
| AI | OpenRouter + Hugging Face (fetch) | Same |
| Persistence | IndexedDB (idb-keyval) + Google Drive API | + Supabase/Firebase |
| Auth | Mock OTP + Google OAuth (mock) | Real OAuth + Apple Sign-In |
| Real-time | setInterval polling (30s) | WebSocket / Supabase Realtime |
| Notifications | Web Notifications API | FCM / APNs |
| Voice | Web Speech API | React Native Voice |
| Ads | Static mock data | Real ad SDK |

---

## 3. Data Models

### 3.1 User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  storageMode: 'local' | 'drive';
  enabledTabs: TabId[];          // ordered array, determines tab bar
  pinnedTab: TabId;              // home tab on launch
  theme: 'auto' | 'light' | 'dark';
  aiConfig: AIConfig;
  teamId: string | null;
  createdAt: string;
}
```

### 3.2 Event
```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  date: string;                  // ISO YYYY-MM-DD
  time: string;                  // HH:MM
  category: 'Work' | 'Learning' | 'Personal' | 'Finance';
  tags: string[];
  color: string;                 // hex
  url: string | null;            // meeting/webinar link
  alarmLeadMin: number | null;   // null = no alarm; multiples of 5
  alarmFired: boolean;
  isCompleted: boolean;
  createdBy: string;             // userId
  teamId: string | null;
  createdAt: string;
}
```

### 3.3 LearningGoal
```typescript
interface LearningGoal {
  id: string;
  title: string;
  category: string;
  targetHours: number;
  completedHours: number;
  dueDate: string;
  tags: string[];
  color: string;
  topics: Topic[];
  isShared: boolean;
  shareToken: string | null;
  createdAt: string;
}
```

### 3.4 Topic
```typescript
interface Topic {
  id: string;
  title: string;
  url: string | null;
  domain: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMins: number;
  dependencies: string[];        // topic IDs
  isCompleted: boolean;
  completedAt: string | null;
  quiz: QuizQuestion[];
  suggestedNext: string | null;  // topic ID
}
```

### 3.5 QuizQuestion
```typescript
interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}
```

### 3.6 Bill
```typescript
interface Bill {
  id: string;
  name: string;
  amount: number;
  currency: string;              // default 'INR'
  dueDate: string;
  recurrence: 'one-time' | 'weekly' | 'monthly' | 'yearly';
  category: 'utility' | 'subscription' | 'insurance' | 'loan' | 'other';
  status: 'unpaid' | 'paid' | 'overdue';
  provider: string | null;
  currentPlan: string | null;
  alternatives: PlanAlternative[];
  alarmLeadMin: number | null;
  createdAt: string;
}
```

### 3.7 PlanAlternative
```typescript
interface PlanAlternative {
  provider: string;
  plan: string;
  amount: number;
  savings: number;
  url: string;
  confidence: 'high' | 'medium' | 'low';
}
```

### 3.8 Group (Finance)
```typescript
interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  expenses: Expense[];
  createdBy: string;
  createdAt: string;
}

interface GroupMember {
  userId: string;
  email: string;
  name: string;
  joinedAt: string;
}

interface Expense {
  id: string;
  title: string;
  totalAmount: number;
  paidBy: string;                // userId
  splitType: 'equal' | 'custom' | 'itemised';
  splits: Split[];
  date: string;
  createdAt: string;
}

interface Split {
  userId: string;
  amount: number;
  items: string[];               // for itemised split
  isPaid: boolean;
}
```

### 3.9 AIConfig
```typescript
interface AIConfig {
  features: {
    [featureKey: string]: {
      provider: 'openrouter' | 'huggingface' | 'anthropic' | 'openai' | 'google' | 'mistral';
      model: string;
      temperature: number;       // 0.0–1.0
      maxTokens: number;         // 128–4096
    }
  };
  apiKeys: {
    openrouter?: string;
    huggingface?: string;
    anthropic?: string;
    openai?: string;
    google?: string;
    mistral?: string;
  };
  openrouterBaseUrl: string;
}
```

---

## 4. State Architecture

### 4.1 Root State
```javascript
// Auth
const [user, setUser] = useState(null);
const [authStep, setAuthStep] = useState('welcome'); // welcome|otp|storage|tabs|aisetup

// App
const [activeTab, setActiveTab] = useState(null);    // set after onboarding
const [modal, setModal] = useState(null);

// Data
const [events, setEvents] = useState(SEED_EVENTS);
const [goals, setGoals] = useState(SEED_GOALS);
const [bills, setBills] = useState(SEED_BILLS);
const [groups, setGroups] = useState([]);
const [team, setTeam] = useState(null);

// UI
const [alarmQueue, setAlarmQueue] = useState([]);
const [aiLoading, setAiLoading] = useState({});      // featureKey → boolean
const firedAlarms = useRef(new Set());
```

### 4.2 Derived State (useMemo)
```javascript
const overdueEvents = useMemo(() =>
  events.filter(e => isOverdue(e.date) && !e.isCompleted), [events]);

const productivityScore = useMemo(() =>
  computeScore(events, goals), [events, goals]);

const weeklyStats = useMemo(() =>
  computeWeeklyStats(events, goals), [events, goals]);

const enabledTabs = useMemo(() =>
  user?.enabledTabs ?? ALL_TABS, [user]);
```

---

## 5. Authentication Flow

### Mock OTP (v1)
```javascript
const sendOTP = (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  sessionStorage.setItem('otp', code);           // mock only
  // v2: POST /auth/send-otp { email }
  setAuthStep('verify');
  setOtpHint(code);                              // shown inline in v1
};

const verifyOTP = (email, code) => {
  if (code === sessionStorage.getItem('otp')) {
    createSession(email);
  }
};
```

### Google OAuth (Mock v1)
```javascript
// v1: simulate with a mock user object
const signInWithGoogle = () => {
  createSession('user@gmail.com', 'Demo User', GOOGLE_AVATAR_URL);
};
// v2: real Google OAuth 2.0 PKCE flow
```

---

## 6. Storage Layer

### IndexedDB (idb-keyval pattern)
```javascript
const saveToLocal = async (key, data) => {
  const db = await openDB('praxi-pro', 1);
  await db.put('store', data, key);
};

// Auto-save on every state change
useEffect(() => {
  if (user?.storageMode === 'local') {
    saveToLocal('events', events);
  }
}, [events]);
```

### Google Drive
```javascript
const saveToDrive = async (data) => {
  const token = await getGoogleAccessToken();
  await fetch('https://www.googleapis.com/upload/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'praxi-pro-data.json', ...data })
  });
};
// API keys are NEVER included in Drive saves
```

---

## 7. AI Integration

### 7.1 Provider Router
```javascript
const AI_ENDPOINTS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  huggingface: 'https://api-inference.huggingface.co/models',
  anthropic: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
  google: 'https://generativelanguage.googleapis.com/v1beta/models',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

const callAI = async (featureKey, prompt, systemPrompt) => {
  const config = user.aiConfig.features[featureKey];
  const endpoint = AI_ENDPOINTS[config.provider];
  const apiKey = user.aiConfig.apiKeys[config.provider];
  // ... unified fetch with provider-specific payload shape
};
```

### 7.2 Topic Processing Pipeline
```javascript
const processTopics = async (goal, newTopic) => {
  setAiLoading(prev => ({ ...prev, topicProcessing: true }));
  const prompt = buildTopicPrompt(goal, newTopic);
  const result = await callAI('topicClassification', prompt, TOPIC_SYSTEM_PROMPT);
  const parsed = parseJSON(result);
  updateGoalTopics(goal.id, parsed.topics);
  setAiLoading(prev => ({ ...prev, topicProcessing: false }));
};
```

### 7.3 JSON Response Parsing
```javascript
const parseJSON = (raw) => {
  const clean = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    throw new Error('AI response was not valid JSON');
  }
};
```

### 7.4 Fallback Chain
```javascript
const callWithFallback = async (featureKey, prompt) => {
  const providers = ['openrouter', 'huggingface', 'anthropic'];
  for (const provider of providers) {
    try {
      return await callAI(featureKey, prompt, provider);
    } catch (e) {
      console.warn(`Provider ${provider} failed:`, e.message);
    }
  }
  throw new Error('All AI providers failed');
};
```

---

## 8. Alarm System

### Polling Loop
```javascript
useEffect(() => {
  const checkAlarms = () => {
    const now = Date.now();
    events.forEach(event => {
      if (!event.alarmLeadMin || event.isCompleted) return;
      const eventMs = new Date(`${event.date}T${event.time}`).getTime();
      const fireAt = eventMs - event.alarmLeadMin * 60 * 1000;
      const alarmKey = `${event.id}-${fireAt}`;
      if (now >= fireAt && !firedAlarms.current.has(alarmKey)) {
        firedAlarms.current.add(alarmKey);
        triggerAlarm(event);
      }
    });
  };
  const id = setInterval(checkAlarms, 30000);
  checkAlarms(); // run immediately on mount
  return () => clearInterval(id);
}, [events]);
```

### Browser Notification
```javascript
const triggerAlarm = async (event) => {
  setAlarmQueue(prev => [...prev, event]);
  if (Notification.permission === 'granted') {
    new Notification(`⏰ ${event.title}`, {
      body: `${formatDate(event.date)} at ${event.time}`,
      icon: '/praxi-pro-icon.png',
    });
  }
};
```

### Clock Deep-link
```javascript
const getClockDeepLink = (event) => {
  const label = encodeURIComponent(`${event.title} — ${formatDateTime(event.date, event.time)}`);
  const isIOS = /iPhone|iPad/.test(navigator.userAgent);
  return isIOS
    ? `clock-alarm://?name=${label}`
    : `intent://alarm#Intent;scheme=alarm;S.android.intent.extra.alarm.MESSAGE=${label};package=com.android.deskclock;end`;
};
```

---

## 9. Bottom Input Bar

### Voice Input
```javascript
const startVoice = () => {
  const recognition = new window.webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    handleVoiceInput(transcript, activeTab);
  };
  recognition.start();
};
```

### URL Type Detection
```javascript
const MEETING_PATTERNS = [/zoom\.us/, /meet\.google\.com/, /teams\.microsoft\.com/, /webex\.com/];
const COURSE_PATTERNS = [/coursera\.org/, /udemy\.com/, /youtube\.com/, /medium\.com/];
const BILL_PATTERNS = [/bill/, /invoice/, /payment/, /receipt/];

const detectURLType = (url) => {
  if (MEETING_PATTERNS.some(p => p.test(url))) return 'meeting';
  if (COURSE_PATTERNS.some(p => p.test(url))) return 'course';
  if (BILL_PATTERNS.some(p => p.test(url))) return 'bill';
  return 'unknown'; // fall back to AI classification
};
```

---

## 10. Learning Dependency Graph

### Cycle Detection (DFS)
```javascript
const hasCycle = (topics) => {
  const visited = new Set();
  const dfs = (id, path) => {
    if (path.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    path.add(id);
    const topic = topics.find(t => t.id === id);
    for (const dep of topic?.dependencies ?? []) {
      if (dfs(dep, path)) return true;
    }
    path.delete(id);
    return false;
  };
  return topics.some(t => dfs(t.id, new Set()));
};
```

### Topological Sort (Kahn's Algorithm)
```javascript
const topoSort = (topics) => {
  const inDegree = Object.fromEntries(topics.map(t => [t.id, 0]));
  topics.forEach(t => t.dependencies.forEach(d => inDegree[d]--));
  const queue = topics.filter(t => inDegree[t.id] === 0)
                      .sort((a, b) => a.estimatedMins - b.estimatedMins);
  const result = [];
  while (queue.length) {
    const node = queue.shift();
    result.push(node);
    topics.filter(t => t.dependencies.includes(node.id))
          .forEach(t => { inDegree[t.id]--; if (inDegree[t.id] === 0) queue.push(t); });
  }
  return result;
};
```

---

## 11. Team & Real-time Sync

### v1 — Polling Simulation
```javascript
// Simulate team updates via shared in-memory state
const pollTeamUpdates = () => {
  setInterval(() => {
    if (team) fetchTeamState(team.id); // mock: no-op in v1
  }, 30000);
};
```

### v2 — WebSocket
```javascript
const ws = new WebSocket(`wss://api.praxi-pro.com/teams/${team.id}`);
ws.onmessage = (e) => {
  const { type, payload } = JSON.parse(e.data);
  if (type === 'EVENT_ADDED') setEvents(prev => [...prev, payload]);
  if (type === 'GOAL_UPDATED') updateGoal(payload.id, payload);
  if (type === 'ACTIVITY') setActivityFeed(prev => [payload, ...prev]);
};
```

---

## 12. Finance Group Splitting

```javascript
const computeSplits = (expense) => {
  const { totalAmount, splitType, members, customSplits, items } = expense;
  if (splitType === 'equal') {
    const share = totalAmount / members.length;
    return members.map(m => ({ userId: m.userId, amount: share }));
  }
  if (splitType === 'custom') return customSplits;
  if (splitType === 'itemised') {
    return members.map(m => ({
      userId: m.userId,
      amount: items.filter(i => i.assignedTo === m.userId).reduce((s, i) => s + i.amount, 0)
    }));
  }
};

const computeSettlements = (group) => {
  const balances = {};
  group.members.forEach(m => balances[m.userId] = 0);
  group.expenses.forEach(exp => {
    balances[exp.paidBy] += exp.totalAmount;
    exp.splits.forEach(s => balances[s.userId] -= s.amount);
  });
  // Simplify debts: greedy min-cash-flow algorithm
  return simplifyDebts(balances);
};
```

---

## 13. Tab Configuration System

```javascript
const ALL_TABS = ['dashboard', 'work', 'learning', 'personal', 'finance'];
const REQUIRED_TABS = ['dashboard'];

const updateTabs = (newOrder) => {
  if (!newOrder.includes('dashboard')) return; // guard
  setUser(prev => ({ ...prev, enabledTabs: newOrder }));
  saveUser({ ...user, enabledTabs: newOrder });
};

const pinTab = (tabId) => {
  setUser(prev => ({ ...prev, pinnedTab: tabId }));
};
```

---

## 14. Productivity Score Formula

```javascript
const computeScore = (events, goals) => {
  const now = new Date();
  const weekStart = startOfWeek(now);

  const weekEvents = events.filter(e => new Date(e.date) >= weekStart);
  const completedEvents = weekEvents.filter(e => e.isCompleted);
  const overdueCount = events.filter(e => isOverdue(e.date) && !e.isCompleted).length;

  const totalTopics = goals.reduce((s, g) => s + g.topics.length, 0);
  const completedTopics = goals.reduce((s, g) => s + g.topics.filter(t => t.isCompleted).length, 0);

  const targetHours = goals.reduce((s, g) => s + g.targetHours, 0);
  const loggedHours = goals.reduce((s, g) => s + g.completedHours, 0);

  const hoursScore     = Math.min(loggedHours / (targetHours || 1), 1) * 25;
  const milestoneScore = (totalTopics ? completedTopics / totalTopics : 0) * 25;
  const eventScore     = (weekEvents.length ? completedEvents.length / weekEvents.length : 1) * 25;
  const overdueScore   = Math.max(0, 25 - overdueCount * 5);

  return Math.round(hoursScore + milestoneScore + eventScore + overdueScore);
};
```

---

## 15. Ad System

```javascript
const AD_DATA = {
  dashboard: [
    { id: 'd1', logo: '📋', headline: 'Organise faster with Notion', cta: 'Try free', url: 'https://notion.so' },
    { id: 'd2', logo: '✅', headline: 'Todoist — tasks made simple', cta: 'Get started', url: 'https://todoist.com' },
  ],
  work: [
    { id: 'w1', logo: '🔷', headline: 'Track issues with Linear', cta: 'Sign up', url: 'https://linear.app' },
  ],
  learning: [
    { id: 'l1', logo: '🎓', headline: 'Learn anything on Coursera', cta: 'Explore', url: 'https://coursera.org' },
  ],
  personal: [
    { id: 'p1', logo: '🧘', headline: 'Find your calm with Headspace', cta: 'Try free', url: 'https://headspace.com' },
  ],
  finance: [
    { id: 'f1', logo: '📈', headline: 'Invest smarter with Groww', cta: 'Start investing', url: 'https://groww.in' },
    { id: 'f2', logo: '🛡️', headline: 'Compare insurance on PolicyBazaar', cta: 'Compare now', url: 'https://policybazaar.com' },
  ],
};

const getNextAd = (tab, dismissed) => {
  const ads = AD_DATA[tab] ?? [];
  return ads.find(a => !dismissed.has(a.id)) ?? null;
};
```

---

## 16. Performance Considerations

- All chart data memoised with `useMemo`; recomputed only when source data changes
- AI calls use an in-flight guard (`useRef` flag) to prevent duplicate concurrent requests per feature
- Dependency graph SVG re-renders only when the active goal's topics change
- Alarm polling runs every 30s; check function is O(n) on event count — acceptable under 1000 events
- IndexedDB writes are async and non-blocking; UI updates optimistically before write completes
- Google Drive saves are debounced to 1s to prevent excessive API calls on rapid edits

---

## 17. Error Handling

- All `fetch()` calls to AI providers wrapped in `try/catch`
- AI JSON parse failures show inline error banner; app continues functioning
- If `Notification.permission` is denied, silent fallback to in-app banners only
- IndexedDB unavailable → fallback to in-memory only with a persistent warning banner
- Drive API errors → retry once after 2s, then show manual save prompt
- All modals include an error state with actionable messages

---

## 18. Security Considerations

- API keys stored in IndexedDB only; never included in Drive sync payload
- API keys never logged or shown in plain text after initial entry (masked with `••••`)
- OTP codes stored in sessionStorage only (v1); cleared after verification
- No sensitive data in URL parameters
- Google Drive OAuth scopes requested: `drive.file` only (access only to files created by Praxi Pro)
- Content Security Policy headers (v2): restrict script sources to known CDNs
