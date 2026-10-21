# SESSION LOG

## Session 1 — 2026-10-20 (15:18 – 15:40 +08:00)
**Objectives:** Inspect repo, establish protocol files, implement backend foundation, data models, prioritization engine, incident workflows, demo scenarios, video processing pipeline, and comprehensive automated test suite.
**Work performed:**
1. Created repository structure, progress persistence files (`PROJECT_CONTEXT.md`, `PROGRESS.md`, `TASKS.md`, `DECISIONS.md`, `SESSION_LOG.md`).
2. Configured Python 3.9 venv with FastAPI, SQLAlchemy 2, Pydantic v2, OpenCV-headless 4.14.0, pytest, httpx.
3. Implemented full backend:
   - `enums.py`, `config.py`, `database.py` with UTC timezone management.
   - `models.py` (9 ORM tables: Location, Camera, Incident, IncidentEvent, IncidentAssignment, EvidenceItem, AuditLog, VideoJob, EventCandidate).
   - `services/scoring_config.py` (pure declarative weights, baselines, modifiers, emergency rules).
   - `services/prioritization.py` (pure deterministic scoring, emergency rule floors, factor breakdown, explanation generator).
   - `services/queue.py` (tiering, level sorting, hysteresis smoothing, age-based neglect prevention).
   - `services/recommendations.py` (advisory rules-based next actions).
   - `services/incident_service.py` (candidate ingestion, spatio-temporal deduplication, priority recalculation, manual override with audit, acknowledge, assign, actions, resolve, reopen).
   - `services/demo.py` (Scenarios A–D, 15-item realistic demo history seed, safe reset of simulated data only).
   - `services/analytics.py` (aggregated metrics computed from persisted records).
   - `services/events.py` (in-process SSE event broker).
   - `vision/` pipeline: `base.py` (detector interface), `posture.py` (temporal horizontal-box posture heuristic), `detectors.py` (HOG and YOLOX providers), `registry.py`, `video_processor.py` (frame sampling, validation).
   - `api/`: `incidents.py`, `platform.py`, `videos.py`, `deps.py`.
   - `main.py` application entrypoint with lifecycle, CORS, uniform error handling.
4. Resolved OpenCV 5 `HOGDescriptor` module issue by pinning `opencv-python-headless>=4.9,<5`.
5. Automated testing:
   - 70/70 backend tests passing across 5 test suites.
   - Live integration smoke test verified (Scenario A concurrent ranking & Scenario B dynamic escalation).
**Commands executed:**
- `cd backend && .venv/bin/pytest -q` -> 70 passed in 1.32s
- Live FastAPI integration run with SQLite TestClient -> verified Scenario A, Scenario B, and Analytics summary.

---

## Session 2 — 2026-10-20 (15:45 – 16:03 +08:00)
**Objectives:** Implement human-centred, modern, enterprise security operations frontend per mandatory UI/UX design direction, wire live backend APIs and SSE events, verify full end-to-end integration, and create complete documentation.
**Work performed:**
1. Built 7 comprehensive, modular dashboard views adhering strictly to the non-AI-generic enterprise security aesthetic:
   - `OverviewView.tsx`: Operational KPIs, Top Rank #1 spotlight, queue preview, demo trigger cards.
   - `ActiveIncidentsView.tsx`: Central incident queue with rank badges (`#1`, `#2`), multi-factor filters, search, and dynamic intelligence rationale.
   - `TownshipMapView.tsx`: Interactive SVG schematic of Sime Darby Property sectors, 10 CCTV feeds, and urgency pins.
   - `VideoAnalysisView.tsx`: Drag-and-drop video upload, CV pipeline disclosure, and candidate review stream.
   - `HistoryView.tsx`: Searchable historical archive, status filters, and instant CSV export.
   - `AnalyticsView.tsx`: Persisted operational metrics, priority distribution donut chart, and category bar chart.
   - `DemoControlsView.tsx`: One-click scenario runners A–D, system reset, and scoring formula inspector.
2. Built `IncidentDetailModal.tsx` inspector with scoring factor contribution deltas, plain-language assessment, timeline, immutable audit logs, and action sub-modals (Acknowledge, Assign, Record Action, Override Priority, Resolve, Reopen).
3. Configured Next.js 16 App Router `page.tsx` with real-time SSE stream (`api.subscribeQueueEvents`), fallback polling, and toast notifications.
4. Verified compilation and production build:
   - `npx tsc --noEmit` -> 0 errors.
   - `npm run build` -> Turbopack build succeeded in 1.9s with 3/3 static pages.
