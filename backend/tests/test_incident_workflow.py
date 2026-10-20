"""Incident workflow tests against a real (in-memory SQLite) database."""
from datetime import timedelta

import pytest
from sqlalchemy import select

from app import database
from app.database import utcnow
from app.errors import Conflict, ValidationFailed
from app.models import AuditLog, Incident, IncidentEvent
from app.services import incident_service as svc


def cand(category="road_collision", camera="CAM-GATE-01", evidence=None, conf=0.9, **kw):
    return svc.NormalizedCandidate(category=category, camera_id=camera, confidence=conf,
                                   evidence=evidence or {}, **kw)


def test_ingest_creates_scored_incident(db):
    r = svc.ingest_candidate(db, cand(evidence={"vehicles_involved": 2}), "tester")
    inc = r.incident
    assert inc.id == "INC-0001" and inc.status == "new" and inc.is_simulated
    assert inc.location_id == "LOC-GATE"  # derived from camera
    assert 0 <= inc.priority_score <= 100 and inc.priority_level in ("high", "critical")
    assert inc.priority_explanation and inc.recommended_action
    assert inc.score_breakdown["factors"]
    assert [e.event_type for e in inc.events] == ["detected"]


def test_dedup_within_window_merges_and_outside_creates(db):
    now = utcnow()
    a = svc.ingest_candidate(db, cand(evidence={"vehicles_involved": 1}), "t", now).incident
    r = svc.ingest_candidate(db, cand(evidence={"persons_involved": 3}), "t", now + timedelta(seconds=60))
    assert r.deduplicated and r.incident.id == a.id
    assert r.incident.detection_count == 2
    assert r.incident.evidence == {"vehicles_involved": 1, "persons_involved": 3}  # evidence merged
    assert r.incident.priority_level == "critical"  # R-COLLISION-MULTI via merged evidence
    assert db.query(Incident).count() == 1
    # different camera or category => separate incidents
    svc.ingest_candidate(db, cand(camera="CAM-GATE-02"), "t", now + timedelta(seconds=61))
    svc.ingest_candidate(db, cand(category="person_fall", evidence={}), "t", now + timedelta(seconds=62))
    assert db.query(Incident).count() == 3
    # beyond window => new incident for same camera+category
    far = svc.ingest_candidate(db, cand(), "t", now + timedelta(seconds=60 + 301 + 5))
    assert not far.deduplicated and db.query(Incident).count() == 4


def test_dedup_ignores_resolved_incidents(db):
    now = utcnow()
    a = svc.ingest_candidate(db, cand(), "t", now).incident
    svc.resolve(db, a.id, "t", now=now + timedelta(seconds=5))
    r = svc.ingest_candidate(db, cand(), "t", now + timedelta(seconds=10))
    assert not r.deduplicated and r.incident.id != a.id


def test_evidence_update_recalculates_persists_and_records_old_new(db):
    inc = svc.ingest_candidate(db, cand("person_fall", "CAM-PROM-02", {"person_motionless_seconds": 12}), "t").incident
    old = inc.priority_score
    r = svc.update_evidence(db, inc.id, {"person_motionless_seconds": 90, "hazardous_location": True}, "admin", "more evidence")
    assert r.priority_changed and r.incident.priority_score > old
    assert r.incident.emergency_rule_triggered and "R-FALL-PERSISTENT" in r.incident.priority_explanation
    ev = [e for e in r.incident.events if e.event_type == "priority_changed"][0]
    assert ev.data["old"]["priority_score"] == old and ev.data["new"]["priority_score"] == r.incident.priority_score
    audit = db.execute(select(AuditLog).where(AuditLog.action == "priority_recalculated")).scalars().all()
    assert audit and audit[0].old_value["priority_score"] == old
    # persisted in a fresh session
    fresh = database.SessionLocal()
    assert fresh.get(Incident, inc.id).priority_score == r.incident.priority_score
    fresh.close()


