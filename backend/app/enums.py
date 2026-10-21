"""Shared enumerations for Township Guardian AI."""
from enum import Enum


class StrEnum(str, Enum):
    def __str__(self) -> str:  # pragma: no cover - trivial
        return str(self.value)


class Category(StrEnum):
    ROAD_COLLISION = "road_collision"
    PERSON_FALL = "person_fall"
    PARKING_OBSTRUCTION = "parking_obstruction"
    FIRE_SMOKE = "fire_smoke"
    WILDLIFE_INTRUSION = "wildlife_intrusion"
    RESTRICTED_AREA_INTRUSION = "restricted_area_intrusion"
    PIPE_BURST_LEAKAGE = "pipe_burst_leakage"
    FLASH_FLOOD = "flash_flood"
    LIFT_ENTRAPMENT = "lift_entrapment"
    PHYSICAL_ALTERCATION = "physical_altercation"
    MEDICAL_EMERGENCY = "medical_emergency"
    DROWNING_WATER_DISTRESS = "drowning_water_distress"
    UNAUTHORIZED_TRESPASS = "unauthorized_trespass"
    GAS_LEAK_EXPLOSION_RISK = "gas_leak_explosion_risk"
    DRAINAGE_BLOCKAGE = "drainage_blockage"
    FALLEN_TREE_STORM_DAMAGE = "fallen_tree_storm_damage"
    POWER_OUTAGE_ELECTRICAL = "power_outage_electrical"
    ILLEGAL_DUMPING = "illegal_dumping"
    ROAD_PAVEMENT_DEFECT = "road_pavement_defect"
    STRUCTURAL_FACILITY_DAMAGE = "structural_facility_damage"
    CROWD_SURGE_CONGESTION = "crowd_surge_congestion"
    CONSTRUCTION_SAFETY_HAZARD = "construction_safety_hazard"
    EARLY_WARNING_SUBSIDENCE = "early_warning_subsidence"
    CYBER_PHYSICAL_SYSTEM_OUTAGE = "cyber_physical_system_outage"
    ACCESSIBILITY_OBSTRUCTION = "accessibility_obstruction"
    CUSTOM_SAFETY_HAZARD = "custom_safety_hazard"


class LifecycleState(StrEnum):
    DETECTED = "detected"
    SUSPECTED = "suspected"
    SENSOR_REPORTED = "sensor_reported"
    HUMAN_REPORTED = "human_reported"
    CONFIRMED = "confirmed"
    FALSE_POSITIVE = "false_positive"


class DetectionMethod(StrEnum):
    CCTV_VISION = "cctv_vision"
    IOT_TELEMETRY = "iot_telemetry"
    HUMAN_REPORT = "human_report"
    EXTERNAL_INTEGRATION = "external_integration"
    MULTI_SOURCE_CORRELATED = "multi_source_correlated"
    MANUAL_ENTRY = "manual_entry"


class PriorityLevel(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# Higher number == more urgent.
LEVEL_RANK = {
    PriorityLevel.LOW.value: 0,
    PriorityLevel.MEDIUM.value: 1,
    PriorityLevel.HIGH.value: 2,
    PriorityLevel.CRITICAL.value: 3,
}


class Status(StrEnum):
    NEW = "new"  # awaiting acknowledgement
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"  # being handled
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"
    CLOSED = "closed"


ACTIVE_STATUSES = (Status.NEW.value, Status.ACKNOWLEDGED.value, Status.IN_PROGRESS.value)
TERMINAL_STATUSES = (Status.RESOLVED.value, Status.FALSE_POSITIVE.value, Status.CLOSED.value)

# Allowed manual status transitions (acknowledge/resolve/reopen have dedicated endpoints too).
ALLOWED_TRANSITIONS = {
    Status.NEW.value: {Status.ACKNOWLEDGED.value, Status.IN_PROGRESS.value, Status.RESOLVED.value, Status.FALSE_POSITIVE.value},
    Status.ACKNOWLEDGED.value: {Status.IN_PROGRESS.value, Status.RESOLVED.value, Status.FALSE_POSITIVE.value},
    Status.IN_PROGRESS.value: {Status.ACKNOWLEDGED.value, Status.RESOLVED.value, Status.FALSE_POSITIVE.value},
    Status.RESOLVED.value: {Status.CLOSED.value, Status.ACKNOWLEDGED.value},  # ACKNOWLEDGED == reopen
    Status.FALSE_POSITIVE.value: {Status.CLOSED.value, Status.ACKNOWLEDGED.value},
    Status.CLOSED.value: {Status.ACKNOWLEDGED.value},
}


class SourceType(StrEnum):
    SIMULATION = "simulation"
    VIDEO_UPLOAD = "video_upload"


class Verification(StrEnum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"
    FALSE_POSITIVE = "false_positive"


class VideoStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class CandidateStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


CATEGORY_LABELS = {
    Category.ROAD_COLLISION.value: "Road collision",
    Category.PERSON_FALL.value: "Person fall / person down",
    Category.PARKING_OBSTRUCTION.value: "Parking obstruction",
    Category.FIRE_SMOKE.value: "Suspected fire / smoke",
    Category.WILDLIFE_INTRUSION.value: "Wildlife intrusion (wild animal)",
    Category.RESTRICTED_AREA_INTRUSION.value: "Restricted danger zone (rooftop / height)",
    Category.PIPE_BURST_LEAKAGE.value: "Water main pipe burst / leakage",
    Category.FLASH_FLOOD.value: "Flash flooding / inundation",
    Category.LIFT_ENTRAPMENT.value: "Elevator passenger entrapment",
    Category.PHYSICAL_ALTERCATION.value: "Physical altercation / public affray",
    Category.MEDICAL_EMERGENCY.value: "Acute medical emergency",
    Category.DROWNING_WATER_DISTRESS.value: "Water distress / drowning risk",
    Category.UNAUTHORIZED_TRESPASS.value: "Perimeter security breach",
    Category.GAS_LEAK_EXPLOSION_RISK.value: "Gas leak / explosion risk",
    Category.DRAINAGE_BLOCKAGE.value: "Drainage / culvert blockage",
    Category.FALLEN_TREE_STORM_DAMAGE.value: "Fallen tree / storm damage",
    Category.POWER_OUTAGE_ELECTRICAL.value: "Substation trip / power blackout",
    Category.ILLEGAL_DUMPING.value: "Illegal waste dumping",
    Category.CUSTOM_SAFETY_HAZARD.value: "Custom safety hazard",
}
