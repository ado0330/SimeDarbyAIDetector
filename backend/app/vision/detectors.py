"""Concrete detectors.

``PersonDownDetector`` = (person-box provider) + (temporal posture heuristic).
Supported event: ``person_fall`` candidates meaning *"a person-sized box stayed horizontal and still"*.
It is NOT a validated fall-detection model.

Providers:
  * ``HogPersonProvider``  – OpenCV built-in HOG+SVM pedestrian detector (no download; weak on lying/occluded people).
  * ``YoloxPersonProvider`` – optional OpenCV-DNN YOLOX ONNX model (see scripts/download_model.py).
"""
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import cv2
import numpy as np

from app.enums import Category
from app.vision.base import DetectedCandidate, Detector, DetectorUnavailable, FramePacket
from app.vision.posture import PersonObs, PostureConfig, build_tracks, qualifying_tracks

Box = Tuple[float, float, float, float, float]  # x, y, w, h, score (pixels in the *provided* image)


class PersonProvider:
    id = "provider"
    version = "0"

    def availability(self) -> Tuple[bool, str]:
        return True, "ok"

    def detect(self, image: np.ndarray) -> List[Box]:  # pragma: no cover - interface
        raise NotImplementedError


class HogPersonProvider(PersonProvider):
    id = "opencv-hog-people"
    version = "opencv-%s" % cv2.__version__

    def __init__(self, max_width: int = 640):
        self.max_width = max_width
        self._hog: Optional[cv2.HOGDescriptor] = None

    def availability(self) -> Tuple[bool, str]:
        try:
            self._get()
            return True, "OpenCV HOG pedestrian detector (built in; limited accuracy, upright people work best)."
        except Exception as exc:  # pragma: no cover
            return False, "OpenCV HOG detector could not be created: %s" % exc

    def _get(self) -> cv2.HOGDescriptor:
        if self._hog is None:
            hog = cv2.HOGDescriptor()
            hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            self._hog = hog
        return self._hog

    def detect(self, image: np.ndarray) -> List[Box]:
        h, w = image.shape[:2]
        scale = min(1.0, self.max_width / float(w))
        img = cv2.resize(image, (int(w * scale), int(h * scale))) if scale < 1.0 else image
        rects, weights = self._get().detectMultiScale(img, winStride=(8, 8), padding=(8, 8), scale=1.05)
        out: List[Box] = []
        for (x, y, rw, rh), wt in zip(rects, np.array(weights).reshape(-1) if len(rects) else []):
            out.append((x / scale, y / scale, rw / scale, rh / scale, float(wt)))
        return out


class YoloxPersonProvider(PersonProvider):
    """YOLOX (COCO) via OpenCV DNN. Requires the ONNX file; never downloaded implicitly."""

    id = "opencv-dnn-yolox"
    version = "yolox-onnx"
    INPUT = 640
    STRIDES = (8, 16, 32)

    def __init__(self, model_path: Path, score_threshold: float = 0.35, nms_threshold: float = 0.45):
        self.model_path = Path(model_path)
        self.score_threshold = score_threshold
        self.nms_threshold = nms_threshold
        self._net = None
        self._grid: Optional[np.ndarray] = None
        self._strides: Optional[np.ndarray] = None

    def availability(self) -> Tuple[bool, str]:
        if not self.model_path.is_file():
            return False, ("YOLOX model file not found at %s. Run `python scripts/download_model.py`." % self.model_path.name)
        try:
            self._load()
            return True, "YOLOX (COCO) ONNX model loaded via OpenCV DNN."
        except Exception as exc:
            return False, "YOLOX model failed to load: %s" % exc

    def _load(self) -> None:
        if self._net is not None:
            return
        self._net = cv2.dnn.readNetFromONNX(str(self.model_path))
        grids, strides = [], []
        for s in self.STRIDES:
            n = self.INPUT // s
            xv, yv = np.meshgrid(np.arange(n), np.arange(n))
            grids.append(np.stack((xv, yv), 2).reshape(-1, 2))
            strides.append(np.full((n * n, 1), s))
        self._grid = np.concatenate(grids, 0).astype(np.float32)
        self._strides = np.concatenate(strides, 0).astype(np.float32)

    def detect(self, image: np.ndarray) -> List[Box]:
        self._load()
        h, w = image.shape[:2]
        r = min(self.INPUT / h, self.INPUT / w)
        resized = cv2.resize(image, (int(w * r), int(h * r)))
        canvas = np.full((self.INPUT, self.INPUT, 3), 114, dtype=np.uint8)
        canvas[: resized.shape[0], : resized.shape[1]] = resized
        blob = cv2.dnn.blobFromImage(canvas.astype(np.float32), 1.0, (self.INPUT, self.INPUT), swapRB=False)
        self._net.setInput(blob)
        out = self._net.forward()[0]  # (N, 85)
        xy = (out[:, :2] + self._grid) * self._strides
        wh = np.exp(out[:, 2:4]) * self._strides
        scores = out[:, 4:5] * out[:, 5:]
        person = scores[:, 0]  # COCO class 0 = person
        keep = person >= self.score_threshold
        if not keep.any():
            return []
        boxes = np.concatenate([xy[keep] - wh[keep] / 2, wh[keep]], 1) / r
        sc = person[keep]
        idx = cv2.dnn.NMSBoxes(boxes.tolist(), sc.tolist(), self.score_threshold, self.nms_threshold)
        result: List[Box] = []
        for i in np.array(idx).reshape(-1):
            bx, by, bw, bh = boxes[i]
            result.append((float(bx), float(by), float(bw), float(bh), float(sc[i])))
        return result


