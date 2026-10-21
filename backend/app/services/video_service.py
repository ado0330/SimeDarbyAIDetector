"""Video upload handling, background analysis and candidate review.

Retention (prototype): uploaded clips live in ``data/uploads`` under random names and are deleted automatically after
``TG_RETAIN_UPLOADS_HOURS`` (default 24 h) or on request (``DELETE /api/videos/{id}``). Evidence frames of candidates
(small JPEGs) are kept as incident evidence.
"""
import logging
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

import cv2
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal, utcnow
from app.enums import CandidateStatus, SourceType, VideoStatus
from app.errors import Conflict, NotFound, ServiceError, ValidationFailed
from app.models import AuditLog, Camera, EventCandidate, EvidenceItem, VideoJob
from app.services import incident_service as svc
from app.services.prioritization import compute_priority
from app.vision import gemini_analyzer
from app.vision.base import DetectorUnavailable, FramePacket
from app.vision.registry import get_detector
from app.vision.video_processor import ProcessingTimeout, VideoError, check_signature, iter_sampled_frames, probe_video

log = logging.getLogger("township_guardian.video")

CHUNK = 1024 * 1024


class PayloadTooLarge(ServiceError):
    status_code = 413
    code = "file_too_large"


class UnsupportedMedia(ServiceError):
    status_code = 415
    code = "unsupported_media_type"


def _safe_display_name(name: Optional[str]) -> str:
    base = Path(name or "clip").name  # strips any directory components
    base = re.sub(r"[^\w.\- ]", "_", base)[:120]
    return base or "clip"


def save_upload(db: Session, upload: UploadFile, camera_id: Optional[str]) -> VideoJob:
    """Validate and store an upload, creating a queued VideoJob. Never trusts client-supplied names."""
    s = get_settings()
    ext = Path(upload.filename or "").suffix.lower()
    if ext not in s.allowed_video_extensions:
        raise UnsupportedMedia("Unsupported file type '%s'. Allowed: %s" % (ext or "(none)", ", ".join(s.allowed_video_extensions)))
    if camera_id and db.get(Camera, camera_id) is None:
        raise ValidationFailed("Unknown camera_id '%s'" % camera_id, [{"field": "camera_id"}])

    s.upload_dir.mkdir(parents=True, exist_ok=True)
    job_id = uuid.uuid4().hex
    stored = "%s%s" % (job_id, ext)
    path = s.upload_dir / stored
    size = 0
    try:
        with open(path, "wb") as out:
            header = b""
            while True:
                chunk = upload.file.read(CHUNK)
                if not chunk:
                    break
                if len(header) < 16:
                    header = (header + chunk)[:16]
                size += len(chunk)
                if size > s.max_upload_bytes:
                    raise PayloadTooLarge("File exceeds the %d MB limit." % s.max_upload_mb)
                out.write(chunk)
        if size == 0:
            raise ValidationFailed("The uploaded file is empty.")
        if not check_signature(ext, header):
            raise UnsupportedMedia("File content does not match a %s video." % ext)
        try:
            info = probe_video(path, s.max_video_seconds)
        except VideoError as exc:
            raise ValidationFailed(exc.message, code=exc.code)
        except Exception as exc:
            log.exception("Unexpected error while probing uploaded video %s", upload.filename)
            raise ValidationFailed("Could not decode video file (%s)." % type(exc).__name__, code="unreadable_video")
    except Exception:
        path.unlink(missing_ok=True)
        raise

    job = VideoJob(id=job_id, original_filename=_safe_display_name(upload.filename), stored_filename=stored,
                   size_bytes=size, camera_id=camera_id, status=VideoStatus.QUEUED.value, duration_s=info.duration_s,
                   fps=round(info.fps, 2), frame_count=info.frame_count, created_at=utcnow())
    db.add(job)
    db.commit()
    return job


def _frame_filename(job_id: str, n: int) -> str:
    return "%s_c%d.jpg" % (job_id, n)


