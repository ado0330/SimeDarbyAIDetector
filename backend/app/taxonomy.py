"""GLOBAL EYE — Expandable Incident Taxonomy and Classification System.

Defines the comprehensive township safety, security, wildlife, infrastructure,
environmental, utility, traffic, property, and operational incident catalogue.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from app.enums import Category, DetectionMethod, LifecycleState, PriorityLevel


@dataclass(frozen=True)
class IncidentTaxonomyEntry:
    id: str
    name: str
    domain: str
    domain_name: str
    description: str
    default_severity: PriorityLevel
    supported_methods: Tuple[DetectionMethod, ...]
    primary_method: DetectionMethod
    sop_workflow: Tuple[str, ...]
    evidence_fields: Tuple[str, ...]


TAXONOMY_REGISTRY: Dict[str, IncidentTaxonomyEntry] = {
    Category.PERSON_FALL.value: IncidentTaxonomyEntry(
        id=Category.PERSON_FALL.value,
        name="Person Fall / Motionless",
        domain="human_safety",
        domain_name="Human Safety & Medical",
        description="Pedestrian collapse, fall, or motionless state on pavement, road, or steps.",
        default_severity=PriorityLevel.CRITICAL,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Verify CCTV feed immediately",
            "Dispatch nearest first-aid ranger patrol",
            "Escalate to Emergency Medical Services (999/112) if unresponsive",
        ),
        evidence_fields=("person_motionless_seconds", "hazardous_location", "bystander_assisting"),
    ),
    Category.WILDLIFE_INTRUSION.value: IncidentTaxonomyEntry(
        id=Category.WILDLIFE_INTRUSION.value,
        name="Wildlife Intrusion (Wild Animal)",
        domain="wildlife_nature",
        domain_name="Wildlife & Animal Hazards",
        description="Wild animals (boars, monkeys, venomous snakes) entering residential or park areas.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Broadcast localized push alert to park visitors",
            "Dispatch township wildlife management warden",
            "Coordinate with PERHILITAN for safe capture and relocation",
        ),
        evidence_fields=("proximity_to_pedestrians", "aggressive_behavior", "pack_size"),
    ),
    Category.RESTRICTED_AREA_INTRUSION.value: IncidentTaxonomyEntry(
        id=Category.RESTRICTED_AREA_INTRUSION.value,
        name="Restricted Danger Zone (Rooftop / Height)",
        domain="security_access",
        domain_name="Security & Restricted Access",
        description="Unauthorized person on commercial rooftop ledge, electrical substation, or construction fence.",
        default_severity=PriorityLevel.CRITICAL,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.IOT_TELEMETRY, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Trigger automated CCTV speaker warning to step back",
            "Dispatch auxiliary security patrol to lock roof hatch",
            "Isolate access elevator",
        ),
        evidence_fields=("height_fall_hazard", "unauthorized_entry", "substation_voltage"),
    ),
    Category.FIRE_SMOKE.value: IncidentTaxonomyEntry(
        id=Category.FIRE_SMOKE.value,
        name="Suspected Fire / Smoke Plume",
        domain="fire_hazards",
        domain_name="Fire, Smoke & Explosions",
        description="Open flames, thick smoke plume, hazardous burning, or thermal hazard.",
        default_severity=PriorityLevel.CRITICAL,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.IOT_TELEMETRY, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Immediate human verification of CCTV view (zero suppression)",
            "Call Fire & Rescue BOMBA (994 / 999)",
            "Activate township fire warden and evacuation protocol",
        ),
        evidence_fields=("smoke_or_flame_visible", "people_in_vicinity", "spreading", "blocks_emergency_access"),
    ),
    Category.PIPE_BURST_LEAKAGE.value: IncidentTaxonomyEntry(
        id=Category.PIPE_BURST_LEAKAGE.value,
        name="Water Main Pipe Burst / Leakage",
        domain="water_utilities",
        domain_name="Water, Drainage & Utilities",
        description="Underground water main rupture causing surface gushing and road subsidence risk.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.IOT_TELEMETRY, DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.IOT_TELEMETRY,
        sop_workflow=(
            "Check municipal telemetry sensor flow rate",
            "Dispatch emergency plumbing team to isolate sectional valve",
            "Monitor downstream roadway for subsidence / pooling",
        ),
        evidence_fields=("road_subsidence_risk", "pressure_drop_bar"),
    ),
    Category.FLASH_FLOOD.value: IncidentTaxonomyEntry(
        id=Category.FLASH_FLOOD.value,
        name="Flash Flooding / Inundation",
        domain="weather_flooding",
        domain_name="Flooding & Natural Hazards",
        description="Monsoon storm overflow submerging roadways, underpasses, or parking aprons.",
        default_severity=PriorityLevel.CRITICAL,
        supported_methods=(DetectionMethod.IOT_TELEMETRY, DetectionMethod.CCTV_VISION, DetectionMethod.EXTERNAL_INTEGRATION),
        primary_method=DetectionMethod.IOT_TELEMETRY,
        sop_workflow=(
            "Activate electronic variable message flood warning boards",
            "Dispatch traffic marshals to close flooded lanes",
            "Inspect retention lake spillway pump operations",
        ),
        evidence_fields=("water_depth_cm", "rate_of_rise_cm_min"),
    ),
    Category.ROAD_COLLISION.value: IncidentTaxonomyEntry(
        id=Category.ROAD_COLLISION.value,
        name="Road Collision / Vehicle Crash",
        domain="traffic_mobility",
        domain_name="Traffic, Mobility & Parking",
        description="Vehicle impact, motorcycle skid, or vehicle collision with pedestrian/cyclist.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Verify camera view for injured or trapped occupants",
            "Dispatch traffic marshal to secure crash perimeter",
            "Contact Police (PDRM) and Ambulance (999)",
        ),
        evidence_fields=("persons_involved", "person_motionless_after_impact", "blocks_emergency_access"),
    ),
    Category.PARKING_OBSTRUCTION.value: IncidentTaxonomyEntry(
        id=Category.PARKING_OBSTRUCTION.value,
        name="Emergency Access / Parking Obstruction",
        domain="traffic_mobility",
        domain_name="Traffic, Mobility & Parking",
        description="Vehicle or stationary object blocking fire hydrant, emergency gate, or travel lane.",
        default_severity=PriorityLevel.LOW,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Lookup vehicle plate in resident vehicle registry",
            "Dispatch parking enforcement / towing team if emergency route",
        ),
        evidence_fields=("blocks_emergency_access", "duration_minutes"),
    ),
    Category.LIFT_ENTRAPMENT.value: IncidentTaxonomyEntry(
        id=Category.LIFT_ENTRAPMENT.value,
        name="Elevator Passenger Entrapment",
        domain="smart_infrastructure",
        domain_name="Smart Infra, Lifts & Energy",
        description="Elevator stalled between floors with passengers trapped inside.",
        default_severity=PriorityLevel.CRITICAL,
        supported_methods=(DetectionMethod.IOT_TELEMETRY, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.IOT_TELEMETRY,
        sop_workflow=(
            "Open 2-way cabin intercom to reassure trapped passengers",
            "Dispatch certified lift technician and BOMBA rescue team",
        ),
        evidence_fields=("passengers_count", "between_floors"),
    ),
    Category.CUSTOM_SAFETY_HAZARD.value: IncidentTaxonomyEntry(
        id=Category.CUSTOM_SAFETY_HAZARD.value,
        name="Custom Safety Hazard",
        domain="operational_general",
        domain_name="Operational & Other",
        description="Administrator or operator-defined township incident category.",
        default_severity=PriorityLevel.MEDIUM,
        supported_methods=(DetectionMethod.MANUAL_ENTRY, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.MANUAL_ENTRY,
        sop_workflow=(
            "Operator review of custom incident description",
            "Assign appropriate department responder",
        ),
        evidence_fields=(),
    ),
}


@dataclass(frozen=True)
class IncidentCorrelation:
    id: str
    name: str
    description: str
    trigger_category: str
    followup_category: str
    composite_name: str
    composite_severity: PriorityLevel


CORRELATIONS = (
    IncidentCorrelation(
        id="CORR-WATER-FLOOD",
        name="Pipe Burst leading to Roadway Flooding",
        description="High-pressure pipe burst followed by downstream road inundation.",
        trigger_category=Category.PIPE_BURST_LEAKAGE.value,
        followup_category=Category.FLASH_FLOOD.value,
        composite_name="Water Infrastructure Failure & Roadway Inundation",
        composite_severity=PriorityLevel.CRITICAL,
    ),
    IncidentCorrelation(
        id="CORR-COLLISION-EGRESS",
        name="Collision blocking Emergency Route",
        description="Vehicle collision causing downstream emergency route obstruction.",
        trigger_category=Category.ROAD_COLLISION.value,
        followup_category=Category.PARKING_OBSTRUCTION.value,
        composite_name="Major Boulevard Collision & Egress Blockage",
        composite_severity=PriorityLevel.CRITICAL,
    ),
)


def get_taxonomy_entry(category_id: str) -> IncidentTaxonomyEntry:
    if category_id in TAXONOMY_REGISTRY:
        return TAXONOMY_REGISTRY[category_id]
    return IncidentTaxonomyEntry(
        id=category_id,
        name=category_id.replace("_", " ").title(),
        domain="operational_general",
        domain_name="Operational & Other",
        description="Custom township incident.",
        default_severity=PriorityLevel.MEDIUM,
        supported_methods=(DetectionMethod.MANUAL_ENTRY,),
        primary_method=DetectionMethod.MANUAL_ENTRY,
        sop_workflow=("Review incident telemetry and assign responder.",),
        evidence_fields=(),
    )
