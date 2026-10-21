"""GLOBAL EYE — Expandable Incident Taxonomy and Classification System.

Defines the comprehensive township safety, security, wildlife, infrastructure,
environmental, utility, traffic, property, and operational incident catalogue.
Honors sensing realities by differentiating CCTV vision, IoT telemetry, human reports,
and external sensor integration without falsely claiming uniform computer-vision detection.
"""
from dataclasses import dataclass
from typing import Dict, Tuple

from app.enums import Category, DetectionMethod, PriorityLevel


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
    # 1. Human Safety & Medical
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
    Category.MEDICAL_EMERGENCY.value: IncidentTaxonomyEntry(
        id=Category.MEDICAL_EMERGENCY.value,
        name="Acute Medical Emergency",
        domain="human_safety",
        domain_name="Human Safety & Medical",
        description="Cardiac arrest, seizure, heatstroke, or acute physical distress in township public spaces.",
        default_severity=PriorityLevel.CRITICAL,
        supported_methods=(DetectionMethod.HUMAN_REPORT, DetectionMethod.CCTV_VISION),
        primary_method=DetectionMethod.HUMAN_REPORT,
        sop_workflow=(
            "Contact Emergency Ambulance 999",
            "Deploy Automated External Defibrillator (AED) patrol unit",
            "Clear access route for ambulance arrival",
        ),
        evidence_fields=("consciousness_level", "breathing", "aed_deployed"),
    ),
    Category.DROWNING_WATER_DISTRESS.value: IncidentTaxonomyEntry(
        id=Category.DROWNING_WATER_DISTRESS.value,
        name="Water Distress / Drowning Risk",
        domain="human_safety",
        domain_name="Human Safety & Medical",
        description="Person struggling in retention pond, lake, swimming pool, or deep drainage canal.",
        default_severity=PriorityLevel.CRITICAL,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT, DetectionMethod.IOT_TELEMETRY),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Sound local audio distress siren",
            "Dispatch water rescue team with lifebuoy",
            "Notify BOMBA Water Rescue Unit (PPDA)",
        ),
        evidence_fields=("water_depth", "flotation_device_present", "persons_in_water"),
    ),

    # 2. Security & Restricted Access
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
    Category.PHYSICAL_ALTERCATION.value: IncidentTaxonomyEntry(
        id=Category.PHYSICAL_ALTERCATION.value,
        name="Physical Altercation / Public Affray",
        domain="security_access",
        domain_name="Security & Restricted Access",
        description="Violent confrontation, assault, brawl, or menacing behavior in commercial squares or parks.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Dispatch security patrol dual-officer unit",
            "Monitor on high-definition PTZ camera tracking",
            "Notify Royal Malaysia Police (PDRM) if weapons or bodily injury visible",
        ),
        evidence_fields=("weapons_detected", "persons_involved", "crowd_gathering"),
    ),
    Category.UNAUTHORIZED_TRESPASS.value: IncidentTaxonomyEntry(
        id=Category.UNAUTHORIZED_TRESPASS.value,
        name="Perimeter Security Breach",
        domain="security_access",
        domain_name="Security & Restricted Access",
        description="Breach of residential gated perimeter fence, unauthorized vehicle tailgating, or forced entry.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.IOT_TELEMETRY, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.IOT_TELEMETRY,
        sop_workflow=(
            "Inspect fence vibration sensor / thermal camera feed",
            "Dispatch perimeter mobile guard",
            "Notify boom gate security personnel",
        ),
        evidence_fields=("perimeter_sector", "fence_tamper_sensor", "vehicle_plate"),
    ),
    Category.CROWD_SURGE_CONGESTION.value: IncidentTaxonomyEntry(
        id=Category.CROWD_SURGE_CONGESTION.value,
        name="Crowd Surge & Egress Congestion",
        domain="security_access",
        domain_name="Security & Restricted Access",
        description="Excessive crowd density, compression, or blocked emergency evacuation route during community events.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Open secondary emergency release gates",
            "Broadcast directional public address audio instructions",
            "Deploy crowd control marshals to relieve bottlenecks",
        ),
        evidence_fields=("crowd_density_m2", "egress_blocked", "compression_risk"),
    ),

    # 3. Wildlife & Animal Hazards
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

    # 4. Fire, Smoke & Explosions
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
    Category.GAS_LEAK_EXPLOSION_RISK.value: IncidentTaxonomyEntry(
        id=Category.GAS_LEAK_EXPLOSION_RISK.value,
        name="Gas Leak / Explosion Risk",
        domain="fire_hazards",
        domain_name="Fire, Smoke & Explosions",
        description="LPG or natural gas concentration anomaly reported near commercial kitchens or residences.",
        default_severity=PriorityLevel.CRITICAL,
        supported_methods=(DetectionMethod.IOT_TELEMETRY, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.IOT_TELEMETRY,
        sop_workflow=(
            "Isolate main gas supply valve remotely",
            "Evacuate 100m perimeter; prohibit open flames / vehicle ignitions",
            "Notify BOMBA Hazardous Materials (HAZMAT) squad",
        ),
        evidence_fields=("ppm_concentration", "wind_direction", "affected_units"),
    ),

    # 5. Water, Plumbing & Drainage
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
    Category.DRAINAGE_BLOCKAGE.value: IncidentTaxonomyEntry(
        id=Category.DRAINAGE_BLOCKAGE.value,
        name="Drainage / Culvert Blockage",
        domain="water_utilities",
        domain_name="Water, Drainage & Utilities",
        description="Debris, fallen branches, or silt obstructing monsoon drain before heavy rain.",
        default_severity=PriorityLevel.MEDIUM,
        supported_methods=(DetectionMethod.IOT_TELEMETRY, DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.IOT_TELEMETRY,
        sop_workflow=(
            "Dispatch maintenance excavator or cleanout contractor",
            "Clear culvert grate inlet before storm front arrives",
        ),
        evidence_fields=("culvert_headroom_remaining", "debris_volume_m3"),
    ),

    # 6. Flooding, Weather & Storms
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
    Category.FALLEN_TREE_STORM_DAMAGE.value: IncidentTaxonomyEntry(
        id=Category.FALLEN_TREE_STORM_DAMAGE.value,
        name="Fallen Tree / Severe Storm Obstruction",
        domain="weather_flooding",
        domain_name="Flooding & Natural Hazards",
        description="Uprooted tree or large broken branch blocking roadway, striking vehicles, or pulling down power lines.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Verify power line clearance with electrical emergency team",
            "Dispatch landscape chainsaw emergency team",
            "Divert traffic to secondary township route",
        ),
        evidence_fields=("power_lines_contacted", "road_lanes_blocked", "vehicle_damaged"),
    ),
    Category.EARLY_WARNING_SUBSIDENCE.value: IncidentTaxonomyEntry(
        id=Category.EARLY_WARNING_SUBSIDENCE.value,
        name="Early-Warning Slope & Ground Movement",
        domain="weather_flooding",
        domain_name="Flooding & Natural Hazards",
        description="Sensor-detected geotechnical slope movement, retaining wall bulging, or foundation settlement developing over time.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.IOT_TELEMETRY, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.IOT_TELEMETRY,
        sop_workflow=(
            "Review inclinometer and geotechnical sensor trend data",
            "Dispatch structural engineer to conduct on-site physical survey",
            "Install temporary diversion barriers if slope movement accelerates",
        ),
        evidence_fields=("displacement_mm", "slope_angle_delta", "rainfall_accumulation_mm"),
    ),

    # 7. Traffic, Mobility & Parking
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
    Category.ROAD_PAVEMENT_DEFECT.value: IncidentTaxonomyEntry(
        id=Category.ROAD_PAVEMENT_DEFECT.value,
        name="Pothole, Sinkhole & Road Subsidence",
        domain="traffic_mobility",
        domain_name="Traffic, Mobility & Parking",
        description="Large crater, opening sinkhole, or severe pavement depression creating imminent vehicle rim damage or crash hazard.",
        default_severity=PriorityLevel.MEDIUM,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Place high-visibility emergency cones and warning signs around void",
            "Notify municipal works maintenance for cold-mix patch / trench repair",
        ),
        evidence_fields=("diameter_meters", "depth_cm", "lane_closed"),
    ),
    Category.ACCESSIBILITY_OBSTRUCTION.value: IncidentTaxonomyEntry(
        id=Category.ACCESSIBILITY_OBSTRUCTION.value,
        name="Accessibility & Mobility Pathway Blockage",
        domain="traffic_mobility",
        domain_name="Traffic, Mobility & Parking",
        description="Wheelchair ramp, tactile paving, or accessible crossing blocked by construction hoarding, vehicles, or debris.",
        default_severity=PriorityLevel.MEDIUM,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Dispatch facility warden to remove obstruction immediately",
            "Issue non-compliance citation if commercial contractor material",
        ),
        evidence_fields=("path_type", "accessible_alternative_distance_m"),
    ),

    # 8. Smart Infrastructure, Lifts & Utilities
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
    Category.POWER_OUTAGE_ELECTRICAL.value: IncidentTaxonomyEntry(
        id=Category.POWER_OUTAGE_ELECTRICAL.value,
        name="Substation Trip / Streetlight Blackout",
        domain="smart_infrastructure",
        domain_name="Smart Infra, Lifts & Energy",
        description="Medium-voltage electrical trip or blackout affecting residential boulevards, streetlights, or critical nodes.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.IOT_TELEMETRY, DetectionMethod.EXTERNAL_INTEGRATION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.IOT_TELEMETRY,
        sop_workflow=(
            "Verify backup UPS and generator status for security operations center",
            "Notify Tenaga Nasional Berhad (TNB) electrical grid desk",
            "Deploy auxiliary battery mobile lighting to major intersections",
        ),
        evidence_fields=("affected_substation", "streetlights_offline", "exposed_live_wires"),
    ),
    Category.STRUCTURAL_FACILITY_DAMAGE.value: IncidentTaxonomyEntry(
        id=Category.STRUCTURAL_FACILITY_DAMAGE.value,
        name="Building Façade & Structural Damage",
        domain="smart_infrastructure",
        domain_name="Smart Infra, Lifts & Energy",
        description="Detached building façade panel, broken overhead glass, fallen canopy, or structural masonry collapse.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Cordon off perimeter beneath damaged structure with warning tape",
            "Dispatch certified structural engineer to assess load integrity",
        ),
        evidence_fields=("component_type", "fall_zone_pedestrians", "building_sector"),
    ),

    # 9. Waste, Cleanliness & Environment
    Category.ILLEGAL_DUMPING.value: IncidentTaxonomyEntry(
        id=Category.ILLEGAL_DUMPING.value,
        name="Illegal Waste Dumping / Pollution",
        domain="environment_sanitation",
        domain_name="Waste & Environment",
        description="Commercial lorry dumping construction debris, toxic drums, or bulk garbage in undeveloped township reserve.",
        default_severity=PriorityLevel.MEDIUM,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Record vehicle registration number from CCTV",
            "Dispatch security patrol to document site",
            "File report with Department of Environment (DOE)",
        ),
        evidence_fields=("waste_type", "chemical_odor", "lorry_plate"),
    ),

    # 10. Operations, Worksites & Cyber-Physical
    Category.CONSTRUCTION_SAFETY_HAZARD.value: IncidentTaxonomyEntry(
        id=Category.CONSTRUCTION_SAFETY_HAZARD.value,
        name="Construction & Worksite Hazard",
        domain="operational_general",
        domain_name="Operational & Other",
        description="Unsecured deep trench, crane load hazard, or contractor materials falling onto public road.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.CCTV_VISION, DetectionMethod.HUMAN_REPORT),
        primary_method=DetectionMethod.CCTV_VISION,
        sop_workflow=(
            "Issue immediate Stop-Work order on affected site sector",
            "Dispatch safety auditor to inspect contractor perimeter barriers",
        ),
        evidence_fields=("contractor_name", "public_road_affected", "trench_unprotected"),
    ),
    Category.CYBER_PHYSICAL_SYSTEM_OUTAGE.value: IncidentTaxonomyEntry(
        id=Category.CYBER_PHYSICAL_SYSTEM_OUTAGE.value,
        name="Security & Sensor System Outage",
        domain="operational_general",
        domain_name="Operational & Other",
        description="Telemetry cluster loss, CCTV node disconnection, or monitoring system communication failure creating blind spots.",
        default_severity=PriorityLevel.HIGH,
        supported_methods=(DetectionMethod.EXTERNAL_INTEGRATION, DetectionMethod.IOT_TELEMETRY),
        primary_method=DetectionMethod.EXTERNAL_INTEGRATION,
        sop_workflow=(
            "Initiate auxiliary heartbeat telemetry ping",
            "Dispatch field network technician to inspect PoE switch cabinet",
            "Route mobile security patrol to cover visual blind zone",
        ),
        evidence_fields=("nodes_offline_count", "sector_blind_zone", "duration_minutes"),
    ),
    Category.CUSTOM_SAFETY_HAZARD.value: IncidentTaxonomyEntry(
        id=Category.CUSTOM_SAFETY_HAZARD.value,
        name="Custom Safety Hazard",
        domain="operational_general",
        domain_name="Operational & Other",
        description="Administrator or operator-defined township incident category.",
        default_severity=PriorityLevel.MEDIUM,
        supported_methods=(DetectionMethod.MANUAL_ENTRY, DetectionMethod.HUMAN_REPORT, DetectionMethod.MULTI_SOURCE_CORRELATED),
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


# Master Cascading Incidents (Section 29: one event causing several others)
CORRELATIONS = (
    IncidentCorrelation(
        id="CORR-TREE-ROAD",
        name="Fallen Tree causing Road Blockage & Collision Risk",
        description="A fallen tree or broken large branch obstructs travel lanes, risking vehicular impact.",
        trigger_category=Category.FALLEN_TREE_STORM_DAMAGE.value,
        followup_category=Category.ROAD_COLLISION.value,
        composite_name="Tree Fall & Roadway Traffic Obstruction Hazard",
        composite_severity=PriorityLevel.CRITICAL,
    ),
    IncidentCorrelation(
        id="CORR-TREE-POWER",
        name="Fallen Tree causing Power Line Damage & Blackout",
        description="Fallen tree striking overhead medium-voltage power lines causing localized blackout.",
        trigger_category=Category.FALLEN_TREE_STORM_DAMAGE.value,
        followup_category=Category.POWER_OUTAGE_ELECTRICAL.value,
        composite_name="Severe Tree Fall & Power Grid Outage Emergency",
        composite_severity=PriorityLevel.CRITICAL,
    ),
    IncidentCorrelation(
        id="CORR-WATER-FLOOD",
        name="Burst Water Pipe leading to Roadway Flooding",
        description="High-pressure pipe burst followed by downstream road inundation.",
        trigger_category=Category.PIPE_BURST_LEAKAGE.value,
        followup_category=Category.FLASH_FLOOD.value,
        composite_name="Water Infrastructure Failure & Roadway Inundation",
        composite_severity=PriorityLevel.CRITICAL,
    ),
    IncidentCorrelation(
        id="CORR-WATER-SUBSIDENCE",
        name="Pipe Leak causing Road Subsidence & Sinkhole",
        description="Underground water main failure washing away soil foundations and creating road sinkholes.",
        trigger_category=Category.PIPE_BURST_LEAKAGE.value,
        followup_category=Category.ROAD_PAVEMENT_DEFECT.value,
        composite_name="Subsurface Water Main Rupture & Roadway Collapse",
        composite_severity=PriorityLevel.CRITICAL,
    ),
    IncidentCorrelation(
        id="CORR-STORM-CASCADE",
        name="Monsoon Storm causing Inundation & Debris",
        description="Intense rainfall overwhelming drainage culverts while storm winds fell branches.",
        trigger_category=Category.FALLEN_TREE_STORM_DAMAGE.value,
        followup_category=Category.FLASH_FLOOD.value,
        composite_name="Storm Inundation & Debris Obstruction Emergency",
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
    IncidentCorrelation(
        id="CORR-FIRE-EGRESS",
        name="Structural Fire with Blocked Evacuation",
        description="Fire and smoke plume detected where emergency egress path is obstructed.",
        trigger_category=Category.FIRE_SMOKE.value,
        followup_category=Category.PARKING_OBSTRUCTION.value,
        composite_name="Structural Fire & Blocked Emergency Egress Emergency",
        composite_severity=PriorityLevel.CRITICAL,
    ),
    IncidentCorrelation(
        id="CORR-ELECTRICAL-LIFT",
        name="Substation Trip causing Elevator Passenger Entrapment",
        description="Electrical grid failure stalling elevators between floors with trapped occupants.",
        trigger_category=Category.POWER_OUTAGE_ELECTRICAL.value,
        followup_category=Category.LIFT_ENTRAPMENT.value,
        composite_name="Power Outage & Multi-Cabin Lift Entrapment Crisis",
        composite_severity=PriorityLevel.CRITICAL,
    ),
    IncidentCorrelation(
        id="CORR-WILDLIFE-TRAFFIC",
        name="Wild Animal entering Roadway causing Collision Hazard",
        description="Wild boar pack or large monitor lizard crossing highway leading to sudden braking and collision.",
        trigger_category=Category.WILDLIFE_INTRUSION.value,
        followup_category=Category.ROAD_COLLISION.value,
        composite_name="Wildlife Road Intrusion & Multi-Vehicle Crash Risk",
        composite_severity=PriorityLevel.HIGH,
    ),
    IncidentCorrelation(
        id="CORR-WALL-SUBSIDENCE",
        name="Retaining Wall Bulging leading to Soil Collapse",
        description="Geotechnical slope movement developing into retaining wall displacement.",
        trigger_category=Category.EARLY_WARNING_SUBSIDENCE.value,
        followup_category=Category.STRUCTURAL_FACILITY_DAMAGE.value,
        composite_name="Geotechnical Slope Movement & Retaining Wall Collapse",
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
