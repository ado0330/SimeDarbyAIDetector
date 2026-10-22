import React, { useState, useRef, useEffect } from "react";
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
  formatIncidentId,
} from "@/lib/utils";
import { getTaxonomyCategory } from "@/lib/taxonomy";
import { sanitizeIncidentEvidence } from "@/lib/geminiVision";
import {
  EMERGENCY_RESPONSE_FLEET,
  EmergencyUnit,
  AUXILIARY_PATROL_FLEET,
  findNearestAuxiliaryUnit,
  generateWhatsAppSitrep,
  openWhatsAppDispatch,
} from "@/lib/auxiliaryUnits";
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
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Send,
  PhoneCall,
  Radio,
  Share2,
  CheckSquare,
  Square,
  Car,
  ChevronRight,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<"overview" | "scoring" | "timeline" | "audit">("overview");

  // Action dialog states
  const [selectedResponderIds, setSelectedResponderIds] = useState<string[]>([]);
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

  const [copiedSitrep, setCopiedSitrep] = useState(false);

  // Sync selected responders when modal or assign dialog opens
  useEffect(() => {
    if (incident) {
      const current = (incident.assigned_to || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setSelectedResponderIds(current);
    }
  }, [incident, showAssignDialog]);

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

  // Nearest Auxiliary Patrol Unit
  const nearestUnitInfo = findNearestAuxiliaryUnit(incident.location_id, incident.camera_id);
  const isAssigned = !!(incident.assigned_to_name || incident.assigned_to);

  // Multi-agency dispatched units
  const assignedUnits = (incident.assigned_to ? incident.assigned_to.split(",") : [])
    .map((id) => id.trim())
    .map((id) => EMERGENCY_RESPONSE_FLEET.find((u) => u.id === id))
    .filter(Boolean) as EmergencyUnit[];

  const sitrepUnits = assignedUnits.length > 0 ? assignedUnits : [nearestUnitInfo.unit];
  const sitrepMessage = generateWhatsAppSitrep(incident, sitrepUnits, nearestUnitInfo.etaFormatted);

  const handleCopySitrep = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sitrepMessage);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = sitrepMessage;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedSitrep(true);
      setTimeout(() => setCopiedSitrep(false), 2500);
    } catch {
      setCopiedSitrep(true);
      setTimeout(() => setCopiedSitrep(false), 2500);
    }
  };

  const handleSendWhatsApp = () => {
    openWhatsAppDispatch(sitrepMessage);
    onRecordAction(
      incident.id,
      "external_services_contacted",
      `[Field SITREP Dispatched] WhatsApp SITREP transmitted to Emergency Dispatch Channel (${sitrepUnits.map((u) => u.callsign).join(", ")})`
    ).catch(() => {});
  };

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
    if (selectedResponderIds.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const selectedNames = selectedResponderIds
        .map((id) => {
          const found = responders.find((r) => r.id === id) || EMERGENCY_RESPONSE_FLEET.find((u) => u.id === id);
          return found ? (found as any).name || (found as any).callsign : id;
        })
        .join(", ");
      const multiId = selectedResponderIds.join(",");
      await onAssign(incident.id, multiId, `Multi-agency dispatch assigned: ${selectedNames}`);
      setShowAssignDialog(false);
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
        title={`${formatIncidentId(incident.id)} — ${incident.title}`}
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
              <span className={prioStyles.pill}>
                Priority {prioStyles.label} ({incident.priority_score.toFixed(1)}/100)
              </span>

              {incident.emergency_rule_triggered && (
                <Badge variant="emergency" className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Emergency Tier
                </Badge>
              )}

              <span className={statusStyles.badge}>
                <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`} />
                {statusStyles.label}
              </span>

              <Badge variant="outline" className="border-teal-400 text-teal-800 bg-teal-50/60 font-semibold">
                {incident.source_type === "video_upload" || !incident.is_simulated ? "CCTV Vision Analysis" : "Township Telemetry"}
              </Badge>

              {incident.priority_overridden && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200">
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
                <p className="text-[13px] text-slate-800 leading-relaxed font-medium">
                  {incident.priority_explanation}
                </p>
                {incident.override_reason && (
                  <div className="mt-2.5 pt-2 border-t border-teal-200/80 text-xs text-purple-900">
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
                <p className="text-[13px] text-amber-950 font-medium">
                  {incident.recommended_action || "Review video feed and assign a security responder."}
                </p>
                <p className="text-xs text-amber-700 mt-1 italic">
                  * All recommendations are strictly advisory. The control room supervisor retains full response authority.
                </p>
              </div>

              {/* Key Indicators Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-xs block">Category & Domain</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {formatCategory(incident.category)}
                  </span>
                  <span className="text-xs text-teal-700 font-medium block">
                    {getTaxonomyCategory(incident.category).domainName}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-xs block">Detection Confidence</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {incident.detection_confidence !== null && incident.detection_confidence !== undefined
                      ? `${(incident.detection_confidence * 100).toFixed(0)}%`
                      : "Heuristic (Unscored)"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-xs block">Human Verification</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block capitalize">
                    {incident.verification_status.replace("_", " ")}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-xs block">Assigned Responder(s)</span>
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
                        <h4 className="text-[15px] font-semibold text-white tracking-normal  flex items-center gap-2">
                          CCTV Recorded Footage & Evidence
                          {effectiveVideoUrl && (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Footage Stream Ready
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-slate-400">
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
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-medium"
                              >
                                <Clock className="w-3 h-3 text-teal-400" />
                                Jump to Detection Point ({videoTimestamp.toFixed(1)}s)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleJumpToTimestamp(0)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
                            >
                              Rewind (0:00)
                            </button>
                          </div>

                          <a
                            href={effectiveVideoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-teal-300 text-xs flex items-center gap-1 transition-colors"
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
                                    className="absolute bottom-2 right-2 px-2 py-1 rounded bg-slate-950/90 hover:bg-teal-600 text-white text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
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
                            <div className="p-2.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                              <span className="truncate pr-2">{item.description || "Video analysis keyframe capture"}</span>
                              {typeof item.timestamp_s === "number" && (
                                <span className="tabular-nums text-teal-400 font-semibold shrink-0">{item.timestamp_s.toFixed(1)}s</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observed Evidence Attributes (Domain Parameters Only) */}
              {(() => {
                const TECHNICAL_KEYS = new Set([
                  "video_job_id",
                  "file_name",
                  "filename",
                  "thumbnail",
                  "model_used",
                  "is_gemini",
                  "ai_model",
                  "model",
                  "is_gemini_ai",
                  "detector_id",
                  "source",
                  "analyzed_frames",
                  "raw_response",
                  "status",
                  "evidence_frame",
                  "notes",
                  "evidence_url",
                ]);

                // Filter out any technical/software keys and empty objects
                let entries = Object.entries(incident.evidence || {}).filter(
                  ([k, v]) =>
                    !TECHNICAL_KEYS.has(k.toLowerCase()) &&
                    v !== null &&
                    v !== undefined &&
                    typeof v !== "object" &&
                    !String(v).startsWith("data:image")
                );

                // If no domain parameters exist, fall back to category-tailored evidence parameters
                if (entries.length === 0) {
                  const fallbackEvidence = sanitizeIncidentEvidence(incident.category);
                  entries = Object.entries(fallbackEvidence);
                }

                if (entries.length === 0) return null;

                const formatLabel = (key: string): string => {
                  const labelMap: Record<string, string> = {
                    motionless_seconds: "Motionless Duration",
                    person_motionless_seconds: "Motionless Duration",
                    hazardous_location: "Hazardous Location",
                    bystander_assisting: "Bystander Assisting",
                    person_attempting_to_stand: "Attempting to Stand",
                    vehicles_involved: "Vehicles Involved",
                    traffic_blocked: "Traffic Flow Blocked",
                    motionless_after_impact: "Motionless Post-Impact",
                    persons_involved: "Persons Involved",
                    vulnerable_road_user_involved: "Pedestrian / Cyclist Involved",
                    smoke_or_flame_visible: "Flame / Smoke Visible",
                    spreading: "Fire Spreading Active",
                    people_in_vicinity: "People in Vicinity",
                    blocks_emergency_access: "Blocks Emergency Route",
                    animal_species: "Wildlife Species",
                    pack_size: "Animal Count",
                    proximity_to_pedestrians: "Proximity to Pedestrians",
                    aggressive_behavior: "Aggressive Posture",
                    height_fall_hazard: "Height Fall Risk",
                    entry_method: "Breach / Access Method",
                    danger_zone: "Restricted Zone Type",
                    substation_voltage: "Electrical Hazard",
                    duration_minutes: "Obstruction Duration",
                    blocks_traffic_lane: "Blocks Traffic Lane",
                    road_lanes_blocked: "Road Lanes Blocked",
                    power_lines_contacted: "Power Lines Contacted",
                    vehicle_damaged: "Vehicle Damaged",
                    water_depth_cm: "Flood Water Depth",
                    rate_of_rise: "Water Rise Rate",
                    vehicles_submerged: "Vehicles Submerged",
                    pressure_drop_bar: "Main Pressure Drop",
                    flow_rate_loss_pct: "Flow Rate Loss",
                    road_subsidence_risk: "Road Subsidence Risk",
                  };
                  return labelMap[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                };

                const formatValue = (key: string, val: any): string => {
                  if (typeof val === "boolean") return val ? "Yes" : "No";
                  if (typeof val === "number") {
                    if (key.includes("seconds")) return `${val}s`;
                    if (key.includes("minutes")) return `${val} mins`;
                    if (key.includes("pct")) return `${val}%`;
                    if (key.includes("bar")) return `${val} bar`;
                    if (key.includes("cm")) return `${val} cm`;
                  }
                  return String(val);
                };

                return (
                  <div>
                    <h4 className="text-[15px] font-semibold text-slate-900 mb-2">Evidence Parameters</h4>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {entries.map(([k, v]) => (
                        <div key={k} className="p-2 bg-white rounded border border-slate-200 shadow-2xs">
                          <span className="text-slate-500 text-xs block font-semibold tracking-normal mb-0.5">
                            {formatLabel(k)}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">
                            {formatValue(k, v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
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
                  <span className="text-slate-500 text-xs block">Severity (40%)</span>
                  <span className="text-base font-bold text-slate-900">{incident.severity_score.toFixed(1)}/100</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-slate-500 text-xs block">Immediacy (25%)</span>
                  <span className="text-base font-bold text-slate-900">{incident.immediacy_score.toFixed(1)}/100</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-slate-500 text-xs block">People at Risk (20%)</span>
                  <span className="text-base font-bold text-slate-900">{incident.people_at_risk_score.toFixed(1)}/100</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-slate-500 text-xs block">Secondary Hazard (15%)</span>
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
                          <td className="p-2.5 text-right tabular-nums font-medium">
                            {f.delta >= 0 ? `+${f.delta.toFixed(1)}` : f.delta.toFixed(1)}
                          </td>
                          <td className="p-2.5 text-right tabular-nums font-bold text-teal-800">
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
                <p className="text-sm text-slate-500 text-center py-6">No timeline events recorded.</p>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-4 text-xs">
                  {incident.events.map((e) => (
                    <div key={e.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-teal-600 border-2 border-white ring-2 ring-slate-200" />
                      <div className="flex items-center justify-between text-slate-500 text-xs">
                        <span className="font-semibold text-slate-800">{e.event_type.replace(/_/g, " ").toUpperCase()}</span>
                        <span>{formatDateTime(e.created_at)}</span>
                      </div>
                      <p className="text-slate-700 mt-1">{e.message}</p>
                      <div className="text-xs text-slate-400 mt-0.5">Actor: {e.actor}</div>
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
                <p className="text-sm text-slate-500 text-center py-6">No audit records.</p>
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
                          <td className="p-2.5 text-right tabular-nums text-[13px] text-slate-500">
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
                    Assign Responder(s) {incident.assigned_to ? `(${incident.assigned_to.split(",").length})` : ""}
                  </Button>

                  {isAssigned && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      className="opacity-50 cursor-not-allowed text-slate-400 border-slate-200"
                      title="WhatsApp dispatch link disabled"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      Send SITREP (WhatsApp Disabled)
                    </Button>
                  )}

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

      {/* Sub-modal: Assign Responders (Multi-Select Enabled) */}
      <Modal
        isOpen={showAssignDialog}
        onClose={() => setShowAssignDialog(false)}
        title="Assign Emergency Responders"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500 font-medium">
              {selectedResponderIds.length} responder{selectedResponderIds.length === 1 ? "" : "s"} selected
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleAssign}
                disabled={selectedResponderIds.length === 0}
                loading={isSubmitting}
              >
                Confirm Assignment ({selectedResponderIds.length})
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] text-slate-600">
            Select one or more emergency response services for <strong>{formatIncidentId(incident.id)}</strong> ({incident.title}).
            Control room operators can assign directly to the nearest PB patrol unit or dispatch external emergency services.
          </p>

          {/* Quick Action: Assign to Nearest PB Patrol Unit */}
          <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-300 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-950 uppercase tracking-wide">
                <span>🎯</span>
                <span>Nearest PB Patrol Unit (Recommended)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-200 text-teal-900 border border-teal-300">
                ETA: {nearestUnitInfo.etaFormatted} ({nearestUnitInfo.distanceMeters}m away)
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{nearestUnitInfo.unit.callsign}</span>
                  <span className="text-slate-400 font-normal">({nearestUnitInfo.unit.unitCode})</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {nearestUnitInfo.unit.status === "on_patrol" ? "On Patrol" : "Available"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Officer: <strong className="text-slate-700">{nearestUnitInfo.unit.officerInCharge}</strong> &bull; {nearestUnitInfo.unit.vehicleModel}
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                type="button"
                onClick={() => {
                  setSelectedResponderIds([nearestUnitInfo.unit.id]);
                }}
                className="text-xs font-semibold bg-teal-700 hover:bg-teal-800 cursor-pointer"
              >
                {selectedResponderIds.includes(nearestUnitInfo.unit.id)
                  ? "✓ Nearest Unit Selected"
                  : "Assign Nearest Unit"}
              </Button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-700 tracking-normal block">
              Quick Multi-Agency Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedResponderIds([nearestUnitInfo.unit.id])}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-teal-100 hover:bg-teal-200 text-teal-950 border border-teal-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🎯</span>
                <span>Nearest Unit: {nearestUnitInfo.unit.callsign} ({nearestUnitInfo.distanceMeters}m)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedResponderIds([nearestUnitInfo.unit.id, "ambulance"])}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🛡️ + 🚑</span>
                <span>Medical: Nearest PB Unit + Ambulance</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedResponderIds([nearestUnitInfo.unit.id, "fire-warden"])}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🛡️ + 🚒</span>
                <span>Fire / Hazard: Nearest PB Unit + Bomba</span>
              </button>
            </div>
          </div>

          {/* Multi-Select Responder Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 tracking-normal">
                Available Emergency Units & Responders
              </label>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedResponderIds(AUXILIARY_PATROL_FLEET.map((u) => u.id))}
                  className="text-teal-700 hover:text-teal-900 font-medium cursor-pointer"
                >
                  Select All PB Units
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => setSelectedResponderIds([])}
                  className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
              {(() => {
                const combinedList = [
                  ...AUXILIARY_PATROL_FLEET.map((u) => ({
                    id: u.id,
                    name: `${u.callsign} (${u.unitCode})`,
                    role: `PB Patrol • Officer: ${u.officerInCharge} • ${u.baseLocation}`,
                    isNearest: u.id === nearestUnitInfo.unit.id,
                  })),
                  ...responders
                    .filter(
                      (r) =>
                        !r.id.startsWith("pb-patrol-") &&
                        !["patrol-a", "patrol-b", "facilities", "maintenance"].includes(r.id)
                    )
                    .map((r) => ({
                      id: r.id,
                      name: r.name,
                      role: r.role,
                      isNearest: false,
                    })),
                ];

                return combinedList.map((r) => {
                  const isSelected = selectedResponderIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedResponderIds((prev) =>
                          prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                        );
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start space-x-3 ${
                        isSelected
                          ? "bg-teal-50/80 border-teal-500 shadow-xs ring-1 ring-teal-500"
                          : r.isNearest
                          ? "bg-teal-50/30 border-teal-300 hover:border-teal-400 hover:bg-teal-50/60"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="pt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-teal-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center justify-between gap-1">
                          <span className="truncate">{r.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {r.isNearest && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                                Nearest • {nearestUnitInfo.distanceMeters}m
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-teal-200 text-teal-900">
                                Selected
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                          {r.role}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
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
          <p className="text-[13px] text-slate-600">
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
          <p className="text-[13px] text-slate-600">
            Reopening will place <strong>{formatIncidentId(incident.id)}</strong> back in the active queue with status &quot;Acknowledged&quot;.
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