def process_video_job(job_id: str) -> None:
    """Background task: sample frames → detector → candidates. Own DB session; never raises."""
    db = SessionLocal()
    try:
        job = db.get(VideoJob, job_id)
        if job is None or job.status == VideoStatus.COMPLETED.value:
            return
        s = get_settings()
        path = s.upload_dir / job.stored_filename
        if not path.is_file():
            raise VideoError("The uploaded clip is no longer available on the server.", "video_missing")

        # --- Path A: Gemini Multimodal Vision API (Zero-Shot Incident Understanding) ---
        if s.gemini_api_key:
            job.detector_id = f"gemini/{s.gemini_model}"
            job.detector_version = "vlm-multimodal"
            job.detector_available = True
            job.detector_note = f"Google Gemini Vision Model ({s.gemini_model})"
            job.status, job.started_at, job.progress = VideoStatus.PROCESSING.value, utcnow(), 0.2
            db.commit()

            res = gemini_analyzer.analyze_video_with_gemini(path, s.gemini_api_key, s.gemini_model)
            job.frames_analyzed = 12
            job.progress = 0.85
            db.commit()

            if res.detected and res.category:
                s.frames_dir.mkdir(parents=True, exist_ok=True)
                ref = _frame_filename(job.id, 1)
                if res.evidence_frame is not None:
                    cv2.imwrite(str(s.frames_dir / ref), res.evidence_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                else:
                    ref = None

                scored = compute_priority(res.category, res.evidence, res.confidence)
                preview = scored.to_dict()
                preview["explanation"] = scored.explanation

                cand = EventCandidate(
                    video_job_id=job.id,
                    category=res.category,
                    timestamp_s=res.timestamp_s,
                    end_timestamp_s=res.timestamp_s,
                    confidence=res.confidence,
                    bbox={"x": 0.05, "y": 0.05, "w": 0.9, "h": 0.9},
                    evidence=res.evidence,
                    details={
                        "method": f"Gemini VLM ({res.model_used}) multimodal video analysis",
                        "title": res.title,
                        "summary": res.summary,
                    },
                    frame_reference=ref,
                    model_id=f"gemini/{res.model_used}",
                    model_version="multimodal-vlm",
                    preview=preview,
                    status=CandidateStatus.PENDING.value,
                    created_at=utcnow(),
                )
                db.add(cand)
                db.flush()

                if s.gemini_auto_promote:
                    review_candidate(
                        db,
                        cand.id,
                        decision="accept",
                        note=f"Auto-promoted by Gemini AI ({res.model_used}): {res.summary}",
                        actor=f"Gemini AI ({res.model_used})",
                    )

            job.frames_analyzed = 12
            job.progress = 1.0
            job.status, job.completed_at = VideoStatus.COMPLETED.value, utcnow()
            job.error = res.error if not res.detected and res.error else None
            db.commit()
            return

        # --- Path B: Local OpenCV Heuristic Detector (Baseline / Offline) ---
        detector = get_detector()
        ok, note = detector.availability()
        job.detector_id, job.detector_version = detector.id, detector.version
        job.detector_available, job.detector_note = ok, note
        job.status, job.started_at, job.progress = VideoStatus.PROCESSING.value, utcnow(), 0.0
        db.commit()
        if not ok:
            raise DetectorUnavailable(note)

        total = max(1, int((job.duration_s or 1) / max(0.1, s.frame_sample_interval_seconds)) + 1)
        counter = {"n": 0}

        def tracked() -> Iterator[FramePacket]:
            for fp in iter_sampled_frames(path, s.frame_sample_interval_seconds, s.processing_timeout_seconds):
                counter["n"] += 1
                if counter["n"] % 3 == 0:
                    job.frames_analyzed, job.progress = counter["n"], min(0.95, counter["n"] / total)
                    db.commit()
                yield fp

        found = detector.analyze(tracked())
        s.frames_dir.mkdir(parents=True, exist_ok=True)
        for n, c in enumerate(found, start=1):
            ref = None
            if c.evidence_frame is not None:
                ref = _frame_filename(job.id, n)
                cv2.imwrite(str(s.frames_dir / ref), c.evidence_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            scored = compute_priority(c.category, c.evidence, c.confidence)
            preview = scored.to_dict()
            preview["explanation"] = scored.explanation
            cand = EventCandidate(
                video_job_id=job.id, category=c.category, timestamp_s=c.timestamp_s, end_timestamp_s=c.end_timestamp_s,
                confidence=c.confidence, bbox=c.bbox, evidence=c.evidence, details=c.details, frame_reference=ref,
                model_id=c.model_id, model_version=c.model_version, preview=preview,
                status=CandidateStatus.PENDING.value, created_at=utcnow())
            db.add(cand)
        job.frames_analyzed, job.progress = counter["n"], 1.0
        job.status, job.completed_at = VideoStatus.COMPLETED.value, utcnow()
        job.error = None
        db.commit()
    except DetectorUnavailable as exc:
        _fail(db, job_id, "Detector unavailable: %s" % exc)
    except VideoError as exc:
        _fail(db, job_id, exc.message)
    except Exception as exc:  # pragma: no cover - defensive
        log.exception("Video processing failed for %s", job_id)
        _fail(db, job_id, "Processing failed unexpectedly (%s)." % type(exc).__name__)
    finally:
        db.close()


def _fail(db: Session, job_id: str, message: str) -> None:
    db.rollback()
    job = db.get(VideoJob, job_id)
    if job is not None:
        job.status, job.error, job.completed_at = VideoStatus.FAILED.value, message, utcnow()
        db.commit()


def get_job(db: Session, job_id: str) -> VideoJob:
    job = db.get(VideoJob, job_id)
    if job is None:
        raise NotFound("Video job %s was not found" % job_id)
    return job


def delete_video_file(db: Session, job_id: str) -> VideoJob:
    job = get_job(db, job_id)
    (get_settings().upload_dir / job.stored_filename).unlink(missing_ok=True)
    job.video_deleted = True
    db.commit()
    return job


def purge_expired_uploads() -> int:
    """Delete clips older than the retention window (called at startup)."""
    s = get_settings()
    cutoff = utcnow() - timedelta(hours=s.retain_uploads_hours)
    db = SessionLocal()
    purged = 0
    try:
        for job in db.query(VideoJob).filter(VideoJob.created_at < cutoff, VideoJob.video_deleted.is_(False)).all():
            (s.upload_dir / job.stored_filename).unlink(missing_ok=True)
            job.video_deleted = True
            purged += 1
        db.commit()
    finally:
        db.close()
    return purged


def review_candidate(db: Session, candidate_id: int, decision: str, note: Optional[str], actor: str,
                     now: Optional[datetime] = None) -> Dict[str, Any]:
    now = now or utcnow()
    cand = db.get(EventCandidate, candidate_id)
    if cand is None:
        raise NotFound("Event candidate %s was not found" % candidate_id)
    if cand.status != CandidateStatus.PENDING.value:
        raise Conflict("Candidate %s has already been %s" % (cand.id, cand.status), code="already_reviewed")
    job = cand.video_job
    result: Optional[svc.MutationResult] = None
    if decision == "accept":
        ts = cand.timestamp_s
        items: List[Dict[str, Any]] = []
        if cand.frame_reference:
            items.append(dict(kind="frame", reference=cand.frame_reference, video_job_id=job.id, timestamp_s=ts,
                              bbox=cand.bbox, description="Evidence frame from clip '%s' at %.1f s" % (job.original_filename, ts)))
        details = dict(cand.details or {})
        ai_title = details.get("title")
        ai_summary = details.get("summary")
        description = ai_summary if ai_summary else (
            "Video-analysis candidate from clip '%s' at %.1f s (%s). Heuristic detection — human verification required."
            % (job.original_filename, ts, details.get("method", "detector output"))
        )
        title = ai_title or ("%s (%s)" % (svc.TITLES.get(cand.category, cand.category), job.original_filename))
        ncand = svc.NormalizedCandidate(
            category=cand.category, camera_id=job.camera_id, source_type=SourceType.VIDEO_UPLOAD.value,
            title=title,
            source_reference="video:%s@%.1fs" % (job.id, ts), confidence=cand.confidence,
            evidence=dict(cand.evidence or {}),
            description=description,
            metadata={"video_job_id": job.id, "video_timestamp_s": ts, "model_id": cand.model_id,
                      "model_version": cand.model_version, "details": cand.details, "reviewed_by": actor},
            evidence_items=items)
        result = svc.ingest_candidate(db, ncand, actor, now)
        cand.status = CandidateStatus.ACCEPTED.value
        cand.incident_id = result.incident.id
    elif decision == "reject":
        cand.status = CandidateStatus.REJECTED.value
    else:
        raise ValidationFailed("decision must be 'accept' or 'reject'")
    cand.reviewed_by, cand.reviewed_at, cand.review_note = actor, now, note
    db.add(AuditLog(entity_type="candidate", entity_id=str(cand.id), action="candidate_%s" % cand.status, actor=actor,
                    old_value={"status": CandidateStatus.PENDING.value},
                    new_value={"status": cand.status, "incident_id": cand.incident_id}, reason=note,
                    is_simulated=False, created_at=now))
    db.commit()
    return {"candidate": cand, "mutation": result}
