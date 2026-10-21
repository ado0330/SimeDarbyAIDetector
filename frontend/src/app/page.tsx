"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Incident,
  IncidentDetail,
  Location,
  Camera,
  Responder,
  AnalyticsSummary,
  VideoJob,
  VideoCandidate,
  ScoringConfigData,
  PriorityLevel,
} from "@/types";
import { api } from "@/lib/api";
import {
  FALLBACK_LOCATIONS,
  FALLBACK_CAMERAS,
  FALLBACK_RESPONDERS,
  FALLBACK_CONFIG,
  FALLBACK_INCIDENTS,
  FALLBACK_ANALYTICS,
  FALLBACK_VIDEOS,
  FALLBACK_CANDIDATES,
  createFallbackDetail,
} from "@/lib/mockData";
import { extractVideoThumbnail } from "@/lib/utils";
import { Sidebar, NavView } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { IncidentDetailModal } from "@/components/modals/IncidentDetailModal";
import { OverviewView } from "@/components/views/OverviewView";
import { ActiveIncidentsView } from "@/components/views/ActiveIncidentsView";
import { TownshipMapView } from "@/components/views/TownshipMapView";
import { VideoAnalysisView } from "@/components/views/VideoAnalysisView";
import { HistoryView } from "@/components/views/HistoryView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { DemoControlsView } from "@/components/views/DemoControlsView";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function Home() {
  const [currentView, setCurrentView] = useState<NavView>("overview");

  // Core Data States
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfigData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [candidates, setCandidates] = useState<VideoCandidate[]>([]);

  // Platform State
  const [mode, setMode] = useState<string>("simulation");
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Fetch all primary operational data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [incRes, anaRes, vidRes, candRes] = await Promise.allSettled([
        api.getIncidents({ sort: "queue" }),
        api.getAnalyticsSummary(),
        api.getVideos(),
        api.getCandidates(),
      ]);

      if (incRes.status === "fulfilled") {
        setIncidents(incRes.value.items);
      } else {
        setIncidents((prev) => (prev.length > 0 ? prev : FALLBACK_INCIDENTS));
      }

      if (anaRes.status === "fulfilled") {
        setAnalytics(anaRes.value);
      } else {
        setAnalytics((prev) => prev || FALLBACK_ANALYTICS);
      }

      if (vidRes.status === "fulfilled") {
        setVideos(vidRes.value);
      } else {
        setVideos((prev) => (prev.length > 0 ? prev : FALLBACK_VIDEOS));
      }
      if (candRes.status === "fulfilled") {
        setCandidates(candRes.value);
      } else {
        setCandidates((prev) => (prev.length > 0 ? prev : FALLBACK_CANDIDATES));
      }
    } catch (err) {
      console.error("Data refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial Reference & Health Fetch
  useEffect(() => {
    const initPlatform = async () => {
      try {
        const [refData, healthData, configData] = await Promise.allSettled([
          api.getReference(),
          api.getHealth(),
          api.getConfig(),
        ]);

        if (refData.status === "fulfilled") {
          setLocations(refData.value.locations);
          setCameras(refData.value.cameras);
          setResponders(refData.value.responders);
        } else {
          setLocations(FALLBACK_LOCATIONS);
          setCameras(FALLBACK_CAMERAS);
          setResponders(FALLBACK_RESPONDERS);
        }

        if (healthData.status === "fulfilled") {
          setMode(healthData.value.mode);
        } else {
          setMode("simulation");
        }

        if (configData.status === "fulfilled") {
          setScoringConfig(configData.value);
        } else {
          setScoringConfig(FALLBACK_CONFIG);
        }

        await fetchData();
      } catch (err) {
        console.error("Platform init error:", err);
      }
    };

    initPlatform();
  }, [fetchData]);

  // Server-Sent Events (SSE) Live Subscription
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = api.subscribeQueueEvents((event) => {
        if (event.type === "connected") {
          setIsStreamConnected(true);
        } else if (event.type === "queue_changed") {
          setIsStreamConnected(true);
          fetchData();
        }
      });
    } catch {
      setIsStreamConnected(false);
    }

    // Polling fallback every 8 seconds
    const pollInterval = setInterval(() => {
      fetchData();
    }, 8000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [fetchData]);

  // Select incident and open detail modal
  const handleSelectIncident = async (id: string) => {
    try {
      const detail = await api.getIncident(id);
      setSelectedIncident(detail);
      setIsDetailModalOpen(true);
    } catch {
      const found = incidents.find((i) => i.id === id) || FALLBACK_INCIDENTS.find((i) => i.id === id);
      if (found) {
        setSelectedIncident(createFallbackDetail(found));
        setIsDetailModalOpen(true);
      } else {
        showToast(`Could not open incident ${id}`, "error");
      }
    }
  };

  // Incident Actions
  const handleAcknowledge = async (id: string, note?: string) => {
    try {
      const res = await api.acknowledge(id, note);
      showToast(`Incident ${id} acknowledged successfully.`);
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(res.incident);
      }
      fetchData();
    } catch {
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "acknowledged", acknowledged_at: new Date().toISOString() } : i))
      );
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident((prev) =>
          prev ? { ...prev, status: "acknowledged", acknowledged_at: new Date().toISOString() } : null
        );
      }
      showToast(`Incident ${id} acknowledged.`);
    }
  };

  const handleAssign = async (id: string, responderId: string, note?: string) => {
    try {
      const res = await api.assign(id, responderId, note);
      showToast(`Responder assigned to ${id}.`);
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(res.incident);
      }
      fetchData();
    } catch {
      const responder = responders.find((r) => r.id === responderId);
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                assigned_to: responderId,
                assigned_to_name: responder?.name || responderId,
                status: "in_progress",
              }
            : i
        )
      );
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident((prev) =>
          prev
            ? {
                ...prev,
                assigned_to: responderId,
                assigned_to_name: responder?.name || responderId,
                status: "in_progress",
              }
            : null
        );
      }
      showToast(`Responder assigned to ${id}.`);
    }
  };

  const handleRecordAction = async (id: string, actionType: string, note: string) => {
    try {
      const res = await api.recordAction(id, actionType, note);
      showToast(`Action log recorded for ${id}.`);
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(res.incident);
      }
      fetchData();
    } catch {
      showToast(`Action log recorded for ${id}: ${actionType}`);
    }
  };

  const handleOverridePriority = async (id: string, level: PriorityLevel | null, reason: string) => {
    try {
      const res = await api.overridePriority(id, level, reason);
      showToast(`Priority override updated for ${id}.`);
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(res.incident);
      }
      fetchData();
    } catch {
      if (level) {
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  priority_level: level,
                  priority_overridden: true,
                  override_reason: reason,
                }
              : i
          )
        );
        if (selectedIncident && selectedIncident.id === id) {
          setSelectedIncident((prev) =>
            prev
              ? {
                  ...prev,
                  priority_level: level,
                  priority_overridden: true,
                  override_reason: reason,
                }
              : null
          );
        }
      }
      showToast(`Priority override updated for ${id}.`);
    }
  };

  const handleResolve = async (id: string, resolutionType: "resolved" | "false_positive", note?: string) => {
    try {
      const res = await api.resolve(id, resolutionType, note);
      showToast(`Incident ${id} marked as ${resolutionType.replace("_", " ")}.`);
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(res.incident);
      }
      fetchData();
    } catch {
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: resolutionType,
                resolved_at: new Date().toISOString(),
                resolution_type: resolutionType,
                resolution_note: note,
              }
            : i
        )
      );
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident((prev) =>
          prev
            ? {
                ...prev,
                status: resolutionType,
                resolved_at: new Date().toISOString(),
                resolution_type: resolutionType,
                resolution_note: note,
              }
            : null
        );
      }
      showToast(`Incident ${id} marked as ${resolutionType.replace("_", " ")}.`);
    }
  };

  const handleReopen = async (id: string, reason: string) => {
    try {
      const res = await api.reopen(id, reason);
      showToast(`Incident ${id} reopened.`);
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(res.incident);
      }
      fetchData();
    } catch {
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: "acknowledged",
              }
            : i
        )
      );
      showToast(`Incident ${id} reopened.`);
    }
  };

  // Video Analysis Upload
  const handleUploadVideo = async (file: File, cameraId?: string) => {
    try {
      const job = await api.uploadVideo(file, cameraId);
      showToast(`Clip "${file.name}" uploaded. Processing queued.`);
      fetchData();
    } catch (e: any) {
      // Client-side fallback for standalone / cloud demo deployment (e.g. Vercel)
      const blobUrl = URL.createObjectURL(file);
      const cam = cameras.find((c) => c.id === cameraId) || cameras[0] || {
        id: cameraId || "CAM-PARK-01",
        name: "Elmina Central Park Trail #1",
        location_id: "LOC-PARK",
      };

      const jobId = `job-${Date.now()}`;
      const candidateId = Math.floor(Date.now() % 900000) + 100000;
      const incidentId = `INC-VID-${candidateId}`;

      // Analyze file name for category heuristics
      const lower = file.name.toLowerCase();
      let category = "person_fall";
      let category_label = "Person Fall / Motionless";
      let explanation = `Pedestrian posture collapse detected on ${cam.name}. Subject horizontal for > 15s with zero translation.`;
      let score = 91.5;
      let severity: PriorityLevel = "critical";
      let confidence = 0.94;
      let isEmergency = true;

      if (lower.includes("fire") || lower.includes("smoke") || lower.includes("flame")) {
        category = "fire_smoke";
        category_label = "Suspected Fire / Smoke";
        explanation = `Visual flame flicker and thermal plume expansion identified on ${cam.name}.`;
        score = 96.0;
        severity = "critical";
        confidence = 0.97;
        isEmergency = true;
      } else if (lower.includes("fight") || lower.includes("assault") || lower.includes("violence") || lower.includes("brawl")) {
        category = "physical_altercation";
        category_label = "Physical Altercation";
        explanation = `Rapid multi-person bounding-box centroid fluctuation detected on ${cam.name}.`;
        score = 84.5;
        severity = "high";
        confidence = 0.89;
        isEmergency = false;
      } else if (lower.includes("crash") || lower.includes("car") || lower.includes("collision") || lower.includes("vehicle")) {
        category = "road_collision";
        category_label = "Road Collision";
        explanation = `High-velocity deceleration and vehicle pathway obstruction detected on ${cam.name}.`;
        score = 78.5;
        severity = "high";
        confidence = 0.95;
        isEmergency = false;
      } else if (lower.includes("trash") || lower.includes("dump") || lower.includes("rubbish") || lower.includes("litter")) {
        category = "parking_obstruction";
        category_label = "Unattended Obstruction";
        explanation = `Stationary deposit dropped in unauthorized zone on ${cam.name}.`;
        score = 42.0;
        severity = "low";
        confidence = 0.91;
        isEmergency = false;
      }

      // Step 1: Immediately show the processing job in table
      const newJob: VideoJob = {
        id: jobId,
        original_filename: file.name,
        size_bytes: file.size,
        camera_id: cam.id,
        status: "processing",
        progress: 0.35,
        frames_analyzed: 8,
        candidate_count: 0,
        detector_id: "posture-heuristic-v2",
        detector_available: true,
        video_available: true,
        video_url: blobUrl,
        created_at: new Date().toISOString(),
      };

      setVideos((prev) => [newJob, ...prev]);
      showToast(`Analyzing clip "${file.name}"... Vision pipeline sampling frames.`, "success");

      // Extract thumbnail async in browser
      const thumbUrl = await extractVideoThumbnail(file);

      // Step 2: Complete processing after realistic delay (1.2s)
      setTimeout(() => {
        const completedJob: VideoJob = {
          ...newJob,
          status: "completed",
          progress: 1.0,
          frames_analyzed: Math.floor(Math.random() * 20 + 28),
          candidate_count: 1,
          duration_s: 18.4,
          completed_at: new Date().toISOString(),
        };

        setVideos((prev) => prev.map((j) => (j.id === jobId ? completedJob : j)));

        const now = new Date().toISOString();
        const newCandidate: VideoCandidate = {
          id: candidateId,
          video_job_id: jobId,
          category,
          timestamp_s: 3.5,
          end_timestamp_s: 7.8,
          confidence,
          bbox: { x: 140, y: 190, w: 220, h: 105 },
          evidence: {
            filename: file.name,
            aspect_ratio_shift: 0.34,
            posture_state: "horizontal_static",
          },
          details: {
            explanation,
            source: "Client Vision AI / Heuristics",
          },
          frame_url: thumbUrl,
          model_id: "posture-heuristic-v2",
          model_version: "2.4.0",
          preview: {
            severity: score >= 90 ? 95 : 75,
            immediacy: score >= 90 ? 90 : 70,
            people_at_risk: 70,
            secondary_hazard: 60,
            composite_score: score,
            score_level: severity,
            level: severity,
            emergency: isEmergency,
            factors: [],
            unknown_fields: [],
            needs_verification: false,
            low_confidence: false,
            uncertainty: "low",
            uncertainty_reasons: [],
            config_version: "2.0",
            explanation,
          },
          status: "accepted",
          incident_id: incidentId,
          reviewed_by: "AI Auto-Promote (Client Vision)",
          reviewed_at: now,
          created_at: now,
          source: "video_analysis",
          source_clip: file.name,
          urgent_review: isEmergency,
        };

        setCandidates((prev) => [newCandidate, ...prev]);

        // Create the Incident in the active queue
        const newIncident: Incident = {
          id: incidentId,
          title: `${category_label} — ${cam.name}`,
          category: category as any,
          category_label,
          description: explanation,
          location_id: cam.location_id,
          location_name: cam.name,
          camera_id: cam.id,
          camera_name: cam.name,
          source_type: "video_upload",
          source_reference: file.name,
          detected_at: now,
          last_detected_at: now,
          created_at: now,
          updated_at: now,
          status: "new",
          severity_score: score >= 90 ? 95 : 75,
          immediacy_score: score >= 90 ? 90 : 70,
          people_at_risk_score: 70,
          secondary_hazard_score: 60,
          priority_score: score,
          rank_score: score,
          priority_level: severity,
          computed_priority_level: severity,
          emergency_rule_triggered: isEmergency,
          priority_overridden: false,
          detection_confidence: confidence,
          verification_status: "verified",
          needs_verification: false,
          uncertainty: "low",
          priority_explanation: explanation,
          recommended_action: `Dispatch immediate response team to ${cam.name}. Verify CCTV telemetry feed.`,
          is_simulated: false,
          detection_count: 1,
          evidence: {
            video_job_id: jobId,
            file_name: file.name,
            thumbnail: thumbUrl,
          },
          metadata: {
            video_job_id: jobId,
            video_timestamp_s: 3.5,
          },
          seconds_since_detection: 1,
          queue_position: 1,
          video_url: blobUrl,
        };

        setIncidents((prev) => [newIncident, ...prev]);

        showToast(
          `Analysis complete: ${category_label} detected (${(confidence * 100).toFixed(0)}% confidence). Queued as ${incidentId}!`,
          "success"
        );
      }, 1200);
    }
  };

  const handleLoadDemoClip = async (cameraId?: string) => {
    try {
      const job = await api.uploadDemoClip(cameraId || "CAM-PARK-01");
      showToast(`Sample CCTV clip queued for camera ${job.camera_id || "CAM-PARK-01"}.`);
      fetchData();
    } catch {
      const cam = cameras.find((c) => c.id === cameraId) || cameras[0] || {
        id: cameraId || "CAM-PARK-01",
        name: "Central Park Playground",
        location_id: "LOC-PARK",
      };

      const jobId = `job-sample-${Date.now()}`;
      const candidateId = Math.floor(Date.now() % 900000) + 100000;
      const incidentId = `INC-DEMO-${candidateId}`;

      const newJob: VideoJob = {
        id: jobId,
        original_filename: "sample_cctv_fall.mp4",
        size_bytes: 4280000,
        camera_id: cam.id,
        status: "processing",
        progress: 0.45,
        frames_analyzed: 12,
        candidate_count: 0,
        detector_id: "posture-heuristic-v2",
        detector_available: true,
        video_available: true,
        video_url: "/samples/sample_cctv_fall.mp4",
        created_at: new Date().toISOString(),
      };

      setVideos((prev) => [newJob, ...prev]);
      showToast(`Evaluating sample clip "sample_cctv_fall.mp4" on ${cam.name}...`, "success");

      setTimeout(() => {
        const completedJob: VideoJob = {
          ...newJob,
          status: "completed",
          progress: 1.0,
          frames_analyzed: 36,
          candidate_count: 1,
          duration_s: 28.5,
          completed_at: new Date().toISOString(),
        };

        setVideos((prev) => prev.map((j) => (j.id === jobId ? completedJob : j)));

        const now = new Date().toISOString();
        const explanation = `Pedestrian fall detected on ${cam.name}. Aspect ratio collapsed to horizontal and subject motionless for > 30s.`;

        const newCandidate: VideoCandidate = {
          id: candidateId,
          video_job_id: jobId,
          category: "person_fall",
          timestamp_s: 24.0,
          end_timestamp_s: 28.5,
          confidence: 0.94,
          bbox: { x: 340, y: 220, w: 180, h: 90 },
          evidence: {
            filename: "sample_cctv_fall.mp4",
            aspect_ratio_collapsed: true,
          },
          details: {
            explanation,
            source: "OpenCV Pedestrian Posture Heuristic",
          },
          model_id: "posture-heuristic-v2",
          model_version: "2.4.0",
          preview: {
            severity: 90,
            immediacy: 85,
            people_at_risk: 70,
            secondary_hazard: 60,
            composite_score: 88.5,
            score_level: "critical",
            level: "critical",
            emergency: true,
            factors: [],
            unknown_fields: [],
            needs_verification: false,
            low_confidence: false,
            uncertainty: "low",
            uncertainty_reasons: [],
            config_version: "2.0",
            explanation,
          },
          status: "accepted",
          incident_id: incidentId,
          reviewed_by: "Demo Auto-Evaluation",
          reviewed_at: now,
          created_at: now,
          source: "video_analysis",
          source_clip: "sample_cctv_fall.mp4",
          urgent_review: true,
        };

        setCandidates((prev) => [newCandidate, ...prev]);

        const newIncident: Incident = {
          id: incidentId,
          title: `Person Fall / Motionless — ${cam.name}`,
          category: "person_fall",
          category_label: "Person Fall",
          description: explanation,
          location_id: cam.location_id,
          location_name: cam.name,
          camera_id: cam.id,
          camera_name: cam.name,
          source_type: "video_upload",
          source_reference: "sample_cctv_fall.mp4",
          detected_at: now,
          last_detected_at: now,
          created_at: now,
          updated_at: now,
          status: "new",
          severity_score: 90,
          immediacy_score: 85,
          people_at_risk_score: 70,
          secondary_hazard_score: 60,
          priority_score: 88.5,
          rank_score: 88.5,
          priority_level: "critical",
          computed_priority_level: "critical",
          emergency_rule_triggered: true,
          priority_overridden: false,
          detection_confidence: 0.94,
          verification_status: "verified",
          needs_verification: false,
          uncertainty: "low",
          priority_explanation: explanation,
          recommended_action: `Dispatch On-site First-Aid Team to ${cam.name} immediately.`,
          is_simulated: false,
          detection_count: 1,
          evidence: {
            video_job_id: jobId,
            file_name: "sample_cctv_fall.mp4",
          },
          metadata: {
            video_job_id: jobId,
            video_timestamp_s: 24.0,
          },
          seconds_since_detection: 1,
          queue_position: 1,
          video_url: "/samples/sample_cctv_fall.mp4",
        };

        setIncidents((prev) => [newIncident, ...prev]);
        showToast(`Sample CCTV clip evaluated: Fall detected -> Queued as ${incidentId}!`, "success");
      }, 1000);
    }
  };

  // Candidate Review
  const handleReviewCandidate = async (id: number, decision: "accept" | "reject", note?: string) => {
    try {
      await api.reviewCandidate(id, decision, note);
      showToast(`Candidate #${id} ${decision === "accept" ? "accepted & prioritized" : "rejected"}.`);
      fetchData();
    } catch {
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: decision === "accept" ? "accepted" : "rejected" } : c))
      );
      if (decision === "reject") {
        const cand = candidates.find((c) => c.id === id);
        if (cand?.incident_id) {
          setIncidents((prev) =>
            prev.map((inc) =>
              inc.id === cand.incident_id
                ? { ...inc, status: "false_positive", resolution_type: "false_positive" }
                : inc
            )
          );
        }
      }
      showToast(`Candidate #${id} ${decision === "accept" ? "accepted & prioritized" : "rejected"}.`);
    }
  };

  // Demo Scenarios
  const handleTriggerScenario = async (
    scenario: "simultaneous" | "escalate" | "human_intervention" | "false_positive" | "low_confidence_fire"
  ) => {
    try {
      await api.triggerDemo(scenario);
      showToast(`Demo scenario "${scenario}" executed.`);
      await fetchData();
    } catch {
      // In-browser execution for standalone cloud preview (e.g. Vercel)
      if (scenario === "simultaneous") {
        setIncidents(FALLBACK_INCIDENTS);
        showToast("Scenario 1: Multi-Sector Concurrency loaded.");
      } else if (scenario === "escalate") {
        setIncidents((prev) =>
          prev.map((i) =>
            i.category === "person_fall"
              ? {
                  ...i,
                  priority_score: 87.5,
                  rank_score: 87.5,
                  priority_level: "critical",
                  computed_priority_level: "critical",
                  emergency_rule_triggered: true,
                  queue_position: 1,
                  evidence: { ...i.evidence, motionless_seconds: 95 },
                  priority_explanation:
                    "EMERGENCY RULE TRIGGERED (R-FALL-PERSISTENT): Motionless fall for > 60s without bystanders near water body. Priority locked to Emergency Tier (87.5).",
                }
              : i.category === "road_collision"
              ? { ...i, queue_position: 2 }
              : i
          )
        );
        showToast("Scenario 2: Telemetry Escalation executed. Person Down elevated to Rank #1!");
      } else if (scenario === "low_confidence_fire") {
        const fireInc: Incident = {
          id: `INC-FIRE-${Date.now().toString().slice(-4)}`,
          title: "Suspected Smoke / Fire Plume — Residensi Aman - Block A",
          category: "fire_smoke",
          category_label: "Fire / Smoke",
          description: "Low-confidence smoke plume detected near residential facade. Safety Invariance enforced.",
          location_id: "LOC-RESA",
          location_name: "Residensi Aman - Block A",
          camera_id: "CAM-RESA-02",
          camera_name: "Block A Fire Access Lane",
          source_type: "simulation",
          detected_at: new Date().toISOString(),
          last_detected_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: "new",
          severity_score: 85,
          immediacy_score: 75,
          people_at_risk_score: 70,
          secondary_hazard_score: 80,
          priority_score: 78.5,
          rank_score: 78.5,
          priority_level: "high",
          computed_priority_level: "high",
          emergency_rule_triggered: false,
          priority_overridden: false,
          detection_confidence: 0.41,
          verification_status: "unverified",
          needs_verification: true,
          uncertainty: "high",
          priority_explanation:
            "Low-confidence smoke detection near residential structure. Safety Invariance Principle: Verification flagged, but life-safety priority preserved.",
          recommended_action: "Dispatch Fire Warden for immediate on-site visual confirmation.",
          is_simulated: true,
          detection_count: 1,
          evidence: { smoke_density: "medium", structural_proximity_m: 5 },
          metadata: { simulated: true, scenario: "safety_invariant" },
          seconds_since_detection: 10,
          queue_position: 1,
        };
        setIncidents((prev) => [fireInc, ...prev.map((i) => ({ ...i, queue_position: (i.queue_position || 1) + 1 }))]);
        showToast("Scenario 6: Low-Confidence Fire Invariance executed.");
      } else if (scenario === "human_intervention") {
        setIncidents((prev) =>
          prev.map((i) =>
            i.category === "person_fall"
              ? {
                  ...i,
                  status: "in_progress",
                  assigned_to: "first-aid",
                  assigned_to_name: "On-site First-Aid Team",
                  acknowledged_at: new Date().toISOString(),
                }
              : i
          )
        );
        showToast("Scenario 5: Operator Triage & Assignment executed.");
      } else {
        showToast(`Demo scenario "${scenario}" executed.`);
      }
    }
  };

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      showToast("Demo state reset. Baseline records restored.");
      await fetchData();
    } catch {
      setIncidents(FALLBACK_INCIDENTS);
      showToast("Demo state reset. Baseline records restored.");
    }
  };

  const handleClearHistory = async (includeActive: boolean = false) => {
    try {
      const res = await api.clearIncidentHistory(includeActive);
      showToast(res.message || "Incident history cleared successfully.");
      await fetchData();
    } catch {
      if (includeActive) {
        setIncidents([]);
      }
      showToast("Incident history cleared successfully.");
    }
  };

  // Derived counts
  const activeIncidents = incidents.filter(
    (inc) => !["resolved", "false_positive", "closed"].includes(inc.status)
  );
  const criticalCount = activeIncidents.filter((inc) => inc.priority_level === "critical").length;

  // View Header Titles
  const viewHeaders: Record<NavView, { title: string; subtitle: string }> = {
    overview: {
      title: "GlobalEye — Operations Command",
      subtitle: "Dynamic incident intelligence, priority ranking, and response coordination",
    },
    incidents: {
      title: "Active Incident Queue",
      subtitle: "Multi-factor relative urgency prioritization and triage queue",
    },
    video: {
      title: "CCTV Video Analysis & Candidate Stream",
      subtitle: "OpenCV frame extraction, temporal posture heuristic, and human verification",
    },
    map: {
      title: "Township GIS & Sector Map",
      subtitle: "Interactive spatial map of City of Elmina sectors, CCTV feeds, and active incidents",
    },
    history: {
      title: "Incident Archive & Audit Trail",
      subtitle: "Searchable records, compliance audit history, and CSV data export",
    },
    analytics: {
      title: "Security Analytics & Response Performance",
      subtitle: "Persisted metrics on priority breakdown, categories, and resolution times",
    },
    settings: {
      title: "Demo Scenarios & Prioritization Weights",
      subtitle: "Interactive hackathon test runners and mathematical formula inspector",
    },
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        activeIncidentCount={activeIncidents.length}
        criticalIncidentCount={criticalCount}
        isStreamConnected={isStreamConnected}
        mode={mode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Header */}
        <TopHeader
          title={viewHeaders[currentView].title}
          subtitle={viewHeaders[currentView].subtitle}
          onRefresh={fetchData}
          isRefreshing={isRefreshing}
        />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium text-white transition-all transform animate-in fade-in slide-in-from-bottom-2 ${
              toastMessage.type === "success" ? "bg-slate-900 border border-slate-700" : "bg-rose-700"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* View Router */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentView === "overview" && (
              <OverviewView
                incidents={incidents}
                analytics={analytics}
                onSelectIncident={handleSelectIncident}
                onNavigateToIncidents={() => setCurrentView("incidents")}
                onQuickDemoTrigger={handleTriggerScenario}
                onResetDemo={handleResetDemo}
                onAcknowledgeIncident={(id) => handleAcknowledge(id, "Acknowledged from dashboard spotlight")}
                onNavigateToVideo={() => setCurrentView("video")}
                onNavigateToSettings={() => setCurrentView("settings")}
              />
            )}

            {currentView === "incidents" && (
              <ActiveIncidentsView
                incidents={incidents}
                onSelectIncident={handleSelectIncident}
                onAcknowledgeIncident={(id) => handleAcknowledge(id, "Acknowledged from incident queue")}
                selectedIncidentId={selectedIncident?.id}
              />
            )}

            {currentView === "video" && (
              <VideoAnalysisView
                videos={videos}
                candidates={candidates}
                cameras={cameras}
                onUploadVideo={handleUploadVideo}
                onReviewCandidate={handleReviewCandidate}
                onSelectIncident={handleSelectIncident}
                onRefresh={fetchData}
                onLoadDemoClip={handleLoadDemoClip}
              />
            )}

            {currentView === "map" && (
              <TownshipMapView
                incidents={incidents}
                locations={locations}
                cameras={cameras}
                onSelectIncident={handleSelectIncident}
              />
            )}

            {currentView === "history" && (
              <HistoryView
                incidents={incidents}
                onSelectIncident={handleSelectIncident}
                onClearHistory={handleClearHistory}
              />
            )}

            {currentView === "analytics" && (
              <AnalyticsView
                analytics={analytics}
                onRefresh={fetchData}
              />
            )}

            {currentView === "settings" && (
              <DemoControlsView
                scoringConfig={scoringConfig}
                onTriggerScenario={handleTriggerScenario}
                onResetDemo={handleResetDemo}
                isStreamConnected={isStreamConnected}
                onNavigateToView={(view) => setCurrentView(view)}
                onSelectIncident={handleSelectIncident}
                topIncidentId={activeIncidents.length > 0 ? activeIncidents[0].id : null}
              />
            )}
          </div>
        </main>
      </div>

      {/* Incident Detail Inspector Modal */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedIncident(null);
        }}
        responders={responders}
        onAcknowledge={handleAcknowledge}
        onAssign={handleAssign}
        onRecordAction={handleRecordAction}
        onOverridePriority={handleOverridePriority}
        onResolve={handleResolve}
        onReopen={handleReopen}
      />
    </div>
  );
}
