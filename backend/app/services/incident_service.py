"""Incident workflow service: ingestion + dedup, dynamic re-prioritization, and all administrator actions.

All business rules live here (not in API handlers). Scoring is delegated to ``prioritization`` and ordering to
``queue``. Every function accepts an optional ``now`` so seeds/tests are deterministic.
"""
import re
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import utcnow
from app.enums import (
    ACTIVE_STATUSES, ALLOWED_TRANSITIONS, CATEGORY_LABELS, LEVEL_RANK, TERMINAL_STATUSES, Category,
    PriorityLevel, SourceType, Status, Verification,
)
from app.errors import Conflict, NotFound, ValidationFailed
from app.models import (
    AuditLog, Camera, EvidenceItem, Incident, IncidentAssignment, IncidentEvent, Location,
)
from app.services import queue as queue_mod
from app.services.events import broker
from app.services.prioritization import ScoreResult, compute_priority
from app.services.recommendations import primary_text, recommend
from app.services.reference import RESPONDER_BY_ID
from app.services.scoring_config import build_config

_create_lock = threading.Lock()

TITLES = {
    Category.ROAD_COLLISION.value: "Possible road collision",
    Category.PERSON_FALL.value: "Possible person down",
    Category.PARKING_OBSTRUCTION.value: "Parking obstruction",
    Category.FIRE_SMOKE.value: "Suspected fire / smoke",
    Category.WILDLIFE_INTRUSION.value: "Wildlife intrusion detected",
    Category.RESTRICTED_AREA_INTRUSION.value: "Restricted danger zone breach",
    Category.PIPE_BURST_LEAKAGE.value: "Water main pipe burst / leak",
    Category.FLASH_FLOOD.value: "Roadway flash flooding detected",
    Category.LIFT_ENTRAPMENT.value: "Elevator passenger entrapment",
    Category.PHYSICAL_ALTERCATION.value: "Physical altercation detected",
    Category.MEDICAL_EMERGENCY.value: "Acute medical emergency",
    Category.DROWNING_WATER_DISTRESS.value: "Water distress / drowning risk",
    Category.UNAUTHORIZED_TRESPASS.value: "Perimeter security breach",
    Category.GAS_LEAK_EXPLOSION_RISK.value: "Gas leak / explosion risk",
    Category.DRAINAGE_BLOCKAGE.value: "Monsoon drainage blockage",
    Category.FALLEN_TREE_STORM_DAMAGE.value: "Fallen tree storm obstruction",
    Category.POWER_OUTAGE_ELECTRICAL.value: "Power blackout / substation fault",
    Category.ILLEGAL_DUMPING.value: "Illegal waste dumping",
    Category.CUSTOM_SAFETY_HAZARD.value: "Custom township safety hazard",
}


# ---------------------------------------------------------------------------------------------
# Data transfer objects
# ---------------------------------------------------------------------------------------------
@dataclass
class NormalizedCandidate:
    """Standardised event candidate; produced by simulation, API calls and reviewed video detections."""
    category: str
    description: str = ""
    title: Optional[str] = None
    camera_id: Optional[str] = None
    location_id: Optional[str] = None
    source_type: str = SourceType.SIMULATION.value
    source_reference: Optional[str] = None
    event_timestamp: Optional[datetime] = None
    confidence: Optional[float] = None
    evidence: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    evidence_items: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def is_simulated(self) -> bool:
        return self.source_type == SourceType.SIMULATION.value


@dataclass
class MutationResult:
    incident: Incident
    priority_changed: bool = False
    ranking_changed: bool = False
    deduplicated: bool = False
    message: str = ""


# ---------------------------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------------------------
def get_incident(db: Session, incident_id: str) -> Incident:
    inc = db.get(Incident, incident_id)
    if inc is None:
        raise NotFound("Incident %s was not found" % incident_id)
    return inc


def active_incidents(db: Session) -> List[Incident]:
    rows = db.execute(select(Incident).where(Incident.status.in_(ACTIVE_STATUSES))).scalars().all()
    return queue_mod.sort_queue(rows)


def _active_order(db: Session) -> List[str]:
    return [i.id for i in active_incidents(db)]


