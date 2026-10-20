"""Video analysis endpoints."""
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


@router.get("/video/status")
def video_status() -> Dict[str, Any]:
    s = get_settings()
    return {"detector": detector_status(), "limits": {"max_upload_mb": s.max_upload_mb,
                                                       "max_video_seconds": s.max_video_seconds,
                                                       "allowed_extensions": s.allowed_video_extensions},
            "supported_events": ["person_fall (heuristic: person-sized box stays horizontal and still)"],
            "note": "Only the listed event type is implemented. Detections are heuristic candidates requiring human review. "
                    "Other event types are available only through clearly-labelled simulation."}


@router.post("/videos", status_code=202)
def upload_video(background: BackgroundTasks, file: UploadFile = File(...), camera_id: Optional[str] = Form(None),
                 db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Upload a clip. Returns immediately (202); poll ``GET /api/videos/{id}`` for processing status."""
    job = vs.save_upload(db, file, camera_id or None)
    background.add_task(vs.process_video_job, job.id)
    return _job_dict(job, include_candidates=False)


@router.get("/videos")
def list_videos(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    jobs = db.query(VideoJob).order_by(VideoJob.created_at.desc()).limit(50).all()
    return [_job_dict(j, include_candidates=False) for j in jobs]


@router.get("/videos/{job_id}")
def get_video(job_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return _job_dict(vs.get_job(db, job_id))


@router.get("/videos/{job_id}/file")
def get_video_file(job_id: str, db: Session = Depends(get_db)):
    job = vs.get_job(db, job_id)
    path = get_settings().upload_dir / job.stored_filename
    if job.video_deleted or not path.is_file():
        raise NotFound("The clip is no longer retained on the server")
    return FileResponse(path)


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
