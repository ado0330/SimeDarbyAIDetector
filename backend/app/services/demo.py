"""Deterministic demo scenario generator, demo-history seed and safe reset.

Everything here goes through ``incident_service`` and therefore through the REAL prioritization engine; no ordering
is hardcoded. All data created here is flagged ``is_simulated=True`` and ``source_type='simulation'``.
``reset_demo`` deletes ONLY simulated rows.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import utcnow
from app.enums import Category, SourceType
from app.errors import Conflict, ServiceError
from app.models import AuditLog, Incident
from app.services import incident_service as svc

DEMO_ACTOR = "Demo Script (simulated)"
SIM_NOTE = "SIMULATED scenario data — not produced by a vision model."

# ---- Scenario A: three concurrent incidents ----------------------------------------------------------
SCENARIO_A = [
    dict(category=Category.ROAD_COLLISION.value, camera_id="CAM-GATE-01", offset_s=90, confidence=0.87,
         description="[Simulated] Two vehicles stopped at an angle on the roundabout approach; traffic is slowing. "
                     "Number of people involved is not yet known.",
         evidence={"vehicles_involved": 2}),
    dict(category=Category.PERSON_FALL.value, camera_id="CAM-PROM-02", offset_s=60, confidence=0.81,
         description="[Simulated] A person is on the ground beside the lake-edge path. No one else is nearby yet.",
         evidence={"person_motionless_seconds": 12}),
    dict(category=Category.PARKING_OBSTRUCTION.value, camera_id="CAM-MALL-01", offset_s=30, confidence=0.92,
         description="[Simulated] A delivery van is parked across two bays at the Deck B entry; "
                     "no emergency route is affected.",
         evidence={"blocks_emergency_access": False, "duration_minutes": 20}),
]

# ---- Scenario B: evidence for the person-fall incident that increases risk -----------------------------
ESCALATION_EVIDENCE = {"person_motionless_seconds": 90, "hazardous_location": True, "no_bystander_assistance": True}
ESCALATION_NOTE = ("[Simulated] Follow-up footage: the person has not moved for 90 s next to the lake edge "
                   "and nobody has stopped to help.")

# ---- Scenario D: uncertain detection -----------------------------------------------------------------
FALSE_POSITIVE_CANDIDATE = dict(
    category=Category.PERSON_FALL.value, camera_id="CAM-PARK-01", offset_s=20, confidence=0.38,
    description="[Simulated] Low-confidence detection: a dark shape near the playground bench might be a person "
                "lying down or might be a bag.",
    evidence={"person_motionless_seconds": 4})

LOW_CONF_FIRE = dict(
    category=Category.FIRE_SMOKE.value, camera_id="CAM-RESA-02", offset_s=15, confidence=0.41,
    description="[Simulated] Low-confidence smoke-like pattern near the Block A fire access lane (could be steam "
                "or dust).",
    evidence={})

RESPONDER_FOR = {
    Category.ROAD_COLLISION.value: "traffic-marshal",
    Category.PERSON_FALL.value: "first-aid",
    Category.PARKING_OBSTRUCTION.value: "parking-mgmt",
    Category.FIRE_SMOKE.value: "fire-warden",
}


def _candidate(spec: Dict[str, Any], now: datetime) -> svc.NormalizedCandidate:
    return svc.NormalizedCandidate(
        category=spec["category"], camera_id=spec["camera_id"], description=spec["description"],
        confidence=spec["confidence"], evidence=dict(spec["evidence"]),
        event_timestamp=now - timedelta(seconds=spec["offset_s"]),
        source_type=SourceType.SIMULATION.value, source_reference="simulation:%s" % spec["camera_id"],
        metadata={"simulated": True, "note": SIM_NOTE})


def _queue_snapshot(db: Session) -> List[Dict[str, Any]]:
    return [{"position": n + 1, "id": i.id, "title": i.title, "priority_level": i.priority_level,
             "priority_score": i.priority_score, "emergency": i.emergency_rule_triggered}
            for n, i in enumerate(svc.active_incidents(db))]


def _require_enabled() -> None:
    if not get_settings().allow_demo_endpoints:
        raise ServiceError("Demo endpoints are disabled (TG_ALLOW_DEMO_ENDPOINTS=false)", code="demo_disabled")


def _results(items: List[svc.MutationResult]) -> List[Dict[str, Any]]:
    return [{"id": r.incident.id, "created": not r.deduplicated, "deduplicated": r.deduplicated,
             "priority_level": r.incident.priority_level, "priority_score": r.incident.priority_score}
            for r in items]


def run_scenario(db: Session, scenario: str, now: Optional[datetime] = None) -> Dict[str, Any]:
    _require_enabled()
    now = now or utcnow()
    results: List[svc.MutationResult] = []
    message = ""

    if scenario == "simultaneous":
        for spec in SCENARIO_A:
            results.append(svc.ingest_candidate(db, _candidate(spec, now), DEMO_ACTOR, now))
        dedup = sum(1 for r in results if r.deduplicated)
        message = ("Three simulated incidents ingested and ranked by the prioritization engine."
                   if not dedup else "Repeated detections were merged into %d existing incident(s) — no duplicates created." % dedup)

    elif scenario == "escalate":
        fall = _find_active_simulated(db, Category.PERSON_FALL.value, "CAM-PROM-02")
        if fall is None:
            raise Conflict("No active simulated person-fall incident. Run 'Simultaneous incidents' first.",
                           code="scenario_precondition")
        if (fall.evidence.get("person_motionless_seconds") or 0) >= ESCALATION_EVIDENCE["person_motionless_seconds"]:
            raise Conflict("The person-fall incident %s has already been escalated with this evidence." % fall.id,
                           code="already_applied")
        r = svc.update_evidence(db, fall.id, dict(ESCALATION_EVIDENCE), DEMO_ACTOR, ESCALATION_NOTE, now)
        results.append(r)
        message = ("Evidence added to %s; priority recalculated%s." %
                   (fall.id, " and the queue was re-ranked" if r.ranking_changed else ""))

    elif scenario == "human_intervention":
        top = next((i for i in svc.active_incidents(db) if i.is_simulated), None)
        if top is None:
            raise Conflict("No active simulated incident to work on. Run 'Simultaneous incidents' first.",
                           code="scenario_precondition")
        svc.acknowledge(db, top.id, DEMO_ACTOR, "Scripted demo: top-ranked incident acknowledged", now)
        svc.assign(db, top.id, RESPONDER_FOR[top.category], DEMO_ACTOR, "Scripted demo assignment (no real dispatch)",
                   now + timedelta(seconds=1))
        svc.record_action(db, top.id, "camera_reviewed",
                          "Scripted demo: administrator reviewed camera evidence. No real emergency service was contacted.",
                          DEMO_ACTOR, now + timedelta(seconds=2))
        results.append(svc.resolve(db, top.id, DEMO_ACTOR, "resolved",
                                   "Scripted demo: resolved after simulated response.", now + timedelta(seconds=3)))
        message = "Scripted response completed on %s (acknowledge → assign → record action → resolve)." % top.id

    elif scenario == "false_positive":
        results.append(svc.ingest_candidate(db, _candidate(FALSE_POSITIVE_CANDIDATE, now), DEMO_ACTOR, now))
        message = ("Uncertain, low-confidence detection created. Open it, review the evidence, and mark it as a "
                   "false positive to see the audit trail.")

    elif scenario == "low_confidence_fire":
        results.append(svc.ingest_candidate(db, _candidate(LOW_CONF_FIRE, now), DEMO_ACTOR, now))
        message = ("A low-confidence smoke detection was created. Note that low confidence does NOT lower its priority; "
                   "it is flagged for verification instead.")
    scenario_titles = {
        "simultaneous": "Scenario 1: Multi-Sector Concurrency (The Morning Rush)",
        "escalate": "Scenario 2: Dynamic Telemetry Escalation (Life-Safety Floor)",
        "human_intervention": "Scenario 5: Operator Triage & Lifecycle Response",
        "false_positive": "Scenario 5b: False-Positive Review & Audit Trail",
        "low_confidence_fire": "Scenario 6: Safety Invariance & Uncertainty Handling",
    }

    return {"scenario": scenario, "scenario_title": scenario_titles.get(scenario, scenario), "version": "2.0",
            "message": message, "results": _results(results), "queue": _queue_snapshot(db), "simulated": True}


def _find_active_simulated(db: Session, category: str, camera_id: str) -> Optional[Incident]:
    return next((i for i in svc.active_incidents(db)
                 if i.is_simulated and i.category == category and i.camera_id == camera_id), None)


# ---------------------------------------------------------------------------------------------
# Demo history (so analytics/history have realistic *clearly simulated* content)
# ---------------------------------------------------------------------------------------------
# (hours_ago, category, camera, evidence, confidence, ack_seconds, resolve_minutes, resolution_type)
HISTORY = [
    (150, "parking_obstruction", "CAM-MALL-02", {"blocks_traffic_lane": True}, 0.90, 240, 38, "resolved"),
    (138, "person_fall", "CAM-PROM-01", {"person_motionless_seconds": 25}, 0.84, 95, 14, "resolved"),
    (126, "road_collision", "CAM-GATE-01", {"vehicles_involved": 2, "persons_involved": 2}, 0.88, 70, 52, "resolved"),
    (110, "parking_obstruction", "CAM-RESA-02", {"blocks_emergency_access": True}, 0.93, 130, 22, "resolved"),
    (96, "person_fall", "CAM-PARK-01", {"person_attempting_to_stand": True, "person_motionless_seconds": 15}, 0.55, 180, 6, "resolved"),
    (84, "fire_smoke", "CAM-MALL-02", {"smoke_or_flame_visible": False}, 0.46, 45, 9, "false_positive"),
    (72, "road_collision", "CAM-GATE-02", {"vehicles_involved": 1, "persons_involved": 1, "vulnerable_road_user_involved": True}, 0.79, 55, 31, "resolved"),
    (60, "parking_obstruction", "CAM-SCH-01", {"duration_minutes": 35}, 0.91, 310, 18, "resolved"),
    (48, "person_fall", "CAM-PROM-02", {"person_motionless_seconds": 70, "hazardous_location": True}, 0.80, 40, 27, "resolved"),
    (40, "parking_obstruction", "CAM-MALL-01", {}, 0.90, 200, 12, "resolved"),
    (30, "road_collision", "CAM-GATE-01", {"vehicles_involved": 2}, 0.85, 85, 44, "resolved"),
    (22, "person_fall", "CAM-SCH-01", {"person_motionless_seconds": 35, "bystander_assisting": True}, 0.72, 150, 11, "resolved"),
    (12, "fire_smoke", "CAM-RESA-01", {"smoke_or_flame_visible": True, "people_in_vicinity": False}, 0.66, 30, 41, "resolved"),
    (6, "parking_obstruction", "CAM-RESA-02", {"blocks_emergency_access": True, "duration_minutes": 40}, 0.90, 100, 16, "resolved"),
    (3, "person_fall", "CAM-PARK-01", {"person_motionless_seconds": 3}, 0.35, 60, 5, "false_positive"),
]


def seed_demo_history(db: Session, now: Optional[datetime] = None, force: bool = False) -> int:
    """Insert clearly-simulated historical incidents. Without ``force`` it is skipped if any incident exists."""
    if not force and db.query(Incident.id).first() is not None:
        return 0
    now = now or utcnow()
    for hours_ago, cat, cam, ev, conf, ack_s, res_min, rtype in HISTORY:
        t0 = now - timedelta(hours=hours_ago)
        cand = svc.NormalizedCandidate(
            category=cat, camera_id=cam, confidence=conf, evidence=dict(ev), event_timestamp=t0,
            description="[Simulated history] Demo record for analytics.", source_type=SourceType.SIMULATION.value,
            source_reference="simulation:history", metadata={"simulated": True, "seed": "history"})
        inc = svc.ingest_candidate(db, cand, "Demo Seed", t0).incident
        svc.acknowledge(db, inc.id, "Demo Administrator", None, t0 + timedelta(seconds=ack_s))
        svc.assign(db, inc.id, RESPONDER_FOR[cat], "Demo Administrator", None, t0 + timedelta(seconds=ack_s + 45))
        svc.resolve(db, inc.id, "Demo Administrator", rtype, "[Simulated history]", t0 + timedelta(minutes=res_min))
    return len(HISTORY)


def reset_demo(db: Session, now: Optional[datetime] = None) -> Dict[str, Any]:
    """Remove ONLY simulated incidents (+ their events/assignments/evidence/audit) and re-seed baseline history.

    Incidents from real video analysis (``source_type='video_upload'``), video jobs and candidates are untouched.
    """
    _require_enabled()
    now = now or utcnow()
    sim = db.query(Incident).filter(Incident.is_simulated.is_(True)).all()
    removed = len(sim)
    for inc in sim:
        db.delete(inc)  # cascades to events, assignments, evidence items
    db.query(AuditLog).filter(AuditLog.is_simulated.is_(True)).delete(synchronize_session=False)
    db.add(AuditLog(entity_type="system", entity_id="demo", action="demo_reset", actor=DEMO_ACTOR,
                    old_value={"simulated_incidents_removed": removed}, new_value=None, is_simulated=False,
                    created_at=now, reason="Demo reset (simulated data only)"))
    db.commit()
    seeded = seed_demo_history(db, now, force=True)
    svc.broker.publish({"type": "queue_changed", "reason": "demo_reset", "ranking_changed": True})
    return {"removed_simulated_incidents": removed, "seeded_history_incidents": seeded,
            "message": "Demo reset: removed %d simulated incident(s); baseline demo history restored." % removed}