def _require_active(inc: Incident, what: str) -> None:
    if inc.status not in ACTIVE_STATUSES:
        raise Conflict("Cannot %s: incident %s is %s" % (what, inc.id, inc.status.replace("_", " ")),
                       code="invalid_state")


def _next_id(db: Session) -> str:
    nums = [int(m.group(1)) for (i,) in db.execute(select(Incident.id)).all()
            for m in [re.match(r"INC-(\d+)$", i)] if m]
    return "INC-%04d" % ((max(nums) if nums else 0) + 1)


def _event(db: Session, inc: Incident, etype: str, message: str, actor: str, now: datetime,
           data: Optional[Dict[str, Any]] = None) -> None:
    db.add(IncidentEvent(incident_id=inc.id, event_type=etype, message=message, data=data or {},
                         actor=actor, created_at=now))


def _audit(db: Session, inc: Incident, action: str, actor: str, now: datetime,
           old: Optional[Dict[str, Any]] = None, new: Optional[Dict[str, Any]] = None,
           reason: Optional[str] = None) -> None:
    db.add(AuditLog(entity_type="incident", entity_id=inc.id, action=action, actor=actor, old_value=old,
                    new_value=new, reason=reason, is_simulated=inc.is_simulated, created_at=now))


def _merge_evidence(current: Dict[str, Any], patch: Dict[str, Any], unset_on_none: bool) -> Dict[str, Any]:
    merged = dict(current or {})
    for k, v in patch.items():
        if v is None:
            if unset_on_none:
                merged.pop(k, None)
        else:
            merged[k] = v
    return merged


def _snapshot(inc: Incident) -> Dict[str, Any]:
    return {"priority_score": inc.priority_score, "priority_level": inc.priority_level,
            "computed_priority_level": inc.computed_priority_level,
            "emergency": inc.emergency_rule_triggered, "rank_score": inc.rank_score}


def _apply_score(db: Session, inc: Incident, actor: str, now: datetime, reason: str,
                 is_new: bool = False, record_change: bool = True,
                 old_snapshot: Optional[Dict[str, Any]] = None) -> bool:
    """(Re)compute priority from the incident's current evidence and persist it. Returns True if score/level changed.

    ``old_snapshot`` lets callers that already mutated the incident (manual override) supply the pre-change state.
    """
    cfg = build_config()
    old = None if is_new else (old_snapshot or _snapshot(inc))
    result: ScoreResult = compute_priority(inc.category, inc.evidence, inc.detection_confidence,
                                           inc.verification_status, cfg)
    # Manual override wins over the engine; engine output is still kept in ``computed_priority_level``.
    effective = inc.priority_level if (inc.priority_overridden and not is_new) else result.level

    inc.severity_score = result.severity
    inc.immediacy_score = result.immediacy
    inc.people_at_risk_score = result.people_at_risk
    inc.secondary_hazard_score = result.secondary_hazard
    inc.priority_score = result.composite_score
    inc.computed_priority_level = result.level
    inc.priority_level = effective
    inc.emergency_rule_triggered = result.emergency
    inc.triggered_rules = result.triggered_rules
    inc.score_breakdown = result.to_dict()
    inc.needs_verification = result.needs_verification
    inc.uncertainty = result.uncertainty
    explanation = result.explanation
    if inc.priority_overridden:
        explanation = ("Priority manually set to %s by an administrator (engine calculated %s). Reason: %s. %s"
                       % (effective, result.level, inc.override_reason, explanation))
    inc.priority_explanation = explanation
    recs = recommend(inc.category, effective, result.emergency, result.needs_verification,
                     inc.verification_status, inc.evidence, inc.detection_confidence)
    inc.recommendations = [r.to_dict() for r in recs]
    inc.recommended_action = primary_text(recs)
    inc.updated_at = now

    if is_new:
        inc.rank_score = result.composite_score
        return False
    inc.rank_score = queue_mod.apply_hysteresis(
        old["rank_score"], old["priority_level"], old["emergency"],
        result.composite_score, effective, result.emergency, cfg.rank_hysteresis)

    new = _snapshot(inc)
    changed = (abs(new["priority_score"] - old["priority_score"]) >= 0.005
               or new["priority_level"] != old["priority_level"] or new["emergency"] != old["emergency"])
    if changed and record_change:
        msg = "Priority recalculated: %s %.1f → %s %.1f (%s)" % (
            old["priority_level"], old["priority_score"], new["priority_level"], new["priority_score"], reason)
        _event(db, inc, "priority_changed", msg, actor, now, {"old": old, "new": new, "reason": reason})
        _audit(db, inc, "priority_recalculated", actor, now, old, new, reason)
    return changed


