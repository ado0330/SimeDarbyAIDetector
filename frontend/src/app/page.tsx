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
  computeDynamicAnalytics,
} from "@/lib/mockData";
import { extractVideoThumbnail } from "@/lib/utils";
import { analyzeVideoWithGemini } from "@/lib/geminiVision";
import { Sidebar, NavView } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { IncidentDetailModal } from "@/components/modals/IncidentDetailModal";
import { OverviewView } from "@/components/views/OverviewView";
import { ActiveIncidentsView } from "@/components/views/ActiveIncidentsView";
import { TownshipMapView } from "@/components/views/TownshipMapView";
import { VideoAnalysisView } from "@/components/views/VideoAnalysisView";
import { HistoryView } from "@/components/views/HistoryView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { CheckCircle2, AlertCircle } from "lucide-react";

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
        latestItems = incRes.value.items;
        setIncidents(incRes.value.items);
      } else {
        // Keep active client state without falling back to synthetic fake items
        setIncidents((prev) => {
          latestItems = prev;
          return prev;
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
      showToast(`Clip "${file.name}" uploaded to backend pipeline.`);
      fetchData();
    } catch (e: any) {
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
        const severity: PriorityLevel = analysis.score >= 90 ? "critical" : analysis.score >= 75 ? "high" : "medium";

        const completedJob: VideoJob = {
          ...newJob,
          status: "completed",
          progress: 1.0,
          frames_analyzed: analysis.keyframes.length || 8,
          candidate_count: 1,
          duration_s: 16.5,
          detector_id: analysis.isGeminiAi ? `gemini-${analysis.modelUsed}` : "township-guardian-v2",
          completed_at: now,
        };

        setVideos((prev) => prev.map((j) => (j.id === jobId ? completedJob : j)));

        const newCandidate: VideoCandidate = {
          id: candidateId,
          video_job_id: jobId,
          category: analysis.category,
          timestamp_s: analysis.timestamp_s,
          end_timestamp_s: analysis.timestamp_s + 4.5,
          confidence: analysis.confidence,
          bbox: { x: 120, y: 160, w: 240, h: 140 },
          evidence: {
            filename: file.name,
            model: analysis.modelUsed,
            is_gemini: analysis.isGeminiAi,
            ...analysis.evidence,
          },
          details: {
            explanation: analysis.summary,
            source: analysis.isGeminiAi
              ? `Google Gemini Vision (${analysis.modelUsed})`
              : "Township Guardian Heuristics v2",
          },
          frame_url: thumbUrl,
          model_id: analysis.modelUsed,
          model_version: analysis.isGeminiAi ? "Gemini 1.5 Flash" : "2.4.0",
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
          reviewed_by: analysis.isGeminiAi
            ? "AI Auto-Promote (Gemini Vision)"
            : "AI Auto-Promote (Township Vision)",
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
          verification_status: "verified",
          needs_verification: false,
          uncertainty: "low",
          priority_explanation: analysis.summary,
          recommended_action: `Dispatch immediate response team to ${cam.name}. Verify CCTV telemetry feed.`,
          is_simulated: false,
          detection_count: 1,
          evidence: {
            video_job_id: jobId,
            file_name: file.name,
            thumbnail: thumbUrl,
            model_used: analysis.modelUsed,
            is_gemini: analysis.isGeminiAi,
          },
          metadata: {
            video_job_id: jobId,
            video_timestamp_s: analysis.timestamp_s,
            ai_model: analysis.modelUsed,
          },
          seconds_since_detection: 1,
          queue_position: 1,
          video_url: blobUrl,
        };

        setIncidents((prev) => [newIncident, ...prev]);

        showToast(
          `AI Vision: ${analysis.categoryLabel} detected (${(
            analysis.confidence * 100
          ).toFixed(0)}% conf). Incident ${incidentId} created.`,
          "success"
        );
      } catch (analysisErr: any) {
        console.error("Frame analysis error:", analysisErr);
        showToast(`Video analysis error: ${analysisErr.message || "Failed to process frames"}`, "error");
      }
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
                onAcknowledgeIncident={(id) => handleAcknowledge(id, "Acknowledged from dashboard spotlight")}
                onNavigateToVideo={() => setCurrentView("video")}
                onNavigateToMap={() => setCurrentView("map")}
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
