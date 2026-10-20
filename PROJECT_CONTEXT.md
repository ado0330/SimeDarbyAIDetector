# PROJECT_CONTEXT — Township Guardian AI

> Read this first in any new session, then `PROGRESS.md`, `TASKS.md`, latest `SESSION_LOG.md`, `DECISIONS.md`.

## Objective
Working hackathon prototype (Sime Darby Property University Hackathon 2026, theme *Township of Tomorrow*,
category PEOPLE — Safety & Security) of **Township Guardian AI**: an AI-assisted township incident detection,
**dynamic prioritization**, and response-coordination dashboard.

**Differentiator: Dynamic Incident Intelligence** — rank concurrent incidents, explain relative urgency, and
re-rank when new evidence changes risk. It is NOT a generic CCTV dashboard.

## Problem / users
Township security control-room administrators monitor many cameras; incidents get missed and concurrent
incidents are hard to triage. Alerts must be assessed, prioritized, explained, assigned and tracked to resolution.

## Operating modes
- **Mode A – Simulation (default, works offline, no AI model):** deterministic scenarios, clearly labelled
  `is_simulated`. Uses the *real* prioritization engine and DB.
- **Mode B – Video Analysis:** upload clips → OpenCV frame sampling → pluggable detector → event candidates →
  human review → incident through the same prioritization engine. If no model is available the UI shows an
  explicit "detector unavailable" state. Never fabricate detections.

## Stack (see DECISIONS.md)
- Frontend: Next.js (App Router) + React + TypeScript + Tailwind CSS, lucide-react, recharts. Hand-written shadcn-style UI primitives.
- Backend: Python 3.9 (system python) + FastAPI + Pydantic v2 + SQLAlchemy 2 + SQLite.
- CV: OpenCV (headless). Detector behind an interface.
- Live updates: SSE (`/api/stream`) with polling fallback.

## Architecture (high-level)
`API routes (thin)` → `services/` (incident_service, prioritization, queue, recommendations, dedup, demo, video) →
`SQLAlchemy models` → SQLite. Prioritization is pure/deterministic and independent of API, DB, and vision code.
Vision pipeline: `Video -> frames -> Detector -> EventCandidate -> review -> incident_service.ingest -> prioritization`.

## Repository structure (target)
```
backend/app/{main,config,database,models,schemas}.py
backend/app/api/        routers
backend/app/services/   prioritization, queue, recommendations, incident_service, demo, video, events, seed
backend/app/vision/     base (interface), opencv detectors, video_processor
backend/tests/
frontend/               Next.js app (src/app, src/components, src/lib)
docs/                   ARCHITECTURE.md, API.md, DEMO_SCRIPT.md, FEATURES.md
.env.example, README.md, PROJECT_CONTEXT.md, PROGRESS.md, TASKS.md, DECISIONS.md, SESSION_LOG.md
```

## Conventions
- Timestamps stored UTC (aware via `UTCDateTime` type); API emits ISO-8601 `Z`; UI displays Asia/Kuala_Lumpur.
- All scoring parameters live in `backend/app/config.py` / `scoring_config` (not scattered).
- Service functions accept an optional `now` for deterministic tests/seed.
- Demo reset only deletes rows with `is_simulated = true`.
- Recommendations are advisory; no real emergency contact is ever made.
- Python 3.9: use `Optional[X]`/`List[X]` (no `X | None`) in Pydantic models.

## Current phase
See `PROGRESS.md`.

## Constraints / limitations
No real CCTV, no real emergency services, fictional township, scoring weights are prototype assumptions needing validation.
