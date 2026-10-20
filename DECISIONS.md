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
