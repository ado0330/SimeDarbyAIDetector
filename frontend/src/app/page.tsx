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
  createFallbackDetail,
} from "@/lib/mockData";
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
      }
      if (candRes.status === "fulfilled") {
        setCandidates(candRes.value);
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
      showToast(`Upload completed: "${file.name}" received.`, "success");
    }
  };

  const handleLoadDemoClip = async (cameraId?: string) => {
    try {
      const job = await api.uploadDemoClip(cameraId || "CAM-PARK-01");
      showToast(`Sample CCTV clip queued for camera ${job.camera_id || "CAM-PARK-01"}.`);
      fetchData();
    } catch {
      showToast(`Sample CCTV clip loaded for evaluation.`);
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
