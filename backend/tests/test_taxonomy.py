"""Automated tests for GlobalEye Expandable Incident Taxonomy and Classification System."""
import pytest
from app.enums import Category, DetectionMethod, LifecycleState, PriorityLevel
from app.services.prioritization import compute_priority
from app.services.scoring_config import build_config
from app.taxonomy import CORRELATIONS, TAXONOMY_REGISTRY, get_taxonomy_entry


def test_taxonomy_registry_completeness():
    """Verify that all core Category enums have corresponding taxonomy definitions."""
    for cat in (
        Category.PERSON_FALL,
        Category.WILDLIFE_INTRUSION,
        Category.RESTRICTED_AREA_INTRUSION,
        Category.FIRE_SMOKE,
        Category.PIPE_BURST_LEAKAGE,
        Category.FLASH_FLOOD,
        Category.ROAD_COLLISION,
        Category.PARKING_OBSTRUCTION,
        Category.LIFT_ENTRAPMENT,
        Category.FALLEN_TREE_STORM_DAMAGE,
        Category.ROAD_PAVEMENT_DEFECT,
        Category.STRUCTURAL_FACILITY_DAMAGE,
        Category.CROWD_SURGE_CONGESTION,
        Category.CONSTRUCTION_SAFETY_HAZARD,
        Category.EARLY_WARNING_SUBSIDENCE,
        Category.CYBER_PHYSICAL_SYSTEM_OUTAGE,
        Category.ACCESSIBILITY_OBSTRUCTION,
        Category.ILLEGAL_DUMPING,
    ):
        entry = get_taxonomy_entry(cat.value)
        assert entry.id == cat.value
        assert len(entry.name) > 0
        assert len(entry.sop_workflow) >= 1
        assert len(entry.supported_methods) >= 1
        assert isinstance(entry.default_severity, PriorityLevel)


def test_detection_methods_differentiated():
    """Ensure computer vision is NOT claimed for all categories (Section 30: Sensing Realities)."""
    pipe_burst = get_taxonomy_entry(Category.PIPE_BURST_LEAKAGE.value)
    assert pipe_burst.primary_method == DetectionMethod.IOT_TELEMETRY

    flash_flood = get_taxonomy_entry(Category.FLASH_FLOOD.value)
    assert flash_flood.primary_method == DetectionMethod.IOT_TELEMETRY

    fall = get_taxonomy_entry(Category.PERSON_FALL.value)
    assert fall.primary_method == DetectionMethod.CCTV_VISION

    lift = get_taxonomy_entry(Category.LIFT_ENTRAPMENT.value)
    assert lift.primary_method == DetectionMethod.IOT_TELEMETRY

    subsidence = get_taxonomy_entry(Category.EARLY_WARNING_SUBSIDENCE.value)
    assert subsidence.primary_method == DetectionMethod.IOT_TELEMETRY

    outage = get_taxonomy_entry(Category.CYBER_PHYSICAL_SYSTEM_OUTAGE.value)
    assert outage.primary_method == DetectionMethod.EXTERNAL_INTEGRATION


def test_custom_unknown_category_fallback():
    """Verify unknown or admin-defined categories fallback safely without crashes."""
    entry = get_taxonomy_entry("substation_arc_flash")
    assert entry.id == "substation_arc_flash"
    assert entry.domain == "operational_general"
    assert DetectionMethod.MANUAL_ENTRY in entry.supported_methods


def test_wildlife_prioritization():
    """Verify wildlife intrusion is scored as high priority."""
    cfg = build_config()
    p = compute_priority(Category.WILDLIFE_INTRUSION.value, {"proximity_to_pedestrians": True}, 0.92, config=cfg)
    assert p.level in (PriorityLevel.HIGH.value, PriorityLevel.CRITICAL.value)
    assert p.composite_score >= 60.0


def test_rooftop_emergency_floor():
    """Verify unauthorized rooftop intrusion triggers critical emergency rule."""
    cfg = build_config()
    p = compute_priority(Category.RESTRICTED_AREA_INTRUSION.value, {"height_fall_hazard": True}, 0.95, config=cfg)
    assert p.emergency is True
    assert p.level in (PriorityLevel.HIGH.value, PriorityLevel.CRITICAL.value)


def test_incident_correlation_rules():
    """Verify predefined correlation relationships between cascading township incidents (Section 29)."""
    corr_ids = {c.id for c in CORRELATIONS}
    assert "CORR-TREE-ROAD" in corr_ids
    assert "CORR-TREE-POWER" in corr_ids
    assert "CORR-WATER-FLOOD" in corr_ids
    assert "CORR-WATER-SUBSIDENCE" in corr_ids
    assert "CORR-STORM-CASCADE" in corr_ids
    assert "CORR-COLLISION-EGRESS" in corr_ids
    assert "CORR-FIRE-EGRESS" in corr_ids
    assert "CORR-ELECTRICAL-LIFT" in corr_ids
    assert "CORR-WILDLIFE-TRAFFIC" in corr_ids
    assert "CORR-WALL-SUBSIDENCE" in corr_ids

    water_corr = next(c for c in CORRELATIONS if c.id == "CORR-WATER-FLOOD")
    assert water_corr.trigger_category == Category.PIPE_BURST_LEAKAGE.value
    assert water_corr.followup_category == Category.FLASH_FLOOD.value

    tree_road_corr = next(c for c in CORRELATIONS if c.id == "CORR-TREE-ROAD")
    assert tree_road_corr.trigger_category == Category.FALLEN_TREE_STORM_DAMAGE.value
    assert tree_road_corr.followup_category == Category.ROAD_COLLISION.value
