"""FastAPI application entry point.

Run:  uvicorn app.main:app --reload --port 8000   (from ./backend)
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app import database
from app.api import evaluation, incidents, platform, videos
from app.config import get_settings
from app.errors import ServiceError
from app.services.events import broker
from app.services.reference import seed_reference_data

log = logging.getLogger("township_guardian")


def init_database() -> None:
    """Create tables, reference data and (optionally) demo history. Safe to call repeatedly."""
    from app.services.demo import seed_demo_history

    if not database.has_engine():
        database.init_engine()
    database.create_all()
    db = database.SessionLocal()
    try:
        seed_reference_data(db)
        if get_settings().seed_demo_history:
            seed_demo_history(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    broker.attach_loop(asyncio.get_running_loop())
    init_database()
    try:
        from app.services.video_service import purge_expired_uploads
        purge_expired_uploads()
    except Exception:  # pragma: no cover - never block startup on cleanup
        log.exception("Upload cleanup failed")
    yield


def error_body(code: str, message: str, details=None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or []}}


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title=s.app_name, version=platform.VERSION, lifespan=lifespan,
                  description="Township incident intelligence & response coordination (hackathon prototype).")
    app.add_middleware(CORSMiddleware, allow_origins=s.cors_origins, allow_credentials=False,
                       allow_methods=["*"], allow_headers=["*"])

    @app.exception_handler(ServiceError)
    async def _service_error(_: Request, exc: ServiceError):
        return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message, exc.details))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        details = [{"field": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]), "message": e["msg"]}
                   for e in exc.errors()]
        msg = details[0]["message"] if details else "Invalid request"
        return JSONResponse(status_code=422, content=error_body("validation_error", msg, details))

    @app.exception_handler(HTTPException)
    async def _http_error(_: Request, exc: HTTPException):
        code = {400: "bad_request", 403: "forbidden", 404: "not_found", 405: "method_not_allowed",
                413: "payload_too_large", 415: "unsupported_media_type"}.get(exc.status_code, "error")
        return JSONResponse(status_code=exc.status_code, content=error_body(code, str(exc.detail)))

    @app.exception_handler(SQLAlchemyError)
    async def _db_error(_: Request, exc: SQLAlchemyError):
        log.exception("Database error")
        return JSONResponse(status_code=500, content=error_body("database_error", "A database error occurred."))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        log.exception("Unhandled error")  # trace goes to server logs only, never to the client
        return JSONResponse(status_code=500, content=error_body("internal_error", "An unexpected error occurred."))

    app.include_router(platform.router)
    app.include_router(incidents.router)
    app.include_router(videos.router)
    app.include_router(evaluation.router)
    return app


app = create_app()
