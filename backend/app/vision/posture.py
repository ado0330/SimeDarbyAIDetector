"""Temporal inference over per-frame person boxes: 'person-sized box stays horizontal and still'.

This is a transparent geometric HEURISTIC, not an action-recognition model. It cannot tell a fall from someone lying
down on purpose, and it will miss many real falls. Its output is only ever a *candidate* for human review.
Pure logic (no OpenCV models) so it is unit-testable with synthetic boxes.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class PersonObs:
    timestamp_s: float
    x: float  # pixels
    y: float
    w: float
    h: float
    score: float
    frame_w: int
    frame_h: int
    frame_index: int = 0

    @property
    def center(self) -> Tuple[float, float]:
        return (self.x + self.w / 2.0, self.y + self.h / 2.0)

    @property
    def horizontal(self) -> bool:
        return self.h > 0 and (self.w / self.h) >= 1.2


@dataclass
class PostureConfig:
    min_aspect: float = 1.2  # width/height at or above which a person box is "horizontal"
    min_duration_s: float = 4.0  # must persist at least this long
    min_observations: int = 3
    min_iou: float = 0.25
    max_gap_s: float = 3.5
    max_drift_ratio: float = 0.6  # centre drift relative to box width
    min_box_frame_ratio: float = 0.04  # ignore tiny boxes (< 4% of frame height)


@dataclass
class DownTrack:
    obs: List[PersonObs] = field(default_factory=list)

    @property
    def start(self) -> float:
        return self.obs[0].timestamp_s

    @property
    def end(self) -> float:
        return self.obs[-1].timestamp_s

    @property
    def duration(self) -> float:
        return self.end - self.start


def iou(a: PersonObs, b: PersonObs) -> float:
    ix = max(0.0, min(a.x + a.w, b.x + b.w) - max(a.x, b.x))
    iy = max(0.0, min(a.y + a.h, b.y + b.h) - max(a.y, b.y))
    inter = ix * iy
    union = a.w * a.h + b.w * b.h - inter
    return inter / union if union > 0 else 0.0


def build_tracks(frames: List[List[PersonObs]], cfg: Optional[PostureConfig] = None) -> List[DownTrack]:
    """Greedy association of *horizontal* person boxes across consecutive sampled frames."""
    cfg = cfg or PostureConfig()
    tracks: List[DownTrack] = []
    for obs_list in frames:
        for o in obs_list:
            if o.h <= 0 or (o.w / o.h) < cfg.min_aspect or o.h < cfg.min_box_frame_ratio * o.frame_h:
                continue
            best, best_iou = None, 0.0
            for t in tracks:
                last = t.obs[-1]
                if o.timestamp_s - last.timestamp_s > cfg.max_gap_s or o.timestamp_s <= last.timestamp_s:
                    continue
                v = iou(last, o)
                if v >= cfg.min_iou and v > best_iou:
                    best, best_iou = t, v
            if best is None:
                tracks.append(DownTrack([o]))
            else:
                best.obs.append(o)
    return tracks


def qualifying_tracks(tracks: List[DownTrack], cfg: Optional[PostureConfig] = None) -> List[DownTrack]:
    cfg = cfg or PostureConfig()
    out = []
    for t in tracks:
        if len(t.obs) < cfg.min_observations or t.duration < cfg.min_duration_s:
            continue
        cx0, cy0 = t.obs[0].center
        mean_w = sum(o.w for o in t.obs) / len(t.obs)
        drift = max(((o.center[0] - cx0) ** 2 + (o.center[1] - cy0) ** 2) ** 0.5 for o in t.obs)
        if drift > cfg.max_drift_ratio * mean_w:
            continue  # moving around -> not "stayed down"
        out.append(t)
    return out
