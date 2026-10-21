"""Video analysis endpoints."""
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import current_actor
from app.api.incidents import _mutation
from app.config import get_settings
from app.database import get_db
from app.errors import NotFound
from app.models import EventCandidate, VideoJob
from app.schemas import CandidateReviewRequest
from app.services import video_service as vs
from app.services.serializers import frame_url
from app.vision.registry import detector_status

router = APIRouter(prefix="/api", tags=["video"])


def _candidate_dict(c: EventCandidate) -> Dict[str, Any]:
    return {
        "id": c.id, "video_job_id": c.video_job_id, "category": c.category, "timestamp_s": c.timestamp_s,
        "end_timestamp_s": c.end_timestamp_s, "confidence": c.confidence, "bbox": c.bbox, "evidence": c.evidence,
        "details": c.details, "frame_url": frame_url(c.frame_reference), "model_id": c.model_id,
        "model_version": c.model_version, "preview": c.preview, "status": c.status, "incident_id": c.incident_id,
        "reviewed_by": c.reviewed_by, "reviewed_at": c.reviewed_at, "review_note": c.review_note,
        "created_at": c.created_at, "source": "video_analysis",
        "source_clip": c.video_job.original_filename if c.video_job else None,
        "urgent_review": bool((c.preview or {}).get("emergency")),
    }


def _job_dict(j: VideoJob, include_candidates: bool = True) -> Dict[str, Any]:
    d = {
        "id": j.id, "original_filename": j.original_filename, "size_bytes": j.size_bytes, "camera_id": j.camera_id,
        "status": j.status, "progress": j.progress, "error": j.error, "duration_s": j.duration_s, "fps": j.fps,
        "frame_count": j.frame_count, "frames_analyzed": j.frames_analyzed, "detector_id": j.detector_id,
        "detector_version": j.detector_version, "detector_available": j.detector_available,
        "detector_note": j.detector_note, "created_at": j.created_at, "started_at": j.started_at,
        "completed_at": j.completed_at, "video_available": not j.video_deleted,
        "video_url": "/api/videos/%s/file" % j.id if not j.video_deleted else None,
        "candidate_count": len(j.candidates),
    }
    if include_candidates:
        d["candidates"] = [_candidate_dict(c) for c in sorted(j.candidates, key=lambda c: c.timestamp_s)]
    return d