def test_queue_reorders_when_evidence_changes(db):
    now = utcnow()
    coll = svc.ingest_candidate(db, cand("road_collision", "CAM-GATE-01", {"vehicles_involved": 2}), "t", now).incident
    fall = svc.ingest_candidate(db, cand("person_fall", "CAM-PROM-02", {"person_motionless_seconds": 12}), "t", now).incident
    assert [i.id for i in svc.active_incidents(db)] == [coll.id, fall.id]
    r = svc.update_evidence(db, fall.id, {"person_motionless_seconds": 90, "hazardous_location": True,
                                          "no_bystander_assistance": True}, "t")
    assert r.ranking_changed
    assert [i.id for i in svc.active_incidents(db)] == [fall.id, coll.id]


def test_unknown_marking_and_false_to_zero_evidence(db):
    inc = svc.ingest_candidate(db, cand("road_collision", evidence={"persons_involved": 1}), "t").incident
    before = inc.priority_score
    r = svc.update_evidence(db, inc.id, {"persons_involved": None}, "t")  # unknown again => not zero risk
    assert r.incident.priority_score > before
    assert "persons_involved" not in r.incident.evidence
    with pytest.raises(ValidationFailed):
        svc.update_evidence(db, inc.id, {}, "t")


def test_ack_assign_resolve_timestamps_persist(db):
    t0 = utcnow()
    inc = svc.ingest_candidate(db, cand("parking_obstruction", "CAM-MALL-01"), "t", t0).incident
    svc.acknowledge(db, inc.id, "admin", now=t0 + timedelta(seconds=30))
    svc.assign(db, inc.id, "parking-mgmt", "admin", "go", now=t0 + timedelta(seconds=60))
    svc.record_action(db, inc.id, "owner_contacted", "Called owner", "admin", now=t0 + timedelta(seconds=90))
    svc.resolve(db, inc.id, "admin", "resolved", "moved", now=t0 + timedelta(seconds=120))
    fresh = database.SessionLocal()
    row = fresh.get(Incident, inc.id)
    assert row.acknowledged_at == t0 + timedelta(seconds=30)
    assert row.resolved_at == t0 + timedelta(seconds=120)
    assert row.status == "resolved" and row.assigned_to == "parking-mgmt" and row.resolution_type == "resolved"
    assert len(row.assignments) == 1 and row.assignments[0].unassigned_at is not None
    types = [e.event_type for e in row.events]
    assert types == ["detected", "acknowledged", "assigned", "action_recorded", "resolved"]
    fresh.close()


def test_resolved_incident_leaves_active_queue_and_reopen_returns(db):
    inc = svc.ingest_candidate(db, cand(), "t").incident
    assert [i.id for i in svc.active_incidents(db)] == [inc.id]
    svc.resolve(db, inc.id, "t")
    assert svc.active_incidents(db) == []
    with pytest.raises(Conflict):
        svc.resolve(db, inc.id, "t")  # already resolved
    r = svc.reopen(db, inc.id, "Problem recurred", "t")
    assert r.incident.status == "acknowledged" and r.incident.resolved_at is None
    assert [i.id for i in svc.active_incidents(db)] == [inc.id]
    with pytest.raises(Conflict):
        svc.reopen(db, inc.id, "again", "t")  # not terminal


def test_acknowledge_twice_conflicts_and_invalid_responder(db):
    inc = svc.ingest_candidate(db, cand(), "t").incident
    svc.acknowledge(db, inc.id, "t")
    with pytest.raises(Conflict):
        svc.acknowledge(db, inc.id, "t")
    with pytest.raises(ValidationFailed):
        svc.assign(db, inc.id, "nobody", "t")


