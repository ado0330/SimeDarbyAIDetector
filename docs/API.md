# Township Guardian AI — REST & SSE API Reference

Base URL: `http://localhost:8000/api` (proxied by Next.js at `/api`)

All endpoints accept and return `application/json` unless otherwise specified.
Authentication header: `X-Admin-Name` (defaults to `"Demo Administrator"` in UI).

---

## 1. Platform & Reference Endpoints

### `GET /api/health`
Returns system health, database connection state, operational mode, and OpenCV detector capabilities.
```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "ok",
  "mode": "simulation",
  "demo_endpoints_enabled": true,
  "detector": {
    "id": "person-down-heuristic/opencv-hog-people",
    "version": "heuristic-1/opencv-4.14.0",
    "available": true,
    "note": "OpenCV HOG pedestrian detector."
  },
  "server_time": "2026-10-20T08:00:00Z"
}
```

### `GET /api/reference`
Returns reference metadata for township locations (6 zones), cameras (10 CCTV feeds), emergency responders, and supported incident categories.

### `GET /api/config`
Returns active scoring configuration weights (Severity 0.40, Immediacy 0.25, People 0.20, Secondary Hazard 0.15) and video processing limits.

### `GET /api/stream`
Server-Sent Events (SSE) live connection stream. Yields `retry: 3000` and events of type `queue_changed` whenever priority re-ranking or new alerts occur.

---

## 2. Incident Operations Endpoints

### `GET /api/incidents`
Lists incidents with filtering and queue sorting.
- Query parameters:
  - `status`: Filter by status (`new`, `acknowledged`, `in_progress`, `resolved`, `false_positive`, `closed`)
  - `priority`: Filter by priority level (`critical`, `high`, `medium`, `low`)
  - `category`: Filter by incident category
  - `source`: Filter by source (`simulation`, `video_analysis`)
  - `sort`: `queue` (engine rank score descending) or `newest`
  - `q`: Keyword search string

### `GET /api/incidents/{id}`
Returns complete incident detail including:
- Composite priority score & rank score
- Sub-scores (Severity, Immediacy, People at Risk, Secondary Hazard)
- Score factor contributions breakdown
- Plain-language explanation and recommended advisory action
- Event timeline history
- Responder assignment logs
- Immutable audit log trail

### `POST /api/incidents`
Creates an incident or merges evidence if matching an active incident within 300s window.

### `POST /api/incidents/{id}/acknowledge`
Transitions an incident from `new` to `acknowledged`.
```json
{ "note": "Reviewed by operator" }
```

### `POST /api/incidents/{id}/assign`
Assigns a designated responder team to an incident and transitions status to `in_progress`.
```json
{ "responder_id": "patrol-1", "note": "Dispatched to lakeside" }
```

### `POST /api/incidents/{id}/actions`
Records an operational action note in the timeline without changing status.
```json
{
  "action_type": "camera_reviewed",
  "note": "Verified victim standing up with assistance from passerby."
}
```

### `POST /api/incidents/{id}/evidence`
Injects updated situational evidence into an active incident. Triggers immediate recalculation through the prioritization engine and emits an SSE queue event.
```json
{
  "evidence": {
    "person_motionless_seconds": 120,
    "no_bystander_assistance": true
  },
  "note": "Victim has remained motionless for 2 minutes."
}
```

### `POST /api/incidents/{id}/override-priority`
Allows a control room supervisor to manually override the automated priority score with mandatory audit justification.
```json
{
  "level": "critical",
  "reason": "Direct radio report from guardhouse indicates emergency."
}
```

### `POST /api/incidents/{id}/resolve`
Closes an incident with resolution outcome.
```json
{
  "resolution_type": "resolved",
  "note": "Paramedics arrived; patient transferred to hospital."
}
```

### `POST /api/incidents/{id}/reopen`
Reopens a closed or resolved incident back into active triage with mandatory justification.
```json
{ "reason": "Patient reported further complications on scene." }
```

---

## 3. Video Analysis & Candidate Stream

### `POST /api/videos`
Uploads a CCTV video clip (multipart/form-data). Returns `202 Accepted` with a job ID while OpenCV processes in the background.

### `GET /api/videos`
Lists all processed CCTV jobs with frame counts, analyzed frames, and duration.

### `GET /api/candidates`
Returns extracted posture-heuristic candidates awaiting human verification.
- Query parameters:
  - `status`: `pending`, `accepted`, `rejected`

### `POST /api/candidates/{id}/review`
Accepts or rejects an extracted candidate detection:
- `decision: "accept"`: Automatically converts candidate into a live incident in the queue via the prioritization engine.
- `decision: "reject"`: Closes candidate as false alarm.

### `GET /api/media/frames/{filename}`
Serves extracted JPEG thumbnail snapshots for candidates and incident evidence.

---

## 4. Hackathon Demo Scenarios

### `POST /api/demo/trigger`
Executes one of the deterministic hackathon presentation scenarios:
- `simultaneous`: Ingests 3 concurrent incidents at the same second. Tests multi-factor queue sorting.
- `escalate`: Injects follow-up evidence on Person Fall. Tests dynamic score escalation and live re-ranking.
- `human_intervention`: Scripted operator handling (Ack $\to$ Assign $\to$ Action $\to$ Resolve).
- `false_positive`: Closes detection with justification.

### `POST /api/demo/reset`
Removes simulated incidents, preserving video uploads and baseline demo history.
