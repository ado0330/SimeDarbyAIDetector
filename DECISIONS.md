# DECISIONS

## D-001 — Greenfield project, stack per spec (2026-10-20) — accepted
Repo was empty. Use Next.js + FastAPI + SQLite as specified. Monorepo: `backend/`, `frontend/`, `docs/`.

## D-002 — Python 3.9 system interpreter (2026-10-20) — accepted
Only Python 3.9.6 is installed (no brew python/uv). Backend venv at `backend/.venv`. Pydantic models use `Optional[...]`.

## D-003 — No hand-run `shadcn init` (2026-10-20) — accepted
shadcn CLI is interactive/network dependent. Hand-write shadcn-style primitives (Button, Badge, Card, Dialog, Tabs…)
with Tailwind + `clsx` + `tailwind-merge` for a consistent in-repo component library.

## D-004 — Scoring: base formula with per-category baseline profiles + additive evidence modifiers (2026-10-20) — accepted
`priority = .40 sev + .25 imm + .20 people + .15 secondary`. Each category has baseline sub-scores; evidence adds/subtracts
deltas (clamped 0–100). Unknown evidence adds a small *positive* "uncertainty" delta (unknown ≠ zero risk) and raises the
uncertainty indicator. Weights/thresholds/profiles/modifiers are config. They are **unvalidated prototype assumptions**.

## D-005 — Confidence is separate from priority (2026-10-20) — accepted
Detection confidence NEVER lowers priority. Low confidence (< 0.5) only sets `needs_verification` and drives the
verification recommendation. Verification status (`unverified|verified|false_positive`) is a third separate concept.

## D-006 — Emergency rules and precedence (2026-10-20) — accepted
Rules provide a *floor* level and an `emergency` flag. Precedence: effective level = max(score-level, rule floor);
manual override (audited) beats both. Queue tier 1 = emergency rule triggered OR effective level critical.
A rule can raise but never lower a score-derived level.

## D-007 — Queue hysteresis via stored `rank_score` (2026-10-20) — accepted
`priority_score` always updates. `rank_score` (used for sorting) updates only if |Δ| ≥ `RANK_HYSTERESIS` (2.0), or the
level / emergency tier changes. Sorting separate from scoring.

## D-008 — Dedup key (2026-10-20) — accepted
Active incident with same `camera_id` + `category` whose `last_detected_at` is within `DEDUP_WINDOW_SECONDS` (300) of the
new event timestamp absorbs the detection (adds IncidentEvent, bumps `detection_count`, merges evidence, recalcs).

## D-009 — Video candidates require human review (2026-10-20) — accepted
Detector output → `EventCandidate` (pending). Admin accepts (→ incident via the same ingest service) or rejects.
Candidates triggering an emergency rule are flagged "urgent review" and sorted first; they are not auto-created.

## D-010 — SSE + polling fallback (2026-10-20) — accepted
In-process SSE broker emits `queue_changed` events; the frontend refetches. Polling every ~10 s as fallback.

## D-011 — Detector honesty (2026-10-20) — accepted
Only event types implemented and tested are claimed. Object detection ≠ fall/collision recognition; video candidates are
posture *heuristics* labelled as such, require human verification.

## D-012 — Rebranding to GlobalEye & Incident History Governance (2026-10-21) — accepted
Product name standardized to "GlobalEye" across backend and UI. Added shift-transition history clearing with
mandatory audit logging, retaining baseline locations and operational integrity. Removed redundant quick demo bar
from top header to maintain an uncluttered commercial SOC layout.

## D-013 — Canonical Coordinate Synchronization & 1-Click Demo Video (2026-10-21) — accepted
Synchronized SVG schematic layout and camera pin coordinates to canonical backend IDs (LOC-GATE..SCH, CAM-GATE-01..SCH-01). Bundled pre-packaged sample CCTV fall clip with dedicated demo-clip endpoints and 1-click execution in VideoAnalysisView.

## D-014 — Multimodal Gemini Vision Analyzer & Auto-Triage Pipeline (2026-10-21) — accepted
Integrated Google Gemini multimodal REST API using model `gemini-3.5-flash-lite` (with automatic fallback chain to `gemini-2.0-flash-lite` / `gemini-1.5-flash`). Zero-shot incident understanding extracts keyframes, classifies events (`road_collision`, `person_fall`, `fire_smoke`, `parking_obstruction`), creates evidence records, and auto-promotes candidates to active incidents with deterministic multi-factor priority scoring. CCTV footage playback was integrated directly into the incident inspector modal with quick jump to detection timestamps. The technical configuration card was hidden from the operational UI to maintain a clean enterprise aesthetic.

## D-015 — Brand Identity System & Official GlobalEye Logo (2026-10-21) — accepted
Explored four creative concept directions (The Iris Orbital, The Hex-Apex Beacon, The Luminous Focus Nexus, and The Geo-Orbit Monogram). Selected the synthesized "Horizon Apex" direction: dual sweeping orbital crescent arcs (representing township-wide panoramic surveillance and global coverage) enclosing a precision circular iris with a centered 4-point priority diamond reticle (representing intelligent triage and incident prioritization). Implemented a complete scalable vector SVG asset family (`globaleye-logo.svg`, `globaleye-logo-dark.svg`, `globaleye-logo-light.svg`, `globaleye-symbol.svg`, `globaleye-symbol-mono.svg`, and `favicon.svg`), built a reusable `GlobalEyeLogo` React component, integrated it into the application sidebar, and added an interactive brand system showcase.