def _commit(db: Session, inc: Incident, before_order: List[str], reason: str, priority_changed: bool = False,
            deduplicated: bool = False, message: str = "") -> MutationResult:
    db.commit()
    after_order = _active_order(db)
    after_set, before_set = set(after_order), set(before_order)
    ranking_changed = ([i for i in after_order if i in before_set] != [i for i in before_order if i in after_set])
    broker.publish({"type": "queue_changed", "reason": reason, "incident_id": inc.id,
                    "priority_changed": priority_changed, "ranking_changed": ranking_changed})
    db.refresh(inc)
    return MutationResult(inc, priority_changed, ranking_changed, deduplicated, message)


# ---------------------------------------------------------------------------------------------
# Ingestion & deduplication
# ---------------------------------------------------------------------------------------------
def find_duplicate(db: Session, cand: NormalizedCandidate, event_ts: datetime) -> Optional[Incident]:
    """Dedup strategy: same category + same camera (or, lacking a camera, same location) + same source kind,
    on an ACTIVE incident whose last detection is within ``dedup_window_seconds`` of the new event.

    CRITICAL: Uploaded video files represent distinct physical footage clips. Detections from DIFFERENT
    video files (different video_job_id) must NEVER be merged into the same incident, even if they share
    the same category or assigned camera. Only multiple detections within the EXACT SAME video file may merge.
    """
    if cand.camera_id is None and cand.location_id is None:
        return None
    window = timedelta(seconds=build_config().dedup_window_seconds)

    # For video uploads: detections from different video uploads must never merge.
    if cand.source_type == SourceType.VIDEO_UPLOAD.value:
        cand_job_id = (cand.metadata or {}).get("video_job_id")
        if not cand_job_id:
            return None
        q = select(Incident).where(
            Incident.status.in_(ACTIVE_STATUSES),
            Incident.source_type == SourceType.VIDEO_UPLOAD.value,
            Incident.category == cand.category,
            Incident.is_simulated == False,
        )
        q = q.where(Incident.camera_id == cand.camera_id) if cand.camera_id else q.where(Incident.location_id == cand.location_id)
        matches = [
            i for i in db.execute(q).scalars().all()
            if ((i.meta or {}).get("video_job_id") == cand_job_id or (i.source_reference and i.source_reference.startswith("video:%s@" % cand_job_id)))
            and abs(event_ts - i.last_detected_at) <= window
        ]
        return max(matches, key=lambda i: i.last_detected_at) if matches else None

    # For simulations / real-time camera sensor events: dedup by category + camera within time window
    q = select(Incident).where(
        Incident.status.in_(ACTIVE_STATUSES),
        Incident.category == cand.category,
        Incident.is_simulated == cand.is_simulated,
    )
    q = q.where(Incident.camera_id == cand.camera_id) if cand.camera_id else q.where(Incident.location_id == cand.location_id)
    matches = [i for i in db.execute(q).scalars().all() if abs(event_ts - i.last_detected_at) <= window]
    return max(matches, key=lambda i: i.last_detected_at) if matches else None



def _validate_candidate(db: Session, cand: NormalizedCandidate) -> None:
    if cand.category not in CATEGORY_LABELS:
        raise ValidationFailed("Unsupported incident category '%s'" % cand.category,
                               [{"field": "category", "supported": list(CATEGORY_LABELS)}])
    if cand.source_type not in (SourceType.SIMULATION.value, SourceType.VIDEO_UPLOAD.value):
        raise ValidationFailed("Unsupported source_type '%s'" % cand.source_type)
    if cand.confidence is not None and not 0 <= cand.confidence <= 1:
        raise ValidationFailed("detection_confidence must be between 0 and 1")
    if cand.camera_id:
        cam = db.get(Camera, cand.camera_id)
        if cam is None:
            raise ValidationFailed("Unknown camera_id '%s'" % cand.camera_id,
                                   [{"field": "camera_id", "message": "camera does not exist"}])
        if cand.location_id and cand.location_id != cam.location_id:
            raise ValidationFailed("camera '%s' is not at location '%s'" % (cand.camera_id, cand.location_id))
        cand.location_id = cam.location_id
    elif cand.location_id and db.get(Location, cand.location_id) is None:
        raise ValidationFailed("Unknown location_id '%s'" % cand.location_id,
                               [{"field": "location_id", "message": "location does not exist"}])


