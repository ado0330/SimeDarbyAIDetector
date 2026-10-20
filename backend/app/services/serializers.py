"""ORM → API schema conversion."""
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import utcnow
from app.enums import ACTIVE_STATUSES, ALLOWED_TRANSITIONS, CATEGORY_LABELS
from app.models import AuditLog, EvidenceItem, Incident
from app.schemas import (
    AssignmentOut, AuditLogOut, EvidenceItemOut, IncidentDetailOut, IncidentEventOut, IncidentOut,
)
from app.services.reference import RESPONDER_BY_ID


def frame_url(reference: Optional[str]) -> Optional[str]:
    return "/api/media/frames/%s" % reference if reference else None


def incident_out(inc: Incident, positions: Optional[Dict[str, int]] = None) -> IncidentOut:
    now = utcnow()
    responder = RESPONDER_BY_ID.get(inc.assigned_to or "")
    return IncidentOut(
        id=inc.id, title=inc.title, category=inc.category,
        category_label=CATEGORY_LABELS.get(inc.category, inc.category), description=inc.description or "",
        location_id=inc.location_id, location_name=inc.location.name if inc.location else None,
        camera_id=inc.camera_id, camera_name=inc.camera.name if inc.camera else None,
        source_type=inc.source_type, source_reference=inc.source_reference, event_timestamp=inc.event_timestamp,
        detected_at=inc.detected_at, last_detected_at=inc.last_detected_at, created_at=inc.created_at,
        updated_at=inc.updated_at, status=inc.status, severity_score=inc.severity_score,
        immediacy_score=inc.immediacy_score, people_at_risk_score=inc.people_at_risk_score,
        secondary_hazard_score=inc.secondary_hazard_score, priority_score=inc.priority_score,
        rank_score=inc.rank_score, priority_level=inc.priority_level,
        computed_priority_level=inc.computed_priority_level, emergency_rule_triggered=inc.emergency_rule_triggered,
        priority_overridden=inc.priority_overridden, override_reason=inc.override_reason,
        detection_confidence=inc.detection_confidence, verification_status=inc.verification_status,
        needs_verification=inc.needs_verification, uncertainty=inc.uncertainty,
        priority_explanation=inc.priority_explanation, recommended_action=inc.recommended_action,
        assigned_to=inc.assigned_to, assigned_to_name=responder["name"] if responder else inc.assigned_to,
        acknowledged_at=inc.acknowledged_at, resolved_at=inc.resolved_at, closed_at=inc.closed_at,
        resolution_type=inc.resolution_type, resolution_note=inc.resolution_note, is_simulated=inc.is_simulated,
        detection_count=inc.detection_count, evidence=inc.evidence or {}, metadata=inc.meta or {},
        seconds_since_detection=max(0.0, (now - inc.detected_at).total_seconds()),
        queue_position=(positions or {}).get(inc.id) if inc.status in ACTIVE_STATUSES else None,
    )


def incident_detail_out(db: Session, inc: Incident, positions: Optional[Dict[str, int]] = None) -> IncidentDetailOut:
    base = incident_out(inc, positions).model_dump()
    audit = db.execute(select(AuditLog).where(AuditLog.entity_type == "incident", AuditLog.entity_id == inc.id)
                       .order_by(AuditLog.id)).scalars().all()
    assignments: List[AssignmentOut] = []
    for a in inc.assignments:
        out = AssignmentOut.model_validate(a)
        out.responder_name = (RESPONDER_BY_ID.get(a.responder_id) or {}).get("name", a.responder_id)
        assignments.append(out)
    items: List[EvidenceItemOut] = []
    for e in inc.evidence_items:
        out = EvidenceItemOut.model_validate(e)
        out.frame_url = frame_url(e.reference) if e.kind == "frame" else None
        items.append(out)
    return IncidentDetailOut(
        **base,
        score_breakdown=inc.score_breakdown or {}, triggered_rules=inc.triggered_rules or [],
        recommendations=inc.recommendations or [],
        events=[IncidentEventOut.model_validate(e) for e in inc.events],
        assignments=assignments, evidence_items=items,
        audit=[AuditLogOut.model_validate(a) for a in audit],
        allowed_status_transitions=sorted(ALLOWED_TRANSITIONS.get(inc.status, set())),
    )
