# PROGRESS

## Last Updated
2026-10-20 15:40 +08:00

## Current Phase
Phase 7: Frontend Dashboard (Backend foundation, prioritization engine, simulation mode, video analysis pipeline, and 70/70 backend tests are completed and verified)

## Overall Status
In progress (Milestone 1 backend complete; moving to Next.js frontend)

## Completed Work
- Repo initialized, python venv created (`backend/.venv`), dependencies installed.
- Core configuration & enums (`enums.py`, `config.py`, `services/scoring_config.py`).
- SQLite database layer with UTC timezone handling (`database.py`, `models.py`).
- 9 domain entities: Location, Camera, Incident, IncidentEvent, IncidentAssignment, EvidenceItem, AuditLog, VideoJob, EventCandidate.
- Deterministic prioritization engine (`services/prioritization.py`):
  - Base formula: `0.40 * sev + 0.25 * imm + 0.20 * people + 0.15 * secondary`.
  - Additive evidence modifiers, baseline category profiles, emergency rule floors, uncertainty separation.
- Queue ordering service (`services/queue.py`):
  - Emergency tiering (tier 0 vs 1), level ranking, hysteresis-smoothed rank_score, time-since-detection, tiebreaker.
- Rules-based recommendation engine (`services/recommendations.py`): advisory guidance without fake dispatch.
- Incident management service (`services/incident_service.py`):
  - Ingestion and temporal-spatial deduplication (`dedup_window_seconds = 300`).
  - Actions: acknowledge, assign, record_action, update_evidence, recalculate, override_priority, verify, resolve, reopen, close.
  - Complete audit logging and timeline history.
- Demo scenario generator (`services/demo.py`):
  - Scenario A: 3 simultaneous incidents (collision, fall, parking).
  - Scenario B: Dynamic risk escalation (fall moves above collision).
  - Scenario C: Human intervention (ack -> assign -> action -> resolve).
  - Scenario D: Uncertain detection / false positive review.
  - Seed demo history (15 realistic historical records) & safe demo reset (only purges simulated records).
- Real video pipeline & computer vision (`vision/` & `services/video_service.py`):
  - Pluggable `Detector` interface with explicit unavailable state.
  - OpenCV video processor (probe, signature checks, size/duration validation, frame extraction).
  - Posture-heuristic fall candidate detector with temporal tracking.
  - Candidate review flow (review before active incident creation).
- REST API & SSE (`api/incidents.py`, `api/platform.py`, `api/videos.py`, `services/events.py`).
- Automated tests: 70 unit and integration tests passing (`pytest`).

## Verified Work
- 70/70 backend tests passing via pytest:
  - `test_prioritization.py` (25/25 passed)
  - `test_incident_workflow.py` (15/15 passed)
  - `test_api.py` (7/7 passed)
  - `test_demo.py` (10/10 passed)
  - `test_video.py` (13/13 passed)
- Live FastAPI TestClient verification:
  - `/api/health`: 200 OK, DB OK, detector registered.
  - Scenario A execution: generates 3 concurrent incidents ranked by real urgency.
  - Scenario B execution: updates fall evidence, dynamic re-ranking into emergency tier 0 confirmed.
  - `/api/analytics/summary`: accurate aggregated metrics from persisted DB records.

## Unverified Work
- Frontend application (Next.js dashboard) — not started yet.

## Current Task
Ready to scaffold Next.js frontend with Tailwind CSS and build the dashboard screens.

## Next Steps
1. Scaffold Next.js frontend in `frontend/` (React, TypeScript, Tailwind CSS, Lucide icons).
2. Build UI design system components (Badge, Button, Card, Tabs, Dialog, Modal, Dropdown).
3. Implement 7 core dashboard views:
   - Overview (KPIs, active incidents, charts, mode toggle).
   - Active Incident Queue (sorted by urgency, dynamic re-rank animations, score breakdown).
   - Incident Details (timeline, evidence, audit log, actions: ack, assign, override, resolve).
   - CCTV & Video Analysis (clip upload, processing bar, candidate review).
   - Township Map (schematic map with camera & incident pins).
   - Incident History & Analytics (filters, resolution metrics).
   - Demo Controls (Scenario A, B, C, D one-click triggers & reset).
4. Connect frontend to backend REST API & live SSE updates.
5. Create `.env.example`, README, and architectural documentation.

## Known Bugs
None.

## Blockers
None. Backend is completely verified and operational.

## Last Known Good State
Backend fully working with all 70 tests passing.

## Resume Instructions
1. Inspect repo with `git status`.
2. Run backend tests to verify health: `cd backend && .venv/bin/pytest -q`.
3. Proceed to Phase 7: scaffold Next.js frontend in `frontend/`.