def ingest_candidate(db: Session, cand: NormalizedCandidate, actor: Optional[str] = None,
                     now: Optional[datetime] = None) -> MutationResult:
    """Create an incident from a validated candidate, or merge it into an ongoing duplicate."""
    now = now or utcnow()
    actor = actor or "system"
    _validate_candidate(db, cand)
    event_ts = cand.event_timestamp or now
    with _create_lock:
        before = _active_order(db)
        dup = find_duplicate(db, cand, event_ts)
        if dup is not None:
            return _merge_into(db, dup, cand, event_ts, actor, now, before)
        return _create(db, cand, event_ts, actor, now, before)


def _create(db: Session, cand: NormalizedCandidate, event_ts: datetime, actor: str, now: datetime,
            before: List[str]) -> MutationResult:
    loc = db.get(Location, cand.location_id) if cand.location_id else None
    title = cand.title or ("%s — %s" % (TITLES[cand.category], loc.name) if loc else TITLES[cand.category])
    inc = Incident(
        id=_next_id(db), title=title, category=cand.category, description=cand.description,
        location_id=cand.location_id, camera_id=cand.camera_id, source_type=cand.source_type,
        source_reference=cand.source_reference, event_timestamp=cand.event_timestamp, detected_at=now,
        last_detected_at=event_ts, created_at=now, updated_at=now, status=Status.NEW.value,
        severity_score=0, immediacy_score=0, people_at_risk_score=0, secondary_hazard_score=0, priority_score=0,
        rank_score=0, computed_priority_level="low", priority_level="low", detection_confidence=cand.confidence,
        verification_status=Verification.UNVERIFIED.value, evidence=_merge_evidence({}, cand.evidence, False),
        is_simulated=cand.is_simulated, meta=dict(cand.metadata), detection_count=1,
        triggered_rules=[], score_breakdown={}, recommendations=[],
    )
    db.add(inc)
    db.flush()
    _apply_score(db, inc, actor, now, "initial assessment", is_new=True)
    for item in cand.evidence_items:
        db.add(EvidenceItem(incident_id=inc.id, created_at=now, **item))
    _event(db, inc, "detected",
           "%s incident created from %s%s" % (CATEGORY_LABELS[cand.category],
                                             "simulation" if cand.is_simulated else "video analysis",
                                             "" if cand.confidence is None else " (confidence %.0f%%)" % (cand.confidence * 100)),
           actor, now, {"priority_score": inc.priority_score, "priority_level": inc.priority_level,
                        "source_reference": cand.source_reference})
    _audit(db, inc, "incident_created", actor, now, None,
           {"priority_score": inc.priority_score, "priority_level": inc.priority_level, "status": inc.status})
    return _commit(db, inc, before, "incident_created", message="Incident %s created" % inc.id)


def _merge_into(db: Session, inc: Incident, cand: NormalizedCandidate, event_ts: datetime, actor: str,
                now: datetime, before: List[str]) -> MutationResult:
    """Repeated detection of an ongoing event: keep one incident, retain evidence, recalculate."""
    inc.detection_count += 1
    inc.last_detected_at = max(inc.last_detected_at, event_ts)
    if cand.confidence is not None:
        inc.detection_confidence = max(inc.detection_confidence or 0.0, cand.confidence)
    inc.evidence = _merge_evidence(inc.evidence, cand.evidence, False)
    for item in cand.evidence_items:
        db.add(EvidenceItem(incident_id=inc.id, created_at=now, **item))
    _event(db, inc, "repeated_detection",
           "Repeated detection merged into this incident (detection #%d)" % inc.detection_count, actor, now,
           {"evidence": cand.evidence, "confidence": cand.confidence})
    changed = _apply_score(db, inc, actor, now, "repeated detection with updated evidence")
    return _commit(db, inc, before, "repeated_detection", changed, True,
                   "Merged into existing incident %s (no duplicate created)" % inc.id)


