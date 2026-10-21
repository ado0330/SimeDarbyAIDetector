"""Shared fixtures: every test gets an isolated in-memory DB and temp data directory."""
import pytest
from fastapi.testclient import TestClient

from app import database
from app.config import reset_settings_cache
from app.services.reference import seed_reference_data


@pytest.fixture(autouse=True)
def _env(tmp_path, monkeypatch):
    monkeypatch.setenv("TG_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("TG_DATABASE_URL", "sqlite://")
    monkeypatch.setenv("TG_SEED_DEMO_HISTORY", "false")
    monkeypatch.setenv("TG_DETECTOR", "hog_posture")
    monkeypatch.setenv("TG_GEMINI_API_KEY", "")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    reset_settings_cache()
    yield
    reset_settings_cache()


@pytest.fixture()
def db(_env):
    database.init_engine("sqlite://")
    database.create_all()
    session = database.SessionLocal()
    seed_reference_data(session)
    yield session
    session.close()


@pytest.fixture()
def client(db):
    from app.main import app
    with TestClient(app) as c:
        yield c
