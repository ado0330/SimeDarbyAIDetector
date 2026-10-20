"""Health, reference data, analytics, demo controls, live stream and media endpoints."""
import asyncio
import json
import re
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import current_actor
from app.config import get_settings
from app.database import get_db, utcnow
from app.enums import CATEGORY_LABELS
from app.models import AuditLog, Camera, Location
from app.schemas import AuditLogOut, CameraOut, DemoTriggerRequest, LocationOut, ResponderOut
from app.services import analytics, demo
from app.services.events import broker
from app.services.reference import RESPONDERS
from app.services.scoring_config import build_config, config_as_dict

router = APIRouter(prefix="/api", tags=["platform"])

VERSION = "0.1.0"


@router.get("/health")
def health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    from app.vision.registry import detector_status

    s = get_settings()
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:  # pragma: no cover
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "version": VERSION, "database": "ok" if db_ok else "error",
            "mode": s.app_mode, "demo_endpoints_enabled": s.allow_demo_endpoints,
            "detector": detector_status(), "server_time": utcnow()}


@router.get("/reference")
def reference(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return {
        "locations": [LocationOut.model_validate(l) for l in db.query(Location).order_by(Location.id).all()],
        "cameras": [CameraOut.model_validate(c) for c in db.query(Camera).order_by(Camera.id).all()],
        "responders": [ResponderOut(**r) for r in RESPONDERS],
        "categories": [{"id": k, "label": v} for k, v in CATEGORY_LABELS.items()],
        "display_timezone": "Asia/Kuala_Lumpur",
    }


@router.get("/config")
def config() -> Dict[str, Any]:
    s = get_settings()
    return {"scoring": config_as_dict(build_config()), "mode": s.app_mode,
            "video": {"max_upload_mb": s.max_upload_mb, "max_video_seconds": s.max_video_seconds,
                      "allowed_extensions": s.allowed_video_extensions,
                      "frame_sample_interval_seconds": s.frame_sample_interval_seconds,
                      "retention_hours": s.retain_uploads_hours}}


@router.get("/analytics/summary")
def analytics_summary(
    date_from: Optional[datetime] = None, date_to: Optional[datetime] = None, category: Optional[str] = None,
    priority: Optional[str] = Query(None, pattern="^(critical|high|medium|low)$"), status: Optional[str] = None,
    camera_id: Optional[str] = None, location_id: Optional[str] = None, db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return analytics.summary(db, date_from, date_to, category, priority, status, camera_id, location_id)


@router.get("/audit", response_model=list)
def audit_log(limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    return [AuditLogOut.model_validate(r) for r in rows]


@router.post("/demo/trigger")
def demo_trigger(body: DemoTriggerRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return demo.run_scenario(db, body.scenario)


@router.post("/demo/reset")
def demo_reset(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Deletes ONLY simulated incidents and restores baseline demo history. Video-derived data is untouched."""
    return demo.reset_demo(db)


@router.get("/stream")
async def stream(request: Request) -> StreamingResponse:
    """Server-Sent Events: ``queue_changed`` notifications. The client refetches on each event."""
    q = broker.subscribe()

    async def gen():
        try:
            yield "retry: 3000\n\n"
            yield "data: %s\n\n" % json.dumps({"type": "connected"})
            while True:
                if await request.is_disconnected():
                    break
                try:
                    ev = await asyncio.wait_for(q.get(), timeout=15)
                    yield "data: %s\n\n" % json.dumps(ev)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            broker.unsubscribe(q)

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


_FRAME_RE = re.compile(r"^[A-Za-z0-9_\-]{1,80}\.jpg$")
_UUID_RE = re.compile(r"^[0-9a-f]{32}$")


@router.get("/media/frames/{filename}")
def media_frame(filename: str):
    if not _FRAME_RE.match(filename):
        raise HTTPException(status_code=400, detail="Invalid frame name")
    path = (get_settings().frames_dir / filename).resolve()
    if get_settings().frames_dir.resolve() not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Frame not found")
    return FileResponse(path, media_type="image/jpeg")