# ---------------------------------------------------------------------------------------------
# Administrator actions
# ---------------------------------------------------------------------------------------------
def acknowledge(db: Session, incident_id: str, actor: str, note: Optional[str] = None,
                now: Optional[datetime] = None) -> MutationResult:
    now = now or utcnow()
    inc = get_incident(db, incident_id)
    _require_active(inc, "acknowledge")
    if inc.acknowledged_at is not None:
        raise Conflict("Incident %s was already acknowledged" % inc.id, code="already_acknowledged")
    before = _active_order(db)
    old_status = inc.status
    inc.acknowledged_at = now
    inc.status = Status.ACKNOWLEDGED.value
    inc.updated_at = now
    _event(db, inc, "acknowledged", "Acknowledged by %s%s" % (actor, ": " + note if note else ""), actor, now,
           {"from": old_status, "to": inc.status})
    _audit(db, inc, "acknowledge", actor, now, {"status": old_status}, {"status": inc.status}, note)
    return _commit(db, inc, before, "acknowledged", message="Incident acknowledged")


def assign(db: Session, incident_id: str, responder_id: str, actor: str, note: Optional[str] = None,
           now: Optional[datetime] = None) -> MutationResult:
    now = now or utcnow()
    inc = get_incident(db, incident_id)
    _require_active(inc, "assign")
    responder = RESPONDER_BY_ID.get(responder_id)
    if responder is None:
        raise ValidationFailed("Unknown responder '%s'" % responder_id,
                               [{"field": "responder_id", "valid": sorted(RESPONDER_BY_ID)}])
    before = _active_order(db)
    for a in inc.assignments:
        if a.unassigned_at is None:
            a.unassigned_at = now
    old_assignee, old_status = inc.assigned_to, inc.status
    db.add(IncidentAssignment(incident_id=inc.id, responder_id=responder_id, assigned_by=actor, note=note,
                              assigned_at=now))
    inc.assigned_to = responder_id
    if inc.acknowledged_at is None:  # assigning implies someone has taken ownership
        inc.acknowledged_at = now
    inc.status = Status.IN_PROGRESS.value
    inc.updated_at = now
    _event(db, inc, "assigned", "Assigned to %s by %s%s" % (responder["name"], actor, ": " + note if note else ""),
           actor, now, {"responder_id": responder_id, "previous": old_assignee})
    _audit(db, inc, "assign", actor, now, {"assigned_to": old_assignee, "status": old_status},
           {"assigned_to": responder_id, "status": inc.status}, note)
    return _commit(db, inc, before, "assigned", message="Assigned to %s" % responder["name"])


def record_action(db: Session, incident_id: str, action_type: str, note: str, actor: str,
                  now: Optional[datetime] = None) -> MutationResult:
    """Log a human action (the system never dispatches or contacts anyone)."""
    now = now or utcnow()
    inc = get_incident(db, incident_id)
    _require_active(inc, "record an action")
    before = _active_order(db)
    inc.updated_at = now
    _event(db, inc, "action_recorded", "Action recorded (%s): %s" % (action_type.replace("_", " "), note), actor, now,
           {"action_type": action_type, "note": note})
    _audit(db, inc, "action_recorded", actor, now, None, {"action_type": action_type, "note": note}, None)
    return _commit(db, inc, before, "action_recorded", message="Action recorded")


def update_evidence(db: Session, incident_id: str, patch: Dict[str, Any], actor: str, note: Optional[str] = None,
                    now: Optional[datetime] = None) -> MutationResult:
    """New evidence (``None`` = mark unknown) → recalculate priority → persist → notify."""
    now = now or utcnow()
    inc = get_incident(db, incident_id)
    _require_active(inc, "update evidence")
    if not patch:
        raise ValidationFailed("No evidence fields were provided")
    before = _active_order(db)
    old_ev = dict(inc.evidence or {})
    inc.evidence = _merge_evidence(old_ev, patch, True)
    _event(db, inc, "evidence_updated", "Evidence updated: " + ", ".join(
        "%s=%s" % (k.replace("_", " "), "unknown" if v is None else v) for k, v in patch.items())
        + (" — " + note if note else ""), actor, now, {"patch": patch, "note": note})
    _audit(db, inc, "evidence_updated", actor, now, {k: old_ev.get(k) for k in patch}, patch, note)
    changed = _apply_score(db, inc, actor, now, "evidence updated")
    return _commit(db, inc, before, "evidence_updated", changed, message="Evidence updated; priority recalculated")


