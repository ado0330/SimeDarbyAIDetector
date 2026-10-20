"""Deterministic prioritization engine.

Pure functions only: no database, no HTTP, no video code. Given a category, the current evidence, optional
detection confidence and verification status, it returns a fully explained ``ScoreResult``.

    priority_score = w_sev*severity + w_imm*immediacy + w_ppl*people_at_risk + w_sec*secondary_hazard

The weights, thresholds, baselines, evidence modifiers and emergency rules live in ``scoring_config.py`` and are
PROVISIONAL prototype assumptions that require validation before real-world use.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.enums import CATEGORY_LABELS, LEVEL_RANK, PriorityLevel, Verification
from app.services.scoring_config import (
    DIMENSION_LABELS,
    DIMENSIONS,
    Condition,
    ScoringConfig,
    build_config,
)


def clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, float(value)))


@dataclass
class ScoreFactor:
    kind: str  # baseline | evidence | unknown
    dimension: str
    label: str
    delta: float  # effective delta applied to the dimension (after clamping)
    composite_delta: float  # contribution to the composite score


@dataclass
class ScoreResult:
    severity: float
    immediacy: float
    people_at_risk: float
    secondary_hazard: float
    composite_score: float
    score_level: str  # level from thresholds only
    level: str  # level after emergency-rule floors (before any manual override)
    emergency: bool
    triggered_rules: List[Dict[str, Any]]
    factors: List[ScoreFactor]
    unknown_fields: List[str]
    needs_verification: bool
    low_confidence: bool
    uncertainty: str  # low | medium | high
    uncertainty_reasons: List[str]
    explanation: str
    config_version: str
    baseline_composite: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "immediacy": self.immediacy,
            "people_at_risk": self.people_at_risk,
            "secondary_hazard": self.secondary_hazard,
            "composite_score": self.composite_score,
            "baseline_composite": self.baseline_composite,
            "score_level": self.score_level,
            "level": self.level,
            "emergency": self.emergency,
            "triggered_rules": self.triggered_rules,
            "factors": [f.__dict__ for f in self.factors],
            "unknown_fields": self.unknown_fields,
            "needs_verification": self.needs_verification,
            "low_confidence": self.low_confidence,
            "uncertainty": self.uncertainty,
            "uncertainty_reasons": self.uncertainty_reasons,
            "config_version": self.config_version,
        }


def level_for_score(score: float, cfg: ScoringConfig) -> str:
    """Map a composite score to a level using the configured thresholds."""
    if score >= cfg.thresholds["critical"]:
        return PriorityLevel.CRITICAL.value
    if score >= cfg.thresholds["high"]:
        return PriorityLevel.HIGH.value
    if score >= cfg.thresholds["medium"]:
        return PriorityLevel.MEDIUM.value
    return PriorityLevel.LOW.value


def _is_number(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def evaluate_condition(cond: Condition, evidence: Dict[str, Any]) -> bool:
    value = evidence.get(cond.field)
    if cond.op == "unknown":
        return value is None
    if value is None:
        return False  # unknown never matches positive/numeric conditions
    if cond.op == "is_true":
        return value is True
    if cond.op == "is_false":
        return value is False
    if not _is_number(value):
        return False
    if cond.op == "gte":
        return value >= cond.value
    if cond.op == "lt":
        return value < cond.value
    if cond.op == "between":
        lo, hi = cond.value
        return lo <= value < hi
    raise ValueError("Unknown condition op: %s" % cond.op)


def compute_priority(
    category: str,
    evidence: Optional[Dict[str, Any]] = None,
    confidence: Optional[float] = None,
    verification_status: str = Verification.UNVERIFIED.value,
    config: Optional[ScoringConfig] = None,
) -> ScoreResult:
    cfg = config or build_config()
    evidence = dict(evidence or {})
    if category not in cfg.baselines:
        raise ValueError("Unsupported category: %s" % category)

    # 1. baseline ------------------------------------------------------------------------------
    dims = {d: clamp(cfg.baselines[category][d]) for d in DIMENSIONS}
    baseline_composite = round(sum(cfg.weights[d] * dims[d] for d in DIMENSIONS), 2)
    factors: List[ScoreFactor] = []

    # 2. evidence modifiers (applied in declaration order, clamped per dimension) ----------------
    for mod in cfg.modifiers:
        if mod.category != category or not evaluate_condition(mod.condition, evidence):
            continue
        kind = "unknown" if mod.condition.op == "unknown" else "evidence"
        for dim, delta in mod.deltas.items():
            before = dims[dim]
            dims[dim] = clamp(before + delta)
            effective = dims[dim] - before
            factors.append(ScoreFactor(kind, dim, mod.label, round(effective, 2),
                                       round(effective * cfg.weights[dim], 2)))

    # 3. composite ------------------------------------------------------------------------------
    composite = round(clamp(sum(cfg.weights[d] * dims[d] for d in DIMENSIONS)), 2)
    score_level = level_for_score(composite, cfg)

    # 4. emergency rules (floors) ---------------------------------------------------------------
    level = score_level
    emergency = False
    triggered: List[Dict[str, Any]] = []
    for rule in cfg.rules:
        if category not in rule.categories:
            continue
        if not all(evaluate_condition(c, evidence) for c in rule.conditions):
            continue
        triggered.append({"id": rule.id, "description": rule.description, "floor": rule.floor,
                          "emergency": rule.emergency})
        if LEVEL_RANK[rule.floor] > LEVEL_RANK[level]:
            level = rule.floor
        emergency = emergency or rule.emergency

    # 5. uncertainty & verification (kept separate from priority) -------------------------------
    unknown_fields = [f for f in cfg.expected_fields.get(category, ()) if evidence.get(f) is None]
    low_conf = confidence is not None and confidence < cfg.low_confidence_threshold
    verified = verification_status == Verification.VERIFIED.value
    needs_verification = bool(low_conf and not verified)
    reasons: List[str] = []
    if low_conf:
        reasons.append("Detection confidence is low (%.0f%%)" % (confidence * 100))
    if unknown_fields:
        reasons.append("Unknown evidence: " + ", ".join(f.replace("_", " ") for f in unknown_fields))
    if verified:
        uncertainty = "low"
        reasons.append("Confirmed by a human reviewer")
    else:
        # low confidence counts double; each unknown expected evidence field counts once.
        points = (2 if low_conf else 0) + len(unknown_fields)
        uncertainty = "high" if points >= 3 else ("medium" if points >= 1 else "low")

    result = ScoreResult(
        severity=round(dims["severity"], 2),
        immediacy=round(dims["immediacy"], 2),
        people_at_risk=round(dims["people_at_risk"], 2),
        secondary_hazard=round(dims["secondary_hazard"], 2),
        composite_score=composite,
        score_level=score_level,
        level=level,
        emergency=emergency,
        triggered_rules=triggered,
        factors=factors,
        unknown_fields=unknown_fields,
        needs_verification=needs_verification,
        low_confidence=low_conf,
        uncertainty=uncertainty,
        uncertainty_reasons=reasons,
        explanation="",
        config_version=cfg.version,
        baseline_composite=baseline_composite,
    )
    result.explanation = build_explanation(category, result, confidence)
    return result


def build_explanation(category: str, r: ScoreResult, confidence: Optional[float]) -> str:
    label = CATEGORY_LABELS.get(category, category).lower()
    parts = ["%s priority (score %.1f/100)." % (r.level.capitalize(), r.composite_score)]
    parts.append("Baseline for %s is %.1f." % (label, r.baseline_composite))

    drivers = sorted((f for f in r.factors if f.composite_delta != 0), key=lambda f: -abs(f.composite_delta))[:3]
    if drivers:
        parts.append("Main drivers: " + "; ".join(
            "%s (%+.1f, %s)" % (f.label, f.composite_delta, DIMENSION_LABELS[f.dimension].lower()) for f in drivers) + ".")
    else:
        parts.append("No additional evidence has changed the baseline.")

    if r.triggered_rules:
        rule = sorted(r.triggered_rules, key=lambda x: (-LEVEL_RANK[x["floor"]], x["id"]))[0]
        if LEVEL_RANK[rule["floor"]] > LEVEL_RANK[r.score_level]:
            parts.append("Emergency rule %s raised the level from %s to %s: %s" %
                         (rule["id"], r.score_level, r.level, rule["description"]))
        else:
            parts.append("Emergency rule %s applies: %s" % (rule["id"], rule["description"]))
        if r.emergency:
            parts.append("It is placed in the emergency tier of the queue.")

    if r.low_confidence:
        parts.append("Detection confidence is low (%.0f%%); this does NOT lower the priority, but human verification is required."
                     % ((confidence or 0) * 100))
    if r.unknown_fields:
        parts.append("Uncertainty is %s: unknown %s." % (
            r.uncertainty, ", ".join(f.replace("_", " ") for f in r.unknown_fields)))
    return " ".join(parts)
