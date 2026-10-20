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
      }
      if (anaRes.status === "fulfilled") {
        setAnalytics(anaRes.value);
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
        }

        if (healthData.status === "fulfilled") {
          setMode(healthData.value.mode);
        }

        if (configData.status === "fulfilled") {
          setScoringConfig(configData.value);
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
    } catch (err: any) {
      showToast(`Failed to open incident details: ${err.message}`, "error");
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
    } catch (err: any) {
      showToast(`Acknowledgment failed: ${err.message}`, "error");
      throw err;
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
    } catch (err: any) {
      showToast(`Assignment failed: ${err.message}`, "error");
      throw err;
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
    } catch (err: any) {
      showToast(`Failed to record action: ${err.message}`, "error");
      throw err;
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
    } catch (err: any) {
      showToast(`Priority override failed: ${err.message}`, "error");
      throw err;
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
    } catch (err: any) {
      showToast(`Resolution failed: ${err.message}`, "error");
      throw err;
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
    } catch (err: any) {
      showToast(`Reopen failed: ${err.message}`, "error");
      throw err;
    }
  };

  // Video Analysis Upload
  const handleUploadVideo = async (file: File, cameraId?: string) => {
    const job = await api.uploadVideo(file, cameraId);
    showToast(`Clip "${file.name}" uploaded. Processing queued.`);
    fetchData();
  };

  // Candidate Review
  const handleReviewCandidate = async (id: number, decision: "accept" | "reject", note?: string) => {
    await api.reviewCandidate(id, decision, note);
    showToast(`Candidate #${id} ${decision === "accept" ? "accepted & prioritized" : "rejected"}.`);
    fetchData();
  };

  // Demo Scenarios
  const handleTriggerScenario = async (
    scenario: "simultaneous" | "escalate" | "human_intervention" | "false_positive" | "low_confidence_fire"
  ) => {
    await api.triggerDemo(scenario);
    showToast(`Demo scenario "${scenario}" executed.`);
    await fetchData();
  };

  const handleResetDemo = async () => {
    await api.resetDemo();
    showToast("Demo state reset. Baseline records restored.");
    await fetchData();
  };

  // Derived counts
  const activeIncidents = incidents.filter(
    (inc) => !["resolved", "false_positive", "closed"].includes(inc.status)
  );
  const criticalCount = activeIncidents.filter((inc) => inc.priority_level === "critical").length;

  // View Header Titles
  const viewHeaders: Record<NavView, { title: string; subtitle: string }> = {
    overview: {
      title: "Township Guardian AI — Operations Command",
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
          onQuickDemoTrigger={handleTriggerScenario}
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