def recalculate(db: Session, incident_id: str, actor: str, reason: Optional[str] = None,
                now: Optional[datetime] = None) -> MutationResult:
    now = now or utcnow()
    inc = get_incident(db, incident_id)
    _require_active(inc, "recalculate")
    before = _active_order(db)
    changed = _apply_score(db, inc, actor, now, reason or "manual recalculation requested")
    _audit(db, inc, "recalculate", actor, now, None, {"priority_changed": changed}, reason)
    return _commit(db, inc, before, "recalculated", changed,
                   message="Priority recalculated" + ("" if changed else " (no change)"))


def override_priority(db: Session, incident_id: str, level: Optional[str], reason: str, actor: str,
                      now: Optional[datetime] = None) -> MutationResult:
    """Manual override (escalate / de-escalate / clear). Reason is mandatory and audited."""
    now = now or utcnow()
    if not reason or len(reason.strip()) < 5:
        raise ValidationFailed("A reason of at least 5 characters is required for a manual priority override",
                               [{"field": "reason"}])
    if level is not None and level not in LEVEL_RANK:
        raise ValidationFailed("level must be one of critical/high/medium/low")
    inc = get_incident(db, incident_id)
    _require_active(inc, "override priority")
    if level is None and not inc.priority_overridden:
        raise Conflict("Incident %s has no manual override to clear" % inc.id, code="no_override")
    if level is not None and level == inc.priority_level and inc.priority_overridden:
        raise Conflict("Priority is already manually set to %s" % level, code="no_change")
    before = _active_order(db)
    old = {"level": inc.priority_level, "overridden": inc.priority_overridden, "score": inc.priority_score,
           "computed_level": inc.computed_priority_level}
    reason = reason.strip()
    prev_snapshot = _snapshot(inc)
    if level is None:
        inc.priority_overridden = False
        inc.override_reason = None
        inc.priority_level = inc.computed_priority_level
    else:
        inc.priority_overridden = True
        inc.override_reason = reason
        inc.priority_level = level
    _apply_score(db, inc, actor, now, "manual override", record_change=False, old_snapshot=prev_snapshot)
    new = {"level": inc.priority_level, "overridden": inc.priority_overridden, "score": inc.priority_score,
           "computed_level": inc.computed_priority_level}
    verb = "cleared" if level is None else ("escalated" if LEVEL_RANK[level] > LEVEL_RANK[old["level"]] else "de-escalated")
    _event(db, inc, "priority_override", "Priority override %s by %s: %s → %s. Reason: %s" % (
        verb, actor, old["level"], new["level"], reason), actor, now, {"old": old, "new": new, "reason": reason})
    _audit(db, inc, "priority_override", actor, now, old, new, reason)
    return _commit(db, inc, before, "priority_override", True, message="Priority override %s" % verb)


def _close_open_assignments(inc: Incident, now: datetime) -> None:
    for a in inc.assignments:
        if a.unassigned_at is None:
            a.unassigned_at = now


def resolve(db: Session, incident_id: str, actor: str, resolution_type: str = "resolved",
            note: Optional[str] = None, now: Optional[datetime] = None) -> MutationResult:
    now = now or utcnow()
    if resolution_type not in ("resolved", "false_positive"):
        raise ValidationFailed("resolution_type must be 'resolved' or 'false_positive'")
    inc = get_incident(db, incident_id)
    _require_active(inc, "resolve")
    before = _active_order(db)
    old_status = inc.status
    fp = resolution_type == "false_positive"
    inc.status = Status.FALSE_POSITIVE.value if fp else Status.RESOLVED.value
    inc.resolved_at = now
    inc.resolution_type = resolution_type
    inc.resolution_note = note
    if fp:
        inc.verification_status = Verification.FALSE_POSITIVE.value
        inc.needs_verification = False
    inc.updated_at = now
    _close_open_assignments(inc, now)
    _event(db, inc, "resolved" if not fp else "false_positive",
           ("Marked as FALSE POSITIVE by %s" if fp else "Resolved by %s") % actor + (": " + note if note else ""),
           actor, now, {"from": old_status, "to": inc.status})
    _audit(db, inc, "mark_false_positive" if fp else "resolve", actor, now, {"status": old_status},
           {"status": inc.status, "resolution_type": resolution_type}, note)
    return _commit(db, inc, before, "resolved", message="Incident marked as %s" % ("false positive" if fp else "resolved"))


