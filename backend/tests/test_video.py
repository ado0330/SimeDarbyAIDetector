"""Video pipeline tests: upload validation, processing states, detector interface, candidate review."""
import io
from pathlib import Path

import cv2
import numpy as np
import pytest

from app.config import reset_settings_cache
from app.vision.detectors import PersonDownDetector, PersonProvider
from app.vision.posture import PersonObs, PostureConfig, build_tracks, qualifying_tracks


def make_video(path: Path, seconds=8, fps=10, size=(320, 240)) -> Path:
    w = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), fps, size)
    assert w.isOpened()
    rng = np.random.default_rng(1)
    for i in range(seconds * fps):
        frame = np.full((size[1], size[0], 3), 60, dtype=np.uint8)
        cv2.rectangle(frame, (10 + i, 50), (60 + i, 120), (0, 200, 0), -1)
        frame += rng.integers(0, 10, frame.shape, dtype=np.uint8)
        w.write(frame)
    w.release()
    return path


class FakeHorizontalProvider(PersonProvider):
    """Test double standing in for a model: reports one horizontal, motionless person box."""
    id = "fake-provider"
    version = "test"

    def detect(self, image):
        return [(50.0, 150.0, 120.0, 40.0, 0.8)]


def post_video(client, path, name="clip.mp4", camera_id=None, content=None):
    data = content if content is not None else Path(path).read_bytes()
    files = {"file": (name, io.BytesIO(data), "video/mp4")}
    return client.post("/api/videos", files=files, data={"camera_id": camera_id} if camera_id else {})


# ---- pure heuristic logic ---------------------------------------------------------------------

def obs(t, x=100, y=100, w=120, h=40, score=0.8):
    return PersonObs(t, x, y, w, h, score, 640, 480, int(t * 10))


def test_posture_heuristic_requires_persistent_horizontal_still_box():
    cfg = PostureConfig()
    still = [[obs(t)] for t in range(0, 7)]
    assert len(qualifying_tracks(build_tracks(still, cfg), cfg)) == 1
    short = [[obs(t)] for t in range(0, 3)]
    assert qualifying_tracks(build_tracks(short, cfg), cfg) == []
    upright = [[obs(t, w=40, h=120)] for t in range(0, 7)]
    assert qualifying_tracks(build_tracks(upright, cfg), cfg) == []
    walking = [[obs(t, x=100 + t * 150)] for t in range(0, 7)]  # horizontal but moving across frame
    assert qualifying_tracks(build_tracks(walking, cfg), cfg) == []
    gap = [[obs(0)], [obs(1)], [obs(10)], [obs(11)]]
    assert qualifying_tracks(build_tracks(gap, cfg), cfg) == []


def test_detector_emits_honest_candidate(tmp_path):
    from app.vision.base import FramePacket
    det = PersonDownDetector(FakeHorizontalProvider())
    frames = [FramePacket(i * 10, float(i), np.zeros((240, 320, 3), np.uint8)) for i in range(8)]
    cands = det.analyze(frames)
    assert len(cands) == 1
    c = cands[0]
    assert c.category == "person_fall" and c.confidence is None  # no fabricated event confidence
    assert c.evidence["person_motionless_seconds"] == 7.0
    assert "heuristic" in c.details["limitations"].lower()
    assert c.evidence_frame is not None and c.model_id.startswith("person-down-heuristic")


# ---- upload validation -------------------------------------------------------------------------

def test_rejects_unsupported_extension_and_fake_content(client):
    r = post_video(client, None, "malware.exe", content=b"MZ" + b"\x00" * 100)
    assert r.status_code == 415 and r.json()["error"]["code"] == "unsupported_media_type"
    r = post_video(client, None, "notes.mp4", content=b"this is plain text, not a video at all")
    assert r.status_code == 415
    r = post_video(client, None, "empty.mp4", content=b"")
    assert r.status_code in (415, 422)
    r = post_video(client, None, "noext", content=b"x" * 50)
    assert r.status_code == 415


def test_rejects_corrupt_video_with_valid_header(client, tmp_path):
    fake = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom" + b"\x13" * 4000
    r = post_video(client, None, "broken.mp4", content=fake)
    assert r.status_code == 422 and r.json()["error"]["code"] == "unreadable_video"
    assert list((tmp_path / "uploads").glob("*")) == []  # nothing left behind


def test_rejects_oversized_upload(client, tmp_path, monkeypatch):
    monkeypatch.setenv("TG_MAX_UPLOAD_MB", "1")
    reset_settings_cache()
    big = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * (2 * 1024 * 1024)
    r = post_video(client, None, "big.mp4", content=big)
    assert r.status_code == 413 and r.json()["error"]["code"] == "file_too_large"
    assert list((tmp_path / "uploads").glob("*")) == []


def test_rejects_too_long_video(client, tmp_path, monkeypatch):
    monkeypatch.setenv("TG_MAX_VIDEO_SECONDS", "3")
    reset_settings_cache()
    v = make_video(tmp_path / "long.mp4", seconds=6)
    r = post_video(client, v)
    assert r.status_code == 422 and r.json()["error"]["code"] == "video_too_long"


