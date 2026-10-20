"""Detector selection (configurable via ``TG_DETECTOR``).

    none                -> explicit "unavailable" state
    hog_posture         -> OpenCV HOG person boxes + posture heuristic (always available)
    yolox_posture       -> YOLOX ONNX person boxes + posture heuristic (needs model file)
    auto (default)      -> yolox_posture if model file present, else hog_posture
"""
from pathlib import Path
from typing import Any, Dict

from app.config import BACKEND_DIR, get_settings
from app.vision.base import Detector, UnavailableDetector
from app.vision.detectors import HogPersonProvider, PersonDownDetector, YoloxPersonProvider

MODEL_DIR = BACKEND_DIR / "models"
YOLOX_FILE = MODEL_DIR / "yolox_s.onnx"


def get_detector() -> Detector:
    s = get_settings()
    choice = (s.detector or "auto").lower()
    interval = s.frame_sample_interval_seconds
    if choice in ("none", "off", "disabled"):
        return UnavailableDetector()
    if choice == "auto":
        choice = "yolox_posture" if YOLOX_FILE.is_file() else "hog_posture"
    if choice == "hog_posture":
        return PersonDownDetector(HogPersonProvider(), sample_interval_s=interval)
    if choice == "yolox_posture":
        return PersonDownDetector(YoloxPersonProvider(YOLOX_FILE), sample_interval_s=interval)
    return UnavailableDetector("Unknown detector '%s'. Valid: auto, hog_posture, yolox_posture, none." % s.detector)


def detector_status() -> Dict[str, Any]:
    d = get_detector()
    info = d.info()
    info["configured"] = get_settings().detector
    return info
