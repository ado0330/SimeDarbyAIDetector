# PROGRESS

## Last Updated
2026-10-21 12:45 +08:00

## Current Phase
Post-Implementation System Optimization & Polish Completed (Local Workspace)

## Overall Status
Complete, Fully Tested & Validated for Sime Darby Property University Hackathon 2026

## Completed Work
- **High-Capacity Video Upload & Ingestion Resiliency (Fix for HTTP 500 & Upload Stalls):**
  - Resolved `Request body exceeded 10MB` and `ECONNRESET` socket hangups in Next.js 16 reverse proxy by configuring `experimental: { proxyClientMaxBodySize: "150mb" }` in `next.config.ts`.
  - Configured `frontend/src/lib/api.ts` to stream large multipart video uploads directly to FastAPI on port 8000 (`http://${hostname}:8000`) in browser runtime, bypassing Node.js buffer limitations entirely.
  - Expanded backend CORS origins in `backend/app/config.py` to allow direct browser uploads from `http://localhost:3000` and `http://127.0.0.1:3000`.
  - Raised maximum upload limit from 100MB to 150MB (`max_upload_mb = 150`) and maximum video duration to 300s (5 minutes) across backend settings and UI guidelines.
  - Made MP4 and MOV magic-byte verification in `backend/app/vision/video_processor.py` permissive to `ftyp`, `moov`, `mdat`, `wide`, `free`, and `skip` atoms across the first 32 bytes, supporting edited, trimmed, and unindexed mobile/dashcam files.
  - Added robust fallback in `probe_video` for videos with unindexed frame counts (`CAP_PROP_FRAME_COUNT <= 0`) or variable/invalid FPS, falling back to `CAP_PROP_POS_AVI_RATIO` and defaulting to 25.0 FPS instead of throwing `unreadable_video`.
  - Added sequential frame extraction fallback in `gemini_analyzer.py` for stream-based or non-seekable video files.
  - Enclosed video probe routines in `video_service.py` with defensive exception handling, returning HTTP 422 with descriptive validation messages instead of unhandled 500 server crashes.
  - Successfully verified with a high-capacity **83.58 MB** test video upload returning HTTP 202 Accepted.
- **Product Rebranding to GlobalEye:**
  - Standardized commercial brand name across frontend sidebar, browser headers, page headers, API configuration, and documentation.
- **Incident History Governance:**
  - Added `POST /api/incidents/clear-history` and `DELETE /api/incidents/history` with optional active incident purge and full SQLite audit logging.
  - Added "Clear History" button with confirmation modal in `HistoryView.tsx` alongside CSV export.
- **Top Header Uncluttering:**
  - Removed redundant quick demo bar from top navigation header for a clean, professional command layout.
- **Township Map ID & Coordinate Synchronization:**
  - Remapped `ZONE_LAYOUTS` and `CAMERA_COORDINATES` to match canonical backend reference IDs (`LOC-GATE` through `LOC-SCH`, `CAM-GATE-01` through `CAM-SCH-01`).
  - Active incident pins now accurately render at their assigned camera/sector coordinates instead of defaulting to center canvas.
  - Zone inspector correctly displays live incidents and online cameras for the selected sector.
- **Category Filter Dropdown Alignment:**
  - Synchronized `ActiveIncidentsView.tsx` and `HistoryView.tsx` dropdowns with the backend `Category` enum (`road_collision`, `person_fall`, `parking_obstruction`, `fire_smoke`).
- **1-Click Pre-packaged CCTV Video Analysis:**
  - Bundled sample CCTV footage in `backend/samples/sample_cctv_fall.mp4` and `frontend/public/samples/`.
  - Added `POST /api/videos/demo-clip` and `GET /api/videos/sample-file` endpoints.
  - Added "1-Click Test: Load Sample Clip" button and sample MP4 download link in `VideoAnalysisView.tsx`.
