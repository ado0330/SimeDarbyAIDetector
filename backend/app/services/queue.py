"""Queue ordering — deliberately separate from scoring.

Order (most urgent first):
  1. Tier: emergency rule triggered OR effective level critical        -> tier 0, everything else tier 1
  2. Effective priority level (critical > high > medium > low)
  3. ``rank_score`` (hysteresis-smoothed composite score), higher first
  4. Time since detection: older first (prevents indefinite neglect)
  5. Stable identifier (numeric part of ``INC-xxxx``)
"""
from datetime import datetime
from typing import Any, Iterable, List, Tuple

from app.enums import LEVEL_RANK, PriorityLevel


def _id_number(incident_id: str) -> Tuple[int, str]:
    digits = "".join(ch for ch in str(incident_id) if ch.isdigit())
    return (int(digits) if digits else 0, str(incident_id))


def _ts(dt: datetime) -> float:
    return dt.timestamp() if dt else 0.0


def queue_sort_key(incident: Any) -> Tuple:
    level = incident.priority_level
    tier = 0 if (incident.emergency_rule_triggered or level == PriorityLevel.CRITICAL.value) else 1
    return (
        tier,
        -LEVEL_RANK[level],
        -float(incident.rank_score),
        _ts(incident.detected_at),
        _id_number(incident.id),
    )


def sort_queue(incidents: Iterable[Any]) -> List[Any]:
    return sorted(incidents, key=queue_sort_key)


def apply_hysteresis(
    prev_rank_score: float,
    prev_level: str,
    prev_emergency: bool,
    new_score: float,
    new_level: str,
    new_emergency: bool,
    min_change: float,
) -> float:
    """Return the ``rank_score`` to store.

    The rank score only moves when the composite changes by at least ``min_change`` points, or when the
    level / emergency tier changes. This prevents distracting queue reshuffles from tiny score fluctuations.
    """
    if prev_level != new_level or bool(prev_emergency) != bool(new_emergency):
        return new_score
    if abs(new_score - prev_rank_score) >= min_change:
        return new_score
    return prev_rank_score
