"""Aggregate metrics computed ONLY from persisted incident records (no invented numbers)."""
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.enums import ACTIVE_STATUSES, CATEGORY_LABELS, Status
from app.models import Incident, IncidentEvent
from app.services import queue as queue_mod


def _avg(values: List[float]) -> Optional[float]:
    return round(sum(values) / len(values), 1) if values else None


def summary(
    db: Session,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    camera_id: Optional[str] = None,
    location_id: Optional[str] = None,
) -> Dict[str, Any]:
    q = select(Incident)
    if date_from:
        q = q.where(Incident.detected_at >= date_from)
    if date_to:
        q = q.where(Incident.detected_at <= date_to)
    if category:
        q = q.where(Incident.category == category)
    if priority:
        q = q.where(Incident.priority_level == priority)
    if camera_id:
        q = q.where(Incident.camera_id == camera_id)
    if location_id:
        q = q.where(Incident.location_id == location_id)
    rows: List[Incident] = list(db.execute(q).scalars().all())
    if status == "active":
        rows = [r for r in rows if r.status in ACTIVE_STATUSES]
    elif status:
        rows = [r for r in rows if r.status == status]

    active = [r for r in rows if r.status in ACTIVE_STATUSES]
    ack_times = [(r.acknowledged_at - r.detected_at).total_seconds() for r in rows
                 if r.acknowledged_at and r.acknowledged_at >= r.detected_at]
    res_times = [(r.resolved_at - r.detected_at).total_seconds() for r in rows
                 if r.resolved_at and r.resolution_type == "resolved" and r.resolved_at >= r.detected_at]

    by_sev_active = Counter(r.priority_level for r in active)
    by_sev_all = Counter(r.priority_level for r in rows)
    by_cat = Counter(r.category for r in rows)
    by_status = Counter(r.status for r in rows)
    matrix: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for r in rows:
        matrix[r.category][r.priority_level] += 1

    per_day: Dict[str, int] = defaultdict(int)
    for r in rows:
        per_day[r.detected_at.date().isoformat()] += 1

    top = queue_mod.sort_queue(active)[:5]
    recent_q = select(IncidentEvent).order_by(IncidentEvent.id.desc()).limit(12)
    recent = db.execute(recent_q).scalars().all()
    ids = {e.incident_id for e in recent}
    titles = {i.id: i.title for i in db.execute(select(Incident).where(Incident.id.in_(ids))).scalars().all()} if ids else {}

    levels = ("critical", "high", "medium", "low")
    return {
        "mode": get_settings().app_mode,
        "totals": {
            "incidents": len(rows),
            "active": len(active),
            "critical_active": by_sev_active.get("critical", 0),
            "awaiting_acknowledgement": sum(1 for r in active if r.status == Status.NEW.value),
            "in_progress": sum(1 for r in active if r.status == Status.IN_PROGRESS.value),
            "resolved": by_status.get(Status.RESOLVED.value, 0) + by_status.get(Status.CLOSED.value, 0),
            "false_positive": by_status.get(Status.FALSE_POSITIVE.value, 0),
            "simulated": sum(1 for r in rows if r.is_simulated),
            "from_video_analysis": sum(1 for r in rows if not r.is_simulated),
            "emergency_tier_active": sum(1 for r in active if r.emergency_rule_triggered),
            "needing_verification_active": sum(1 for r in active if r.needs_verification),
        },
        "avg_acknowledgement_seconds": _avg(ack_times),
        "avg_resolution_seconds": _avg(res_times),
        "acknowledgement_sample_size": len(ack_times),
        "resolution_sample_size": len(res_times),
        "by_severity_active": {l: by_sev_active.get(l, 0) for l in levels},
        "by_severity_all": {l: by_sev_all.get(l, 0) for l in levels},
        "by_category": [{"category": c, "label": CATEGORY_LABELS.get(c, c), "count": n,
                         **{l: matrix[c].get(l, 0) for l in levels}} for c, n in sorted(by_cat.items())],
        "by_status": dict(by_status),
        "per_day": [{"date": d, "count": n} for d, n in sorted(per_day.items())],
        "top_incidents": [{"id": i.id, "title": i.title, "priority_level": i.priority_level,
                           "priority_score": i.priority_score, "status": i.status,
                           "emergency": i.emergency_rule_triggered, "is_simulated": i.is_simulated} for i in top],
        "recent_activity": [{"id": e.id, "incident_id": e.incident_id, "incident_title": titles.get(e.incident_id),
                             "event_type": e.event_type, "message": e.message, "actor": e.actor,
                             "created_at": e.created_at} for e in recent],
        "sources": {"note": "All metrics are computed from persisted incident records; simulated demo data is included and flagged."},
    }
