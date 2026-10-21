"""Tests for Gemini Multimodal Vision API configuration and incident auto-promotion."""
from unittest.mock import patch
import numpy as np

from app.config import get_settings, update_gemini_settings
from app.enums import Category, SourceType
from app.models import Incident, VideoJob
from app.vision.gemini_analyzer import GeminiAnalysisResult
from tests.test_video import make_video, post_video


def test_gemini_config_endpoints(client):
    r = client.get("/api/config/gemini")
    assert r.status_code == 200
    data = r.json()
    assert "enabled" in data
    assert "model" in data

    # Update Gemini key and model
    r_update = client.post("/api/config/gemini", json={
        "api_key": "AIzaSyTestMockKey1234567890",
        "model": "gemini-3.5-flash-lite",
        "auto_promote": True,
    })
    assert r_update.status_code == 200
    up = r_update.json()
    assert up["enabled"] is True
    assert up["model"] == "gemini-3.5-flash-lite"
    assert up["auto_promote"] is True
    assert up["masked_key"] == "AIza...7890"

    # Reset
    update_gemini_settings(api_key="", model="gemini-3.5-flash-lite", auto_promote=True)


def test_gemini_video_detection_and_auto_promotion(client, tmp_path, monkeypatch):
    """When Gemini detects a car accident, it should be recognized and auto-promoted into active incidents."""
    # Enable Gemini in settings
    update_gemini_settings(api_key="AIzaSyMockKeyForTest", model="gemini-3.5-flash-lite", auto_promote=True)

    fake_result = GeminiAnalysisResult(
        detected=True,
        category=Category.ROAD_COLLISION.value,
        confidence=0.95,
        timestamp_s=3.5,
        title="Two-Vehicle Collision at Roundabout Exit",
        summary="A silver sedan collided with a dark SUV near the exit lane. Both vehicles are stationary and blocking traffic.",
        evidence={
            "vehicles_involved": 2,
            "traffic_blocked": True,
            "people_at_risk": 0,
            "secondary_hazard": True,
        },
        evidence_frame=np.full((480, 640, 3), 100, dtype=np.uint8),
        model_used="gemini-3.5-flash-lite",
    )

    with patch("app.vision.gemini_analyzer.analyze_video_with_gemini", return_value=fake_result):
        v = make_video(tmp_path / "accident.mp4", seconds=6)
        r = post_video(client, v, name="cctv_accident.mp4", camera_id="CAM-GATE-01")
        assert r.status_code == 202
        job_id = r.json()["id"]

        # Run process_video_job synchronously
        from app.services.video_service import process_video_job
        process_video_job(job_id)

        job_info = client.get(f"/api/videos/{job_id}").json()
        assert job_info["status"] == "completed"
        assert len(job_info["candidates"]) == 1
        cand = job_info["candidates"][0]
        assert cand["category"] == "road_collision"
        assert cand["status"] == "accepted"
        assert cand["incident_id"] is not None

        # Verify active incident queue now contains this car accident
        incidents = client.get("/api/incidents").json()["items"]
        matching = [i for i in incidents if i["id"] == cand["incident_id"]]
        assert len(matching) == 1
        inc = matching[0]
        assert inc["category"] == "road_collision"
        assert inc["source_type"] == SourceType.VIDEO_UPLOAD.value
        assert inc["is_simulated"] is False
        assert inc["priority_score"] > 50.0

    # Clean up setting
    update_gemini_settings(api_key="", model="gemini-3.5-flash-lite", auto_promote=True)
