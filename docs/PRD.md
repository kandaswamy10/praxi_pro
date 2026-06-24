# Praxi Pro — Product Requirements Document
> *Plan. Learn. Relax.*
> Version 1.0 · June 2026 · Confidential

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Onboarding & Authentication](#4-onboarding--authentication)
5. [Configurable Tabs](#5-configurable-tabs)
6. [Layout & Chrome](#6-layout--chrome)
7. [In-App Ads](#7-in-app-ads)
8. [Bottom Input Bar](#8-bottom-input-bar)
9. [Dashboard](#9-dashboard)
10. [Work Tab](#10-work-tab)
11. [Learning Tab](#11-learning-tab)
12. [Personal Tab](#12-personal-tab)
13. [Finance Tab](#13-finance-tab)
14. [Team Mode](#14-team-mode)
15. [Alarms & Reminders](#15-alarms--reminders)
16. [AI Configuration](#16-ai-configuration)
17. [Persistence & Storage](#17-persistence--storage)
18. [Theme](#18-theme)
19. [Platform Roadmap](#19-platform-roadmap)
20. [Constraints & Out of Scope](#20-constraints--out-of-scope)

---

## 1. Product Overview

**Praxi Pro** is a unified personal and professional productivity platform that combines event management, AI-guided learning, bill tracking, team collaboration, and group finance — all in one configurable interface.

The core insight: professionals use 5–8 fragmented tools daily. Praxi Pro replaces them with a single app that adapts to each user's workflow, powered by open-source AI models by default.

**Tagline:** Plan. Learn. Relax.

---

## 2. Goals & Success Metrics

### Primary Goals
- Replace fragmented tools with one unified planner
- Reduce daily planning overhead to under 5 minutes
- Increase learning goal completion via AI-guided sequencing
- Never miss a meeting, webinar, or birthday via smart alarms
- Empower teams to collaborate without switching apps

### Success Metrics

| Metric | Target |
|--------|--------|
| Daily active use | ≥ 5 days/week |
| Learning goal completion rate | ≥ 70% within deadline |
| Missed alarms | < 2% of scheduled |
| Time to add an event | < 30 seconds |
| Onboarding completion rate | > 85% |
| Tab configuration adoption | > 60% users customise at least one tab |

---

## 3. User Personas

### Alex — The Ambitious Professional
- Works full-time, upskills on weekends
- Needs: work deadlines + learning goals + personal events in one place
- Pain: context-switching between Notion, Google Calendar, and Coursera

### Maya — The Freelancer
- Manages multiple clients, tracks invoices, attends webinars
- Needs: bill tracking, meeting alarms, learning new tools
- Pain: scattered tools, missed payment deadlines

### Raj — The Team Lead
- Leads a 6-person team, owns project delivery
- Needs: shared team events, activity feed, role-based access
- Pain: coordinating via email threads

---

## 4. Onboarding & Authentication

### Step 1 — Welcome Screen
- Praxi Pro logo + tagline
- "Get started free" CTA
- Sign in options: Email OTP · Google OAuth

### Step 2 — Email OTP Flow
1. User enters email address
2. 6-digit OTP sent to email (mock in v1: displayed inline)
3. User enters OTP → verified
4. Session created

### Step 3 — Google OAuth
- One-tap Google sign-in
- Email + avatar pulled from Google profile

### Step 4 — Storage Choice
- **Local** — data saved to IndexedDB in this browser
- **Google Drive** — data saved to `praxi-pro-data.json` in user's Drive
- Short explanation of each option shown
- Switchable later in Settings with one-time migration

### Step 5 — Tab Configuration
- Header: "Choose your workspace"
- Subhead: "Pick the tabs you need. You can always change this later."
- Checklist with icon + description:
  - ✅ Dashboard *(always on)*
  - ☐ Work — projects, deadlines, meetings
  - ☐ Learning — AI-guided goals and topic paths
  - ☐ Personal — birthdays, social events, reminders
  - ☐ Finance — bills, offers, group expenses
- Minimum: Dashboard + 1 tab
- Default: all tabs selected
- "Let's go →" CTA

### Step 6 — AI Setup (optional, skippable)
- "Praxi Pro uses AI for smart features"
- Default: Llama 3.1 8B via OpenRouter (free, no key needed)
- Optional: enter API keys for OpenRouter, Hugging Face, Anthropic, OpenAI, Gemini, Mistral
- "Configure later in Settings" skip link

---

## 5. Configurable Tabs

### At Signup
- Checklist of tabs (see Step 5 above)
- Dashboard always enabled and greyed out with lock icon + tooltip

### Post-Signup Tab Settings (Avatar → Tabs)
- Toggle each tab on/off
- Drag to reorder in tab bar
- Pin one tab as home (opens on launch)
- Dashboard toggle disabled with tooltip: "Dashboard is always visible"
- Bottom input bar context auto-updates to pinned home tab
- Ad banners auto-update to match only enabled tabs

### Available Tabs
| Tab | Icon | Description |
|-----|------|-------------|
| Dashboard | grid | Productivity score, agenda, charts, reminders |
| Work | briefcase | Projects, deadlines, meetings |
| Learning | book | AI-guided goals, topics, skill tree |
| Personal | heart | Birthdays, social events, reminders |
| Finance | coin | Bills, offers, group expenses |

---

## 6. Layout & Chrome

```
┌──────────────────────────────────────────────┐
│  TOP: Tab-contextual ad banner (48px)        │
├──────────────────────────────────────────────┤
│  HEADER: Praxi Pro logo · Tab pills · Avatar │
├──────────────────────────────────────────────┤
│                                              │
│  CONTENT AREA (scrollable)                   │
│                                              │
├──────────────────────────────────────────────┤
│  BOTTOM BAR: 🎤 Voice · 🔗 Paste · ＋ Add   │
└──────────────────────────────────────────────┘
```

- Tab bar shows only enabled tabs, in user-defined order
- Pinned home tab highlighted on launch
- Avatar top-right: name, sign out, Settings, Tabs, Theme toggle

---

## 7. In-App Ads

- **Format:** slim native banner, 48px tall, top of screen
- **Contextual curation by tab:**
  - Dashboard → Notion, Todoist, Linear
  - Work → Jira, Loom, Slack
  - Learning → Coursera, O'Reilly, Audible
  - Personal → Calm, Headspace, local events
  - Finance → Zerodha, Groww, PolicyBazaar, expense trackers
- **Structure:** Logo · 1-line headline · CTA button · × dismiss
- **Frequency cap:** same ad not repeated in one session
- **Dismissed ads** do not reappear that session
- **v1:** static mock ad data seeded per tab
- **v2:** real ad network SDK integration

---

## 8. Bottom Input Bar

Persistent bar at the bottom of every tab. Three controls:

### 🎤 Voice Input
- Powered by Web Speech API
- Tap to start recording, tap to stop
- Transcribed text auto-populates the contextual add form:
  - Work/Personal tab → event form
  - Learning tab → add topic form
  - Finance tab → add bill form
- Small tab-context pill above bar shows current context; tappable to switch

### 🔗 Paste Link
- Paste any URL
- App detects type:
  - Meeting/webinar URL (Zoom, Meet, Teams) → event form pre-filled
  - Article/course URL → learning topic form pre-filled
  - Bill/invoice URL → finance form pre-filled
- Detection uses URL pattern matching + AI classification fallback

### ＋ Add
- Opens contextual add modal for the active tab
- Work/Personal → Add Event modal
- Learning → Add Goal or Add Topic modal
- Finance → Add Bill or Add Group Expense modal

---

## 9. Dashboard

### Hero — Productivity Score
- Circular ring, 0–100
- Formula: hours logged (25%) + milestones completed (25%) + events completed on time (25%) + zero overdue penalty (25%)
- Colour: 0–40 red · 41–70 amber · 71–100 green
- Four supporting metric tiles: Hours Logged · Goals Active · Events Done · Overdue count

### Today's Agenda Strip
- Horizontally scrollable
- All events and goal due dates for today, sorted by time
- Each item: title, time, category badge, urgency colour

### Weekly Stats Strip
- Three metric cards: Hours Logged this week · Goals Progressed · Events Completed

### Charts Panel
- Donut chart — time split: Work / Learning / Personal / Finance
- Horizontal bar chart — progress per active learning goal
- Bar chart — events by category this week

### Reminders Panel
- All items due within 7 days, sorted by urgency
- Overdue items pinned at top in red
- Each item: title, due date, category badge, quick-complete button

### Team Activity Feed *(if in a team)*
- Real-time stream of teammate actions
- "Priya completed 'Q3 Planning'" · "Arjun added event 'Client Call'"

---

## 10. Work Tab

- All work events and project deadlines
- 3 view modes toggled by segmented control:
  - **Calendar** — monthly grid, events as coloured dots
  - **Timeline** — chronological list grouped by Today / Tomorrow / This Week / Later
  - **Kanban** — To Do / In Progress / Done columns
- Daily / Weekly horizon toggle within Timeline and Kanban
- Add Event fields: title, description, date, time, tags, colour, URL, alarm
- Mark complete, delete, edit
- URL events show "Join" button

---

## 11. Learning Tab

### Goal Cards Grid
- Each card: title, category, progress bar, due date badge, tags, share button

### Add Goal
- Title, category, target hours, due date, tags, colour

### Add Topic / URL
- Free-form text or URL paste
- AI pipeline (per-feature model, see §16):
  1. **Classify** — domain, difficulty, estimated study time
  2. **Order** — detect dependencies across all topics, produce recommended sequence
  3. **Suggest** — after each topic is done, recommend next
  4. **Quiz** — generate 5 MCQ questions on topic completion

### Topic View — Hybrid
- **List view** — ordered list with dependency badges, estimated time, completion checkbox
- **Skill tree toggle** — SVG node-link diagram; completed nodes green, locked nodes grey

### Progress Calculation
- Overall = average of (hours logged / target hours) and (topics completed / total topics), each 50%

### Sharing
- **Public link** — read-only view of the learning path
- **Fork/copy** — viewer clones path into their own account
- **Social OG card** — auto-generated image: goal title, topic count, progress %, skill tree preview; share to Twitter/LinkedIn

---

## 12. Personal Tab

- Personal events: birthdays, social events, reminders, appointments
- Same 3 view modes as Work tab
- Birthday events auto-set annual recurrence
- Alarm system with clock deep-link (iOS + Android)

---

## 13. Finance Tab

### Bill Tracking
- Fields: name, amount, due date, recurrence (one-time/weekly/monthly/yearly), category (utility/subscription/insurance/loan/other), payment status (unpaid/paid/overdue)
- Payment reminders via alarm system
- Overdue bills flagged in red

### AI Offer Discovery
- **Paste bill URL** → AI extracts provider, plan, amount, renewal date
- **Upload receipt image** → AI (vision model via Hugging Face) auto-scans and extracts details
- AI searches for cheaper alternatives and better offers
- Side-by-side comparison card: current plan vs suggested alternatives
- Finance tab ad banner contextually shows relevant fintech products

### Group Spending
- Create a group: name, invite members by email or link
- Add shared expenses with three split options per expense:
  - **Equal split** — divided evenly
  - **Custom split** — define % or amount per person
  - **Itemised split** — assign specific line items to specific people
- Settlement view: net balances, who owes whom, settle-up button
- Real-time sync via WebSocket (v2); polling fallback (v1)

---

## 14. Team Mode

### Setup
- Create team workspace from avatar menu
- Invite members by email or shareable link
- Assign roles: Owner · Editor · Viewer

### Roles
| Role | Permissions |
|------|-------------|
| Owner | Full access, manage members, delete workspace |
| Editor | Add, edit, delete events and goals |
| Viewer | Read-only, can comment |

### Features
- Shared Work tab visible to all team members
- Activity feed: real-time stream of all teammate actions
- Comments on events and goals
- @mention notifications
- Push notifications for assignments and mentions (v2)
- **Real-time WebSocket sync** — changes appear instantly (mock polling in v1, real WebSocket in v2)

### Separation of Personal vs Team
- Learning and Finance tabs remain personal by default
- Finance Group is opt-in, separate from team workspace
- No personal data shared without explicit user action

---

## 15. Alarms & Reminders

- **Alarm per event** — custom lead time, 5-min increments, up to 10 days before
- **Snooze** — user-defined per snooze instance, 5-min increments, 5–60 min
- **Delivery:**
  - In-app banner (active tab) with Dismiss + Snooze buttons
  - Browser notification (Web Notifications API) when backgrounded
- **URL events** — alarm fires + "Open Link" button auto-opens meeting/webinar URL
- **Clock deep-link** on alarm creation:
  - iOS: `clock-alarm://` URL scheme (Safari)
  - Android: `intent://alarm` Intent (Chrome)
  - Auto-named: `[Event Title] — [DD MMM YYYY HH:MM]`
- **Urgency colour-coding** on all cards: 🔴 overdue · 🟡 ≤3 days · 🟢 on track
- Alarm polling: `setInterval` every 30 seconds

---

## 16. AI Configuration

### Default
- **Provider:** OpenRouter
- **Model:** `meta-llama/llama-3.1-8b-instruct:free` (free, no API key required)

### Supported Providers
| Provider | Free Tier | Notes |
|----------|-----------|-------|
| OpenRouter | ✅ Free models | Default; 100+ models |
| Hugging Face | ✅ Free tier | Vision + specialist models |
| Anthropic | ❌ Paid | Claude Sonnet/Haiku |
| OpenAI | ❌ Paid | GPT-4o/mini |
| Google | ✅ Limited | Gemini Flash |
| Mistral | ✅ Limited | Mistral 7B |

### Per-Feature Model Assignment
| Feature | Default Model | Provider |
|---------|--------------|----------|
| Topic classification & ordering | llama-3.1-8b-instruct:free | OpenRouter |
| Dependency detection | llama-3.1-8b-instruct:free | OpenRouter |
| Next-topic suggestion | llama-3.1-8b-instruct:free | OpenRouter |
| Quiz generation | mistral-7b-instruct:free | OpenRouter |
| Bill/receipt scanning | microsoft/phi-3-vision | Hugging Face |
| Offer comparison | mistral-7b-instruct:free | OpenRouter |
| Voice transcription correction | llama-3.1-8b-instruct:free | OpenRouter |
| Social share card generation | llama-3.1-8b-instruct:free | OpenRouter |

### Fallback Chain
OpenRouter free → OpenRouter (with key) → Hugging Face → Claude → graceful error banner with setup guide

### Advanced Settings Panel
- Provider + model picker per feature
- API key per cloud provider (stored in IndexedDB only, never synced to Drive)
- OpenRouter base URL (default: `https://openrouter.ai/api/v1`)
- Hugging Face token input
- Test connection button per provider
- Temperature (0.0–1.0) + token limit (128–4096) per feature
- Reset to defaults button
- **Free-form AI Chat** — chat panel accessible from bottom bar, powered by configured default model

---

## 17. Persistence & Storage

### Local (IndexedDB)
- Auto-saves every change instantly
- Survives page refresh
- API keys stored here only, never exported

### Google Drive
- Saves to `praxi-pro-data.json` in user's Drive root
- Auto-saves every change instantly via Drive API
- Manual "Back up to Drive now" button always available

### Notes
- Storage mode chosen at signup, switchable in Settings with one-time migration
- API keys never written to Drive (security)
- Team data synced via WebSocket/backend (v2), not Drive

---

## 18. Theme

- **Auto** — follows system light/dark preference via `prefers-color-scheme`
- **Manual toggle** — light/dark switch in avatar menu
- Theme preference saved to local storage immediately

---

## 19. Platform Roadmap

| Version | Platform | Key additions |
|---------|----------|---------------|
| v1 | React web artifact | Core features, mock auth, IndexedDB/Drive, polling sync |
| v2 | PWA + real backend | Real auth, WebSocket, ad SDK, push notifications, offline mode |
| v3 | React Native iOS + Android | Native alarms, camera for receipts, Apple Sign-In, FCM/APNs |

---

## 20. Constraints & Out of Scope

### v1 Known Constraints
1. WebSocket sync is mocked (polling every 30s fallback)
2. Google OAuth requires real Client ID in production
3. OTP requires mail service in production
4. Drive API requires real OAuth scope in production
5. Ad network is static mock data
6. Receipt image scanning requires file upload handler wired to Hugging Face
7. Sharing URLs are mock (no backend to host shared paths)
8. React Native is v3 scope
9. Clock deep-links only work in native mobile browsers, not inside iframes
10. Browser notifications require explicit user permission grant

### Out of Scope (v1)
- Real payment processing
- Native mobile app
- Google Calendar / Outlook sync
- File attachments on events
- Live ad network SDK
- Backend database (all state in-memory + IndexedDB/Drive)