5. Started both servers in daemon mode:
   - Backend on `http://127.0.0.1:8000` (FastAPI).
   - Frontend on `http://localhost:3000` (Next.js 16).
6. Live scenario end-to-end verification via API:
   - Scenario A: Ingests 3 concurrent incidents at the exact same timestamp; Person Fall ranked #1.
   - Scenario B: Dynamic risk escalation updates evidence; Person Fall jumps to Rank #1 with Emergency Tier and score increase.
   - Scenario C: Operator intervention executes full lifecycle (Acknowledge $\to$ Assign $\to$ Record Action $\to$ Resolve).
   - Full audit trail preserved in SQLite.
7. Produced project documentation:
   - Root `README.md`
   - `docs/ARCHITECTURE.md`
   - `docs/API.md`
   - `docs/FEATURES.md`
   - `docs/DEMO_SCRIPT.md` (90-120s presentation script)

---

## Session 3 — 2026-10-21 (09:00 – 11:15 +08:00)
**Objectives:** Product re-branding to GlobalEye, fix map pin hover jitter, implement incident history governance, integrate Google Gemini multimodal AI video understanding, build in-modal CCTV surveillance video player with instant timestamp seeking, and design an official scalable vector brand identity & logo system.
**Work performed:**
1. **Commercial Rebranding & Layout Polish:**
   - Standardized application name to **GlobalEye** across frontend and backend.
   - Removed redundant quick demo bar from top header for an authentic SOC layout.
   - Fixed township map pin hovering jitter / flickering bug by replacing CSS scale transforms on SVG `<g>` elements with stable, invisible `r="22"` hit-target circles.
   - Added shift-handover "Clear History" button with mandatory SQLite audit logging in `HistoryView.tsx`.
   - Synchronized map coordinates to canonical backend sector and camera IDs (`LOC-GATE..SCH`, `CAM-GATE-01..SCH-01`).
   - Added pre-packaged 1-click CCTV sample footage evaluation.
2. **Multimodal AI Video Understanding (Google Gemini 3.5 Flash Lite):**
   - Built `backend/app/vision/gemini_analyzer.py` supporting chronological keyframe sampling and direct REST communication with Google Generative Language API.
   - Enforced structured JSON output schema detecting road collisions, pedestrian falls, fire/smoke, and parking obstructions.
   - Implemented automatic fallback chain: `[gemini-3.5-flash-lite, gemini-2.0-flash-lite, gemini-1.5-flash, gemini-2.0-flash]`.
   - Built automatic candidate promotion pipeline: detected events are instantly ingested as active incidents with multi-factor risk priority scoring and broadcast via SSE.
   - Loaded user's API key securely via `backend/.env` (git-ignored) and hid technical AI configuration cards from the operator UI for a clean enterprise interface.
3. **In-Modal CCTV Surveillance Video Player:**
   - Integrated an HTML5 surveillance video player directly inside `IncidentDetailModal.tsx`.
   - Supports native video controls, video scrubbing, fullscreen, and audio mute.
   - Built 1-click "Jump to Detection Point (XX.Xs)" button that immediately seeks to the exact second where the collision or incident occurred.
   - Enabled mode switching between live CCTV video playback and AI-annotated keyframe evidence.
   - Updated `backend/app/api/videos.py` to support `HEAD` requests, byte-range streaming, and MIME type mappings (`video/mp4`, `video/quicktime`, etc.).
   - Linked `video_url` across `IncidentOut` and `EvidenceItemOut`.
4. **Official GlobalEye Brand Identity & Scalable Vector Logo System:**
   - Formulated 4 creative concepts and selected "The Horizon Apex": dual sweeping orbital crescent arcs (panoramic surveillance & global township scope) enclosing a precision circular iris with a centered 4-point priority diamond reticle (triage & focus).
   - Generated 6 clean vector SVG assets in `frontend/public/brand/`:
     - `globaleye-logo.svg` (Primary dark lockup)
     - `globaleye-logo-dark.svg` (Dark surface lockup)
     - `globaleye-logo-light.svg` (Light surface lockup)
     - `globaleye-symbol.svg` (Standalone emblem)
     - `globaleye-symbol-mono.svg` (Monochrome vector glyph)
     - `favicon.svg` (16x16 / 32x32 high-contrast favicon)
   - Created reusable `<GlobalEyeLogo>` and `<GlobalEyeSymbol>` React component system (`frontend/src/components/brand/GlobalEyeLogo.tsx`).
   - Integrated into Sidebar (`Sidebar.tsx`), Next.js layout metadata (`layout.tsx`), and browser icon (`icon.svg`, `favicon.svg`).
   - Added interactive Brand Identity & Logo System showcase card in `DemoControlsView.tsx`.