- **Multimodal Video Understanding Engine (Google Gemini 3.5 Flash Lite):**
  - Integrated Gemini REST API for zero-shot CCTV incident recognition (`gemini-3.5-flash-lite` with fallback chain).
  - Automatically identifies collisions, falls, smoke/fire, and parking blockages from sampled keyframes.
  - Automatically promotes detections to active incidents with multi-factor risk priority scoring.
  - Kept operational UI clean by hiding technical AI model configuration cards.
- **Integrated CCTV Video Player in Incident Inspector:**
  - Added native HTML5 surveillance video player to `IncidentDetailModal.tsx` supporting seeking, fullscreen, and rewind.
  - Built 1-click "Jump to Detection Point" button to instantly replay the exact second of an incident.
  - Enabled mode switcher between live CCTV footage stream and AI annotated keyframe evidence.
- **GlobalEye Brand Identity & Scalable Vector Logo System:**
  - Designed "The Horizon Apex": dual sweeping orbital crescent arcs (panoramic surveillance & global township scope) enclosing a precision circular iris with a centered 4-point priority diamond reticle (triage & focus).
  - Generated complete vector SVG asset family:
    - `frontend/public/brand/globaleye-logo.svg` (Primary dark lockup)
    - `frontend/public/brand/globaleye-logo-dark.svg` (Dark surface lockup)
    - `frontend/public/brand/globaleye-logo-light.svg` (Light surface lockup)
    - `frontend/public/brand/globaleye-symbol.svg` (Standalone emblem)
    - `frontend/public/brand/globaleye-symbol-mono.svg` (Monochrome vector glyph)
    - `frontend/public/brand/favicon.svg` (High-contrast 16x16 / 32x32 tab icon)
  - Created reusable `GlobalEyeLogo` React component system (`frontend/src/components/brand/GlobalEyeLogo.tsx`).
  - Integrated into application sidebar and browser metadata (`layout.tsx`).
  - Added Brand Identity & Logo System showcase card to `DemoControlsView.tsx`.
- **Demo Scenarios Version 2.0 Suite:**
  - Upgraded the demonstration architecture from legacy synthetic-only events (v1.0) to a comprehensive 6-pillar evaluation suite (v2.0):
    - **Scenario 1:** Multi-Sector Concurrency (The Morning Rush across City of Elmina sectors)
    - **Scenario 2:** Dynamic Telemetry Escalation (Life-Safety Floor & Live SSE Queue Re-ranking)
    - **Scenario 3:** Gemini 3.5 Flash Lite Multimodal Video Intelligence & Auto-Triage
    - **Scenario 4:** In-Modal CCTV Surveillance Video Player & 1-Click Forensic Seek (`24.0s`)
    - **Scenario 5:** Operator Triage, Emergency Override & Shift Handover Governance
    - **Scenario 6:** Safety Invariance & Uncertainty Handling (Low-Confidence Fire)
  - Enhanced `DemoControlsView.tsx` with 6 interactive scenario cards, 90-second pitch flow timeline, and direct navigation links.
  - Upgraded `OverviewView.tsx` quick demo runner panel to Version 2.0 with Gemini Lab and Fire Invariance shortcuts.
  - Enriched backend `demo.py` output with `scenario_title` and `version: 2.0` metadata.
  - Completely overhauled `docs/DEMO_SCRIPT.md` with an authoritative 90-second rapid pitch, 3-minute extended deep-dive, and judge defense cheat-sheet.
- **Backend Test Suite (74/74 Passing):**
  - 100% passing across prioritization, queue hysteresis, workflows, API, clear history, demo scenarios, Gemini config, and video pipelines (`.venv/bin/pytest -v`).
- **Frontend Verification:**
  - `npm run build` compiled cleanly in <1.0s with TypeScript validation passed.
  - Daemons active: Backend on `http://127.0.0.1:8000`, Frontend on `http://localhost:3000`.

