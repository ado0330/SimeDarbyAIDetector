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
}
