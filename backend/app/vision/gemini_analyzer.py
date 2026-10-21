"""Gemini Multimodal Video Analysis Engine for GlobalEye.

Uses Google's Gemini Vision-Language Models to detect road collisions, person falls,
fire/smoke, and parking obstructions from CCTV video footage.
"""
import base64
import json
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.enums import Category

log = logging.getLogger("globaleye.gemini")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

# Model candidate sequence: user model first, followed by proven production fallbacks
FALLBACK_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
]

PROMPT = """You are an expert CCTV security operations AI for a smart township community (Sime Darby Property).
Analyze these sampled video frames captured chronologically at 1-second intervals from a security camera.

Determine if any of the following 4 security/safety incident categories occurred in this footage:
1. "road_collision": Vehicle crash, car collision, motorcycle skid, rear-end impact, vehicle hitting pedestrian or barrier.
2. "person_fall": A person collapsed, fell, tripped, or is lying motionless/unresponsive on the ground or bench.
3. "parking_obstruction": A vehicle parked illegally blocking emergency egress, fire hydrant, driveway, or double-parked.
4. "fire_smoke": Open flames, thick smoke plume, hazardous burning, or suspected fire.

If no incident occurred (normal pedestrian/traffic activity), set "detected": false and "category": null.

Respond STRICTLY with a valid JSON object matching this schema (do not wrap in markdown quotes if possible):
{
  "detected": true,
  "category": "road_collision",
  "confidence": 0.94,
  "timestamp_s": 3.0,
  "title": "Two-Vehicle Collision at Roundabout Exit",
  "summary": "Silver sedan collided with a dark SUV near the exit lane. Both vehicles are stationary and blocking traffic.",
  "evidence": {
    "vehicles_involved": 2,
    "traffic_blocked": true,
    "motionless_seconds": null,
    "people_at_risk": 0,
    "secondary_hazard": true,
    "details": "Impact damaged front bumper of sedan; debris scattered in lane."
  }
}
"""


@dataclass
class GeminiAnalysisResult:
    detected: bool
    category: Optional[str]
    confidence: Optional[float]
    timestamp_s: float
    title: str
    summary: str
    evidence: Dict[str, Any]
    evidence_frame: Optional[np.ndarray]
    model_used: str
    error: Optional[str] = None


