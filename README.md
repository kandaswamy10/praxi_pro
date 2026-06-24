# Praxi Pro
> *Plan. Learn. Relax.*

A unified personal and professional productivity app with AI-powered learning paths, gemstone-themed tabs, smart alarms, and team collaboration.

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/kandaswamy10/praxi_pro.git
cd praxi_pro

# 2. Install
npm install

# 3. Environment
cp .env.example .env
# Fill in your keys (see Setup below)

# 4. Run
npm run dev
# → http://localhost:5173
```

---

## 🔑 Environment Setup

Copy `.env.example` to `.env` and fill in:

### Supabase (required for auth + cloud storage)
1. Go to [supabase.com](https://supabase.com) → New project
2. Settings → API → copy `Project URL` and `anon public` key
3. SQL Editor → paste the schema from `src/lib/supabase.js` comments → Run
4. Authentication → Providers → enable Email and Google

### Google OAuth (required for Google sign-in)
1. [console.cloud.google.com](https://console.cloud.google.com) → New project
2. APIs → OAuth 2.0 Client IDs → Web application
3. Authorised origins: `http://localhost:5173` and your production URL
4. Copy the Client ID

### OpenRouter (AI — free tier, no key needed for `:free` models)
1. [openrouter.ai](https://openrouter.ai) → Sign up → Keys
2. Create a key (optional — free models work without one)

### Hugging Face (AI vision — for receipt scanning)
1. [huggingface.co](https://huggingface.co) → Settings → Tokens
2. Create a read token

---

## 📁 Project Structure

```
praxi_pro/
├── src/
│   ├── ai/
│   │   └── service.js          # AI provider router, prompts, fallback chain
│   ├── components/
│   │   └── ui.jsx              # Shared themed UI primitives
│   ├── hooks/
│   │   ├── useAuth.js          # Auth context + Supabase auth helpers
│   │   ├── useData.js          # CRUD for events, goals, topics, links
│   │   └── useAlarms.js        # Alarm polling engine
│   ├── lib/
│   │   ├── supabase.js         # Supabase client + SQL schema
│   │   └── storage.js          # Unified IndexedDB / Supabase storage layer
│   ├── theme/
│   │   └── gems.js             # Gemstone colour palette (Sapphire/Emerald/Ruby/Citrine/Amethyst)
│   ├── views/
│   │   ├── Onboarding.jsx      # Auth + tab config flow
│   │   ├── Dashboard.jsx       # Score ring, charts, reminders
│   │   └── Learning.jsx        # Goals, topics, skill tree, AI quiz
│   ├── App.jsx                 # Root app with tab routing + bottom bar
│   └── main.jsx                # React entry point
├── docs/
│   ├── PRD.md                  # Product Requirements Document
│   ├── TDD.md                  # Technical Design Document
│   ├── LLM-WIKI.md             # AI prompt strategies & schemas
│   └── KANBAN.md               # Sprint board
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions → Vercel CI/CD
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## 💎 Gemstone Tab Themes

| Tab | Gem | Background | Card |
|-----|-----|-----------|------|
| Dashboard | Sapphire | `#dce6f0` | `#1a2744` |
| Work | Emerald | `#d6ece4` | `#1a3d2e` |
| Learning | Ruby | `#f5e8e8` | `#6b1a2a` |
| Personal | Citrine | `#faf0d0` | `#6b4a00` |
| Finance | Amethyst | `#ede8f5` | `#3d1a5c` |

---

## 🤖 AI Features

Default model: **Llama 3.1 8B** via OpenRouter (free, no key required)

| Feature | Model | Provider |
|---------|-------|----------|
| Topic classification | llama-3.1-8b-instruct:free | OpenRouter |
| Dependency detection | llama-3.1-8b-instruct:free | OpenRouter |
| Quiz generation | mistral-7b-instruct:free | OpenRouter |
| Bill scanning | phi-3-vision | Hugging Face |
| AI Chat | llama-3.1-8b-instruct:free | OpenRouter |

Configure per-feature models in **Settings → AI Configuration**.

---

## 🚢 Deployment

### Vercel (recommended)
```bash
npm install -g vercel
vercel login
vercel --prod
```

Or connect GitHub repo to Vercel dashboard for auto-deploys on every push to `main`.

### GitHub Actions (automated)
Add these secrets to your GitHub repo (Settings → Secrets):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_OPENROUTER_KEY`
- `VITE_HF_TOKEN`
- `VITE_APP_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Push to `main` → auto-deploys to production. Push to any other branch → preview deployment.

---

## 🗺️ Roadmap

| Version | Focus |
|---------|-------|
| **v1 (now)** | Auth, Dashboard, Learning tab, AI pipeline |
| **v2** | Work, Personal, Finance tabs + real-time team sync + PWA |
| **v3** | React Native iOS + Android |

See `docs/KANBAN.md` for full sprint breakdown (104 cards, 242 story points).

---

## 📄 License
MIT