## D-016 — Demo Scenarios Version 2.0 & Unified Evaluation Architecture (2026-10-21) — accepted
Upgraded the platform demonstration architecture from legacy synthetic-only events (Version 1.0) to a comprehensive 6-pillar evaluation suite (Version 2.0). Version 2.0 unifies:
1. Multi-Sector Concurrency (Simultaneous 3 events across City of Elmina sectors testing 4-factor relative urgency math),
2. Dynamic Telemetry Escalation (Persistent motionless fall triggering life-safety emergency floor $\ge 85.0$ and live SSE queue re-ranking),
3. Google Gemini 3.5 Flash Lite Multimodal Video Intelligence (automated keyframe reasoning and queue auto-promotion),
4. In-Modal CCTV Surveillance Video Player with 1-Click Forensic Timestamp Seeking (`24.0s`),
5. Operator Triage, Emergency Override & Shift Handover Governance (audited status transitions, mandatory rationale, and CSV audit export), and
6. Safety Invariance Principle (Low-confidence fire near residential towers sets verification flags without suppressing life-safety priority).
Updated backend demo services, enriched frontend presentation controls across `DemoControlsView` and `OverviewView`, and completely overhauled `docs/DEMO_SCRIPT.md` with an authoritative 90-second rapid pitch, extended 3-minute technical deep-dive, and judge defense cheat-sheet.

## D-017 — High-Capacity Video Upload & Direct Client-to-Backend Streaming (2026-10-21) — accepted
Resolved video upload HTTP 500 errors caused by Next.js 16's default 10MB reverse proxy limit and container metadata sensitivities:
1. **Next.js Proxy Bypass & Expansion:** Configured `experimental: { proxyClientMaxBodySize: "150mb" }` in `frontend/next.config.ts`, and updated `frontend/src/lib/api.ts` to stream large multipart video uploads directly to FastAPI on port 8000 in browser runtime (`http://${hostname}:8000`). This completely eliminates Node.js proxy socket hangups (`ECONNRESET`) for multi-megabyte CCTV files.
2. **CORS Whitelist Expansion:** Expanded backend CORS configuration in `backend/app/config.py` to allow cross-origin direct uploads from frontend origins (`http://localhost:3000`, `http://127.0.0.1:3000`).
3. **Capacity Thresholds:** Increased maximum allowed upload size from 100MB to 150MB (`max_upload_mb = 150`) and maximum video duration from 120s to 300s (5 minutes).
4. **Permissive Magic-Byte Signatures:** Expanded MP4 and MOV header signature verification to detect `ftyp`, `moov`, `mdat`, `wide`, `free`, and `skip` ISO box atoms across the initial 32 bytes, supporting edited, trimmed, or non-interleaved mobile/dashcam containers.
5. **OpenCV Probing & Fallback:** Handled containers with unindexed frame counts (`CAP_PROP_FRAME_COUNT <= 0`) or variable frame rates gracefully by falling back to duration probing (`CAP_PROP_POS_AVI_RATIO`) and defaulting to 25.0 FPS, preventing spurious crashes. Sequential frame extraction was added as a fallback in `gemini_analyzer.py`.
6. **Defensive Error Handling:** Wrapped video probe routines in `video_service.py` with uniform validation handlers to return clear 422 HTTP errors instead of unhandled 500 server crashes.

## D-018 — Video Upload Independence & Deduplication Scoping (2026-10-21) — accepted
Resolved the issue where uploading two different video clips of the same category (e.g., pedestrian falls) concluded as the same incident:
1. **Root Cause:** `find_duplicate` in `incident_service.py` matched any active incident sharing the same category and camera within the 300-second deduplication window, without distinguishing whether the detections originated from different uploaded video files. Because video uploads often use the default selected camera (e.g., `CAM-PARK-01`), uploading a second fall clip within 5 minutes caused the engine to merge the detection into the first incident (`_merge_into`), overwriting/merging evidence rather than creating a distinct incident.
2. **Video Upload Scoping:** Updated `find_duplicate` to enforce that uploaded video files (`SourceType.VIDEO_UPLOAD`) only merge if they originate from the *exact same* `video_job_id` (i.e. multiple detections within a single clip). Detections from different uploaded video files are always treated as separate, independent incidents with their own incident IDs, dedicated video player streams, and individual triage lifecycles.
3. **Prompt Hardening for Distinct Titles:** Enhanced Gemini's system prompt in `gemini_analyzer.py` to instruct the model to produce unique, scene-specific titles and detailed summaries (incorporating clothing colors, setting like stairs/crosswalk, exact vehicle models) instead of generic repeated placeholders.
4. **Filename Fallback:** Configured candidate review in `video_service.py` to incorporate the uploaded clip's original filename into candidate titles when AI titles are not supplied.




