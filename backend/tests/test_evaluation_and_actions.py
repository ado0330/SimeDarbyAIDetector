"""Controlled-test log must never fabricate data; SOP/escalation actions must persist."""


def test_evaluation_starts_empty_and_summarises_only_recorded_trials(client):
    r = client.get("/api/evaluation/trials").json()
    assert r["trials"] == []
    assert r["summary"]["manual"]["trials"] == 0
    assert r["summary"]["manual"]["median_detection_seconds"] is None  # no invented numbers

    for sec in (40, 60, 80):
        client.post("/api/evaluation/trials", json={"arm": "manual", "scenario": "fall @ gate", "detection_seconds": sec})
    client.post("/api/evaluation/trials", json={"arm": "manual", "scenario": "fall @ gate", "missed": True,
                                                 "false_alarms": 1})
    s = client.get("/api/evaluation/trials").json()["summary"]
    assert s["manual"]["trials"] == 4
    assert s["manual"]["median_detection_seconds"] == 60.0
    assert s["manual"]["missed_incidents"] == 1 and s["manual"]["false_alarms"] == 1
    assert s["globaleye"]["trials"] == 0 and s["globaleye"]["median_detection_seconds"] is None


def test_evaluation_rejects_bad_input(client):
    assert client.post("/api/evaluation/trials", json={"arm": "robot", "scenario": "x1"}).status_code == 422
    assert client.post("/api/evaluation/trials", json={"arm": "manual", "scenario": "ok",
                                                        "detection_seconds": -5}).status_code == 422


def test_sop_and_escalation_actions_are_persisted(client):
    r = client.post("/api/demo/trigger", json={"scenario": "simultaneous"})
    iid = r.json()["results"][0]["id"]
    for t in ("sop_step_completed", "escalation"):
        res = client.post("/api/incidents/%s/actions" % iid, json={"action_type": t, "note": "step done by operator"})
        assert res.status_code == 200, res.text
    detail = client.get("/api/incidents/%s" % iid).json()
    types = [e.get("data", {}).get("action_type") for e in detail["events"] if e["event_type"] == "action_recorded"]
    assert "sop_step_completed" in types and "escalation" in types
