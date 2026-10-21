"""Pydantic request/response schemas (the explicit, typed frontend↔backend contract).

Python 3.9: use Optional[...] rather than ``X | None``.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums import Category, PriorityLevel, SourceType, Status


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ---------------------------------------------------------------------------------------------
# Evidence (inputs to the prioritization engine). All optional; ``None`` means "unknown".
# ---------------------------------------------------------------------------------------------
class EvidencePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    persons_involved: Optional[int] = Field(None, ge=0, le=500)
    vehicles_involved: Optional[int] = Field(None, ge=0, le=100)
    vulnerable_road_user_involved: Optional[bool] = None
    person_motionless_after_impact: Optional[bool] = None
    blocks_emergency_access: Optional[bool] = None
    blocks_traffic_lane: Optional[bool] = None
    smoke_or_flame_visible: Optional[bool] = None
    spreading: Optional[bool] = None
    people_in_vicinity: Optional[bool] = None
    person_motionless_seconds: Optional[float] = Field(None, ge=0, le=86400)
    person_attempting_to_stand: Optional[bool] = None
    bystander_assisting: Optional[bool] = None
    no_bystander_assistance: Optional[bool] = None
    hazardous_location: Optional[bool] = None
    fall_from_height: Optional[bool] = None
    duration_minutes: Optional[float] = Field(None, ge=0, le=100000)


# ---------------------------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------------------------
class IncidentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: Category
    title: Optional[str] = Field(None, max_length=200)
    description: str = Field("", max_length=2000)
    camera_id: Optional[str] = Field(None, max_length=32)
    location_id: Optional[str] = Field(None, max_length=32)
    source_type: SourceType = SourceType.SIMULATION
    source_reference: Optional[str] = Field(None, max_length=255)
    event_timestamp: Optional[datetime] = None
    detection_confidence: Optional[float] = Field(None, ge=0, le=1)
    evidence: EvidencePatch = Field(default_factory=EvidencePatch)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("event_timestamp")
    @classmethod
    def _tz_aware(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None and v.tzinfo is None:
            raise ValueError("event_timestamp must include a time-zone offset (UTC recommended)")
        return v


class AcknowledgeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    note: Optional[str] = Field(None, max_length=1000)


class AssignRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    responder_id: str = Field(..., min_length=1, max_length=64)
    note: Optional[str] = Field(None, max_length=1000)


ACTION_TYPES = ("note", "camera_reviewed", "patrol_dispatched", "owner_contacted", "area_secured",
                "external_services_contacted", "sop_step_completed", "escalation")


class ActionRequest(BaseModel):
    """Records what the administrator says they did. Nothing is dispatched or contacted by the system."""
    model_config = ConfigDict(extra="forbid")
    action_type: str = Field("note")
    note: str = Field(..., min_length=3, max_length=1000)

    @field_validator("action_type")
    @classmethod
    def _valid_type(cls, v: str) -> str:
        if v not in ACTION_TYPES:
            raise ValueError("action_type must be one of: " + ", ".join(ACTION_TYPES))
        return v

    @field_validator("note")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("note must contain at least 3 characters")
        return v


class EvidenceUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    evidence: EvidencePatch
    note: Optional[str] = Field(None, max_length=1000)


class RecalculateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: Optional[str] = Field(None, max_length=1000)


class OverrideRequest(BaseModel):
    """``level`` = new level, or ``null`` to clear a previous override. A reason is mandatory."""
    model_config = ConfigDict(extra="forbid")
    level: Optional[PriorityLevel] = None
    reason: str = Field(..., min_length=5, max_length=1000)

    @field_validator("reason")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("A reason of at least 5 characters is required for a manual priority override")
        return v


class ResolveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    resolution_type: str = Field("resolved", pattern="^(resolved|false_positive)$")
    note: Optional[str] = Field(None, max_length=1000)


class VerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verification: str = Field(..., pattern="^(verified|false_positive)$")
    note: Optional[str] = Field(None, max_length=1000)


class StatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Status
    note: Optional[str] = Field(None, max_length=1000)


class ReopenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(..., min_length=3, max_length=1000)


class DemoTriggerRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario: str = Field(..., pattern="^(simultaneous|escalate|human_intervention|false_positive|low_confidence_fire)$")


class CandidateReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: str = Field(..., pattern="^(accept|reject)$")
    note: Optional[str] = Field(None, max_length=1000)


# ---------------------------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------------------------
class LocationOut(ApiModel):
    id: str
    name: str
    zone: str
    description: str
    map_x: float
    map_y: float


class CameraOut(ApiModel):
    id: str
    name: str
    location_id: str
    map_x: float
    map_y: float
    is_simulated: bool


class ResponderOut(BaseModel):
    id: str
    name: str
    role: str


class IncidentEventOut(ApiModel):
    id: int
    event_type: str
    message: str
    data: Dict[str, Any]
    actor: str
    created_at: datetime


class AssignmentOut(ApiModel):
    id: int
    responder_id: str
    responder_name: Optional[str] = None
    assigned_by: str
    note: Optional[str]
    assigned_at: datetime
    unassigned_at: Optional[datetime]


class EvidenceItemOut(ApiModel):
    id: int
    kind: str
    reference: Optional[str]
    frame_url: Optional[str] = None
    video_url: Optional[str] = None
    video_job_id: Optional[str]
    timestamp_s: Optional[float]
    bbox: Optional[Dict[str, Any]]
    description: str
    created_at: datetime


class AuditLogOut(ApiModel):
    id: int
    entity_type: str
    entity_id: str
    action: str
    actor: str
    old_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]
    reason: Optional[str]
    is_simulated: bool
    created_at: datetime


class IncidentOut(BaseModel):
    id: str
    title: str
    category: str
    category_label: str
    description: str
    location_id: Optional[str]
    location_name: Optional[str]
    camera_id: Optional[str]
    camera_name: Optional[str]
    source_type: str
    source_reference: Optional[str]
    event_timestamp: Optional[datetime]
    detected_at: datetime
    last_detected_at: datetime
    created_at: datetime
    updated_at: datetime
    status: str
    severity_score: float
    immediacy_score: float
    people_at_risk_score: float
    secondary_hazard_score: float
    priority_score: float
    rank_score: float
    priority_level: str
    computed_priority_level: str
    emergency_rule_triggered: bool
    priority_overridden: bool
    override_reason: Optional[str]
    detection_confidence: Optional[float]
    verification_status: str
    needs_verification: bool
    uncertainty: str
    priority_explanation: str
    recommended_action: str
    assigned_to: Optional[str]
    assigned_to_name: Optional[str]
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    resolution_type: Optional[str]
    resolution_note: Optional[str]
    is_simulated: bool
    detection_count: int
    evidence: Dict[str, Any]
    metadata: Dict[str, Any]
    seconds_since_detection: float
    queue_position: Optional[int] = None
    video_url: Optional[str] = None


class IncidentDetailOut(IncidentOut):
    score_breakdown: Dict[str, Any]
    triggered_rules: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    events: List[IncidentEventOut]
    assignments: List[AssignmentOut]
    evidence_items: List[EvidenceItemOut]
    audit: List[AuditLogOut]
    allowed_status_transitions: List[str]


class IncidentListOut(BaseModel):
    items: List[IncidentOut]
    total: int


class MutationOut(BaseModel):
    incident: IncidentDetailOut
    priority_changed: bool = False
    ranking_changed: bool = False
    deduplicated: bool = False
    message: str = ""
