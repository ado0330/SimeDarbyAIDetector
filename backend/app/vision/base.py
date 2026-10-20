"""Detector interface for the video-analysis pipeline.

    Video -> frame extraction -> Detector.analyze() -> DetectedCandidate -> review -> incident_service -> prioritization

A detector turns a stream of frames into *event candidates*. It never decides priority: the output is sent to the
shared prioritization engine. Detectors must be honest about what they can recognise: a generic object detector
finds people/vehicles, it does not by itself establish that a fall or collision occurred.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

import numpy as np


@dataclass
class FramePacket:
    index: int  # frame number in the source video
    timestamp_s: float  # seconds from the start of the clip
    image: np.ndarray  # BGR uint8


@dataclass
class DetectedCandidate:
    category: str
    timestamp_s: float
    end_timestamp_s: Optional[float]
    confidence: Optional[float]  # only set when the model provides a meaningful event-level confidence
    bbox: Optional[Dict[str, float]]  # normalised x, y, w, h (0-1)
    evidence: Dict[str, Any]  # inputs for the prioritization engine (e.g. person_motionless_seconds)
    details: Dict[str, Any]  # descriptive, non-sensitive metadata
    model_id: str
    model_version: str
    frame_index: Optional[int] = None
    evidence_frame: Optional[np.ndarray] = None  # annotated frame to store as evidence


class DetectorUnavailable(Exception):
    """Raised when the configured model/dependency cannot be used. The UI shows this state explicitly."""


ProgressCallback = Callable[[float], None]


class Detector(ABC):
    id: str = "base"
    version: str = "0"
    description: str = ""
    supported_categories: Tuple[str, ...] = ()
    # How the pipeline should sample frames
    sample_interval_s: float = 1.0

    @abstractmethod
    def availability(self) -> Tuple[bool, str]:
        """(available, human-readable note)."""

    @abstractmethod
    def analyze(self, frames: Iterable[FramePacket]) -> List[DetectedCandidate]:
        """Consume sampled frames, return event candidates. Raise DetectorUnavailable if unusable."""

    def info(self) -> Dict[str, Any]:
        ok, note = self.availability()
        return {"id": self.id, "version": self.version, "description": self.description, "available": ok,
                "note": note, "supported_categories": list(self.supported_categories)}


class UnavailableDetector(Detector):
    """Explicit 'no model' state (TG_DETECTOR=none or a model that failed to load)."""

    id = "none"
    version = "-"
    description = "No detector configured"

    def __init__(self, reason: str = "No computer-vision detector is configured (TG_DETECTOR=none)."):
        self.reason = reason

    def availability(self) -> Tuple[bool, str]:
        return False, self.reason

    def analyze(self, frames: Iterable[FramePacket]) -> List[DetectedCandidate]:
        raise DetectorUnavailable(self.reason)
