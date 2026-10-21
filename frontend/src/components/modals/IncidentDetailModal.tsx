import React, { useState, useRef } from "react";
import {
  IncidentDetail,
  PriorityLevel,
  IncidentStatus,
  Responder,
} from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getPriorityStyles,
  getStatusStyles,
  formatDateTime,
  formatTimeAgo,
  formatCategory,
} from "@/lib/utils";
import {
  CheckCircle,
  UserPlus,
  FileText,
  Sliders,
  XCircle,
  RotateCcw,
  AlertCircle,
  Clock,
  MapPin,
  Camera,
  Activity,
  History,
  Info,
  ShieldAlert,
  Video,
  Play,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

interface IncidentDetailModalProps {
  incident: IncidentDetail | null;
  isOpen: boolean;
  onClose: () => void;
  responders: Responder[];
  onAcknowledge: (id: string, note?: string) => Promise<void>;
  onAssign: (id: string, responderId: string, note?: string) => Promise<void>;
  onRecordAction: (id: string, actionType: string, note: string) => Promise<void>;
  onOverridePriority: (id: string, level: PriorityLevel | null, reason: string) => Promise<void>;
  onResolve: (id: string, resolutionType: "resolved" | "false_positive", note?: string) => Promise<void>;
  onReopen: (id: string, reason: string) => Promise<void>;
  onEvidenceUpdate?: (id: string, patch: Record<string, any>, note?: string) => Promise<void>;
}

export function IncidentDetailModal({
  incident,
  isOpen,
  onClose,
  responders,
  onAcknowledge,
  onAssign,
  onRecordAction,
  onOverridePriority,
  onResolve,
  onReopen,
  onEvidenceUpdate,
}: IncidentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "audit" | "scoring">("overview");

  // Action dialog states
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const [actionType, setActionType] = useState<string>("note");
  const [actionNote, setActionNote] = useState<string>("");
  const [showActionDialog, setShowActionDialog] = useState(false);

  const [overrideLevel, setOverrideLevel] = useState<PriorityLevel | "clear">("high");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);

  const [resolutionType, setResolutionType] = useState<"resolved" | "false_positive">("resolved");
  const [resolutionNote, setResolutionNote] = useState<string>("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  const [reopenReason, setReopenReason] = useState<string>("");
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [mediaMode, setMediaMode] = useState<"video" | "snapshot">("video");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!incident) return null;

  const effectiveVideoUrl =
    incident.video_url ||
    incident.evidence_items?.find((i) => i.video_url)?.video_url ||
    (incident.metadata?.video_job_id ? `/api/videos/${incident.metadata.video_job_id}/file` : null);

  const videoTimestamp =
    incident.evidence_items?.find((i) => typeof i.timestamp_s === "number")?.timestamp_s ??
    (typeof incident.metadata?.video_timestamp_s === "number" ? incident.metadata.video_timestamp_s : null);

  const handleJumpToTimestamp = (sec: number) => {
    setMediaMode("video");
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play().catch(() => {});
    }
  };

  const prioStyles = getPriorityStyles(incident.priority_level);
  const statusStyles = getStatusStyles(incident.status);
  const isTerminal = ["resolved", "false_positive", "closed"].includes(incident.status);

  // Handlers
  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onAcknowledge(incident.id, "Acknowledged from incident inspector");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assigneeId) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onAssign(incident.id, assigneeId);
      setShowAssignDialog(false);
      setAssigneeId("");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordAction = async () => {
    if (!actionNote.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onRecordAction(incident.id, actionType, actionNote.trim());
      setShowActionDialog(false);
      setActionNote("");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReason.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onOverridePriority(
        incident.id,
        overrideLevel === "clear" ? null : overrideLevel,
        overrideReason.trim()
      );
      setShowOverrideDialog(false);
      setOverrideReason("");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onResolve(incident.id, resolutionType, resolutionNote.trim());
      setShowResolveDialog(false);
      setResolutionNote("");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onReopen(incident.id, reopenReason.trim());
      setShowReopenDialog(false);
      setReopenReason("");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="3xl"
        title={`${incident.id} — ${incident.title}`}
        description={`Detected ${formatDateTime(incident.detected_at)} (${formatTimeAgo(incident.detected_at)})`}
      >
        <div className="space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Metadata Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200/90">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${prioStyles.pill}`}>
                Priority {prioStyles.label} ({incident.priority_score.toFixed(1)}/100)
              </span>

              {incident.emergency_rule_triggered && (
                <Badge variant="emergency" className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Emergency Tier
                </Badge>
              )}

              <span className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1.5 ${statusStyles.badge}`}>
                <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`} />
                {statusStyles.label}
              </span>

              <Badge variant="outline" className="border-teal-400 text-teal-800 bg-teal-50/60 font-semibold">
                {incident.source_type === "video_upload" || !incident.is_simulated ? "CCTV Vision Analysis" : "Township Telemetry"}
              </Badge>

              {incident.priority_overridden && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200">
                  Manual Override Active
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {incident.location_name || incident.location_id || "Unknown Zone"}
              </span>
              <span className="flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                {incident.camera_name || incident.camera_id || "No Camera"}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 space-x-6 text-xs font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-2.5 cursor-pointer border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-teal-600 text-teal-800 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Incident Assessment
            </button>
            <button
              onClick={() => setActiveTab("scoring")}
              className={`pb-2.5 cursor-pointer border-b-2 transition-colors ${
                activeTab === "scoring"
                  ? "border-teal-600 text-teal-800 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Scoring Factors ({incident.score_breakdown?.factors?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`pb-2.5 cursor-pointer border-b-2 transition-colors ${
                activeTab === "timeline"
                  ? "border-teal-600 text-teal-800 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Event Timeline ({incident.events?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`pb-2.5 cursor-pointer border-b-2 transition-colors ${
                activeTab === "audit"
                  ? "border-teal-600 text-teal-800 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Audit Trail ({incident.audit?.length || 0})
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Plain-Language Intelligence Explanation */}
              <div className="p-4 rounded-lg bg-teal-50/60 border border-teal-200">
                <div className="flex items-center gap-2 text-teal-900 font-semibold text-xs mb-1.5">
                  <Activity className="w-4 h-4 text-teal-700" />
                  Dynamic Intelligence Assessment
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {incident.priority_explanation}
                </p>
                {incident.override_reason && (
                  <div className="mt-2.5 pt-2 border-t border-teal-200/80 text-[11px] text-purple-900">
                    <span className="font-semibold">Administrator Override Reason:</span>{" "}
                    {incident.override_reason}
                  </div>
                )}
              </div>

              {/* Recommended Action Box */}
              <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs mb-1">
                  <Info className="w-4 h-4 text-amber-700" />
                  Recommended Operational Action (Advisory)
                </div>
                <p className="text-xs text-amber-950 font-medium">
                  {incident.recommended_action || "Review video feed and assign a security responder."}
                </p>
                <p className="text-[10px] text-amber-700 mt-1 italic">
                  * All recommendations are strictly advisory. The control room supervisor retains full response authority.
                </p>
              </div>

              {/* Key Indicators Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Category</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {formatCategory(incident.category)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Detection Confidence</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {incident.detection_confidence !== null && incident.detection_confidence !== undefined
                      ? `${(incident.detection_confidence * 100).toFixed(0)}%`
                      : "Heuristic (Unscored)"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Human Verification</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block capitalize">
                    {incident.verification_status.replace("_", " ")}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Assigned Responder</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {incident.assigned_to_name || incident.assigned_to || "Unassigned"}
                  </span>
                </div>
              </div>

              {/* CCTV Video Footage & Evidence Inspector */}
              {(effectiveVideoUrl || (incident.evidence_items && incident.evidence_items.length > 0)) && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                        <Video className="w-4 h-4 text-teal-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
                          CCTV Recorded Footage & Evidence
                          {effectiveVideoUrl && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Footage Stream Ready
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {incident.camera_name || incident.camera_id ? `Source: ${incident.camera_name || incident.camera_id}` : "Uploaded Surveillance Feed"}
                          {videoTimestamp !== null && ` • Incident detected at ${videoTimestamp.toFixed(1)}s`}
                        </p>
                      </div>
                    </div>

                    {/* Media Mode Switcher */}
                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                      {effectiveVideoUrl && (
                        <button
                          type="button"
                          onClick={() => setMediaMode("video")}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                            mediaMode === "video"
                              ? "bg-teal-600 text-white shadow-xs font-semibold"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          Watch CCTV Footage
                        </button>
                      )}
                      {incident.evidence_items && incident.evidence_items.some((i) => i.frame_url) && (
                        <button
                          type="button"
                          onClick={() => setMediaMode("snapshot")}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                            mediaMode === "snapshot" || !effectiveVideoUrl
                              ? "bg-teal-600 text-white shadow-xs font-semibold"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          Keyframe Evidence ({incident.evidence_items.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950">
                    {mediaMode === "video" && effectiveVideoUrl ? (
                      <div className="space-y-3">
                        <div className="relative rounded-lg overflow-hidden bg-black border border-slate-800 shadow-inner flex items-center justify-center">
                          <video
                            ref={videoRef}
                            src={effectiveVideoUrl}
                            controls
                            playsInline
                            preload="auto"
                            className="w-full max-h-[380px] object-contain aspect-video bg-black"
                            onLoadedMetadata={() => {
                              if (videoRef.current && typeof videoTimestamp === "number" && videoTimestamp > 0) {
                                videoRef.current.currentTime = videoTimestamp;
                              }
                            }}
                          >
                            Your browser does not support HTML5 video streaming.
                          </video>
                        </div>

                        {/* Quick playback jump controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                          <div className="flex items-center space-x-2">
                            {videoTimestamp !== null && (
                              <button
                                type="button"
                                onClick={() => handleJumpToTimestamp(videoTimestamp)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] font-medium"
                              >
                                <Clock className="w-3 h-3 text-teal-400" />
                                Jump to Detection Point ({videoTimestamp.toFixed(1)}s)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleJumpToTimestamp(0)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-colors cursor-pointer"
                            >
                              Rewind (0:00)
                            </button>
                          </div>

                          <a
                            href={effectiveVideoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-teal-300 text-[11px] flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Clip in New Window
                          </a>
                        </div>
                      </div>
                    ) : (
                      /* Snapshot Keyframe Mode */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {incident.evidence_items?.map((item) => (
                          <div key={item.id} className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900 group">
                            {item.frame_url ? (
                              <div className="relative">
                                <img
                                  src={item.frame_url}
                                  alt="Incident Evidence Frame"
                                  className="w-full h-48 object-cover bg-black"
                                />
                                {effectiveVideoUrl && typeof item.timestamp_s === "number" && (
                                  <button
                                    type="button"
                                    onClick={() => handleJumpToTimestamp(item.timestamp_s!)}
                                    className="absolute bottom-2 right-2 px-2 py-1 rounded bg-slate-950/90 hover:bg-teal-600 text-white text-[10px] font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                                  >
                                    <Play className="w-2.5 h-2.5" />
                                    Watch Video from {item.timestamp_s.toFixed(1)}s
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="h-40 flex items-center justify-center text-slate-500 text-xs">
                                No visual snapshot recorded
                              </div>
                            )}
                            <div className="p-2.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                              <span className="truncate pr-2">{item.description || "Video analysis keyframe capture"}</span>
                              {typeof item.timestamp_s === "number" && (
                                <span className="font-mono text-teal-400 font-semibold shrink-0">{item.timestamp_s.toFixed(1)}s</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observed Evidence Attributes */}
              {incident.evidence && Object.keys(incident.evidence).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 mb-2">Evidence Parameters</h4>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {Object.entries(incident.evidence).map(([k, v]) => (
                      <div key={k} className="p-1.5 bg-white rounded border border-slate-100">
                        <span className="text-slate-500 text-[10px] block uppercase tracking-wider">
                          {k.replace(/_/g, " ")}
                        </span>
                        <span className="font-medium text-slate-900">
                          {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Scoring Details */}
          {activeTab === "scoring" && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold block mb-1">Standardized Prioritization Formula</span>
                <code>priority_score = 0.40 × Severity + 0.25 × Immediacy + 0.20 × People + 0.15 × Secondary Hazard</code>
              </div>

              {/* Sub-scores Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-slate-500 text-[10px] block">Severity (40%)</span>
                  <span className="text-base font-bold text-slate-900">{incident.severity_score.toFixed(1)}/100</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-slate-500 text-[10px] block">Immediacy (25%)</span>
                  <span className="text-base font-bold text-slate-900">{incident.immediacy_score.toFixed(1)}/100</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-slate-500 text-[10px] block">People at Risk (20%)</span>
                  <span className="text-base font-bold text-slate-900">{incident.people_at_risk_score.toFixed(1)}/100</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-slate-500 text-[10px] block">Secondary Hazard (15%)</span>
                  <span className="text-base font-bold text-slate-900">{incident.secondary_hazard_score.toFixed(1)}/100</span>
                </div>
              </div>

              {/* Factor Contribution Table */}
              {incident.score_breakdown?.factors && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-2.5">Factor</th>
                        <th className="p-2.5">Affected Dimension</th>
                        <th className="p-2.5 text-right">Dimension Δ</th>
                        <th className="p-2.5 text-right">Composite Score Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incident.score_breakdown.factors.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-800">{f.label}</td>
                          <td className="p-2.5 capitalize text-slate-600">{f.dimension.replace(/_/g, " ")}</td>
                          <td className="p-2.5 text-right font-mono font-medium">
                            {f.delta >= 0 ? `+${f.delta.toFixed(1)}` : f.delta.toFixed(1)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-teal-800">
                            {f.composite_delta >= 0 ? `+${f.composite_delta.toFixed(1)}` : f.composite_delta.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Timeline */}
          {activeTab === "timeline" && (
            <div className="space-y-3">
              {incident.events?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No timeline events recorded.</p>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-4 text-xs">
                  {incident.events.map((e) => (
                    <div key={e.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-teal-600 border-2 border-white ring-2 ring-slate-200" />
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span className="font-semibold text-slate-800">{e.event_type.replace(/_/g, " ").toUpperCase()}</span>
                        <span>{formatDateTime(e.created_at)}</span>
                      </div>
                      <p className="text-slate-700 mt-1">{e.message}</p>
                      <div className="text-[10px] text-slate-400 mt-0.5">Actor: {e.actor}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Audit Log */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              {incident.audit?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No audit records.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-2.5">Action</th>
                        <th className="p-2.5">Actor</th>
                        <th className="p-2.5">Reason / Notes</th>
                        <th className="p-2.5 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incident.audit.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-800">{a.action.replace(/_/g, " ")}</td>
                          <td className="p-2.5 text-slate-600">{a.actor}</td>
                          <td className="p-2.5 text-slate-600 max-w-xs truncate">{a.reason || "—"}</td>
                          <td className="p-2.5 text-right font-mono text-[11px] text-slate-500">
                            {formatDateTime(a.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {incident.status === "new" && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAcknowledge}
                  loading={isSubmitting}
                  className="bg-blue-700 hover:bg-blue-800"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Acknowledge Alert
                </Button>
              )}

              {!isTerminal && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAssignDialog(true)}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Assign Responder
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowActionDialog(true)}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Record Action
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowOverrideDialog(true)}
                  >
                    <Sliders className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                    Override Priority
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setResolutionType("resolved");
                      setShowResolveDialog(true);
                    }}
                  >
                    Resolve Incident
                  </Button>
                </>
              )}

              {isTerminal && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowReopenDialog(true)}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                  Reopen Incident
                </Button>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={onClose}>
              Close Inspector
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sub-modal: Assign Responder */}
      <Modal
        isOpen={showAssignDialog}
        onClose={() => setShowAssignDialog(false)}
        title="Assign Responder"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleAssign} loading={isSubmitting}>
              Confirm Assignment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Select a designated on-duty response team for <strong>{incident.id}</strong>.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Responder
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 px-3 text-xs bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- Choose a Responder --</option>
              {responders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Sub-modal: Record Action */}
      <Modal
        isOpen={showActionDialog}
        onClose={() => setShowActionDialog(false)}
        title="Record Operator Action"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleRecordAction} loading={isSubmitting}>
              Save Action Log
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Action Type</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 px-3 text-xs bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="note">General Operator Note</option>
              <option value="camera_reviewed">Camera View Reviewed</option>
              <option value="patrol_dispatched">Security Patrol Dispatched</option>
              <option value="owner_contacted">Vehicle / Property Owner Contacted</option>
              <option value="area_secured">Area Secured / Cordoned</option>
              <option value="external_services_contacted">Emergency Services Contacted (Dispatch Log)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Action Notes</label>
            <textarea
              rows={3}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Detail observations or operational decisions taken..."
              className="w-full rounded-md border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </Modal>

      {/* Sub-modal: Override Priority */}
      <Modal
        isOpen={showOverrideDialog}
        onClose={() => setShowOverrideDialog(false)}
        title="Manual Priority Override"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowOverrideDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleOverride} loading={isSubmitting}>
              Save Override
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            A manual override takes precedence over the automated prioritization engine. An audit trail entry with your mandatory reason will be recorded.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Override Level</label>
            <select
              value={overrideLevel}
              onChange={(e) => setOverrideLevel(e.target.value as any)}
              className="w-full h-9 rounded-md border border-slate-300 px-3 text-xs bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="clear">Clear Override (Restore Engine Assessment)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Mandatory Justification Reason (min 5 chars)
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why you are adjusting the automated priority..."
              className="w-full rounded-md border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </Modal>

      {/* Sub-modal: Resolve Incident */}
      <Modal
        isOpen={showResolveDialog}
        onClose={() => setShowResolveDialog(false)}
        title="Resolve Incident"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleResolve} loading={isSubmitting}>
              Confirm Resolution
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Resolution Outcome</label>
            <select
              value={resolutionType}
              onChange={(e) => setResolutionType(e.target.value as any)}
              className="w-full h-9 rounded-md border border-slate-300 px-3 text-xs bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="resolved">Resolved — Situation Handled</option>
              <option value="false_positive">False Positive — Detection Incorrect / Non-issue</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Resolution Summary Note</label>
            <textarea
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Describe resolution details or reasons for closing..."
              className="w-full rounded-md border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </Modal>

      {/* Sub-modal: Reopen Incident */}
      <Modal
        isOpen={showReopenDialog}
        onClose={() => setShowReopenDialog(false)}
        title="Reopen Incident"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowReopenDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleReopen} loading={isSubmitting}>
              Confirm Reopen
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Reopening will place <strong>{incident.id}</strong> back in the active queue with status &quot;Acknowledged&quot;.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Reopening</label>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Explain why this incident requires further response..."
              className="w-full rounded-md border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
