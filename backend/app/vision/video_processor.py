"""Video validation and frame extraction (OpenCV). Independent of any detector or of the database."""
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Optional

import cv2
import numpy as np

from app.vision.base import FramePacket

# Magic-byte signatures (extension alone is not trusted).
_SIGNATURES = {
    ".mp4": lambda h: (len(h) >= 8 and h[4:8] in (b"ftyp", b"moov", b"mdat", b"wide", b"free", b"skip")) or b"ftyp" in h[:32],
    ".mov": lambda h: (len(h) >= 8 and h[4:8] in (b"ftyp", b"moov", b"mdat", b"wide", b"free")) or b"ftyp" in h[:32] or b"moov" in h[:32],
    ".avi": lambda h: h[:4] == b"RIFF" and h[8:12] == b"AVI ",
    ".mkv": lambda h: h[:4] == b"\x1a\x45\xdf\xa3",
    ".webm": lambda h: h[:4] == b"\x1a\x45\xdf\xa3",
}


class VideoError(Exception):
    """User-facing video problem (unsupported, corrupt, too long ...)."""

    def __init__(self, message: str, code: str = "invalid_video"):
        super().__init__(message)
        self.message = message
        self.code = code


class ProcessingTimeout(VideoError):
    def __init__(self, seconds: int):
        super().__init__("Processing exceeded the %d s time limit" % seconds, "processing_timeout")


@dataclass
class VideoInfo:
    fps: float
    frame_count: int
    duration_s: float
    width: int
    height: int


def check_signature(ext: str, header: bytes) -> bool:
    fn = _SIGNATURES.get(ext.lower())
    return bool(fn and len(header) >= 12 and fn(header))


def probe_video(path: Path, max_seconds: int) -> VideoInfo:
    try:
        cap = cv2.VideoCapture(str(path))
    except Exception as exc:
        raise VideoError("The file could not be opened as a video (%s)." % exc, "unreadable_video")
    try:
        if not cap.isOpened():
            raise VideoError("The file could not be opened as a video (unsupported codec or corrupted file).", "unreadable_video")

        ok, frame = cap.read()
        if not ok or frame is None:
            raise VideoError("No frames could be decoded from this file (corrupted or unsupported codec).", "unreadable_video")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        if fps <= 0 or fps > 240 or np.isnan(fps) or np.isinf(fps):
            fps = 25.0

        count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if count <= 0:
            cap.set(cv2.CAP_PROP_POS_AVI_RATIO, 1)
            duration_probe = float(cap.get(cv2.CAP_PROP_POS_MSEC) or 0.0) / 1000.0
            if duration_probe > 0:
                duration = duration_probe
                count = max(1, int(duration * fps))
            else:
                duration = 10.0
                count = max(1, int(duration * fps))
        else:
            duration = count / fps

        if duration > max_seconds:
            raise VideoError("Video is %.0f s long; the limit is %d s." % (duration, max_seconds), "video_too_long")
        return VideoInfo(fps=round(fps, 2), frame_count=count, duration_s=round(duration, 2), width=width, height=height)
    except cv2.error as exc:
        raise VideoError("OpenCV decoding error: %s" % exc, "unreadable_video")
    finally:
        cap.release()


def iter_sampled_frames(path: Path, interval_s: float, timeout_s: Optional[int] = None) -> Iterator[FramePacket]:
    """Yield one frame every ``interval_s`` seconds, preserving timestamps and frame indices."""
    cap = cv2.VideoCapture(str(path))
    started = time.monotonic()
    try:
        if not cap.isOpened():
            raise VideoError("The file could not be opened as a video.", "unreadable_video")
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0) or 25.0
        step = max(1, int(round(fps * interval_s)))
        index = 0
        while True:
            if timeout_s is not None and time.monotonic() - started > timeout_s:
                raise ProcessingTimeout(timeout_s)
            if index % step == 0:
                ok, frame = cap.read()
                if not ok:
                    break
                yield FramePacket(index=index, timestamp_s=round(index / fps, 3), image=frame)
            else:
                if not cap.grab():
                    break
            index += 1
    finally:
        cap.release()
