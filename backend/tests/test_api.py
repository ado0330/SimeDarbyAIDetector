"""REST API tests (FastAPI TestClient)."""


def create_collision(client, **over):
    body = {"category": "road_collision", "camera_id": "CAM-GATE-01", "detection_confidence": 0.85,
            "evidence": {"vehicles_involved": 2}, "description": "test"}
    body.update(over)
    return client.post("/api/incidents", json=body)


def test_health_and_reference(client):
    h = client.get("/api/health").json()
    assert h["status"] == "ok" and h["database"] == "ok" and h["mode"] == "simulation"
    assert "detector" in h
    ref = client.get("/api/reference").json()
    assert len(ref["cameras"]) >= 5 and ref["responders"] and ref["categories"]


def test_full_incident_api_workflow(client):
    r = create_collision(client)
    assert r.status_code == 201
    inc = r.json()["incident"]
    iid = inc["id"]
    assert inc["priority_explanation"] and inc["recommended_action"] and inc["is_simulated"] is True
    assert client.get("/api/incidents/%s" % iid).json()["id"] == iid
    assert [i["id"] for i in client.get("/api/incidents?status=active").json()["items"]] == [iid]

    assert client.post("/api/incidents/%s/acknowledge" % iid, json={}).json()["incident"]["status"] == "acknowledged"
    r = client.post("/api/incidents/%s/assign" % iid, json={"responder_id": "traffic-marshal", "note": "Go"})
    assert r.json()["incident"]["status"] == "in_progress" and r.json()["incident"]["assigned_to"] == "traffic-marshal"
    r = client.post("/api/incidents/%s/actions" % iid, json={"action_type": "camera_reviewed", "note": "Reviewed feed"})
    assert r.status_code == 200
    r = client.post("/api/incidents/%s/evidence" % iid, json={"evidence": {"persons_involved": 3}, "note": "More people"})
    assert r.json()["incident"]["priority_level"] == "critical" and r.json()["priority_changed"] is True
    r = client.post("/api/incidents/%s/recalculate" % iid, json={})
    assert r.status_code == 200
    r = client.post("/api/incidents/%s/override-priority" % iid, json={"level": "medium", "reason": "Verified minor"})
    assert r.json()["incident"]["priority_level"] == "medium" and r.json()["incident"]["priority_overridden"]
    r = client.post("/api/incidents/%s/resolve" % iid, json={"note": "Cleared"})
    assert r.json()["incident"]["status"] == "resolved" and r.json()["incident"]["resolved_at"]
    detail = client.get("/api/incidents/%s" % iid).json()
    assert len(detail["events"]) >= 6 and len(detail["audit"]) >= 6 and detail["assignments"]
    assert client.get("/api/incidents?status=active").json()["total"] == 0
    assert client.get("/api/incidents?status=resolved").json()["total"] == 1
    assert client.post("/api/incidents/%s/reopen" % iid, json={"reason": "Reoccurred"}).json()["incident"]["status"] == "acknowledged"


def test_error_responses_are_meaningful(client):
    r = client.get("/api/incidents/INC-9999")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found" and "INC-9999" in r.json()["error"]["message"]
    r = client.post("/api/incidents", json={"category": "meteor"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error" and r.json()["error"]["details"]
    r = create_collision(client, camera_id="CAM-NOPE")
    assert r.status_code == 422 and "CAM-NOPE" in r.json()["error"]["message"]
    iid = create_collision(client).json()["incident"]["id"]
    r = client.post("/api/incidents/%s/override-priority" % iid, json={"level": "high", "reason": "x"})
    assert r.status_code == 422  # reason too short
    r = client.post("/api/incidents/%s/override-priority" % iid, json={"level": "high"})
    assert r.status_code == 422  # reason missing
    r = client.post("/api/incidents/%s/assign" % iid, json={"responder_id": "ghost"})
    assert r.status_code == 422
    client.post("/api/incidents/%s/acknowledge" % iid, json={})
    r = client.post("/api/incidents/%s/acknowledge" % iid, json={})
    assert r.status_code == 409 and r.json()["error"]["code"] == "already_acknowledged"
    r = client.post("/api/incidents/%s/evidence" % iid, json={"evidence": {"bogus_field": 1}})
    assert r.status_code == 422
    r = client.post("/api/incidents/%s/evidence" % iid, json={"evidence": {"persons_involved": -4}})
    assert r.status_code == 422
    r = client.get("/api/incidents?priority=urgent")
    assert r.status_code == 422
    assert "Traceback" not in r.text


def test_dedup_via_api(client):
    a = create_collision(client).json()
    b = create_collision(client, evidence={"persons_involved": 2}).json()
    assert b["deduplicated"] is True and b["incident"]["id"] == a["incident"]["id"]
    assert b["incident"]["detection_count"] == 2
    assert client.get("/api/incidents").json()["total"] == 1


def test_analytics_summary_from_persisted_records(client):
    iid = create_collision(client).json()["incident"]["id"]
    create_collision(client, camera_id="CAM-GATE-02", category="parking_obstruction", evidence={})
    client.post("/api/incidents/%s/acknowledge" % iid, json={})
    s = client.get("/api/analytics/summary").json()
    assert s["totals"]["active"] == 2 and s["totals"]["awaiting_acknowledgement"] == 1
    assert s["avg_acknowledgement_seconds"] is not None and s["acknowledgement_sample_size"] == 1
    assert s["avg_resolution_seconds"] is None  # nothing resolved => no invented number
    assert s["mode"] == "simulation" and s["top_incidents"][0]["id"] == iid
    client.post("/api/incidents/%s/resolve" % iid, json={})
    s = client.get("/api/analytics/summary").json()
    assert s["totals"]["resolved"] == 1 and s["avg_resolution_seconds"] is not None
    f = client.get("/api/analytics/summary?category=parking_obstruction").json()
    assert f["totals"]["incidents"] == 1


def test_sse_broker_receives_events(client):
    from app.services.events import broker
    before = broker.published
    create_collision(client)
    assert broker.published > before
