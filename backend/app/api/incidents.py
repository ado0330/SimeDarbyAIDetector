"""Incident REST endpoints (thin: validation → service → serialisation)."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import current_actor
from app.config import get_settings
from app.database import get_db
from app.enums import SourceType
from app.schemas import (
    AcknowledgeRequest, ActionRequest, AssignRequest, EvidenceUpdateRequest, IncidentCreate,
    IncidentDetailOut, IncidentListOut, MutationOut, OverrideRequest, RecalculateRequest, ReopenRequest,
    ResolveRequest, StatusRequest, VerifyRequest,
)
from app.services import incident_service as svc
from app.services.serializers import incident_detail_out, incident_out

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _mutation(db: Session, r: svc.MutationResult) -> MutationOut:
    return MutationOut(incident=incident_detail_out(db, r.incident, svc.queue_positions(db)),
                       priority_changed=r.priority_changed, ranking_changed=r.ranking_changed,
                       deduplicated=r.deduplicated, message=r.message)


@router.get("", response_model=IncidentListOut)
def list_incidents(
    status: Optional[str] = Query(None, description="Comma-separated statuses; 'active' = new+acknowledged+in_progress"),
    category: Optional[str] = None,
    priority: Optional[str] = Query(None, pattern="^(critical|high|medium|low)$"),
    camera_id: Optional[str] = None,
    location_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    source: Optional[str] = Query(None, pattern="^(simulation|video_upload)$"),
    q: Optional[str] = Query(None, max_length=100),
    sort: str = Query("queue", pattern="^(queue|newest)$"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> IncidentListOut:
    statuses: Optional[List[str]] = [s.strip() for s in status.split(",") if s.strip()] if status else None
    res = svc.list_incidents(db, statuses, category, priority, camera_id, location_id, date_from, date_to, source,
                             q, sort, limit, offset)
    positions = svc.queue_positions(db)
    return IncidentListOut(items=[incident_out(i, positions) for i in res["items"]], total=res["total"])


@router.post("", response_model=MutationOut, status_code=201)
def create_incident(body: IncidentCreate, actor: str = Depends(current_actor),
                    db: Session = Depends(get_db)) -> MutationOut:
    """Create an incident from a validated candidate (or an authorised demo action).

    Repeated detections of an ongoing event are merged (``deduplicated: true``) instead of duplicated.
    """
    if body.source_type == SourceType.SIMULATION and not get_settings().allow_demo_endpoints:
        raise HTTPException(status_code=403, detail="Simulated incidents are disabled on this deployment")
    cand = svc.NormalizedCandidate(
        category=body.category.value, title=body.title, description=body.description, camera_id=body.camera_id,
        location_id=body.location_id, source_type=body.source_type.value, source_reference=body.source_reference,
        event_timestamp=body.event_timestamp, confidence=body.detection_confidence,
        evidence=body.evidence.model_dump(exclude_none=True), metadata=body.metadata)
    return _mutation(db, svc.ingest_candidate(db, cand, actor))


@router.post("/clear-history")
def clear_history_post(
    include_active: bool = Query(False, description="Whether to also clear active incidents"),
    actor: str = Depends(current_actor),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return svc.clear_incident_history(db, include_active, actor)


@router.delete("/history")
def clear_history_delete(
    include_active: bool = Query(False, description="Whether to also clear active incidents"),
    actor: str = Depends(current_actor),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return svc.clear_incident_history(db, include_active, actor)


@router.get("/{incident_id}", response_model=IncidentDetailOut)
def get_incident(incident_id: str, db: Session = Depends(get_db)) -> IncidentDetailOut:
    return incident_detail_out(db, svc.get_incident(db, incident_id), svc.queue_positions(db))


@router.post("/{incident_id}/acknowledge", response_model=MutationOut)
def acknowledge(incident_id: str, body: AcknowledgeRequest = AcknowledgeRequest(),
                actor: str = Depends(current_actor), db: Session = Depends(get_db)) -> MutationOut:
    return _mutation(db, svc.acknowledge(db, incident_id, actor, body.note))


@router.post("/{incident_id}/assign", response_model=MutationOut)
def assign(incident_id: str, body: AssignRequest, actor: str = Depends(current_actor),
           db: Session = Depends(get_db)) -> MutationOut:
    return _mutation(db, svc.assign(db, incident_id, body.responder_id, actor, body.note))


@router.post("/{incident_id}/actions", response_model=MutationOut)
def record_action(incident_id: str, body: ActionRequest, actor: str = Depends(current_actor),
                  db: Session = Depends(get_db)) -> MutationOut:
    """Records an action the administrator took. The system itself never dispatches or contacts anyone."""
    return _mutation(db, svc.record_action(db, incident_id, body.action_type, body.note, actor))


@router.post("/{incident_id}/evidence", response_model=MutationOut)
def update_evidence(incident_id: str, body: EvidenceUpdateRequest, actor: str = Depends(current_actor),
                    db: Session = Depends(get_db)) -> MutationOut:
    """Add/modify scoring evidence (``null`` = mark unknown). Triggers recalculation and re-ranking."""
    patch = body.evidence.model_dump(exclude_unset=True)
    return _mutation(db, svc.update_evidence(db, incident_id, patch, actor, body.note))


@router.post("/{incident_id}/recalculate", response_model=MutationOut)
def recalculate(incident_id: str, body: RecalculateRequest = RecalculateRequest(),
                actor: str = Depends(current_actor), db: Session = Depends(get_db)) -> MutationOut:
    return _mutation(db, svc.recalculate(db, incident_id, actor, body.reason))


@router.post("/{incident_id}/override-priority", response_model=MutationOut)
def override_priority(incident_id: str, body: OverrideRequest, actor: str = Depends(current_actor),
                      db: Session = Depends(get_db)) -> MutationOut:
    level = body.level.value if body.level else None
    return _mutation(db, svc.override_priority(db, incident_id, level, body.reason, actor))


@router.post("/{incident_id}/verify", response_model=MutationOut)
def verify(incident_id: str, body: VerifyRequest, actor: str = Depends(current_actor),
           db: Session = Depends(get_db)) -> MutationOut:
    return _mutation(db, svc.verify(db, incident_id, body.verification, actor, body.note))


@router.post("/{incident_id}/status", response_model=MutationOut)
def change_status(incident_id: str, body: StatusRequest, actor: str = Depends(current_actor),
                  db: Session = Depends(get_db)) -> MutationOut:
    return _mutation(db, svc.change_status(db, incident_id, body.status.value, actor, body.note))


@router.post("/{incident_id}/resolve", response_model=MutationOut)
def resolve(incident_id: str, body: ResolveRequest = ResolveRequest(), actor: str = Depends(current_actor),
            db: Session = Depends(get_db)) -> MutationOut:
    return _mutation(db, svc.resolve(db, incident_id, actor, body.resolution_type, body.note))


@router.post("/{incident_id}/reopen", response_model=MutationOut)
def reopen(incident_id: str, body: ReopenRequest, actor: str = Depends(current_actor),
           db: Session = Depends(get_db)) -> MutationOut:
    return _mutation(db, svc.reopen(db, incident_id, body.reason, actor))