def test_override_requires_reason_and_is_audited(db):
    inc = svc.ingest_candidate(db, cand("parking_obstruction", "CAM-MALL-01"), "t").incident
    assert inc.priority_level == "low"
    with pytest.raises(ValidationFailed):
        svc.override_priority(db, inc.id, "high", "", "admin")
    with pytest.raises(ValidationFailed):
        svc.override_priority(db, inc.id, "high", "  ok ", "admin")
    assert db.query(AuditLog).filter(AuditLog.action == "priority_override").count() == 0
    r = svc.override_priority(db, inc.id, "high", "Vehicle is actually in the fire lane", "Admin Aisyah")
    assert r.incident.priority_level == "high" and r.incident.priority_overridden
    assert r.incident.computed_priority_level == "low"
    log = db.query(AuditLog).filter(AuditLog.action == "priority_override").one()
    assert log.old_value["level"] == "low" and log.new_value["level"] == "high"
    assert log.reason == "Vehicle is actually in the fire lane" and log.actor == "Admin Aisyah" and log.created_at
    # engine recalculation does not silently drop the override
    svc.update_evidence(db, inc.id, {"duration_minutes": 45}, "t")
    assert db.get(Incident, inc.id).priority_level == "high"
    # de-escalate and clear
    r = svc.override_priority(db, inc.id, "medium", "Owner is on the way", "Admin Aisyah")
    assert r.incident.priority_level == "medium"
    r = svc.override_priority(db, inc.id, None, "Back to engine assessment", "Admin Aisyah")
    assert not r.incident.priority_overridden and r.incident.priority_level == r.incident.computed_priority_level
    assert db.query(AuditLog).filter(AuditLog.action == "priority_override").count() == 3


def test_false_positive_review_keeps_audit_trail(db):
    inc = svc.ingest_candidate(db, cand("person_fall", "CAM-PARK-01", {"person_motionless_seconds": 4}, conf=0.38), "t").incident
    assert inc.needs_verification and inc.uncertainty != "low"
    assert "verif" in inc.recommended_action.lower()
    r = svc.verify(db, inc.id, "false_positive", "admin", "It was a bag")
    assert r.incident.status == "false_positive" and r.incident.verification_status == "false_positive"
    assert svc.active_incidents(db) == []
    assert db.query(AuditLog).filter(AuditLog.action == "mark_false_positive", AuditLog.entity_id == inc.id).count() == 1
    assert db.query(IncidentEvent).filter(IncidentEvent.event_type == "false_positive").count() == 1


def test_status_transitions_validated(db):
    inc = svc.ingest_candidate(db, cand(), "t").incident
    with pytest.raises(Conflict):
        svc.change_status(db, inc.id, "closed", "t")  # new -> closed not allowed
    r = svc.change_status(db, inc.id, "in_progress", "t")
    assert r.incident.status == "in_progress" and r.incident.acknowledged_at is not None
    svc.change_status(db, inc.id, "resolved", "t", "done")
    svc.change_status(db, inc.id, "closed", "t")
    assert db.get(Incident, inc.id).closed_at is not None


def test_low_confidence_fire_not_suppressed(db):
    inc = svc.ingest_candidate(db, cand("fire_smoke", "CAM-RESA-02", {}, conf=0.2), "t").incident
    assert inc.priority_level in ("high", "critical") and inc.emergency_rule_triggered
    assert inc.needs_verification
    assert [i.id for i in svc.active_incidents(db)] == [inc.id]


def test_ranking_hysteresis_prevents_minor_reorder(db):
    # Learning "how long the person was down" removes an 'unknown' bump of only 1.25 composite points (< 2.0).
    inc = svc.ingest_candidate(db, cand("person_fall", "CAM-PROM-02", {}), "t").incident
    base_rank = inc.rank_score
    r = svc.update_evidence(db, inc.id, {"person_motionless_seconds": 5}, "t")
    assert r.incident.priority_score == pytest.approx(base_rank - 1.25, abs=0.01)  # score reflects new evidence...
    assert r.incident.rank_score == base_rank                                     # ...queue score unchanged
    # A big change moves the rank score.
    r = svc.update_evidence(db, inc.id, {"person_motionless_seconds": 90, "hazardous_location": True}, "t")
    assert r.incident.rank_score == r.incident.priority_score


def test_invalid_input_rejected(db):
    with pytest.raises(ValidationFailed):
        svc.ingest_candidate(db, cand(camera="CAM-NOPE"), "t")
    with pytest.raises(ValidationFailed):
        svc.ingest_candidate(db, svc.NormalizedCandidate(category="meteor_strike"), "t")
    with pytest.raises(ValidationFailed):
        svc.ingest_candidate(db, cand(conf=1.5), "t")
