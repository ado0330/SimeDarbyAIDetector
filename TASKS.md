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
- [x] Full backend test run: 74/74 tests passing via `pytest` — done & verified
- [x] Live end-to-end demo sequence verification via API & daemon servers — done & verified

## Phase 10 — Documentation
- [x] Root `README.md` — done & verified
- [x] `docs/ARCHITECTURE.md` — done & verified
- [x] `docs/API.md` — done & verified
- [x] `docs/FEATURES.md` — done & verified
- [x] `docs/DEMO_SCRIPT.md` (90-120s presentation script) — done & verified

## Phase 11 — Post-Implementation System Polish
- [x] Rebranded product to "GlobalEye" across backend and frontend — done & verified
- [x] Fixed township map pin hovering jitter / flickering bug — done & verified
- [x] Added Shift-Handover "Clear History" button with SQLite audit logging — done & verified
- [x] Synchronized map coordinates with canonical backend reference IDs — done & verified
- [x] Added 1-click sample CCTV clip evaluation — done & verified

## Phase 12 — Multimodal AI Video Understanding & Surveillance Player
- [x] Google Gemini REST API multimodal analyzer (`gemini-3.5-flash-lite` + fallback chain) — done & verified
- [x] Keyframe extraction, JSON schema generation, structured evidence extraction — done & verified
- [x] Automated candidate promotion to active incident queue with priority scoring — done & verified
- [x] Embedded HTML5 CCTV video player in IncidentDetailModal with 1-click detection jump — done & verified
- [x] Byte-range video streaming support in `backend/app/api/videos.py` — done & verified
- [x] Tests: `tests/test_gemini.py` — 2/2 passed (74/74 total)

## Phase 13 — Official Brand Identity & Vector Logo System
- [x] Explored 4 brand concept directions; selected "The Horizon Apex" — done & verified
- [x] Created 6 scalable vector SVG assets in `frontend/public/brand/` — done & verified
- [x] Built reusable `<GlobalEyeLogo>` and `<GlobalEyeSymbol>` React component system — done & verified
- [x] Integrated into Sidebar, Next.js metadata, and browser favicon — done & verified
- [x] Added Brand Identity & Logo System showcase card in `DemoControlsView.tsx` — done & verified
- [x] Next.js build verified (compiled in <1.0s with 0 errors) — done & verified

## Phase 14 — Demo Scenarios Version 2.0 & Unified Evaluation Architecture
- [x] Formulate 6-pillar Version 2.0 scenario suite (Multi-Sector Concurrency, Telemetry Escalation, Gemini Vision, Forensic CCTV Player, Operator Governance, Safety Invariant Fire) — done & verified
- [x] Upgrade `DemoControlsView.tsx` with 6 interactive scenario cards, 90s presentation flow timeline, and navigation shortcuts — done & verified
- [x] Upgrade `OverviewView.tsx` evaluation scenarios panel with Version 2.0 options — done & verified
- [x] Enriched backend `demo.py` return data with `scenario_title` and `version: "2.0"` — done & verified
- [x] Overhaul `docs/DEMO_SCRIPT.md` with complete 90-second rapid pitch, 3-minute extended judging deep-dive, and judge defense cheat-sheet — done & verified
- [x] Test suite: 74/74 pytest tests passing (`.venv/bin/pytest -v`) — done & verified
- [x] Frontend build: `npm run build` compiled in 427ms with 0 type errors — done & verified

## Phase 15 — Video Upload Resiliency & High-Capacity Ingestion
- [x] Diagnose HTTP 500 & socket hangup (`ECONNRESET`) caused by Next.js 16 10MB proxy limit — done & verified
- [x] Configure `proxyClientMaxBodySize: "150mb"` in `frontend/next.config.ts` — done & verified
- [x] Direct client-to-backend upload routing in `frontend/src/lib/api.ts` (`http://${hostname}:8000`) — done & verified
- [x] Expand backend CORS whitelist in `backend/app/config.py` for direct frontend origins — done & verified
- [x] Increase capacity thresholds to 150MB (`max_upload_mb = 150`) and 300s duration (`max_video_seconds = 300`) — done & verified
- [x] Broaden MP4/MOV ISO box signature recognition (`moov`, `mdat`, `wide`, `free`, `skip`, `ftyp`) — done & verified
- [x] Handle unindexed frame counts (`CAP_PROP_FRAME_COUNT <= 0`) and variable/invalid FPS in `probe_video` — done & verified
- [x] Implement sequential frame extraction fallback in `gemini_analyzer.py` — done & verified
- [x] Defensive exception wrapping in `video_service.py` to prevent 500 crashes — done & verified
- [x] Verify high-capacity 83.58 MB upload returning HTTP 202 Accepted — done & verified
- [x] Backend test suite: 74/74 passing (`.venv/bin/pytest -v`) — done & verified
- [x] Frontend build: `npm run build` compiled cleanly in 364ms with 0 type errors — done & verified

## Phase 16 — Video Upload Independence & Deduplication Scoping
- [x] Trace root cause of different fall videos merging into single incident (camera + category temporal dedup window) — done & verified
- [x] Scope `find_duplicate` in `backend/app/services/incident_service.py` so different `video_job_id` files never merge — done & verified
- [x] Enhance Gemini VLM prompt in `gemini_analyzer.py` to enforce unique, visually distinct titles and summaries — done & verified
- [x] Add original filename fallback for candidate titles in `video_service.py` — done & verified
- [x] Add automated test `test_distinct_video_uploads_never_deduplicate_into_same_incident` in `test_video.py` — done & verified
- [x] Test suite: 75/75 pytest tests passing (`.venv/bin/pytest -v`) — done & verified
- [x] Frontend build: `npm run build` compiled cleanly with 0 type errors — done & verified



