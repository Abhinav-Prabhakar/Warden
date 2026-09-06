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

## 2. Core Architectural & Operational Principles

1. **Rule 1 — Freshness Beats History:** The current ward state beats the state from five seconds ago.
2. **Rule 2 — Self-Invalidating Answers:** Warden must *never* blindly continue speaking information that has become obsolete. If underlying mutable state changes mid-sentence, Warden stops, reconsiders, and updates the answer.
3. **Rule 3 — Ground Truth Action Execution:** Never claim an action occurred unless the underlying database/service operation actually succeeded.
4. **Rule 4 — Explain "Why" and "What Next":** Don't just report that a bed or task is blocked—trace the dependency chain and explain *why* and what concrete action can unblock it.
5. **Rule 5 — Closed-Loop Accountability:** Tasks are not complete merely because someone was asked to do them. Track the lifecycle: `requested` → `assigned` → `acknowledged` → `in progress` → `completed` / `verified`.
6. **Rule 6 — Blocker Propagation Awareness:** A blocker at one step (e.g. physician discharge signature) propagates downstream through pharmacy, cloud printing, transport, and bed turnover.
7. **Rule 7 — Append-Only Operational Memory:** Record state transitions in event streams (`patient_events`, `system_events`, `task_events`, `warden_actions`) rather than attempting to derive history from mutable current-state columns.
8. **Rule 8 — Interruptibility:** Conversations are interruptible and correctable at any turn without losing context.
9. **Rule 9 — Cognitive Load Reduction:** Provide concise, high-signal operational briefings rather than exhaustive data dumps.
10. **Rule 10 — Safety & Clinician Primacy:** Never fabricate clinical observations, override clinicians, or silently resolve ambiguous situations with clinical risk.

---

## 3. Database Architecture & Authority

The database is built on **Supabase / PostgreSQL**, adhering strictly to `Database Schema.md`.

### 12 Database Domains (65 Tables & Views):
1. **Organization:** `hospitals`, `departments`, `wards`
2. **Physical Facility & Navigation:** `rooms`, `beds`, `navigation_nodes`, `navigation_edges`
3. **People & Shifts:** `staff`, `staff_shifts`, `staff_skills`, `staff_locations`, `staff_current_locations`
4. **Patients & Contacts:** `patients`, `contacts`, `patient_contacts`, `patient_conditions`, `patient_allergies`, `patient_preferences`
5. **Clinical State:** `vitals` (time-series), `medications`, `patient_medications`, `medication_administrations`, `lab_orders`, `lab_results`, `procedures`
6. **Movement & Turnover:** `bed_assignments`, `patient_transfers`, `discharge_plans`, `cleaning_jobs`
7. **Tasks & Dependencies:** `tasks`, `task_assignments`, `task_dependencies`, `task_events`
8. **Resources & Inventory:** `resource_types`, `resources`, `resource_assignments`, `inventory_items`, `inventory_transactions`
9. **Transport & Escorts:** `transport_resources`, `transport_requests`, `transport_events`
10. **Communication & Escalation:** `communication_contacts`, `communication_attempts`, `escalations`, `escalation_steps`, `notifications`
11. **Queues & Automation:** `dispatch_queue`, `printers`, `print_jobs`, `notification_queue`, `automation_jobs`
12. **Audit, Realtime & Memory:** `patient_events`, `system_events`, `warden_sessions`, `warden_actions`, `voice_interactions`, `feedback_requests`, `feedback_responses`, `call_tasks`, `system_alerts`
13. **High-Performance Views:** `patient_current_state` (realtime operational snapshot per bed/patient)

### Database Triggers & Automations:
- `sync_bed_on_assignment`: Automatically syncs `beds.current_patient_id` and sets status to `occupied` on bed assignment. When released, automatically sets status to `cleaning` and creates an operational `cleaning_jobs` ticket.
- `sync_bed_on_cleaning_complete`: Automatically marks `beds.status = 'available'` when the associated housekeeping cleaning job completes, emitting a `bed_cleaned` system event.
- Realtime publication on core tables: `beds`, `tasks`, `task_assignments`, `patient_events`, `system_events`, `print_jobs`, `system_alerts`, `cleaning_jobs`, `transport_requests`, `escalations`.