def test_unknown_camera_rejected_and_filename_sanitised(client, tmp_path):
    v = make_video(tmp_path / "ok.mp4", seconds=2)
    r = post_video(client, v, camera_id="CAM-NOPE")
    assert r.status_code == 422
    r = post_video(client, v, name="../../etc/pass wd<>.mp4")
    assert r.status_code == 202
    body = r.json()
    assert "/" not in body["original_filename"] and ".." not in body["original_filename"].replace("..mp4", "")
    stored = list((tmp_path / "uploads").glob("*"))
    assert len(stored) == 1 and stored[0].name.endswith(".mp4") and len(stored[0].stem) == 32
    assert "stored_filename" not in body and str(tmp_path) not in r.text  # no filesystem path leakage


# ---- processing ---------------------------------------------------------------------------------

def test_processing_completes_without_fabricating_detections(client, tmp_path):
    v = make_video(tmp_path / "walker.mp4", seconds=4)
    job = post_video(client, v, camera_id="CAM-SCH-01").json()
    got = client.get("/api/videos/%s" % job["id"]).json()
    assert got["status"] == "completed" and got["progress"] == 1.0 and got["frames_analyzed"] >= 4
    assert got["detector_available"] is True and got["detector_id"].startswith("person-down-heuristic")
    assert got["candidates"] == []  # synthetic rectangles are not people -> no candidates
    assert client.get("/api/videos/%s/file" % job["id"]).status_code == 200
    assert client.get("/api/incidents").json()["total"] == 0


def test_processing_reports_unavailable_detector(client, tmp_path, monkeypatch):
    monkeypatch.setenv("TG_DETECTOR", "none")
    reset_settings_cache()
    v = make_video(tmp_path / "a.mp4", seconds=2)
    job = post_video(client, v).json()
    got = client.get("/api/videos/%s" % job["id"]).json()
    assert got["status"] == "failed" and got["detector_available"] is False
    assert "unavailable" in got["error"].lower()
    assert client.get("/api/video/status").json()["detector"]["available"] is False


def test_unknown_job_404_and_delete_removes_file(client, tmp_path):
    assert client.get("/api/videos/" + "0" * 32).status_code == 404
    v = make_video(tmp_path / "a.mp4", seconds=2)
    job = post_video(client, v).json()
    assert client.delete("/api/videos/%s" % job["id"]).json()["video_available"] is False
    assert list((tmp_path / "uploads").glob("*")) == []
    assert client.get("/api/videos/%s/file" % job["id"]).status_code == 404


def test_frame_media_endpoint_blocks_traversal(client):
    assert client.get("/api/media/frames/..%2F..%2Fetc%2Fpasswd").status_code in (400, 404)
    assert client.get("/api/media/frames/nothing.jpg").status_code == 404
    assert client.get("/api/media/frames/evil.png").status_code == 400


# ---- review flow with a stand-in detector --------------------------------------------------------

@pytest.fixture()
def fake_detector(monkeypatch):
    from app.services import video_service
    monkeypatch.setattr(video_service, "get_detector", lambda: PersonDownDetector(FakeHorizontalProvider()))


def test_candidates_need_review_then_flow_through_shared_engine(client, tmp_path, fake_detector):
    v = make_video(tmp_path / "scene.mp4", seconds=8)
    job = post_video(client, v, camera_id="CAM-SCH-01").json()
    detail = client.get("/api/videos/%s" % job["id"]).json()
    assert detail["status"] == "completed" and len(detail["candidates"]) == 1
    cand = detail["candidates"][0]
    assert cand["status"] == "pending" and cand["source"] == "video_analysis" and cand["confidence"] is None
    assert cand["frame_url"] and client.get(cand["frame_url"]).status_code == 200
    assert cand["preview"]["composite_score"] > 0 and cand["details"]["limitations"]
    # not an incident until reviewed
    assert client.get("/api/incidents").json()["total"] == 0

    r = client.post("/api/candidates/%d/review" % cand["id"], json={"decision": "accept", "note": "Looks right"})
    assert r.status_code == 200
    inc = r.json()["mutation"]["incident"]
    assert inc["source_type"] == "video_upload" and inc["is_simulated"] is False
    assert inc["detection_confidence"] is None and inc["camera_id"] == "CAM-SCH-01"
    assert inc["evidence"]["person_motionless_seconds"] == 7.0
    assert inc["priority_explanation"] and inc["source_reference"].startswith("video:")
    full = client.get("/api/incidents/%s" % inc["id"]).json()
    assert full["evidence_items"] and full["evidence_items"][0]["frame_url"]
    assert r.json()["candidate"]["status"] == "accepted" and r.json()["candidate"]["incident_id"] == inc["id"]
    # cannot review twice
    again = client.post("/api/candidates/%d/review" % cand["id"], json={"decision": "reject"})
    assert again.status_code == 409 and again.json()["error"]["code"] == "already_reviewed"


def test_reject_candidate_creates_no_incident(client, tmp_path, fake_detector):
    v = make_video(tmp_path / "scene.mp4", seconds=8)
    job = post_video(client, v).json()
    cid = client.get("/api/videos/%s" % job["id"]).json()["candidates"][0]["id"]
    r = client.post("/api/candidates/%d/review" % cid, json={"decision": "reject", "note": "Not a person"})
    assert r.status_code == 200 and r.json()["candidate"]["status"] == "rejected" and "mutation" not in r.json()
    assert client.get("/api/incidents").json()["total"] == 0
    assert client.post("/api/candidates/99999/review", json={"decision": "accept"}).status_code == 404
    assert client.post("/api/candidates/%d/review" % cid, json={"decision": "maybe"}).status_code == 422
