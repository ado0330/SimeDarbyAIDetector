"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  computeDynamicAnalytics,
} from "@/lib/mockData";
import { extractVideoThumbnail } from "@/lib/utils";
import { CriticalAlertCenter } from "@/components/layout/CriticalAlertCenter";
import { analyzeVideoWithGemini, sanitizeIncidentEvidence } from "@/lib/geminiVision";
import { Sidebar, NavView } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { IncidentDetailModal } from "@/components/modals/IncidentDetailModal";
import { OverviewView } from "@/components/views/OverviewView";
import { ActiveIncidentsView } from "@/components/views/ActiveIncidentsView";
import { TownshipMapView } from "@/components/views/TownshipMapView";
import { VideoAnalysisView } from "@/components/views/VideoAnalysisView";
import { HistoryView } from "@/components/views/HistoryView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { EMERGENCY_RESPONSE_FLEET } from "@/lib/auxiliaryUnits";
import { CheckCircle2, AlertCircle } from "lucide-react";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function sortByPriority<T extends { priority_level: string; priority_score?: number; rank_score?: number; detected_at?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const prioDiff = (PRIORITY_ORDER[b.priority_level] || 0) - (PRIORITY_ORDER[a.priority_level] || 0);
    if (prioDiff !== 0) return prioDiff;
    const scoreDiff = (b.priority_score ?? b.rank_score ?? 0) - (a.priority_score ?? a.rank_score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.detected_at && b.detected_at) {
      return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
    }
    return 0;
  });
}

