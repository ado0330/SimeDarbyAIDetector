# TASKS
Legend: `[ ]` not started · `[~]` in progress · `[x]` completed AND verified · `[!]` blocked

## Phase 1 — Repository inspection & planning
- [x] Inspect repo (empty), tooling (py3.9, node 26, no ffmpeg) — done & verified
- [x] Create progress files (PROJECT_CONTEXT, PROGRESS, TASKS, DECISIONS, SESSION_LOG) — done & verified

## Phase 2 — Backend foundation
- [x] venv + requirements.txt + config/env (`backend/app/config.py`, `.env.example`) — done & verified
- [x] DB layer (`database.py`, UTCDateTime) — done & verified

## Phase 3 — Database & incident models
- [x] Models: Location, Camera, Incident, IncidentEvent, IncidentAssignment, AuditLog, Evidence, VideoJob, EventCandidate — done & verified
- [x] Seed fictional locations/cameras + demo history — done & verified

## Phase 4 — Prioritization engine
- [x] `services/prioritization.py` pure scoring + rules + explanation — done & verified
- [x] `services/queue.py` sorting + hysteresis — done & verified
- [x] `services/recommendations.py` — done & verified
- [x] Tests: `cd backend && .venv/bin/pytest tests/test_prioritization.py` — 25/25 passed

## Phase 5 — Incident management APIs
- [x] incident_service (ingest/dedup, ack, assign, action, status, override, evidence, recalc, resolve, reopen) — done & verified
- [x] REST routers per spec §10 + SSE `/api/stream` — done & verified
- [x] Tests: `tests/test_incident_workflow.py`, `tests/test_api.py` — 22/22 passed

## Phase 6 — Demo scenario generator
- [x] `services/demo.py` scenarios A–D + reset (simulated-only) — done & verified
- [x] Tests: `tests/test_demo.py` — 10/10 passed

## Phase 7 — Frontend dashboard
- [x] Next.js scaffold + enterprise design system (Tailwind CSS v4, Lucide Icons, Recharts) — done & verified
- [x] 7 views: Overview, Active Incidents, Map, Video Analysis, History, Analytics, Demo & Config — done & verified
- [x] Comprehensive IncidentDetailModal (factors, timeline, audit trail, action sub-modals) — done & verified
- [x] Real-time SSE subscription (`api.subscribeQueueEvents`) — done & verified
- [x] `npx tsc --noEmit` (0 errors) & `npm run build` (Turbopack succeeded) — done & verified

## Phase 8 — Video processing & AI
- [x] Detector interface + unavailable state — done & verified
- [x] OpenCV video processor + upload validation — done & verified
- [x] Posture-heuristic detector (real detections only) + review flow — done & verified
- [x] Tests: `tests/test_video.py` — 13/13 passed

## Phase 9 — Testing & integration
- [x] Full backend test run: 70/70 tests passing via `pytest` — done & verified
- [x] Live end-to-end demo sequence verification via API & daemon servers — done & verified

## Phase 10 — Documentation
- [x] Root `README.md` — done & verified
- [x] `docs/ARCHITECTURE.md` — done & verified
- [x] `docs/API.md` — done & verified
- [x] `docs/FEATURES.md` — done & verified
- [x] `docs/DEMO_SCRIPT.md` (90-120s presentation script) — done & verified

## Phase 11 — Final demo verification
- [x] Run all checks, record results in PROGRESS.md — done & verified