5. **Testing & Quality Assurance:**
   - Backend pytest suite: **74/74 passing** in 1.62s (`.venv/bin/pytest -v`).
   - Frontend build: `npm run build` compiled in <1.0s with 0 errors.
   - Both daemons operational: Backend on `http://127.0.0.1:8000`, Frontend on `http://localhost:3000`.
   - All changes maintained strictly on local machine (no git push).

---

## Session 4 — 2026-10-21: Demo Scenarios Version 2.0 & Unified Evaluation Architecture

### Focus & Objectives
Upgrade the platform demonstration scenarios from the legacy Version 1.0 (synthetic-only mock events) to **Version 2.0**, reflecting all newly engineered capabilities: Google Gemini 3.5 Flash Lite Multimodal Video Intelligence, in-modal CCTV surveillance video streaming with 1-click 24.0s seek, City of Elmina spatial GIS sector mapping, shift handover compliance governance, and safety invariance.

### Accomplishments
1. **Demo Scenarios Version 2.0 Suite Formulation:**
   - Designed 6 cohesive scenarios bridging AI vision, prioritization math, forensic playback, and human governance:
     - **Scenario 1:** Multi-Sector Concurrency (The Morning Rush across City of Elmina sectors)
     - **Scenario 2:** Dynamic Telemetry Escalation (Life-Safety Floor & Live SSE Queue Re-ranking)
     - **Scenario 3:** Gemini 3.5 Flash Lite Multimodal Video Intelligence & Auto-Triage
     - **Scenario 4:** In-Modal CCTV Surveillance Video Player & 1-Click Forensic Seek (`24.0s`)
     - **Scenario 5:** Operator Triage, Emergency Override & Shift Handover Governance
     - **Scenario 6:** Safety Invariance & Uncertainty Handling (Low-Confidence Fire)
2. **Frontend Demonstration Controls Upgrade:**
   - Completely revamped `DemoControlsView.tsx`: added 6 interactive scenario cards, a 90-second pitch flow timeline, direct navigation shortcuts, and preserved the vector brand identity showcase.
   - Upgraded `OverviewView.tsx` quick demo runner cards to Version 2.0 with Gemini Lab and Low-Confidence Fire options.
3. **Backend Service Polish:**
   - Enriched `backend/app/services/demo.py` return dictionary with `scenario_title` and `version: "2.0"` while maintaining 100% test compatibility.
4. **Hackathon Presentation & Live Demo Script Overhaul:**
   - Rewrote `docs/DEMO_SCRIPT.md` into an authoritative Version 2.0 guide: 90-second rapid pitch walkthrough, 3-minute extended deep-dive for technical judges, and judge defense cheat-sheet.
5. **Quality Assurance & Verification:**
   - Backend pytest suite: **74/74 passing** in 1.60s (`.venv/bin/pytest -v`).
   - Frontend build: `npm run build` compiled cleanly in 427ms with 0 type errors.
   - Both background servers active and running on local ports 8000 and 3000.
   - All work kept strictly local on developer machine.

---

## Session 5 — 2026-10-21: High-Capacity Video Upload & Resilient Ingestion Pipeline

### Focus & Objectives
Diagnose and resolve the intermittent video upload failure ("keep processing and says upload fail 500. some video can some video cannot"), expand video upload capacity to 150MB / 5 minutes, and harden the OpenCV video container parser and Gemini keyframe extractor against real-world video encoding quirks.

### Root Cause Analysis
1. **Next.js 16 Reverse Proxy Body Limit (10MB):** Next.js App Router dev server proxies `/api/videos` to FastAPI with an unconfigured default body ceiling of 10MB. Files over 10MB resulted in `Request body exceeded 10MB for /api/videos... Failed to proxy http://127.0.0.1:8000/api/videos Error: socket hang up { code: 'ECONNRESET' }`, returning HTTP 500 to the browser.
2. **Container Header & Metadata Sensitivities:** Real-world CCTV and mobile clips (including those trimmed via online video cutters or messaging apps) frequently omit standard `CAP_PROP_FRAME_COUNT` headers (`count <= 0`), report non-standard FPS values, or locate the `moov`/`mdat` box before `ftyp`. This triggered OpenCV decoding exceptions or rejected valid MP4 magic bytes.
3. **Unprotected Probe Exceptions:** Unhandled OpenCV errors during probing in `create_video_job` cascaded into unhandled 500 internal server errors.

