"""Declarative scoring configuration: weights, thresholds, baselines, evidence modifiers, emergency rules.

ALL numbers here are PROTOTYPE ASSUMPTIONS. They have not been validated against real incident data and
MUST be reviewed by township safety/security professionals before any real-world use.

Precedence (documented in docs/ARCHITECTURE.md):
    1. Manual override by an administrator (audited)               -> wins over everything
    2. Emergency-rule floor (``floor`` level)                      -> can raise, never lower, the score-derived level
    3. Composite-score threshold level                             -> default
Detection confidence NEVER lowers priority; it only flags verification needs.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from app.config import Settings, get_settings
from app.enums import Category

DIMENSIONS = ("severity", "immediacy", "people_at_risk", "secondary_hazard")
DIMENSION_LABELS = {
    "severity": "Severity",
    "immediacy": "Immediacy",
    "people_at_risk": "People at risk",
    "secondary_hazard": "Secondary hazard",
}


@dataclass(frozen=True)
class Condition:
    """``field`` <op> ``value`` evaluated against the incident evidence dict.

    ops: is_true, is_false, gte, lt, between (lo <= x < hi), unknown (missing/None).
    Numeric/boolean ops never match unknown (missing) values.
    """

    field: str
    op: str
    value: Any = None


@dataclass(frozen=True)
class Modifier:
    category: str
    condition: Condition
    deltas: Dict[str, float]
    label: str


@dataclass(frozen=True)
class EmergencyRule:
    id: str
    description: str
    categories: Tuple[str, ...]
    conditions: Tuple[Condition, ...]
    floor: str  # minimum priority level
    emergency: bool  # puts the incident in queue tier 1 regardless of score


@dataclass(frozen=True)
class ScoringConfig:
    version: str
    weights: Dict[str, float]
    thresholds: Dict[str, float]  # critical / high / medium minimums
    low_confidence_threshold: float
    baselines: Dict[str, Dict[str, float]]
    modifiers: Tuple[Modifier, ...]
    rules: Tuple[EmergencyRule, ...]
    expected_fields: Dict[str, Tuple[str, ...]]
    rank_hysteresis: float
    dedup_window_seconds: int


C = Category

BASELINES: Dict[str, Dict[str, float]] = {
    C.ROAD_COLLISION.value: {"severity": 70, "immediacy": 70, "people_at_risk": 50, "secondary_hazard": 45},
    C.PERSON_FALL.value: {"severity": 45, "immediacy": 55, "people_at_risk": 20, "secondary_hazard": 10},
    C.PARKING_OBSTRUCTION.value: {"severity": 15, "immediacy": 15, "people_at_risk": 5, "secondary_hazard": 20},
    C.FIRE_SMOKE.value: {"severity": 85, "immediacy": 80, "people_at_risk": 55, "secondary_hazard": 80},
}

# Evidence fields the engine would *like* to know per category. Missing ones are reported as
# "unknown" (raising the uncertainty indicator) and are never silently treated as "no risk".
EXPECTED_FIELDS: Dict[str, Tuple[str, ...]] = {
    C.ROAD_COLLISION.value: ("persons_involved", "person_motionless_after_impact", "blocks_emergency_access"),
    C.PERSON_FALL.value: ("person_motionless_seconds", "hazardous_location"),
    C.PARKING_OBSTRUCTION.value: ("blocks_emergency_access",),
    C.FIRE_SMOKE.value: ("smoke_or_flame_visible", "people_in_vicinity"),
}


def _m(cat: Category, field_: str, op: str, value: Any, deltas: Dict[str, float], label: str) -> Modifier:
    return Modifier(cat.value, Condition(field_, op, value), deltas, label)


MODIFIERS: Tuple[Modifier, ...] = (
    # --- Road collision ---------------------------------------------------------------
    _m(C.ROAD_COLLISION, "persons_involved", "unknown", None, {"people_at_risk": 8},
       "Number of people involved is unknown (treated as moderate risk, not zero)"),
    _m(C.ROAD_COLLISION, "persons_involved", "between", (2, 3), {"people_at_risk": 12}, "Two people involved"),
    _m(C.ROAD_COLLISION, "persons_involved", "gte", 3, {"people_at_risk": 25, "severity": 5},
       "Three or more people involved"),
    _m(C.ROAD_COLLISION, "vehicles_involved", "gte", 2, {"severity": 8}, "Multiple vehicles involved"),
    _m(C.ROAD_COLLISION, "vulnerable_road_user_involved", "is_true", None, {"severity": 12},
       "Pedestrian or cyclist appears to be involved"),
    _m(C.ROAD_COLLISION, "person_motionless_after_impact", "is_true", None, {"severity": 15, "immediacy": 10},
       "A person remains motionless after the impact"),
    _m(C.ROAD_COLLISION, "blocks_emergency_access", "is_true", None, {"immediacy": 10, "secondary_hazard": 25},
       "Collision blocks emergency vehicle access"),
    _m(C.ROAD_COLLISION, "smoke_or_flame_visible", "is_true", None, {"severity": 10, "secondary_hazard": 30},
       "Smoke or flames visible near the vehicles"),
    # --- Person fall / person down ----------------------------------------------------
    _m(C.PERSON_FALL, "person_motionless_seconds", "unknown", None, {"immediacy": 5},
       "How long the person has been on the ground is unknown"),
    _m(C.PERSON_FALL, "person_motionless_seconds", "between", (10, 30), {"immediacy": 5, "severity": 5},
       "Person has stayed on the ground for 10-30 s"),
    _m(C.PERSON_FALL, "person_motionless_seconds", "between", (30, 60), {"immediacy": 15, "severity": 10},
       "Person has stayed on the ground for 30-60 s"),
    _m(C.PERSON_FALL, "person_motionless_seconds", "gte", 60, {"immediacy": 30, "severity": 25},
       "Person has remained on the ground for 60 s or longer"),
    _m(C.PERSON_FALL, "person_attempting_to_stand", "is_true", None, {"severity": -15, "immediacy": -15},
       "Person is getting back up"),
    _m(C.PERSON_FALL, "bystander_assisting", "is_true", None, {"immediacy": -10}, "A bystander is assisting"),
    _m(C.PERSON_FALL, "no_bystander_assistance", "is_true", None, {"immediacy": 10},
       "No bystander assistance observed"),
    _m(C.PERSON_FALL, "hazardous_location", "is_true", None, {"severity": 15, "secondary_hazard": 30},
       "Location is hazardous (e.g. roadway, stairs, water edge)"),
    _m(C.PERSON_FALL, "fall_from_height", "is_true", None, {"severity": 20}, "Fall from a height"),
    _m(C.PERSON_FALL, "persons_involved", "gte", 2, {"people_at_risk": 10}, "More than one person involved"),
    # --- Parking obstruction ----------------------------------------------------------
    _m(C.PARKING_OBSTRUCTION, "blocks_emergency_access", "is_true", None,
       {"severity": 35, "immediacy": 40, "people_at_risk": 20, "secondary_hazard": 40},
       "Vehicle blocks emergency access route"),
    _m(C.PARKING_OBSTRUCTION, "blocks_traffic_lane", "is_true", None, {"immediacy": 15, "secondary_hazard": 15},
       "Vehicle obstructs a traffic lane"),
    _m(C.PARKING_OBSTRUCTION, "duration_minutes", "gte", 30, {"immediacy": 10}, "Obstruction has lasted 30+ minutes"),
    # --- Suspected fire / smoke -------------------------------------------------------
    _m(C.FIRE_SMOKE, "smoke_or_flame_visible", "is_true", None, {"severity": 10, "immediacy": 10},
       "Smoke or flames are visible"),
    _m(C.FIRE_SMOKE, "spreading", "is_true", None,
       {"severity": 10, "immediacy": 10, "people_at_risk": 15, "secondary_hazard": 10}, "Fire appears to be spreading"),
    _m(C.FIRE_SMOKE, "people_in_vicinity", "is_true", None, {"people_at_risk": 20}, "People are in the vicinity"),
    _m(C.FIRE_SMOKE, "blocks_emergency_access", "is_true", None, {"secondary_hazard": 10},
       "Hazard affects emergency access"),
)

RULES: Tuple[EmergencyRule, ...] = (
    EmergencyRule(
        "R-FIRE-SMOKE",
        "Any credible fire/smoke indication is treated as potentially life-threatening, regardless of detection confidence.",
        (C.FIRE_SMOKE.value,), (), "high", True),
    EmergencyRule(
        "R-FIRE-SPREADING",
        "Fire/smoke that is spreading or near people is treated as critical.",
        (C.FIRE_SMOKE.value,), (Condition("spreading", "is_true"),), "critical", True),
    EmergencyRule(
        "R-FIRE-PEOPLE",
        "Visible smoke/flame with people nearby is treated as critical.",
        (C.FIRE_SMOKE.value,),
        (Condition("smoke_or_flame_visible", "is_true"), Condition("people_in_vicinity", "is_true")),
        "critical", True),
    EmergencyRule(
        "R-FALL-PERSISTENT",
        "A person who has stayed on the ground for 60 s or longer may need urgent help; verify immediately.",
        (C.PERSON_FALL.value,), (Condition("person_motionless_seconds", "gte", 60),), "high", True),
    EmergencyRule(
        "R-FALL-HEIGHT",
        "A fall from a height is potentially life-threatening.",
        (C.PERSON_FALL.value,), (Condition("fall_from_height", "is_true"),), "high", True),
    EmergencyRule(
        "R-COLLISION-MOTIONLESS",
        "A person motionless after a collision is potentially life-threatening.",
        (C.ROAD_COLLISION.value,), (Condition("person_motionless_after_impact", "is_true"),), "critical", True),
    EmergencyRule(
        "R-COLLISION-MULTI",
        "A collision involving three or more people is treated as critical.",
        (C.ROAD_COLLISION.value,), (Condition("persons_involved", "gte", 3),), "critical", True),
    EmergencyRule(
        "R-ACCESS-BLOCKED",
        "Blocking an emergency access route is treated as at least high priority.",
        tuple(c.value for c in Category), (Condition("blocks_emergency_access", "is_true"),), "high", False),
)

CONFIG_VERSION = "2026.10-proto-1"


def build_config(settings: Optional[Settings] = None) -> ScoringConfig:
    s = settings or get_settings()
    return ScoringConfig(
        version=CONFIG_VERSION,
        weights={
            "severity": s.weight_severity,
            "immediacy": s.weight_immediacy,
            "people_at_risk": s.weight_people_at_risk,
            "secondary_hazard": s.weight_secondary_hazard,
        },
        thresholds={"critical": s.threshold_critical, "high": s.threshold_high, "medium": s.threshold_medium},
        low_confidence_threshold=s.low_confidence_threshold,
        baselines=BASELINES,
        modifiers=MODIFIERS,
        rules=RULES,
        expected_fields=EXPECTED_FIELDS,
        rank_hysteresis=s.rank_hysteresis,
        dedup_window_seconds=s.dedup_window_seconds,
    )


def config_as_dict(cfg: ScoringConfig) -> Dict[str, Any]:
    """JSON-serialisable view used by the Settings screen."""
    return {
        "version": cfg.version,
        "disclaimer": "Prototype assumptions. Not validated against real incident data.",
        "weights": cfg.weights,
        "thresholds": cfg.thresholds,
        "low_confidence_threshold": cfg.low_confidence_threshold,
        "rank_hysteresis": cfg.rank_hysteresis,
        "dedup_window_seconds": cfg.dedup_window_seconds,
        "baselines": cfg.baselines,
        "rules": [
            {"id": r.id, "description": r.description, "categories": list(r.categories), "floor": r.floor,
             "emergency": r.emergency,
             "conditions": [{"field": c.field, "op": c.op, "value": c.value} for c in r.conditions]}
            for r in cfg.rules
        ],
    }
