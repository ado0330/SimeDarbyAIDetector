"""Unit tests for the pure prioritization engine, queue ordering and recommendations."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.services.prioritization import clamp, compute_priority, level_for_score
from app.services.queue import apply_hysteresis, sort_queue
from app.services.recommendations import recommend
from app.services.scoring_config import build_config


@pytest.fixture
def cfg():
    return build_config()


def test_scores_constrained_0_100(cfg):
    ev = {"persons_involved": 9, "vehicles_involved": 4, "person_motionless_after_impact": True,
          "blocks_emergency_access": True, "smoke_or_flame_visible": True, "vulnerable_road_user_involved": True}
    r = compute_priority("road_collision", ev, 0.99, config=cfg)
    for v in (r.severity, r.immediacy, r.people_at_risk, r.secondary_hazard, r.composite_score):
        assert 0 <= v <= 100
    r = compute_priority("person_fall", {"person_attempting_to_stand": True, "bystander_assisting": True,
                                         "person_motionless_seconds": 0}, 0.9, config=cfg)
    for v in (r.severity, r.immediacy, r.people_at_risk, r.secondary_hazard, r.composite_score):
        assert 0 <= v <= 100
    assert clamp(-5) == 0 and clamp(250) == 100


def test_composite_formula(cfg):
    r = compute_priority("parking_obstruction", {"blocks_emergency_access": None}, None, config=cfg)
    expected = 0.40 * r.severity + 0.25 * r.immediacy + 0.20 * r.people_at_risk + 0.15 * r.secondary_hazard
    assert r.composite_score == pytest.approx(expected, abs=0.01)
    # known baseline: parking 15/15/5/20 -> 6 + 3.75 + 1 + 3 = 13.75
    assert r.composite_score == pytest.approx(13.75)


@pytest.mark.parametrize("score,level", [(100, "critical"), (80, "critical"), (79.99, "high"), (60, "high"),
                                         (59.99, "medium"), (35, "medium"), (34.99, "low"), (0, "low")])
def test_thresholds(cfg, score, level):
    assert level_for_score(score, cfg) == level


def test_weights_configurable():
    from app.config import Settings
    cfg = build_config(Settings(weight_severity=1.0, weight_immediacy=0, weight_people_at_risk=0,
                                weight_secondary_hazard=0))
    r = compute_priority("road_collision", {}, None, config=cfg)
    assert r.composite_score == pytest.approx(r.severity)


def test_emergency_rule_floor_raises_but_never_lowers(cfg):
    # Parking block of emergency access: composite is medium, rule floor lifts it to high.
    r = compute_priority("parking_obstruction", {"blocks_emergency_access": True}, 0.9, config=cfg)
    assert r.score_level == "medium"
    assert r.level == "high"
    assert [t["id"] for t in r.triggered_rules] == ["R-ACCESS-BLOCKED"]
    assert not r.emergency
    # A rule never lowers: critical composite stays critical.
    r = compute_priority("fire_smoke", {"smoke_or_flame_visible": True, "spreading": True}, 0.9, config=cfg)
    assert r.level == "critical" and r.emergency


def test_fire_never_suppressed_by_low_confidence(cfg):
    low = compute_priority("fire_smoke", {}, 0.10, config=cfg)
    high = compute_priority("fire_smoke", {}, 0.99, config=cfg)
    assert low.composite_score == high.composite_score  # confidence never changes the score
    assert low.level in ("high", "critical") and low.emergency
    assert low.needs_verification and not high.needs_verification
    assert any("verif" in x.lower() for x in low.uncertainty_reasons + [low.explanation])


def test_low_confidence_flags_verification_not_priority(cfg):
    ev = {"person_motionless_seconds": 90}
    a = compute_priority("person_fall", ev, 0.2, config=cfg)
    b = compute_priority("person_fall", ev, 0.95, config=cfg)
    assert (a.composite_score, a.level, a.emergency) == (b.composite_score, b.level, b.emergency)
    assert a.needs_verification and not b.needs_verification
    # Verified by human -> no more verification need, uncertainty low.
    v = compute_priority("person_fall", ev, 0.2, "verified", config=cfg)
    assert not v.needs_verification and v.uncertainty == "low"


def test_unknown_is_not_zero_risk(cfg):
    unknown = compute_priority("road_collision", {}, None, config=cfg)
    known_none = compute_priority("road_collision", {"persons_involved": 1}, None, config=cfg)
    assert unknown.people_at_risk > known_none.people_at_risk
    assert "persons_involved" in unknown.unknown_fields
    assert unknown.uncertainty != "low"


def test_evidence_changes_recalculate(cfg):
    base = compute_priority("person_fall", {"person_motionless_seconds": 12}, None, config=cfg)
    worse = compute_priority("person_fall", {"person_motionless_seconds": 90, "hazardous_location": True,
                                             "no_bystander_assistance": True}, None, config=cfg)
    better = compute_priority("person_fall", {"person_motionless_seconds": 12, "person_attempting_to_stand": True},
                              None, config=cfg)
    assert worse.composite_score > base.composite_score > better.composite_score
    assert worse.emergency and worse.level in ("high", "critical")
    assert "R-FALL-PERSISTENT" in worse.explanation


def test_fall_not_automatically_emergency(cfg):
    r = compute_priority("person_fall", {"person_motionless_seconds": 5}, 0.9, config=cfg)
    assert not r.emergency and r.level in ("low", "medium")


def test_collision_not_automatically_more_serious_than_fall(cfg):
    fall = compute_priority("person_fall", {"person_motionless_seconds": 90, "hazardous_location": True,
                                            "no_bystander_assistance": True}, None, config=cfg)
    collision = compute_priority("road_collision", {"persons_involved": 1, "vehicles_involved": 1,
                                                    "person_motionless_after_impact": False,
                                                    "blocks_emergency_access": False}, None, config=cfg)
    assert fall.composite_score > collision.composite_score or fall.emergency


def test_factor_contributions_sum_to_score(cfg):
    r = compute_priority("road_collision", {"vehicles_involved": 2, "persons_involved": 2}, None, config=cfg)
    total = r.baseline_composite + sum(f.composite_delta for f in r.factors)
    assert total == pytest.approx(r.composite_score, abs=0.1)


def test_deterministic(cfg):
    ev = {"vehicles_involved": 2, "persons_involved": 2}
    a = compute_priority("road_collision", ev, 0.8, config=cfg)
    b = compute_priority("road_collision", dict(ev), 0.8, config=cfg)
    assert a.to_dict() == b.to_dict() and a.explanation == b.explanation


def test_unsupported_category_rejected(cfg):
    with pytest.raises(ValueError):
        compute_priority("meteor", {}, None, config=cfg)


# ---- queue ------------------------------------------------------------------------------------

def _inc(id_, level, score, emergency=False, minutes_ago=5):
    return SimpleNamespace(id=id_, priority_level=level, rank_score=score, emergency_rule_triggered=emergency,
                           detected_at=datetime.now(timezone.utc) - timedelta(minutes=minutes_ago))


def test_queue_order_tiers_levels_scores_age_id():
    items = [
        _inc("INC-0005", "medium", 50),
        _inc("INC-0004", "high", 65),
        _inc("INC-0003", "high", 70),
        _inc("INC-0002", "low", 10, emergency=True),   # emergency tier first
        _inc("INC-0001", "critical", 85),
        _inc("INC-0006", "high", 65, minutes_ago=30),  # older first on exact tie
        _inc("INC-0007", "medium", 50),                # same score & same-ish time -> id order
    ]
    items[-1].detected_at = items[0].detected_at
    order = [i.id for i in sort_queue(items)]
    assert order[:2] == ["INC-0001", "INC-0002"]   # critical (score) then emergency-low (same tier 0, level rank)
    assert order.index("INC-0003") < order.index("INC-0006") < order.index("INC-0004")
    assert order.index("INC-0005") < order.index("INC-0007")


def test_queue_changes_when_priority_changes():
    fall = _inc("INC-0002", "medium", 37)
    collision = _inc("INC-0001", "high", 67)
    assert [i.id for i in sort_queue([fall, collision])] == ["INC-0001", "INC-0002"]
    fall.priority_level, fall.rank_score, fall.emergency_rule_triggered = "high", 70, True
    assert [i.id for i in sort_queue([fall, collision])] == ["INC-0002", "INC-0001"]


def test_hysteresis():
    assert apply_hysteresis(60, "high", False, 61.5, "high", False, 2.0) == 60      # small wobble ignored
    assert apply_hysteresis(60, "high", False, 62.0, "high", False, 2.0) == 62.0    # big enough
    assert apply_hysteresis(60, "high", False, 59.5, "medium", False, 2.0) == 59.5  # level change always applies
    assert apply_hysteresis(60, "high", False, 60.5, "high", True, 2.0) == 60.5     # tier change always applies


# ---- recommendations ---------------------------------------------------------------------------

def test_recommendations_are_advisory_and_context_dependent():
    parking = recommend("parking_obstruction", "low", False, False, "unverified", {})
    assert "parking" in parking[0].text.lower()
    blocked = recommend("parking_obstruction", "high", False, False, "unverified", {"blocks_emergency_access": True})
    assert "urgent" in blocked[0].text.lower()
    fall = recommend("person_fall", "high", True, False, "unverified", {"person_motionless_seconds": 90})
    assert "verification" in fall[0].text.lower()
    fire = recommend("fire_smoke", "high", True, True, "unverified", {})
    assert fire[0].code == "verify_low_confidence"
    fp = recommend("person_fall", "low", False, False, "false_positive", {})
    assert fp[0].code == "close_false_positive"
    for rec in fall + fire + parking:
        assert rec.to_dict()["advisory"] == "true"
