"""Video validation and frame extraction (OpenCV). Independent of any detector or of the database."""
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Optional

import cv2

from app.vision.base import FramePacket

# Magic-byte signatures (extension alone is not trusted).
_SIGNATURES = {
    ".mp4": lambda h: h[4:8] == b"ftyp",
    ".mov": lambda h: h[4:8] in (b"ftyp", b"moov", b"mdat", b"wide", b"free"),
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
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            raise VideoError("The file could not be opened as a video (unsupported codec or corrupted file).", "unreadable_video")
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        ok, frame = cap.read()
        if not ok or frame is None:
            raise VideoError("No frames could be decoded from this file (corrupted or unsupported codec).", "unreadable_video")
        if fps <= 0 or fps > 240:
            raise VideoError("The video reports an invalid frame rate.", "unreadable_video")
        if count <= 0:
            raise VideoError("The video reports no frames.", "unreadable_video")
        duration = count / fps
        if duration > max_seconds:
            raise VideoError("Video is %.0f s long; the limit is %d s." % (duration, max_seconds), "video_too_long")
        return VideoInfo(fps=fps, frame_count=count, duration_s=round(duration, 2), width=width, height=height)
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