---

## 4. Backend Service Layer (`lib/services/`)

Decoupled from frontend UI components as specified in Section 62:

- **`WardService` (`lib/services/ward-service.ts`)**:
  - `getWardLiveState`: Aggregates the central operational model across beds, occupants, time-series vitals, on-duty staff, active alerts, and metrics.
  - `getWhatChanged`: Temporal query engine comparing event streams against a reference timestamp (e.g., "since 1 AM" or "since going on break").
  - `getBedDrilldown`: Full drilldown for individual beds/patients including timeline events, care team, conditions, and discharge roadmap.

- **`TaskService` (`lib/services/task-service.ts`)**:
  - `createTask`: Natural language and structured operational task creation with priority, urgency, and dependencies.
  - `assignTask`: Closed-loop assignment tracking worker eligibility, availability, and assignment history.
  - `updateTaskStatus`: Multi-state transitions (`acknowledged`, `in_progress`, `completed`, `declined`, `cancelled`).
  - `traceTaskBlockers`: Traces unresolved upstream task dependencies.

- **`BedService` (`lib/services/bed-service.ts`)**:
  - `updateBedStatus`: Deterministic state machine transitions (`available`, `occupied`, `reserved`, `cleaning`, `maintenance`, `blocked`).
  - `assignPatientToBed` & `releaseBed`: Bed lifecycle management with automated cleaning triggers.
  - `traceBedBlockers`: Deep blocker chain inspection walking through uncompleted doctor clearance, pharmacy dispensing, cloud print jobs, and housekeeping cleaning.

- **`PrintService` (`lib/services/print-service.ts`)**:
  - Cloud printer queue manager with automated duplicate detection (prevents double-printing identical documents within 2 minutes).
  - Queue prioritization, position tracking, failure handling, retry, and cancellation.

- **`IntelligenceService` (`lib/services/intelligence-service.ts`)**:
  - `evaluateSelfInvalidation`: Compares entity states between query time and response execution time. Returns spoken corrections when state changes.
  - `detectBottlenecks`: Predicts bottlenecks across printer queues, bed capacity shortages, transport queues, and low clinical supplies.
  - `detectContradictions`: Detects conflicting state (e.g. bed available with patient assigned, discharged patient occupying bed).
  - `getPrioritizedNextActions`: Dynamically ranks operational tasks ("What should I do next?").
  - `generateShiftHandoff`: Generates a structured shift handoff covering critical watch lists, pending discharges, and unresolved tasks.

- **`OrchestratorService` (`lib/services/orchestrator-service.ts`)**:
  - Multi-step operational workflows: Bed preparation for incoming patients, complete discharge execution, and transport coordination.

- **`SimulationService` (`lib/services/simulation-service.ts`)**:
  - Simulates rapid patient deterioration, staff becoming unavailable, printer paper jams, and cleaning completions for realistic live demonstration.

---