### Accomplishments
1. **Direct Ingestion & Proxy Limit Expansion:**
   - Updated `frontend/next.config.ts` with `experimental: { proxyClientMaxBodySize: "150mb" }`.
   - Updated `frontend/src/lib/api.ts` so browser clients upload directly to FastAPI on port 8000 (`http://${hostname}:8000`), streaming multipart data directly into Uvicorn and avoiding Node.js proxy socket hangups.
   - Expanded backend CORS origins in `backend/app/config.py` to allow direct browser uploads.
2. **Capacity Limit Expansion:**
   - Raised `max_upload_mb = 150` and `max_video_seconds = 300` (5 minutes) in `backend/app/config.py`.
   - Updated UI helper text in `VideoAnalysisView.tsx` to display "MP4, MOV, AVI, MKV, WebM up to 150MB (max 5 minutes)".
3. **Robust Magic Bytes & Container Probing:**
   - In `backend/app/vision/video_processor.py`, updated `_SIGNATURES[".mp4"]` and `_SIGNATURES[".mov"]` to support `ftyp`, `moov`, `mdat`, `wide`, `free`, and `skip` atoms across the first 32 bytes.
   - Handled containers with `CAP_PROP_FRAME_COUNT <= 0` gracefully using `CAP_PROP_POS_AVI_RATIO` duration fallback instead of throwing `unreadable_video`.
   - Clamped invalid, negative, NaN, or infinite FPS values to a reliable 25.0 FPS default.
4. **Resilient Keyframe Extraction:**
   - In `backend/app/vision/gemini_analyzer.py`, implemented sequential frame reading fallback when `total_frames <= 0` to ensure keyframe sampling succeeds for unindexed streams.
5. **Defensive Error Handling:**
   - Wrapped `probe_video` in `video_service.py` to convert any unexpected OpenCV exceptions into clean `ValidationFailed` (HTTP 422) responses with descriptive error messages instead of 500 server crashes.
6. **Testing & Verification:**
   - Generated an 83.58 MB test video; verified that both direct port 8000 upload and port 3000 proxy upload returned **HTTP 202 Accepted**.
   - Backend pytest suite: **74/74 passing** (`.venv/bin/pytest -v`).
   - Frontend build: `npm run build` compiled cleanly in 364ms with 0 type errors.
   - Both daemons remain active and healthy. All changes strictly local (no git push).

---

## Session 6 — 2026-10-21: Video Upload Deduplication Scoping & Title Uniqueness

### Focus & Objectives
Investigate and resolve the bug where uploading two different video clips of the same incident category (e.g. pedestrian falls) resulted in the second video being merged/concluded as the same incident rather than creating a separate incident.

### Root Cause Analysis
1. **Deduplication Scope Collapsed Across Uploads:** In `backend/app/services/incident_service.py`, `find_duplicate` looked for any active incident matching `(category, camera_id)` whose `last_detected_at` was within `dedup_window_seconds` (300 seconds / 5 minutes). In video analysis, users often upload videos to the default selected camera (e.g., `CAM-PARK-01`). Uploading a second fall video within 5 minutes caused `find_duplicate` to match the first incident and call `_merge_into`, treating the second video as a repeated detection (detection count 2) instead of creating a new incident.
2. **Generic Video Title Overwrite:** Gemini's zero-shot vision prompt lacked explicit instructions against generic titles, occasionally producing repetitive titles like `"Person Collapsed on Lakeside Walkway"` for multiple distinct fall clips, making separate events look identical.

### Accomplishments
1. **Video Upload Deduplication Scoping:**
   - Updated `find_duplicate` in `incident_service.py` to differentiate between continuous camera sensor streams and uploaded video files. For `SourceType.VIDEO_UPLOAD`, deduplication only matches if the detection originates from the *exact same* `video_job_id`. Detections from different uploaded video files are guaranteed to create distinct, independent incidents.
2. **Gemini Prompt Hardening:**
   - Enhanced `PROMPT` in `backend/app/vision/gemini_analyzer.py` with strict instructions: titles and summaries must describe unique visual attributes (e.g., clothing color, specific setting such as stairs or crosswalk, fall mechanics, vehicle colors) and must never use repeated generic placeholders.
3. **Filename Fallback for Non-AI Detections:**
   - Updated `backend/app/services/video_service.py` so that candidate titles default to `"<Category> (<Original Filename>)"` when AI titles are absent, ensuring distinct titles even in local heuristic mode.
4. **Automated Verification:**
   - Added `test_distinct_video_uploads_never_deduplicate_into_same_incident` in `tests/test_video.py`.
   - Backend pytest suite: **75/75 passing** in 1.88s (`.venv/bin/pytest -v`).
   - Frontend build: `npm run build` verified cleanly in 237ms with 0 type errors.