def verify(db: Session, incident_id: str, verification: str, actor: str, note: Optional[str] = None,
           now: Optional[datetime] = None) -> MutationResult:
    """Record human verification. ``false_positive`` closes the incident; ``verified`` clears the verification flag."""
    if verification == Verification.FALSE_POSITIVE.value:
        return resolve(db, incident_id, actor, "false_positive", note, now)
    if verification != Verification.VERIFIED.value:
        raise ValidationFailed("verification must be 'verified' or 'false_positive'")
    now = now or utcnow()
    inc = get_incident(db, incident_id)
    _require_active(inc, "verify")
    before = _active_order(db)
    old = inc.verification_status
    inc.verification_status = Verification.VERIFIED.value
    changed = _apply_score(db, inc, actor, now, "human verification")
    _event(db, inc, "verification", "Detection verified by %s%s" % (actor, ": " + note if note else ""), actor, now,
           {"from": old, "to": inc.verification_status})
    _audit(db, inc, "verify", actor, now, {"verification_status": old}, {"verification_status": inc.verification_status}, note)
    return _commit(db, inc, before, "verified", changed, message="Detection verified")


def reopen(db: Session, incident_id: str, reason: str, actor: str, now: Optional[datetime] = None) -> MutationResult:
    now = now or utcnow()
    inc = get_incident(db, incident_id)
    if inc.status not in TERMINAL_STATUSES:
        raise Conflict("Incident %s is not closed/resolved; nothing to reopen" % inc.id, code="invalid_state")
    before = _active_order(db)
    old = {"status": inc.status, "resolution_type": inc.resolution_type}
    if inc.verification_status == Verification.FALSE_POSITIVE.value:
        inc.verification_status = Verification.UNVERIFIED.value
    inc.status = Status.ACKNOWLEDGED.value
    if inc.acknowledged_at is None:
        inc.acknowledged_at = now
    inc.resolved_at = None
    inc.closed_at = None
    inc.resolution_type = None
    inc.resolution_note = None
    inc.last_detected_at = max(inc.last_detected_at, now)
    changed = _apply_score(db, inc, actor, now, "incident reopened")
    _event(db, inc, "reopened", "Reopened by %s: %s" % (actor, reason), actor, now, {"from": old["status"]})
    _audit(db, inc, "reopen", actor, now, old, {"status": inc.status}, reason)
    return _commit(db, inc, before, "reopened", changed, message="Incident reopened")


def close(db: Session, incident_id: str, actor: str, note: Optional[str] = None,
          now: Optional[datetime] = None) -> MutationResult:
    now = now or utcnow()
    inc = get_incident(db, incident_id)
    if inc.status not in (Status.RESOLVED.value, Status.FALSE_POSITIVE.value):
        raise Conflict("Only resolved incidents can be closed", code="invalid_state")
    before = _active_order(db)
    old = inc.status
    inc.status = Status.CLOSED.value
    inc.closed_at = now
    inc.updated_at = now
    _event(db, inc, "status_changed", "Closed by %s%s" % (actor, ": " + note if note else ""), actor, now,
           {"from": old, "to": inc.status})
    _audit(db, inc, "close", actor, now, {"status": old}, {"status": inc.status}, note)
    return _commit(db, inc, before, "closed", message="Incident closed")