class GeminiConfigRequest(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None
    auto_promote: Optional[bool] = None


@router.get("/config/gemini")
def get_gemini_config() -> Dict[str, Any]:
    s = get_settings()
    masked = (s.gemini_api_key[:4] + "..." + s.gemini_api_key[-4:]) if s.gemini_api_key and len(s.gemini_api_key) > 8 else ("configured" if s.gemini_api_key else None)
    return {
        "enabled": bool(s.gemini_api_key),
        "model": s.gemini_model,
        "auto_promote": s.gemini_auto_promote,
        "has_key": bool(s.gemini_api_key),
        "masked_key": masked,
    }


@router.post("/config/gemini")
def set_gemini_config(req: GeminiConfigRequest) -> Dict[str, Any]:
    from app.config import update_gemini_settings
    s = update_gemini_settings(api_key=req.api_key, model=req.model, auto_promote=req.auto_promote)
    masked = (s.gemini_api_key[:4] + "..." + s.gemini_api_key[-4:]) if s.gemini_api_key and len(s.gemini_api_key) > 8 else ("configured" if s.gemini_api_key else None)
    return {
        "message": "Gemini configuration updated successfully",
        "enabled": bool(s.gemini_api_key),
        "model": s.gemini_model,
        "auto_promote": s.gemini_auto_promote,
        "has_key": bool(s.gemini_api_key),
        "masked_key": masked,
    }


@router.get("/video/status")
def video_status() -> Dict[str, Any]:
    s = get_settings()
    if s.gemini_api_key:
        det = {
            "id": f"gemini/{s.gemini_model}",
            "version": "multimodal-vlm",
            "description": f"Google Gemini Vision Model ({s.gemini_model}) for zero-shot incident understanding.",
            "available": True,
            "note": f"Active: Google Gemini Flash ({s.gemini_model}) with auto-triage.",
            "supported_categories": ["road_collision", "person_fall", "parking_obstruction", "fire_smoke"],
            "configured": s.gemini_model,
        }
        supported = [
            "road_collision (car accidents, vehicle crashes, motorcycle slides)",
            "person_fall (collapsed/motionless persons, medical distress)",
            "parking_obstruction (illegal parking, blocked emergency access)",
            "fire_smoke (smoke plumes, flames, suspected fire)",
        ]
        note = f"Active Vision Engine: Google Gemini ({s.gemini_model}). Analyzes CCTV video and automatically triages incidents."
    else:
        det = detector_status()
        supported = ["person_fall (heuristic: person-sized box stays horizontal and still)"]
        note = "Local OpenCV heuristic active. Configure a Gemini API key to enable multi-incident video detection (car crashes, smoke, etc.)."

    return {
        "detector": det,
        "limits": {
            "max_upload_mb": s.max_upload_mb,
            "max_video_seconds": s.max_video_seconds,
            "allowed_extensions": s.allowed_video_extensions,
        },
        "supported_events": supported,
        "note": note,
        "gemini": {
            "enabled": bool(s.gemini_api_key),
            "model": s.gemini_model,
            "auto_promote": s.gemini_auto_promote,
        },
    }


@router.post("/videos", status_code=202)
def upload_video(background: BackgroundTasks, file: UploadFile = File(...), camera_id: Optional[str] = Form(None),
                 db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Upload a clip. Returns immediately (202); poll ``GET /api/videos/{id}`` for processing status."""
    job = vs.save_upload(db, file, camera_id or None)
    background.add_task(vs.process_video_job, job.id)
    return _job_dict(job, include_candidates=False)


@router.post("/videos/demo-clip", status_code=202)
def upload_demo_clip(background: BackgroundTasks, camera_id: Optional[str] = Form("CAM-PARK-01"),
                     db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Queue pre-bundled sample CCTV footage for evaluation without requiring local file upload."""
    sample_path = Path(__file__).resolve().parent.parent.parent / "samples" / "sample_cctv_fall.mp4"
    if not sample_path.is_file():
        raise NotFound("Sample demo clip is not available on server")
    with open(sample_path, "rb") as f:
        file_obj = UploadFile(filename="sample_cctv_fall.mp4", file=f, headers={"content-type": "video/mp4"})
        job = vs.save_upload(db, file_obj, camera_id or "CAM-PARK-01")
        background.add_task(vs.process_video_job, job.id)
        return _job_dict(job, include_candidates=False)


@router.get("/videos/sample-file")
def get_sample_video_file():
    """Download the bundled sample CCTV clip."""
    sample_path = Path(__file__).resolve().parent.parent.parent / "samples" / "sample_cctv_fall.mp4"
    if not sample_path.is_file():
        raise NotFound("Sample demo clip is not available on server")
    return FileResponse(sample_path, media_type="video/mp4", filename="sample_cctv_fall.mp4")


@router.get("/videos")
def list_videos(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    jobs = db.query(VideoJob).order_by(VideoJob.created_at.desc()).limit(50).all()
    return [_job_dict(j, include_candidates=False) for j in jobs]


@router.get("/videos/{job_id}")
def get_video(job_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return _job_dict(vs.get_job(db, job_id))


@router.get("/videos/{job_id}/file")
@router.head("/videos/{job_id}/file")
@router.get("/video/jobs/{job_id}/stream")
@router.head("/video/jobs/{job_id}/stream")
def get_video_file(job_id: str, db: Session = Depends(get_db)):
    job = vs.get_job(db, job_id)
    path = get_settings().upload_dir / job.stored_filename
    if job.video_deleted or not path.is_file():
        raise NotFound("The clip is no longer retained on the server")
    ext = path.suffix.lower()
    media_types = {
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".webm": "video/webm",
        ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska",
    }
    media_type = media_types.get(ext, "video/mp4")
    return FileResponse(path, media_type=media_type)


@router.delete("/videos/{job_id}")
def delete_video(job_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Deletes the stored clip file (candidates and evidence frames are retained)."""
    return _job_dict(vs.delete_video_file(db, job_id), include_candidates=False)


@router.get("/candidates")
def list_candidates(status: Optional[str] = None, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    q = db.query(EventCandidate)
    if status:
        q = q.filter(EventCandidate.status == status)
    rows = q.order_by(EventCandidate.id.desc()).limit(200).all()
    rows.sort(key=lambda c: (not bool((c.preview or {}).get("emergency")), -c.id))  # urgent first
    return [_candidate_dict(c) for c in rows]


@router.post("/candidates/{candidate_id}/review")
def review_candidate(candidate_id: int, body: CandidateReviewRequest, actor: str = Depends(current_actor),
                     db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Accept (→ incident through the shared prioritization engine) or reject a detector candidate."""
    res = vs.review_candidate(db, candidate_id, body.decision, body.note, actor)
    out: Dict[str, Any] = {"candidate": _candidate_dict(res["candidate"])}
    if res["mutation"] is not None:
        out["mutation"] = _mutation(db, res["mutation"])
    return out
