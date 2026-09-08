# Warden — Voice-First Hospital Ward Operations Agent

> **"Warden maintains a live model of what is happening in the ward, coordinates people/resources/tasks, and continuously re-evaluates its responses as the underlying situation changes."**

---

## 1. What Warden Is & Product Purpose

Warden is an intelligent operational coordination layer designed specifically for **night-shift ward coordinators and charge nurses**. Working alone or with minimal staff at 2 AM in an acute hospital ward is a high-cognitive-load, rapidly mutating environment.

### What Warden IS:
- A live operational coordination layer
- Voice-first, state-aware, and action-oriented
- Interruptible and self-invalidating
- Aware of operational dependencies, blockers, and queues
- Designed for chaotic, high-stakes night shifts

### What Warden IS NOT:
- A generic hospital management / EHR replacement
- A static CRUD dashboard
- A passive chatbot sitting beside a database
- A clinical diagnostic or treatment decision system

---

## 2. In-Browser API Key Management (Zero `.env` for Voice & LLM APIs)

Warden is designed to be configured entirely in the browser without needing `.env` files for third-party AI APIs:

1. **5-Second Long-Press Settings Dialog:** Click and hold the ThinkingOrb for 5 seconds to open the `VoiceSettingsModal`.
2. **Supported API Providers:**
   - **TTS Providers:** Fish Audio (default `s2.1-pro-free` with SSE streaming), Rime AI (`mistv2`), OpenAI TTS, and Browser Speech.
   - **LLM Providers:** Groq (`llama-3.3-70b-versatile`), OpenAI.
   - **STT Providers:** Web Speech API, Groq Whisper Turbo, OpenAI Whisper.
   - **LiveKit Credentials:** LiveKit WebSocket URL, API Key, and API Secret.
3. **LocalStorage Persistence:** All entered credentials are saved to browser `localStorage` (`warden_api_keys` and `warden_voice_config`), overriding environment variables and dispatched via client headers and payloads directly to `/api/voice/chat` and `/api/voice/tts`.

---

## 3. Interactive UI & Floor Plan Navigation

The main interface is built with Next.js 16 (Turbopack) and Tailwind CSS, adhering strictly to Figma glassmorphism design standards (`figma-glass-card`, Urbanist font):

- **Full-Viewport Screen Swiping:** Drag or swipe horizontally on the background to navigate between operational screens:
  - **Screen 1 (General Ward):** 3D floor plan with 11 interactive bed overlays, status glows, Bed 2 room label, and quick icon toolbar.
  - **Screen 2 (Pharmacy Medicine Shelf):** 3D pharmacy shelving with downward light fixtures and 4 highlighted medication categories (Cetirizine, Benadryl, Ibuprofen, Amoxicillin) with clinical indications.
  - **Screen 3 (Diagnostics & Telemetry):** Ward telemetry and diagnostic operational view.
- **Centered Layout:** Both the floor plan and pharmacy shelf images and all their interactive UI elements (beds, overlays, labels, cards) are centered in the viewport for wide and ultra-wide displays.

---

## 4. Bed Color Meanings & Clinical Semantics

The 11 beds on the ward floor plan reflect live clinical and operational state:

| Color | Meaning | Beds | Details |
| :--- | :--- | :--- | :--- |
| **Green** | **Patient is doing well** | **Beds 1, 5, 6, 8, 9, 11** | Normal vitals, resolving conditions, all care complete, zero pending tasks. |
| **Orange** | **Task you have to do there** | **Beds 2, 4, 7, 10** | Active operational task requiring action:<br>• **Bed 2:** Terminal UV-C disinfection & restock<br>• **Bed 4:** Awaiting Attending sign-off on blocked discharge<br>• **Bed 7:** Wheelchair porter dispatch with portable O2 to CT Suite 1<br>• **Bed 10:** Discharge medication handover & family escort checkout |
| **Red** | **Danger & Priority Test** | **Bed 3** | Critical vitals deterioration (HR 118, SpO2 90%, BP 158/98), unstable angina. Priority test: **STAT Doctor Review & 12-lead ECG**. |

---

## 5. Live Supabase Bed Drilldown Glass Card

Clicking any of the 11 beds populates the bottom-right glassmorphic card directly from Supabase:
- **Bed & Acuity Badges:** `DOING WELL` (Green), `TASK PENDING` (Orange), `DANGER / STAT` (Red).
- **Patient Profile:** Full name, Medical Record Number (MRN), Blood Type, Age/Sex, and Active Condition.
- **Cardiac Waveform & Vitals Strip:** Real-time animated cardiac telemetry bars plus 4-column vitals: Heart Rate (with pulse animation), SpO2, Blood Pressure, and Temperature.
- **Operational Notices:** Contextual banners highlighting pending tasks, discharge blockers, cleaning ETA, or clinical alerts.
- **Action Toolbar:** One-click Porter Request dispatch and Print Clinical Paperwork triggers.
- **ThinkingOrb Voice Agent:** Anchored to the bottom-right corner, reacting visually to voice states (`idle`, `listening`, `thinking`, `speaking`).

---

## 6. Architecture & Services

### Frontend & API Layer (`app/`)
- Built on Next.js 16 App Router with Turbopack.
- REST endpoints under `/api/beds`, `/api/tasks`, `/api/ward`, `/api/voice/chat`, `/api/voice/tts`, `/api/voice/livekit`, `/api/print-queue`, `/api/simulation`.

### Backend Service Layer (`lib/services/`)
- **`WardService`:** Central operational aggregator, temporal "What changed?" queries, and bed drilldown resolver.
- **`BedService`:** Deterministic bed lifecycle transitions (`occupied`, `cleaning`, `available`, `blocked`).
- **`TaskService`:** Closed-loop operational task tracking with urgency and dependency tracing.
- **`PrintService`:** Cloud printer queue manager with automated duplicate detection.
- **`IntelligenceService`:** Runtime self-invalidation evaluation, bottleneck prediction, contradiction detection, and shift handoff generation.

### Standalone Telephone Backend (`backend/`)
- Express & TypeScript service for LiveKit SIP telephone dispatch.
- Multi-provider TTS adapter supporting Fish Audio SSE streaming, Rime AI, and fallback waterfall.
- Decoupled from Next.js root tsconfig to ensure clean Vercel production builds.
- Comprehensive Vitest suite with 33/33 passing tests across 6 test suites.

---

## 7. Database (`Supabase / PostgreSQL`)

- **Host:** `https://boxxmmxulpagjswsnvxw.supabase.co`
- **Core Domains:** Physical facility (`beds`, `rooms`), clinical state (`patients`, `vitals`, `patient_conditions`), operational movement (`tasks`, `cleaning_jobs`, `discharge_plans`), and event memory (`patient_events`, `system_events`).
- **Database Seeding:** Run `node --env-file=.env.local scripts/seed-beds.mjs` to re-seed all 11 beds and their clinical states.

---

## 8. Verification & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run Next.js development server
npm run dev

# 3. Run production build
npm run build

# 4. Run backend tests
cd backend && npm test
```

### Production Deployment
- **Live Vercel Production URL:** [https://warden-eight-theta.vercel.app](https://warden-eight-theta.vercel.app)