class PersonDownDetector(Detector):
    supported_categories = (Category.PERSON_FALL.value,)
    sample_interval_s = 1.0

    def __init__(self, provider: PersonProvider, cfg: Optional[PostureConfig] = None, sample_interval_s: float = 1.0):
        self.provider = provider
        self.cfg = cfg or PostureConfig()
        self.sample_interval_s = sample_interval_s
        self.id = "person-down-heuristic/%s" % provider.id
        self.version = "heuristic-1/%s" % provider.version
        self.description = ("Finds person-sized boxes that stay horizontal and still. A heuristic candidate generator "
                            "(not a validated fall detector); every candidate needs human review.")

    def availability(self) -> Tuple[bool, str]:
        return self.provider.availability()

    def analyze(self, frames: Iterable[FramePacket]) -> List[DetectedCandidate]:
        ok, note = self.availability()
        if not ok:
            raise DetectorUnavailable(note)
        per_frame: List[List[PersonObs]] = []
        kept_images: Dict[int, np.ndarray] = {}
        for fp in frames:
            h, w = fp.image.shape[:2]
            obs = [PersonObs(fp.timestamp_s, bx, by, bw, bh, sc, w, h, fp.index)
                   for (bx, by, bw, bh, sc) in self.provider.detect(fp.image)]
            if any(o.horizontal for o in obs):
                kept_images[fp.index] = fp.image.copy()
            per_frame.append(obs)
        tracks = qualifying_tracks(build_tracks(per_frame, self.cfg), self.cfg)
        candidates: List[DetectedCandidate] = []
        for t in tracks:
            mid = t.obs[len(t.obs) // 2]
            ev_img = kept_images.get(mid.frame_index)
            if ev_img is not None:
                ev_img = ev_img.copy()
                cv2.rectangle(ev_img, (int(mid.x), int(mid.y)), (int(mid.x + mid.w), int(mid.y + mid.h)), (0, 0, 255), 3)
                cv2.putText(ev_img, "candidate: person horizontal %.0fs (heuristic)" % t.duration,
                            (int(max(5, mid.x)), int(max(25, mid.y - 8))), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            candidates.append(DetectedCandidate(
                category=Category.PERSON_FALL.value, timestamp_s=round(t.start, 2), end_timestamp_s=round(t.end, 2),
                confidence=None,
                bbox={"x": mid.x / mid.frame_w, "y": mid.y / mid.frame_h, "w": mid.w / mid.frame_w, "h": mid.h / mid.frame_h},
                evidence={"person_motionless_seconds": round(t.duration, 1)},
                details={"method": "person-sized box stayed horizontal and still",
                         "observations": len(t.obs),
                         "mean_person_detection_score": round(sum(o.score for o in t.obs) / len(t.obs), 3),
                         "confidence_note": "No event-level confidence is available; the score above is the person-detector's "
                                            "box score only.",
                         "limitations": "Heuristic. Cannot distinguish a fall from lying down intentionally; may miss real falls."},
                model_id=self.id, model_version=self.version, frame_index=mid.frame_index, evidence_frame=ev_img))
        return candidates