## 5. API Reference (`app/api/`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate staff with Supabase Auth (email/password) & set session cookies |
| `POST` | `/api/auth/logout` | Sign out and clear active session |
| `GET` | `/api/auth/user` | Get currently authenticated staff profile & role |
| `GET` | `/api/ward/state` | Retrieve live ward operational model & metrics |
| `GET` | `/api/ward/changes?since=<iso>` | "What changed?" temporal analysis since timestamp |
| `GET` | `/api/ward/bottlenecks` | Active bottlenecks & contradictory state warnings |
| `GET` | `/api/ward/handoff` | Structured shift handoff briefing |
| `GET` | `/api/ward/next-actions` | Prioritized operational guidance ("What should I do next?") |
| `GET` | `/api/beds` | Bed inventory & current statuses |
| `GET` | `/api/beds/[id]` | Bed-level operational drilldown |
| `PATCH`| `/api/beds/[id]` | Update bed status (`available`, `occupied`, `cleaning`, etc.) |
| `GET` | `/api/beds/[id]/blockers` | Trace why a bed is blocked & get resolution steps |
| `GET` | `/api/tasks` | Filterable operational task list |
| `POST` | `/api/tasks` | Create task with dependencies and urgency |
| `GET` | `/api/tasks/[id]` | Get detailed task lifecycle & assignments |
| `PATCH`| `/api/tasks/[id]` | Transition task status (`acknowledged`, `in_progress`, etc.) |
| `POST` | `/api/tasks/[id]/assign` | Assign task to staff member |
| `GET` | `/api/tasks/[id]/blockers` | Trace task dependencies |
| `GET` | `/api/print-queue` | Cloud printer queue with position numbers |
| `POST` | `/api/print-queue` | Submit document to print queue (with duplicate prevention) |
| `POST` | `/api/print-queue/[id]` | Retry failed print job |
| `DELETE`|`/api/print-queue/[id]` | Cancel queued print job |
| `POST` | `/api/warden/action` | Execute action with self-invalidation check |
| `POST` | `/api/warden/orchestrate` | Multi-step orchestration (`prepare_bed`, `discharge_patient`) |
| `POST` | `/api/simulation` | Trigger simulation events (`deterioration`, `staff_unavailable`, `printer_failure`, `cleaning_complete`) |

---

## 6. Demo Staff Credentials

| Role | Staff Member | Email | Password |
|---|---|---|---|
| Charge Nurse | Nurse Priya Sharma | `nurse.priya@warden.hospital` | `WardenStaff2026!` |
| Staff Nurse | Rahul Verma | `rahul.nurse@warden.hospital` | `WardenStaff2026!` |
| Attending Doctor | Dr. Alok Shah | `dr.shah@warden.hospital` | `WardenStaff2026!` |
| Ward Porter | Arjun Patel | `arjun.porter@warden.hospital` | `WardenStaff2026!` |
| Night Coordinator | Sunita Rao | `warden.coordinator@warden.hospital` | `WardenStaff2026!` |

---

## 7. Implementation Status & Roadmap

- [x] **P0 — Infrastructure & DB:** Supabase database provisioned, linked, 65 tables/views migrated, RLS policies enabled, realtime publications configured.
- [x] **P0 — Authentication:** Supabase Auth configured with cookie-based SSR sessions, verified login for 5 demo roles.
- [x] **P0 — Seed Data:** Interconnected demo dataset covering deteriorating patients (Bed 8), oxygen requirements (Bed 12), 4-stage discharge blockers (Bed 14), ready discharges (Bed 17), cleaning beds (Bed 22), staff shifts, and cloud printers.
- [x] **P0 — Core Backend Services:** `WardService`, `BedService`, `TaskService`, `PrintService`, `EventService`, `IntelligenceService`, `OrchestratorService`, `SimulationService`.
- [x] **P0 — REST API Layer:** 17 production Route Handlers built, typed, and integration-tested.
- [x] **P1 — Self-Invalidation Engine:** Verification of mutable entities at execution time with automated spoken correction generation.
- [x] **P1 — Operational Intelligence:** Temporal change detection, dependency blocker tracing, bottleneck identification, dynamic next-action prioritization, shift handoff generation.
- [x] **P1 — Vercel & GitHub:** Linked to Vercel and GitHub repository with automatic deployments and environment synchronization.
- [ ] **P0 (Frontend Next Phase) — Live Ward UI:** Bed/floor map, drilldown drawers, realtime indicators, task execution panels.
- [ ] **P0 (Voice Next Phase) — Voice Interface:** Speech-to-text, audio streaming, natural language intent parser, interruptible speech synthesis.

---

## 8. Verification & Test Instructions

To verify the backend and database integration:
```bash
# 1. Run typechecking
npx tsc --noEmit

# 2. Build production bundle
npm run build

# 3. Query linked database
supabase db query --linked "SELECT bed_number, status, acuity FROM patient_current_state;"
```
