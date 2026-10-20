"""Application settings loaded from environment variables (see ``.env.example``)."""
from pathlib import Path
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_prefix="TG_", extra="ignore")

    # --- General -------------------------------------------------------
    app_name: str = "Township Guardian AI"
    # "simulation" or "video_analysis". Only controls the mode indicator + default tab; both paths
    # always share the same prioritization engine.
    app_mode: str = "simulation"
    database_url: str = f"sqlite:///{BACKEND_DIR / 'data' / 'township_guardian.db'}"
    data_dir: Path = BACKEND_DIR / "data"
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    seed_demo_history: bool = True
    demo_admin_name: str = "Demo Administrator"
    allow_demo_endpoints: bool = True

    # --- Scoring (prototype assumptions; REQUIRE validation before real-world use) ---
    weight_severity: float = 0.40
    weight_immediacy: float = 0.25
    weight_people_at_risk: float = 0.20
    weight_secondary_hazard: float = 0.15
    threshold_critical: float = 80.0
    threshold_high: float = 60.0
    threshold_medium: float = 35.0
    low_confidence_threshold: float = 0.5

    # --- Queue / dedup ---
    rank_hysteresis: float = 2.0
    dedup_window_seconds: int = 300

    # --- Video analysis ---
    max_upload_mb: int = 100
    max_video_seconds: int = 120
    allowed_video_extensions: List[str] = [".mp4", ".mov", ".avi", ".mkv", ".webm"]
    frame_sample_interval_seconds: float = 1.0
    processing_timeout_seconds: int = 300
    # "auto" (default), "hog_posture", "yolox_posture", or "none" (explicitly unavailable)
    detector: str = "auto"
    retain_uploads_hours: int = 24  # uploaded clips older than this are purged at startup

    @property
    def upload_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def frames_dir(self) -> Path:
        return self.data_dir / "frames"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


_settings: Optional[Settings] = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_settings_cache() -> None:
    global _settings
    _settings = None