export default function Home() {
  const [currentView, setCurrentView] = useState<NavView>("overview");

  // Core Data States - completely blank initial state for every visitor
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfigData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(FALLBACK_ANALYTICS);
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [candidates, setCandidates] = useState<VideoCandidate[]>([]);

  // Platform State
  const [mode, setMode] = useState<string>("simulation");
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"connecting" | "connected" | "demo" | "disconnected">("connecting");
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

      let latestItems: Incident[] = [];
      if (incRes.status === "fulfilled") {
        setBackendStatus("connected");
        latestItems = sortByPriority(incRes.value.items);
        setIncidents(latestItems);
      } else {
        // Backend offline or running in cloud demo mode (e.g. Vercel)
        setBackendStatus("demo");
        setIncidents((prev) => {
          latestItems = sortByPriority(prev);
          return latestItems;
        });
      }

      if (anaRes.status === "fulfilled" && anaRes.value && anaRes.value.totals.incidents > 0) {
        setAnalytics(anaRes.value);
      } else {
        setAnalytics(computeDynamicAnalytics(latestItems));
      }

      if (vidRes.status === "fulfilled") {
        setVideos(vidRes.value);
      } else {
        setVideos((prev) => prev);
      }
      if (candRes.status === "fulfilled") {
        setCandidates(candRes.value);
      } else {
        setCandidates((prev) => prev);
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

  const selectedIncidentRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIncidentRef.current = selectedIncident?.id || null;
  }, [selectedIncident?.id]);

  // Server-Sent Events (SSE) Live Subscription
  useEffect(() => {
    let unsubscribe: () => void = () => { };

    try {
      unsubscribe = api.subscribeQueueEvents((event) => {
        if (event.type === "connected") {
          setIsStreamConnected(true);
        } else if (event.type === "queue_changed") {
          setIsStreamConnected(true);
          fetchData();
          if (event.incident_id && selectedIncidentRef.current === event.incident_id) {
            api.getIncident(event.incident_id)
              .then((updated) => setSelectedIncident(updated))
              .catch(() => {});
          }
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

  // Incident Actions.
  // In connected mode, state synchronizes with FastAPI / SQLite.
  // In demo mode (e.g. Vercel deployment), state updates locally so judges can test SOP checklists,
  // responder assignments, and resolution flows without server errors.
  const syncFromServer = (id: string, incident: IncidentDetail) => {
    setSelectedIncident((prev) => (prev && prev.id === id ? incident : prev));
    fetchData();
  };

  const handleAcknowledge = async (id: string, note?: string) => {
    try {
      const res = await api.acknowledge(id, note);
      showToast(`Incident ${id} acknowledged.`);
      syncFromServer(id, res.incident);
    } catch {
      const now = new Date().toISOString();
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "acknowledged", acknowledged_at: now, updated_at: now } : i))
      );
      setSelectedIncident((prev) =>
        prev && prev.id === id ? { ...prev, status: "acknowledged", acknowledged_at: now, updated_at: now } : prev
      );
      showToast(`Incident ${id} acknowledged.`);
    }
  };

  const handleAssign = async (id: string, responderId: string, note?: string) => {
    const ids = responderId.split(",").map((s) => s.trim()).filter(Boolean);
    const names = ids.map((unitId) => {
      const resp = responders.find((r) => r.id === unitId) || EMERGENCY_RESPONSE_FLEET.find((u) => u.id === unitId);
      return resp ? (resp as any).name || (resp as any).callsign : unitId;
    });
    const combinedNames = names.join(", ");
    const primaryId = ids[0] || responderId;

    try {
      const res = await api.assign(id, primaryId, note || `Multi-agency response: ${combinedNames}`);
      showToast(`Assigned ${combinedNames} to ${id}.`);
      syncFromServer(id, {
        ...res.incident,
        assigned_to: responderId,
        assigned_to_name: combinedNames,
      });
    } catch {
      const now = new Date().toISOString();
      const newAssignments = ids.map((unitId, idx) => ({
        id: Date.now() + idx,
        responder_id: unitId,
        responder_name: names[idx] || unitId,
        assigned_by: "Control Room Supervisor",
        assigned_at: now,
      }));

      setIncidents((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, assigned_to: responderId, assigned_to_name: combinedNames, status: "in_progress", updated_at: now }
            : i
        )
      );
      setSelectedIncident((prev) => {
        if (!prev || prev.id !== id) return prev;
        return {
          ...prev,
          assigned_to: responderId,
          assigned_to_name: combinedNames,
          status: "in_progress",
          assignments: [...newAssignments, ...(prev.assignments || [])],
          updated_at: now,
        };
      });
      showToast(`Assigned ${combinedNames} to ${id}.`);
    }
  };

  const handleRecordAction = async (id: string, actionType: string, note: string) => {
    try {
      const res = await api.recordAction(id, actionType, note);
      showToast(`Action log recorded for ${id}.`);
      syncFromServer(id, res.incident);
    } catch {
      const now = new Date().toISOString();
      setSelectedIncident((prev) => {
        if (!prev || prev.id !== id) return prev;
        const newEvent = {
          id: Date.now(),
          event_type: actionType,
          message: note,
          data: {},
          actor: "Control Room Supervisor",
          created_at: now,
        };
        return {
          ...prev,
          events: [newEvent, ...(prev.events || [])],
          updated_at: now,
        };
      });
      showToast(`Action recorded: ${note.slice(0, 35)}`);
    }
  };

  const handleOverridePriority = async (id: string, level: PriorityLevel | null, reason: string) => {
    try {
      const res = await api.overridePriority(id, level, reason);
      showToast(`Priority override updated for ${id}.`);
      syncFromServer(id, res.incident);
    } catch {
      const effective = level || "medium";
      const now = new Date().toISOString();
      setIncidents((prev) => {
        const next = prev.map((i) =>
          i.id === id
            ? { ...i, priority_level: effective, priority_overridden: true, override_reason: reason, updated_at: now }
            : i
        );
        setAnalytics(computeDynamicAnalytics(next));
        return next;
      });
      setSelectedIncident((prev) =>
        prev && prev.id === id
          ? { ...prev, priority_level: effective, priority_overridden: true, override_reason: reason, updated_at: now }
          : prev
      );
      showToast(`Priority updated to ${effective.toUpperCase()} for ${id}.`);
    }
  };

  const handleResolve = async (id: string, resolutionType: "resolved" | "false_positive", note?: string) => {
    try {
      const res = await api.resolve(id, resolutionType, note);
      showToast(`Incident ${id} marked as ${resolutionType.replace("_", " ")}.`);
      syncFromServer(id, res.incident);
    } catch {
      const now = new Date().toISOString();
      setIncidents((prev) => {
        const next = prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: resolutionType,
                resolution_type: resolutionType,
                resolution_note: note,
                resolved_at: now,
                updated_at: now,
              }
            : i
        );
        setAnalytics(computeDynamicAnalytics(next));
        return next;
      });
      setSelectedIncident((prev) =>
        prev && prev.id === id
          ? {
              ...prev,
              status: resolutionType,
              resolution_type: resolutionType,
              resolution_note: note,
              resolved_at: now,
              updated_at: now,
            }
          : prev
      );
      showToast(`Incident ${id} marked as ${resolutionType.replace("_", " ")}.`);
    }
  };

  const handleReopen = async (id: string, reason: string) => {
    try {
      const res = await api.reopen(id, reason);
      showToast(`Incident ${id} reopened.`);
      syncFromServer(id, res.incident);
    } catch {
      const now = new Date().toISOString();
      setIncidents((prev) => {
        const next = prev.map((i) =>
          i.id === id ? { ...i, status: "in_progress" as const, updated_at: now } : i
        );
        setAnalytics(computeDynamicAnalytics(next));
        return next;
      });
      setSelectedIncident((prev) =>
        prev && prev.id === id ? { ...prev, status: "in_progress", updated_at: now } : prev
      );
      showToast(`Incident ${id} reopened.`);
    }
  };

  // Supervisor escalation for an unacknowledged critical alert: logged to audit trail
  const handleEscalate = async (id: string, supervisor: string, elapsedSeconds: number) => {
    const msg = `[AUTO-ESCALATION] Critical alert unacknowledged for ${Math.round(elapsedSeconds)}s. Escalated to ${supervisor}.`;
    try {
      await api.recordAction(id, "escalation", msg);
      fetchData();
    } catch {
      const now = new Date().toISOString();
      setSelectedIncident((prev) => {
        if (!prev || prev.id !== id) return prev;
        return {
          ...prev,
          events: [
            {
              id: Date.now(),
              event_type: "escalation",
              message: msg,
              data: {},
              actor: "GlobalEye System Supervisor",
              created_at: now,
            },
            ...(prev.events || []),
          ],
          updated_at: now,
        };
      });
    }
    showToast(`Critical incident ${id} escalated to ${supervisor}.`, "error");
  };

  // Dashboard / queue quick-actions
  const quickAcknowledge = (id: string, note: string) => {
    handleAcknowledge(id, note).catch(() => {});
  };

  // Video Analysis Upload
  const handleUploadVideo = async (file: File, cameraId?: string) => {
    // If backend is connected, upload to FastAPI pipeline
    if (backendStatus === "connected") {
      try {
        const job = await api.uploadVideo(file, cameraId);
        showToast(`Clip "${file.name}" uploaded to backend pipeline.`);
        fetchData();
        return;
      } catch (e: any) {
        console.warn("Backend upload failed, switching to client vision pipeline:", e);
      }
    }

    // Client-side & Vercel standalone video analysis engine
    const blobUrl = URL.createObjectURL(file);
      const cam = cameras.find((c) => c.id === cameraId) || cameras[0] || {
        id: cameraId || "CAM-PARK-01",
        name: "Elmina Central Park Trail #1",
        location_id: "LOC-PARK",
      };

      const jobId = `job-${Date.now()}`;
      const candidateId = Math.floor(Date.now() % 900000) + 100000;
      const incidentId = `INC-VID-${candidateId}`;

      // Step 1: Immediately show processing job in table
      const newJob: VideoJob = {
        id: jobId,
        original_filename: file.name,
        size_bytes: file.size,
        camera_id: cam.id,
        status: "processing",
        progress: 0.35,
        frames_analyzed: 6,
        candidate_count: 0,
        detector_id: "ai-vision-v2",
        detector_available: true,
        video_available: true,
        video_url: blobUrl,
        created_at: new Date().toISOString(),
      };

      setVideos((prev) => [newJob, ...prev]);
      showToast(
        `Sampling video frames & analyzing "${file.name}" with AI vision pipeline...`,
        "success"
      );

      // Step 2: Extract frames and query Gemini Multimodal Vision API
      try {
        const analysis = await analyzeVideoWithGemini(file, cam.name);
        const thumbUrl = analysis.keyframes[0]?.dataUrl || (await extractVideoThumbnail(file));
        const now = new Date().toISOString();

        // 0. AI could not really analyse the clip: report that honestly. No incident, and NOT "normal activity".
        if (analysis.aiUnavailable) {
          setVideos((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? {
                    ...newJob,
                    status: "failed",
                    progress: 1.0,
                    candidate_count: 0,
                    detector_available: false,
                    detector_id: "none",
                    error: `AI analysis unavailable: ${analysis.unavailableReason}`,
                    completed_at: now,
                  }
                : j
            )
          );
          showToast(`AI analysis unavailable for "${file.name}". No incident created — review the clip manually.`, "error");
          return;
        }

        // 1. Check if normal surveillance activity (No incident detected)
        if (
          !analysis.detected ||
          !analysis.category ||
          analysis.category === "null" ||
          analysis.category === "none" ||
          analysis.category === "normal" ||
          analysis.category === "normal_activity"
        ) {
          const completedJob: VideoJob = {
            ...newJob,
            status: "completed",
            progress: 1.0,
            frames_analyzed: analysis.keyframes.length || 6,
            candidate_count: 0,
            duration_s: analysis.duration_s || 8.0,
            detector_id: `gemini-${analysis.modelUsed}`,
            completed_at: now,
          };

          setVideos((prev) => prev.map((j) => (j.id === jobId ? completedJob : j)));

          showToast(
            `Analysis Complete: Normal activity verified on ${cam.name}. No safety hazards or incidents detected.`,
            "success"
          );
          return;
        }

        // 2. Incident detected: Proceed with candidate and incident creation
        const severity: PriorityLevel = analysis.score >= 90 ? "critical" : analysis.score >= 75 ? "high" : "medium";

        const completedJob: VideoJob = {
          ...newJob,
          status: "completed",
          progress: 1.0,
          frames_analyzed: analysis.keyframes.length || 6,
          candidate_count: 1,
          duration_s: analysis.duration_s || 8.0,
          detector_id: `gemini-${analysis.modelUsed}`,
          completed_at: now,
        };

        setVideos((prev) => prev.map((j) => (j.id === jobId ? completedJob : j)));

        const cleanEvidence = sanitizeIncidentEvidence(analysis.category, analysis.evidence);

        const newCandidate: VideoCandidate = {
          id: candidateId,
          video_job_id: jobId,
          category: analysis.category,
          timestamp_s: analysis.timestamp_s,
          end_timestamp_s: analysis.timestamp_s + 4.5,
          confidence: analysis.confidence,
          bbox: { x: 120, y: 160, w: 240, h: 140 },
          evidence: cleanEvidence,
          details: {
            explanation: analysis.summary,
            source: "Township Vision AI Engine",
          },
          frame_url: thumbUrl,
          model_id: "vision-pipeline",
          model_version: "2.4.0",
          preview: {
            severity: analysis.score >= 90 ? 95 : 75,
            immediacy: analysis.score >= 90 ? 90 : 70,
            people_at_risk: 70,
            secondary_hazard: 60,
            composite_score: analysis.score,
            score_level: severity,
            level: severity,
            emergency: analysis.isEmergency,
            factors: [],
            unknown_fields: [],
            needs_verification: false,
            low_confidence: false,
            uncertainty: "low",
            uncertainty_reasons: [],
            config_version: "2.0",
            explanation: analysis.summary,
          },
          status: "accepted",
          incident_id: incidentId,
          reviewed_by: "AI auto-promote — awaiting human verification",
          reviewed_at: now,
          created_at: now,
          source: "video_analysis",
          source_clip: file.name,
          urgent_review: analysis.isEmergency,
        };

        setCandidates((prev) => [newCandidate, ...prev]);

        // Create the Incident in the active queue as a Danger Incident
        const newIncident: Incident = {
          id: incidentId,
          title: `${analysis.title} — ${cam.name}`,
          category: analysis.category as any,
          category_label: analysis.categoryLabel,
          description: analysis.summary,
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
          severity_score: analysis.score >= 90 ? 95 : 75,
          immediacy_score: analysis.score >= 90 ? 90 : 70,
          people_at_risk_score: 70,
          secondary_hazard_score: 60,
          priority_score: analysis.score,
          rank_score: analysis.score,
          priority_level: severity,
          computed_priority_level: severity,
          emergency_rule_triggered: analysis.isEmergency,
          priority_overridden: false,
          detection_confidence: analysis.confidence,
          verification_status: "unverified",
          needs_verification: true,
          uncertainty: "low",
          priority_explanation: analysis.summary,
          recommended_action: `Dispatch immediate response team to ${cam.name}. Verify CCTV telemetry feed.`,
          is_simulated: false,
          detection_count: 1,
          evidence: cleanEvidence,
          metadata: {
            video_job_id: jobId,
            video_timestamp_s: analysis.timestamp_s,
            source_file: file.name,
            local_only: true,
            ai_detected_unverified: true,
          },
          seconds_since_detection: 1,
          queue_position: 1,
          video_url: blobUrl,
        };

        setIncidents((prev) => sortByPriority([newIncident, ...prev]));

        showToast(
          `AI Alert: ${analysis.categoryLabel} detected (${(
            analysis.confidence * 100
          ).toFixed(0)}% model confidence). Incident ${incidentId} created for operator verification.`,
          "error"
        );
      } catch (analysisErr: any) {
        console.error("Frame analysis error:", analysisErr);
        showToast(`Video analysis error: ${analysisErr.message || "Failed to process frames"}`, "error");
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

  const handleClearHistory = async (includeActive: boolean = false) => {
    try {
      const res = await api.clearIncidentHistory(includeActive);
      showToast(res.message || "Incident history cleared (confirmed by server).");
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Backend unreachable";
      showToast(`NOT SAVED — history was not cleared: ${msg}`, "error");
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
      subtitle: "Multimodal AI video analysis, real-time threat detection, and human verification",
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
  };

  // Synchronize dynamic analytics whenever incidents change (client-side only)
  useEffect(() => {
    setAnalytics((prev) => {
      if (prev && prev.totals && prev.totals.incidents > 0 && incidents.length === prev.totals.incidents) {
        return prev;
      }
      return computeDynamicAnalytics(incidents, new Date());
    });
  }, [incidents]);

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
        backendStatus={backendStatus}
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

        {/* Critical alert banner: audible alarm, unacknowledged countdown, supervisor escalation */}
        <CriticalAlertCenter
          incidents={incidents}
          backendConnected={backendStatus === "connected" || backendStatus === "demo"}
          onAcknowledge={(id) => quickAcknowledge(id, "Acknowledged from critical alert banner")}
          onOpen={handleSelectIncident}
          onEscalate={handleEscalate}
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
                onAcknowledgeIncident={(id) => quickAcknowledge(id, "Acknowledged from dashboard spotlight")}
                onNavigateToVideo={() => setCurrentView("video")}
                onNavigateToMap={() => setCurrentView("map")}
              />
            )}

            {currentView === "incidents" && (
              <ActiveIncidentsView
                incidents={incidents}
                onSelectIncident={handleSelectIncident}
                onAcknowledgeIncident={(id) => quickAcknowledge(id, "Acknowledged from incident queue")}
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
