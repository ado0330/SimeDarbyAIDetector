# TASKS
Legend: `[ ]` not started · `[~]` in progress · `[x]` completed AND verified · `[!]` blocked

## Phase 1 — Repository inspection & planning
- [x] Inspect repo (empty), tooling (py3.9, node 26, no ffmpeg) — done 2026-10-20
- [x] Create progress files (PROJECT_CONTEXT, PROGRESS, TASKS, DECISIONS, SESSION_LOG)

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
- [ ] Next.js scaffold + design system
- [ ] Overview, Active Incidents, Incident Details, Map, History, Analytics, Settings/Demo, Video Analysis
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build`

## Phase 8 — Video processing & AI
- [x] Detector interface + unavailable state — done & verified
- [x] OpenCV video processor + upload validation — done & verified
- [x] Posture-heuristic detector (real detections only) + review flow — done & verified
- [x] Tests: `tests/test_video.py` — 13/13 passed

## Phase 9 — Testing & integration
- [ ] Full backend test run
- [ ] Manual/browser end-to-end of demo sequence

## Phase 10 — Documentation
- [ ] README, docs/ARCHITECTURE.md, docs/API.md, docs/FEATURES.md, docs/DEMO_SCRIPT.md

## Phase 11 — Final demo verification
- [ ] Run all checks, record results in PROGRESS.md
