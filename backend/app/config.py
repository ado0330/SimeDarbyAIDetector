"""Application settings loaded from environment variables (see ``.env.example``)."""
from pathlib import Path
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_prefix="TG_", extra="ignore")

    # --- General -------------------------------------------------------
    app_name: str = "GlobalEye"
    # "simulation" or "video_analysis". Only controls the mode indicator + default tab; both paths
    app_mode: str = "simulation"
    database_url: str = f"sqlite:///{BACKEND_DIR / 'data' / 'township_guardian.db'}"
    data_dir: Path = BACKEND_DIR / "data"
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://0.0.0.0:3000",
        "*",
    ]
    seed_demo_history: bool = False
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
    max_upload_mb: int = 150
    max_video_seconds: int = 300
    allowed_video_extensions: List[str] = [".mp4", ".mov", ".avi", ".mkv", ".webm"]
    frame_sample_interval_seconds: float = 1.0
    processing_timeout_seconds: int = 300
    detector: str = "auto"
    retain_uploads_hours: int = 24
    # --- Gemini AI Video Understanding ---
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-3.5-flash-lite"
    gemini_auto_promote: bool = True

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
        import os
        _settings = Settings()
        if not _settings.gemini_api_key:
            _settings.gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("TG_GEMINI_API_KEY")
        if os.environ.get("GEMINI_MODEL"):
            _settings.gemini_model = os.environ["GEMINI_MODEL"]
    return _settings


def update_gemini_settings(api_key: Optional[str] = None, model: Optional[str] = None, auto_promote: Optional[bool] = None) -> Settings:
    s = get_settings()
    if api_key is not None:
        s.gemini_api_key = api_key.strip() or None
    if model is not None and model.strip():
        s.gemini_model = model.strip()
    if auto_promote is not None:
        s.gemini_auto_promote = auto_promote
    return s


def reset_settings_cache() -> None:
    global _settings
    _settings = None
