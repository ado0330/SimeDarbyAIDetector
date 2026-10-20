"""SQLAlchemy ORM models."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    JSON, Boolean, CheckConstraint, Float, ForeignKey, Index, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UTCDateTime, utcnow


class Location(Base):
    __tablename__ = "locations"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    zone: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(255), default="")
    map_x: Mapped[float] = mapped_column(Float)  # 0-100 schematic coordinates
    map_y: Mapped[float] = mapped_column(Float)
    cameras: Mapped[List["Camera"]] = relationship(back_populates="location")


class Camera(Base):
    __tablename__ = "cameras"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location_id: Mapped[str] = mapped_column(ForeignKey("locations.id"))
    map_x: Mapped[float] = mapped_column(Float)
    map_y: Mapped[float] = mapped_column(Float)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True)  # fictional camera
    location: Mapped[Location] = relationship(back_populates="cameras")


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        CheckConstraint("severity_score BETWEEN 0 AND 100", name="ck_sev"),
        CheckConstraint("immediacy_score BETWEEN 0 AND 100", name="ck_imm"),
        CheckConstraint("people_at_risk_score BETWEEN 0 AND 100", name="ck_ppl"),
        CheckConstraint("secondary_hazard_score BETWEEN 0 AND 100", name="ck_sec"),
        CheckConstraint("priority_score BETWEEN 0 AND 100", name="ck_prio"),
        CheckConstraint("priority_level IN ('critical','high','medium','low')", name="ck_level"),
        CheckConstraint("computed_priority_level IN ('critical','high','medium','low')", name="ck_clevel"),
        CheckConstraint("status IN ('new','acknowledged','in_progress','resolved','false_positive','closed')",
                        name="ck_status"),
        CheckConstraint("source_type IN ('simulation','video_upload')", name="ck_source"),
        CheckConstraint("detection_confidence IS NULL OR (detection_confidence BETWEEN 0 AND 1)", name="ck_conf"),
        Index("ix_incident_status", "status"),
        Index("ix_incident_dedup", "camera_id", "category", "last_detected_at"),
        Index("ix_incident_detected", "detected_at"),
        Index("ix_incident_simulated", "is_simulated"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(40), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    location_id: Mapped[Optional[str]] = mapped_column(ForeignKey("locations.id"), nullable=True)
    camera_id: Mapped[Optional[str]] = mapped_column(ForeignKey("cameras.id"), nullable=True)
    source_type: Mapped[str] = mapped_column(String(20))
    source_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    event_timestamp: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(UTCDateTime)
    last_detected_at: Mapped[datetime] = mapped_column(UTCDateTime)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    status: Mapped[str] = mapped_column(String(20), default="new")

    severity_score: Mapped[float] = mapped_column(Float)
    immediacy_score: Mapped[float] = mapped_column(Float)
    people_at_risk_score: Mapped[float] = mapped_column(Float)
    secondary_hazard_score: Mapped[float] = mapped_column(Float)
    priority_score: Mapped[float] = mapped_column(Float)
    rank_score: Mapped[float] = mapped_column(Float)  # hysteresis-smoothed score used only for queue sorting
    computed_priority_level: Mapped[str] = mapped_column(String(10))  # engine output (after rule floors)
    priority_level: Mapped[str] = mapped_column(String(10))  # effective level (manual override wins)
    emergency_rule_triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    triggered_rules: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    score_breakdown: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    priority_overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    detection_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(20), default="unverified")
    needs_verification: Mapped[bool] = mapped_column(Boolean, default=False)
    uncertainty: Mapped[str] = mapped_column(String(10), default="low")
    priority_explanation: Mapped[str] = mapped_column(Text, default="")
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    recommendations: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    evidence: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)  # current merged scoring evidence
    detection_count: Mapped[int] = mapped_column(Integer, default=1)

    assigned_to: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    resolution_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    meta: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict)

    events: Mapped[List["IncidentEvent"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="IncidentEvent.id")
    assignments: Mapped[List["IncidentAssignment"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="IncidentAssignment.id")
    evidence_items: Mapped[List["EvidenceItem"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="EvidenceItem.id")
    location: Mapped[Optional[Location]] = relationship()
    camera: Mapped[Optional[Camera]] = relationship()


class IncidentEvent(Base):
    """Timeline entry: status changes, evidence updates, priority changes, actions…"""
    __tablename__ = "incident_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(40))
    message: Mapped[str] = mapped_column(Text)
    data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    actor: Mapped[str] = mapped_column(String(80), default="system")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    incident: Mapped[Incident] = relationship(back_populates="events")


class IncidentAssignment(Base):
    __tablename__ = "incident_assignments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), index=True)
    responder_id: Mapped[str] = mapped_column(String(64))
    assigned_by: Mapped[str] = mapped_column(String(80))
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    unassigned_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    incident: Mapped[Incident] = relationship(back_populates="assignments")


class EvidenceItem(Base):
    __tablename__ = "evidence_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[Optional[str]] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    candidate_id: Mapped[Optional[int]] = mapped_column(ForeignKey("event_candidates.id", ondelete="CASCADE"), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(20))  # frame | note
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # server-relative frame filename
    video_job_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    timestamp_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bbox: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    incident: Mapped[Optional[Incident]] = relationship(back_populates="evidence_items")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(30), index=True)
    entity_id: Mapped[str] = mapped_column(String(64), index=True)
    action: Mapped[str] = mapped_column(String(50))
    actor: Mapped[str] = mapped_column(String(80))
    old_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    new_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class VideoJob(Base):
    __tablename__ = "video_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    stored_filename: Mapped[str] = mapped_column(String(80))
    size_bytes: Mapped[int] = mapped_column(Integer)
    camera_id: Mapped[Optional[str]] = mapped_column(ForeignKey("cameras.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fps: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    frame_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    frames_analyzed: Mapped[int] = mapped_column(Integer, default=0)
    detector_id: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    detector_version: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    detector_available: Mapped[bool] = mapped_column(Boolean, default=True)
    detector_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    video_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    candidates: Mapped[List["EventCandidate"]] = relationship(back_populates="video_job", cascade="all, delete-orphan")


class EventCandidate(Base):
    """A detector output awaiting human review. Becomes an Incident only when accepted."""
    __tablename__ = "event_candidates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    video_job_id: Mapped[str] = mapped_column(ForeignKey("video_jobs.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(40))
    timestamp_s: Mapped[float] = mapped_column(Float)
    end_timestamp_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bbox: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    evidence: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)  # scoring evidence
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)  # descriptive metadata
    frame_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    model_id: Mapped[str] = mapped_column(String(60))
    model_version: Mapped[str] = mapped_column(String(40))
    preview: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)  # engine preview of priority
    status: Mapped[str] = mapped_column(String(20), default="pending")
    incident_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    video_job: Mapped[VideoJob] = relationship(back_populates="candidates")
