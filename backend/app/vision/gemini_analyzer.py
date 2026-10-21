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
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
]

PROMPT = """You are an expert CCTV security and township safety operations AI for Sime Darby Property smart townships.
Analyze these sampled video frames captured chronologically from a CCTV security camera.

CRITICAL FIRST DIRECTIVE:
Determine if this video footage shows NORMAL ROUTINE ACTIVITY or an ABNORMAL SAFETY HAZARD / INCIDENT.
The vast majority of township CCTV footage is NORMAL. YOU MUST DEFAULT TO NORMAL ACTIVITY UNLESS CLEAR, UNMISTAKABLE VISUAL EVIDENCE OF A SAFETY HAZARD OR VIOLATION IS VISIBLE.

STEP 1: NORMAL ACTIVITY CHECK:
If the video shows normal routine township life:
- Pedestrians walking normally, strolling, jogging, sitting on benches, exercising, or standing upright.
- Vehicles driving smoothly along roads, parking legally, or cycling normally.
- Normal landscape, trees swaying naturally, calm streets, or normal weather conditions.
-> For ALL normal situations above, you MUST return:
{
  "detected": false,
  "category": null,
  "is_danger": false,
  "confidence": 0.95,
  "timestamp_s": 0.0,
  "title": "Normal Activity Verified — No Incident",
  "summary": "Routine township activity observed. Pedestrians or vehicles moving normally without any falls, safety hazards, or security violations.",
  "evidence": {
    "status": "normal_routine",
    "hazard_level": "none"
  }
}

STEP 2: ABNORMAL INCIDENT CLASSIFICATION (ONLY IF AN ACTUAL HAZARD OCCURRED):
Only if an unmistakable incident is visible, set "detected": true and classify into ONE of:
1. "fire_smoke": Open flames, thick smoke plume, hazardous burning, fire flare, or thermal hazard.
2. "wildlife_intrusion": Wild or hazardous animals (wild boars, monkeys, venomous snakes, monitor lizards, stray aggressive packs) entering residential neighborhoods, parks, or pedestrian trails.
3. "restricted_area_intrusion": Unauthorized persons in high-danger restricted zones (persons on rooftop edges, climbing roof structures, electrical substations, construction perimeters, dangerous heights, retention pond banks).
4. "person_fall": A person who ACTUALLY collapsed, fell, tripped, slipped, or is lying prostrate/motionless horizontally on the ground.
   IMPORTANT: A person walking upright, jogging, standing, bending, or sitting is strictly NORMAL and NEVER a person_fall!
5. "road_collision": Vehicle collision, car crash, motorcycle skid, vehicle hitting pedestrian or cyclist.
6. "parking_obstruction": Vehicle blocking emergency egress route, fire hydrant, or double parked.
7. "pipe_burst_leakage": High-pressure water main burst or street flooding from plumbing failure.
8. "flash_flood": Rapid roadway or path inundation from storm/monsoon overflow.
9. "fallen_tree_storm_damage": Entire fallen tree or heavy branches blocking roads/paths, striking power lines or vehicles.
10. "road_pavement_defect": Opening sinkhole, road crater, or pavement collapse endangering traffic.
11. "structural_facility_damage": Falling building façade panel, loose roof sheets, broken overhead glass, or collapsed structure.
12. "illegal_dumping": Vehicle illegally dumping bulk garbage, chemical drums, or debris in public reserve.
13. "physical_altercation": Violent fight, physical assault, brawl, or menacing confrontation in public areas.

CRITICAL RULES FOR "evidence" FIELD:
- The "evidence" object MUST ONLY contain domain physical parameters describing what actually occurred in the incident.
- DO NOT mention AI models, Gemini, software algorithms, cameras, or filenames.
- Extract real visual parameters such as:
  * For "person_fall": "person_motionless_seconds" (number), "hazardous_location" (boolean), "bystander_assisting" (boolean), "person_attempting_to_stand" (boolean)
  * For "road_collision": "vehicles_involved" (number), "traffic_blocked" (boolean), "motionless_after_impact" (boolean), "persons_involved" (number)
  * For "fire_smoke": "smoke_or_flame_visible" (boolean), "spreading" (boolean), "people_in_vicinity" (boolean), "blocks_emergency_access" (boolean)
  * For "wildlife_intrusion": "animal_species" (string), "pack_size" (number), "proximity_to_pedestrians" (string), "aggressive_behavior" (boolean)
  * For "restricted_area_intrusion": "height_fall_hazard" (boolean), "entry_method" (string), "danger_zone" (string)
  * For "parking_obstruction": "blocks_emergency_access" (boolean), "duration_minutes" (number), "blocks_traffic_lane" (boolean)

RULES:
- NEVER hallucinate or force an incident. If you are uncertain or the scene is peaceful, IT IS NORMAL ACTIVITY ("detected": false, "category": null).
- "title": Specific and descriptive of the exact scene.
- "summary": 2-3 accurate sentences describing the visual sequence observed across the frames.
- Respond STRICTLY with a valid JSON object matching the schema (do not wrap in markdown quotes if possible).
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
    valid_categories = {c.value for c in Category}
    if raw_category in valid_categories:
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

    raw_ev = dict(parsed.get("evidence") or {})
    forbidden = {"model_used", "is_gemini", "ai_model", "model", "video_job_id", "filename", "file_name", "thumbnail", "status"}
    clean_ev = {k: v for k, v in raw_ev.items() if k.lower() not in forbidden and not isinstance(v, (dict, list))}

    return GeminiAnalysisResult(
        detected=detected and (category is not None),
        category=category,
        confidence=float(parsed.get("confidence") or 0.90) if detected else None,
        timestamp_s=target_ts,
        title=parsed.get("title") or (f"{category.replace('_', ' ').title()} Detected" if category else "Normal"),
        summary=parsed.get("summary") or "CCTV incident scan completed.",
        evidence=clean_ev,
        evidence_frame=best_frame,
        model_used=model_used,
    )