def extract_sampled_keyframes(video_path: Path, max_frames: int = 12) -> List[Tuple[float, np.ndarray]]:
    """Extract up to max_frames evenly spaced throughout the video."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return []

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
    if fps <= 0 or np.isnan(fps):
        fps = 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    frames: List[Tuple[float, np.ndarray]] = []

    if total_frames > 0:
        step = max(1, total_frames // max_frames)
        for idx in range(0, total_frames, step):
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ok, frame = cap.read()
            if not ok or frame is None:
                break
            ts = round(idx / fps, 2)
            # Resize to max 640px width to keep payload compact and fast
            h, w = frame.shape[:2]
            if w > 640:
                scale = 640.0 / w
                frame = cv2.resize(frame, (640, int(h * scale)))
            frames.append((ts, frame))
            if len(frames) >= max_frames:
                break
    else:
        # Sequential read fallback for streams or unindexed containers
        idx = 0
        step = max(1, int(fps))  # sample ~1 frame per second
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                break
            if idx % step == 0:
                ts = round(idx / fps, 2)
                h, w = frame.shape[:2]
                if w > 640:
                    scale = 640.0 / w
                    frame = cv2.resize(frame, (640, int(h * scale)))
                frames.append((ts, frame))
                if len(frames) >= max_frames:
                    break
            idx += 1

    cap.release()
    return frames


def _call_gemini_api(api_key: str, model: str, parts: List[Dict[str, Any]]) -> Dict[str, Any]:
    url = GEMINI_API_URL.format(model=model, key=api_key)
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    data_bytes = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def analyze_video_with_gemini(
    video_path: Path,
    api_key: str,
    primary_model: str = "gemini-3.5-flash-lite",
) -> GeminiAnalysisResult:
    """Analyze video frames with Gemini Flash. Handles model fallback gracefully."""
    keyframes = extract_sampled_keyframes(video_path, max_frames=12)
    if not keyframes:
        return GeminiAnalysisResult(
            detected=False,
            category=None,
            confidence=None,
            timestamp_s=0.0,
            title="Video Decode Failed",
            summary="Could not decode video frames.",
            evidence={},
            evidence_frame=None,
            model_used=primary_model,
            error="Could not decode frames",
        )

    # Build multimodal parts: prompt + base64 frames
    parts: List[Dict[str, Any]] = [{"text": PROMPT}]
    for ts, frame in keyframes:
        ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
        if ok:
            b64_data = base64.b64encode(buffer).decode("utf-8")
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": b64_data,
                }
            })

    # Try requested model first, then fallbacks if 404 (model not found)
    models_to_try = [primary_model]
    for fb in FALLBACK_MODELS:
        if fb not in models_to_try:
            models_to_try.append(fb)

    response_data: Optional[Dict[str, Any]] = None
    model_used = primary_model
    last_error: Optional[str] = None

    for m in models_to_try:
        try:
            log.info("Querying Gemini Vision API with model: %s", m)
            response_data = _call_gemini_api(api_key, m, parts)
            model_used = m
            break
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8", errors="ignore")
            last_error = f"HTTP {err.code}: {err_body}"
            log.warning("Gemini model %s failed (%s). Checking next fallback...", m, last_error)
            if err.code in (404, 400):
                # Model not found or bad request for this model; try next fallback
                continue
            else:
                break
        except Exception as exc:
            last_error = str(exc)
            log.warning("Gemini model %s connection error: %s", m, exc)
            break

    if not response_data:
        return GeminiAnalysisResult(
            detected=False,
            category=None,
            confidence=None,
            timestamp_s=0.0,
            title="Gemini Analysis Failed",
            summary=f"Gemini API request failed: {last_error}",
            evidence={},
            evidence_frame=None,
            model_used=model_used,
            error=last_error,
        )

    # Parse response content
    try:
        candidates = response_data.get("candidates", [])
        if not candidates:
            return GeminiAnalysisResult(
                detected=False, category=None, confidence=None, timestamp_s=0.0,
                title="No AI Candidate Returned", summary="Gemini returned no candidates.",
                evidence={}, evidence_frame=None, model_used=model_used, error="Empty response"
            )

        text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
        # Strip potential markdown fence
        cleaned = text_content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
    except Exception as exc:
        log.exception("Failed to parse Gemini output JSON: %s", exc)
        return GeminiAnalysisResult(
            detected=False, category=None, confidence=None, timestamp_s=0.0,
            title="JSON Parse Error", summary="Failed to parse Gemini structured response.",
            evidence={}, evidence_frame=None, model_used=model_used, error=str(exc)
        )

    detected = bool(parsed.get("detected", False))
    raw_category = parsed.get("category")
    category: Optional[str] = None
    if raw_category in (Category.ROAD_COLLISION.value, Category.PERSON_FALL.value,
                         Category.PARKING_OBSTRUCTION.value, Category.FIRE_SMOKE.value):
        category = raw_category

    target_ts = float(parsed.get("timestamp_s") or 0.0)

    # Pick the closest sampled frame as visual evidence
    best_frame: Optional[np.ndarray] = None
    if keyframes:
        best_frame = min(keyframes, key=lambda item: abs(item[0] - target_ts))[1].copy()

    # Annotate frame with high-tech AI detection banner
    if best_frame is not None and detected and category:
        conf_pct = int(float(parsed.get("confidence") or 0.9) * 100)
        h, w = best_frame.shape[:2]
        # Top banner
        cv2.rectangle(best_frame, (0, 0), (w, 36), (15, 23, 42), -1)
        banner_text = f"GEMINI AI [{model_used}]: {category.upper()} ({conf_pct}% CONF)"
        cv2.putText(best_frame, banner_text, (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 220, 255), 2)

    return GeminiAnalysisResult(
        detected=detected and (category is not None),
        category=category,
        confidence=float(parsed.get("confidence") or 0.90) if detected else None,
        timestamp_s=target_ts,
        title=parsed.get("title") or (f"{category.replace('_', ' ').title()} Detected" if category else "Normal"),
        summary=parsed.get("summary") or "Gemini multimodal video scan completed.",
        evidence=dict(parsed.get("evidence") or {}),
        evidence_frame=best_frame,
        model_used=model_used,
    )
