"""Demo scenario tests: determinism, reset safety, simulation mode without any vision model."""
import pytest

from app import database
from app.config import reset_settings_cache
from app.errors import Conflict
from app.models import AuditLog, Incident
from app.services import demo, incident_service as svc


def signature(db):
    """Everything that must be reproducible between runs (ids, order, scores, levels, explanations)."""
    return [(i.id, i.title, i.priority_level, i.priority_score, i.emergency_rule_triggered, i.priority_explanation,
             i.recommended_action) for i in svc.active_incidents(db)]


def test_scenario_a_ranks_by_engine(db):
    out = demo.run_scenario(db, "simultaneous")
    q = out["queue"]
    assert [x["priority_level"] for x in q] == ["high", "medium", "low"]
    titles = [x["title"] for x in q]
    assert "collision" in titles[0].lower() and "person down" in titles[1].lower() and "parking" in titles[2].lower()
    assert all(i.is_simulated and i.source_type == "simulation" for i in svc.active_incidents(db))
    assert all("simulat" in i.description.lower() for i in svc.active_incidents(db))


def test_scenario_b_escalation_moves_fall_above_collision(db):
    demo.run_scenario(db, "simultaneous")
    before = [x["title"] for x in demo.run_scenario(db, "simultaneous")["queue"]]  # dedup: no new incidents
    assert db.query(Incident).count() == 3
    out = demo.run_scenario(db, "escalate")
    assert out["results"][0]["priority_level"] in ("high", "critical")
    q = out["queue"]
    assert "person down" in q[0]["title"].lower() and q[0]["emergency"] is True
    assert "collision" in q[1]["title"].lower()
    assert [x["title"] for x in q] != before
    with pytest.raises(Conflict):
        demo.run_scenario(db, "escalate")  # already applied
    fall = svc.get_incident(db, q[0]["id"])
    assert "R-FALL-PERSISTENT" in fall.priority_explanation
    assert any(e.event_type == "priority_changed" for e in fall.events)


def test_scenario_b_requires_scenario_a(db):
    with pytest.raises(Conflict):
        demo.run_scenario(db, "escalate")


def test_scenario_c_human_intervention_persists(db):
    demo.run_scenario(db, "simultaneous")
    out = demo.run_scenario(db, "human_intervention")
    top = svc.get_incident(db, out["results"][0]["id"])
    assert top.status == "resolved" and top.acknowledged_at and top.resolved_at and top.assigned_to
    assert [e.event_type for e in top.events][-4:] == ["acknowledged", "assigned", "action_recorded", "resolved"]
    assert len(svc.active_incidents(db)) == 2


def test_scenario_d_false_positive_flow(db):
    out = demo.run_scenario(db, "false_positive")
    inc = svc.get_incident(db, out["results"][0]["id"])
    assert inc.needs_verification and inc.detection_confidence == 0.38
    svc.verify(db, inc.id, "false_positive", "Demo Administrator", "Looks like a bag")
    assert db.get(Incident, inc.id).status == "false_positive"
    assert db.query(AuditLog).filter(AuditLog.entity_id == inc.id, AuditLog.action == "mark_false_positive").count() == 1


def test_scenarios_are_deterministic_across_resets(db):
    runs = []
    for _ in range(2):
        demo.reset_demo(db)
        demo.run_scenario(db, "simultaneous")
        a = signature(db)
        demo.run_scenario(db, "escalate")
        runs.append((a, signature(db)))
    assert runs[0] == runs[1]


def test_reset_deletes_only_simulated_data(db):
    # a "real" (video-derived) incident must survive a reset
    real = svc.ingest_candidate(db, svc.NormalizedCandidate(
        category="person_fall", camera_id="CAM-SCH-01", source_type="video_upload", source_reference="video:x@1s",
        evidence={"person_motionless_seconds": 8}), "tester").incident
    demo.run_scenario(db, "simultaneous")
    assert db.query(Incident).count() == 4
    out = demo.reset_demo(db)
    assert out["removed_simulated_incidents"] == 3
    assert db.get(Incident, real.id) is not None and not db.get(Incident, real.id).is_simulated
    sim = db.query(Incident).filter(Incident.is_simulated.is_(True)).count()
    assert sim == out["seeded_history_incidents"] == len(demo.HISTORY)
    assert svc.active_incidents(db)[0].id == real.id  # only the real one is active
    assert db.query(AuditLog).filter(AuditLog.action == "demo_reset").count() >= 1


def test_history_seed_marks_everything_simulated(db):
    assert demo.seed_demo_history(db) == len(demo.HISTORY)
    assert demo.seed_demo_history(db) == 0  # idempotent without force
    rows = db.query(Incident).all()
    assert all(r.is_simulated and r.status in ("resolved", "false_positive") for r in rows)
    assert all(r.acknowledged_at is not None for r in rows)


def test_simulation_mode_works_without_any_vision_model(db, monkeypatch):
    monkeypatch.setenv("TG_DETECTOR", "none")
    reset_settings_cache()
    from app.vision.registry import detector_status
    assert detector_status()["available"] is False
    out = demo.run_scenario(db, "simultaneous")
    assert len(out["queue"]) == 3


def test_demo_endpoints_via_api(client):
    r = client.post("/api/demo/trigger", json={"scenario": "simultaneous"})
    assert r.status_code == 200 and len(r.json()["queue"]) == 3 and r.json()["simulated"] is True
    r = client.post("/api/demo/trigger", json={"scenario": "bogus"})
    assert r.status_code == 422
    assert client.post("/api/demo/trigger", json={"scenario": "escalate"}).status_code == 200
    assert client.post("/api/demo/trigger", json={"scenario": "escalate"}).status_code == 409
    r = client.post("/api/demo/reset")
    assert r.status_code == 200 and r.json()["removed_simulated_incidents"] == 3
    assert client.get("/api/incidents?status=active").json()["total"] == 0


def test_demo_can_be_disabled(db, monkeypatch):
    monkeypatch.setenv("TG_ALLOW_DEMO_ENDPOINTS", "false")
    reset_settings_cache()
    from app.errors import ServiceError
    with pytest.raises(ServiceError):
        demo.run_scenario(db, "simultaneous")