def change_status(db: Session, incident_id: str, target: str, actor: str, note: Optional[str] = None,
                  now: Optional[datetime] = None) -> MutationResult:
    """Generic, validated status transition (delegates to the dedicated actions where timestamps matter)."""
    inc = get_incident(db, incident_id)
    if target == inc.status:
        raise Conflict("Incident is already %s" % target.replace("_", " "), code="no_change")
    if target not in ALLOWED_TRANSITIONS.get(inc.status, set()):
        raise Conflict("Transition %s → %s is not allowed" % (inc.status, target), code="invalid_transition")
    if target == Status.RESOLVED.value:
        return resolve(db, incident_id, actor, "resolved", note, now)
    if target == Status.FALSE_POSITIVE.value:
        return resolve(db, incident_id, actor, "false_positive", note, now)
    if target == Status.CLOSED.value:
        return close(db, incident_id, actor, note, now)
    if inc.status in TERMINAL_STATUSES:
        return reopen(db, incident_id, note or "Reopened via status change", actor, now)
    if target == Status.ACKNOWLEDGED.value and inc.acknowledged_at is None:
        return acknowledge(db, incident_id, actor, note, now)
    now = now or utcnow()
    before = _active_order(db)
    old = inc.status
    inc.status = target
    if inc.acknowledged_at is None:
        inc.acknowledged_at = now
    inc.updated_at = now
    _event(db, inc, "status_changed", "Status changed %s → %s by %s%s" % (old, target, actor, ": " + note if note else ""),
           actor, now, {"from": old, "to": target})
    _audit(db, inc, "status_change", actor, now, {"status": old}, {"status": target}, note)
    return _commit(db, inc, before, "status_changed", message="Status updated")


# ---------------------------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------------------------
def list_incidents(
    db: Session,
    status: Optional[List[str]] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    camera_id: Optional[str] = None,
    location_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "queue",
    limit: int = 200,
    offset: int = 0,
) -> Dict[str, Any]:
    q = select(Incident)
    if status:
        expanded: List[str] = []
        for s in status:
            expanded.extend(ACTIVE_STATUSES if s == "active" else (TERMINAL_STATUSES if s == "closed_all" else (s,)))
        q = q.where(Incident.status.in_(expanded))
    if category:
        q = q.where(Incident.category == category)
    if priority:
        q = q.where(Incident.priority_level == priority)
    if camera_id:
        q = q.where(Incident.camera_id == camera_id)
    if location_id:
        q = q.where(Incident.location_id == location_id)
    if date_from:
        q = q.where(Incident.detected_at >= date_from)
    if date_to:
        q = q.where(Incident.detected_at <= date_to)
    if source in (SourceType.SIMULATION.value, SourceType.VIDEO_UPLOAD.value):
        q = q.where(Incident.source_type == source)
    rows = db.execute(q).scalars().all()
    if search:
        s = search.lower()
        rows = [r for r in rows if s in r.title.lower() or s in r.id.lower() or s in (r.description or "").lower()]
    if sort == "queue":
        rows = queue_mod.sort_queue(rows)
    else:
        rows = sorted(rows, key=lambda r: (r.detected_at, r.id), reverse=True)
    total = len(rows)
    return {"items": rows[offset: offset + limit], "total": total}


def queue_positions(db: Session) -> Dict[str, int]:
    return {i.id: n + 1 for n, i in enumerate(active_incidents(db))}


def clear_incident_history(db: Session, include_active: bool = False, actor: str = "Administrator") -> Dict[str, Any]:
    """Permanently deletes historical incidents and their cascaded records.

    If include_active is False: deletes all terminal incidents (resolved, false_positive, closed).
    If include_active is True: deletes all incidents in the database.
    """
    q = db.query(Incident)
    if not include_active:
        q = q.filter(Incident.status.in_(TERMINAL_STATUSES))
    rows = q.all()
    count = len(rows)

    deleted_ids = [r.id for r in rows]
    if deleted_ids:
        # Clear any candidate reference pointing to deleted incidents
        from app.models import EventCandidate
        db.query(EventCandidate).filter(EventCandidate.incident_id.in_(deleted_ids)).update(
            {EventCandidate.incident_id: None}, synchronize_session=False
        )

    for inc in rows:
        db.delete(inc)

    db.add(AuditLog(
        entity_type="system",
        entity_id="incidents",
        action="clear_history",
        actor=actor,
        old_value={"deleted_count": count, "include_active": include_active},
        new_value=None,
        is_simulated=False,
        reason="Operator cleared incident history",
    ))
    db.commit()

    # Notify connected clients via SSE stream
    broker.publish({"type": "queue_changed", "reason": "clear_history", "ranking_changed": True})
    return {
        "deleted": count,
        "include_active": include_active,
        "message": f"Successfully cleared {count} incident record(s).",
    }

