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

## D-019 — Normal Video Activity Verification & False Positive Suppression (2026-10-21) — accepted
Resolved the critical issue where routine CCTV footage without abnormal incidents was falsely detected as "Person fall down" or generated spurious danger alerts:
1. **Serverless Vision Route Fix (`frontend/src/app/api/vision/route.ts`):** Eliminated the fallback `parsed.category || "person_fall"`, which was converting valid `category: null` responses on normal videos into `"person_fall"`. Added strict validation requiring `parsed.detected && parsed.category` to be truthy and non-null before setting `detected: true`.
2. **Heuristics & Prompt Overhaul (`geminiVision.ts`, `gemini_analyzer.py`):**
   - Reframed the Gemini system prompt to establish **Normal Activity Check as the Primary Directive**, instructing the model to default to normal routine life (`detected: false, category: null`) unless unmistakable visual evidence of a safety hazard exists.
   - Clarified that people walking upright, jogging, standing, or sitting are strictly normal and must NEVER be flagged as `person_fall`.
   - In browser fallback heuristics (`analyzeWithMultiHazardHeuristics`), eliminated greedy substring matches (e.g., bare `"down"` matching `"download.mp4"`, or `"park"` matching `"central park"`), and made Normal Activity the default return whenever no danger keywords match.
3. **Client Upload Pipeline Hardening (`frontend/src/app/page.tsx`):** Added explicit checks for `!analysis.detected || !analysis.category`. When normal activity is verified, the video processing job is marked completed with `candidate_count: 0`, and no candidate or incident is created in the active queue. A clear confirmation toast notifies the operator: *"Analysis Complete: Normal activity verified. No safety hazards or incidents detected."*
4. **UI Clarity (`VideoAnalysisView.tsx`):** Updated video job status indicators to explicitly render *"Normal (0 Incidents)"* in emerald green when no hazards are found, providing immediate visual feedback to operators.

## D-020 — Real Incident Evidence Parameters & Technical Metadata Sanitization (2026-10-21) — accepted
Resolved the issue where the "Evidence Parameters" card in the Incident Details Modal displayed internal technical attributes (`model_used: gemini-3.5-flash-lite`, `is_gemini: Yes`, `video_job_id`, `thumbnail`) instead of physical domain parameters describing what actually occurred during the incident:
1. **Separation of Evidence vs. Technical Metadata (`frontend/src/app/page.tsx`):** Internal processing details (`video_job_id`, `video_timestamp_s`, `source_file`) were moved exclusively into `incident.metadata`. The `incident.evidence` container now exclusively holds real incident telemetry parameters.
2. **Standardized Domain Parameter Sanitization (`frontend/src/lib/geminiVision.ts`):** Implemented `sanitizeIncidentEvidence(category, rawEvidence)` which strips all technical keys (`model_used`, `is_gemini`, `thumbnail`, `video_job_id`, `filename`, `status`) and ensures domain parameters matching the GlobalEye incident taxonomy exist (e.g., `motionless_seconds`, `hazardous_location`, `bystander_assisting` for falls; `vehicles_involved`, `traffic_blocked` for collisions; `smoke_or_flame_visible`, `spreading` for fires; `animal_species`, `pack_size` for wildlife).
3. **Modal UI Refinement (`frontend/src/components/modals/IncidentDetailModal.tsx`):** Updated the Evidence Parameters display to filter out any technical keys and render human-readable domain labels (e.g., "Motionless Duration: 24s", "Traffic Flow Blocked: Yes", "Wildlife Species: Wild Boar") with clean units and badges.
4. **Prompt Enforcement (`route.ts`, `gemini_analyzer.py`):** Added explicit prompt instructions forbidding AI model or software references in the `evidence` JSON object and instructing the model to extract real physical incident attributes observed in the video frames.

## D-021 — Operational Realism: Sime Darby Auxiliary Police (Polis Bantuan) & Field Ranger Workflow (2026-10-21) — accepted
Implemented dedicated operational governance, patrol dispatch telemetry, and field ranger integration matching real-world municipal and township security operations across Sime Darby Property developments (City of Elmina):
1. **Interactive Standard Operating Procedure (SOP) Protocol (`IncidentDetailModal.tsx`):**
   - Transformed static text SOP guidelines into interactive compliance checklists connected directly to the incident's category lifecycle in `taxonomy.ts`.
   - Added live completion progress tracking (e.g. `2 of 3 Steps Logged (67%)`), visual checkmark toggles, and compliance badges.
   - Checking off any SOP step automatically dispatches an audit log entry (`sop_step_completed`) into `incident.events` and `incident.audit`, recording the exact timestamp and operator accountability record.
2. **Auxiliary Police Patrol Fleet & Proximity Dispatch Engine (`frontend/src/lib/auxiliaryUnits.ts`):**
   - Configured a realistic 5-unit on-duty fleet for City of Elmina: `PB-01 Alpha` (Toyota Hilux 4x4), `PB-02 Bravo` (Honda CB500X Rapid Motorcycle), `PB-03 Charlie` (Park Ranger Bicycle Unit), `PB-04 Delta` (Hazard & Rescue Van), and `PB-05 Echo` (Traffic Marshal Proton X70).
   - Implemented `findNearestAuxiliaryUnit` which calculates real Euclidean canvas distance to the incident camera coordinate and derives realistic transit distance (in meters) and driving ETA (in minutes).
   - Added **1-Click Dispatch** which assigns the unit, sets status to `in_progress`, auto-logs the dispatch transit note, and checks off the corresponding SOP dispatch step.
3. **Field Ranger WhatsApp & Telegram SITREP Terminal (`IncidentDetailModal.tsx`):**
   - Created `generateWhatsAppSitrep` formatting an official, structured emergency situation report containing incident ID, priority score, sector, camera node, GPS coordinates, observed evidence parameters, assigned unit, and control room dispatch contact.
   - Added 1-click **"Copy SITREP (WhatsApp Format)"** (with animated clipboard feedback) and **"Transmit to Field Unit"** (via `openWhatsAppDispatch` using `wa.me/?text=...`).
   - Added a dedicated **"SOP & Ranger Dispatch"** tab in the modal displaying the full on-shift fleet roster table and dispatch actions.
4. **Township GIS Schematic Map Integration (`TownshipMapView.tsx`):**
   - Added an interactive **"Auxiliary Patrol Fleet (5)"** layer toggle on the map canvas.
   - Rendered blue `PB` patrol markers with radar pulse rings at unit positions and dynamic dashed dispatch trajectory lines with transit ETA badges connecting units to active incidents.
   - Added an Auxiliary Police Sector Unit info card in the Zone Inspector sidebar with direct officer phone contacts.
