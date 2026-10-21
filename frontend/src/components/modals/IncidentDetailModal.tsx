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
  const [activeTab, setActiveTab] = useState<"overview" | "dispatch" | "scoring" | "timeline" | "audit">("overview");

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

  // Auxiliary Police & Ranger Workflow State
  const [completedSopSteps, setCompletedSopSteps] = useState<Record<number, boolean>>({});
  const [copiedSitrep, setCopiedSitrep] = useState(false);
  const [isDispatchingNearest, setIsDispatchingNearest] = useState(false);
  const [showSitrepCard, setShowSitrepCard] = useState(false);

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

  // Load completed SOP steps from audit trail and event logs
  useEffect(() => {
    if (!incident) return;
    const completed: Record<number, boolean> = {};
    const sopList = getTaxonomyCategory(incident.category).sopWorkflow || [];
    sopList.forEach((step, idx) => {
      const stepSnippet = step.slice(0, 20).toLowerCase();
      const match =
        incident.events?.some(
          (e) =>
            e.message?.toLowerCase().includes(stepSnippet) ||
            e.message?.includes(`Step ${idx + 1}`) ||
            e.message?.includes(`[SOP Step ${idx + 1}`)
        ) ||
        incident.audit?.some(
          (a) =>
            a.reason?.toLowerCase().includes(stepSnippet) ||
            a.reason?.includes(`Step ${idx + 1}`) ||
            a.reason?.includes(`[SOP Step ${idx + 1}`)
        );
      if (match) {
        completed[idx] = true;
      }
    });
    setCompletedSopSteps(completed);
  }, [incident?.id, incident?.events?.length, incident?.audit?.length]);

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

  // Category SOP Workflow
  const categorySop = getTaxonomyCategory(incident.category).sopWorkflow || [
    "Verify surveillance video feed immediately",
    "Dispatch nearest emergency response unit to scene",
    "Log incident report and escalate if required",
  ];
  const completedCount = categorySop.filter((_, idx) => completedSopSteps[idx]).length;
  const sopProgressPct = Math.round((completedCount / categorySop.length) * 100);

  // Nearest Auxiliary Patrol Unit
  const nearestUnitInfo = findNearestAuxiliaryUnit(incident.location_id, incident.camera_id);
  const isAssigned = !!(incident.assigned_to_name || incident.assigned_to);

  // Toggle individual SOP step and record into audit trail
  const handleToggleSopStep = async (stepIndex: number, stepText: string) => {
    const isNowDone = !completedSopSteps[stepIndex];
    setCompletedSopSteps((prev) => ({ ...prev, [stepIndex]: isNowDone }));
    if (isNowDone) {
      try {
        await onRecordAction(
          incident.id,
          "sop_step_completed",
          `[SOP Step ${stepIndex + 1} Done] ${stepText} — Verified by Control Room Operator`
        );
      } catch (err: any) {
        // Server did not confirm: undo the local tick so the checklist never claims an unsaved step.
        setCompletedSopSteps((prev) => ({ ...prev, [stepIndex]: false }));
        console.error("Failed to record SOP step:", err);
      }
    }
  };

  // 1-Click Dispatch Nearest Auxiliary Police Unit
  const handleQuickDispatchNearest = async () => {
    setIsDispatchingNearest(true);
    setErrorMsg(null);
    try {
      const note = `Dispatched ${nearestUnitInfo.unit.callsign} (${nearestUnitInfo.unit.officerInCharge}) to ${
        incident.location_name || incident.location_id
      }. Proximity: ${nearestUnitInfo.distanceMeters}m, ETA: ${nearestUnitInfo.etaFormatted}`;
      await onAssign(incident.id, nearestUnitInfo.unit.id, note);

      // Auto-check the patrol dispatch SOP step if present
      const dispatchIdx = categorySop.findIndex(
        (s) => s.toLowerCase().includes("dispatch") || s.toLowerCase().includes("patrol")
      );
      if (dispatchIdx !== -1 && !completedSopSteps[dispatchIdx]) {
        handleToggleSopStep(dispatchIdx, categorySop[dispatchIdx]);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsDispatchingNearest(false);
    }
  };

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
              onClick={() => setActiveTab("dispatch")}
              className={`pb-2.5 cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "dispatch"
                  ? "border-teal-600 text-teal-800 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>SOP & Ranger Dispatch</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                {completedCount}/{categorySop.length}
              </span>
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
                  <span className="text-slate-500 text-[11px] block">Category & Domain</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {formatCategory(incident.category)}
                  </span>
                  <span className="text-[10px] text-teal-700 font-medium block">
                    {getTaxonomyCategory(incident.category).domainName}
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
                  <span className="text-slate-500 text-[11px] block">Assigned Responder(s)</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {incident.assigned_to_name || incident.assigned_to || "Unassigned"}
                  </span>
                </div>
              </div>

              {/* Interactive Standard Operating Procedure (SOP) Protocol */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 tracking-wide">
                        Standard Operating Procedure (SOP) Protocol
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Mandatory compliance checklist for {getTaxonomyCategory(incident.category).name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-semibold text-slate-600">
                      {completedCount} of {categorySop.length} Steps Logged
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sopProgressPct === 100
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {sopProgressPct}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      sopProgressPct === 100 ? "bg-emerald-500" : "bg-teal-600"
                    }`}
                    style={{ width: `${sopProgressPct}%` }}
                  />
                </div>

                {/* Steps List */}
                <div className="space-y-2 pt-1">
                  {categorySop.map((step, idx) => {
                    const isDone = !!completedSopSteps[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleSopStep(idx, step)}
                        className={`p-2.5 rounded-md border text-xs flex items-start space-x-3 cursor-pointer transition-colors ${
                          isDone
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                            : "bg-slate-50/70 border-slate-200 hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 text-slate-400 hover:text-teal-600"
                        >
                          {isDone ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`font-semibold ${
                                isDone ? "line-through text-emerald-900 opacity-80" : "text-slate-900"
                              }`}
                            >
                              Step {idx + 1}: {step}
                            </span>
                            {isDone && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium shrink-0">
                                Verified & Logged
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sopProgressPct === 100 && (
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">
                      Standard operating procedure fully executed and recorded into incident audit log.
                    </span>
                  </div>
                )}
              </div>

              {/* Auxiliary Police Patrol & Field Ranger Response Hub */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
                        Emergency & Multi-Agency Responder Dispatch
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          Live Fleet Available
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        City of Elmina Township Emergency Command & Multi-Agency SITREP Terminal
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowSitrepCard(!showSitrepCard)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-teal-400" />
                      {showSitrepCard ? "Hide Field SITREP" : "View Field SITREP"}
                    </button>
                  </div>
                </div>

                {/* Nearest Unit Spotlight */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-2 p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider flex items-center gap-1">
                        <Car className="w-3.5 h-3.5" />
                        Recommended Nearest Patrol Unit
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ETA: {nearestUnitInfo.etaFormatted} (~{nearestUnitInfo.distanceMeters}m away)
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <div>
                        <div className="font-bold text-white text-sm">
                          {nearestUnitInfo.unit.callsign}
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Officer: <span className="text-white font-medium">{nearestUnitInfo.unit.officerInCharge}</span> &bull; {nearestUnitInfo.unit.vehicleModel} ({nearestUnitInfo.unit.plateNumber})
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Sector Patrol Base</span>
                        <span className="text-xs text-slate-200 font-medium">{nearestUnitInfo.unit.baseLocation}</span>
                      </div>
                    </div>

                    {/* Equipment badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {nearestUnitInfo.unit.equipment.map((eq, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 text-[10px] border border-slate-700 font-medium"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Dispatch Action Column */}
                  <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                        Deployment Status
                      </span>
                      {isAssigned ? (
                        <div className="p-2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Unit Dispatched & En Route</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-300">
                          Unit on active patrol in sector. 1-click will assign responder and log dispatch time.
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {!isAssigned ? (
                        <Button
                          size="sm"
                          variant="primary"
                          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
                          onClick={handleQuickDispatchNearest}
                          loading={isDispatchingNearest}
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          1-Click Dispatch {nearestUnitInfo.unit.unitCode}
                        </Button>
                      ) : (
                        <a
                          href={`tel:${nearestUnitInfo.unit.contactNumber}`}
                          className="w-full h-8 px-3 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
                          Call Officer ({nearestUnitInfo.unit.contactNumber})
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable WhatsApp SITREP Card */}
                {showSitrepCard && (
                  <div className="bg-slate-950 rounded-lg border border-slate-800 p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-semibold text-emerald-400 text-xs">
                          Field WhatsApp / Telegram SITREP Card
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleCopySitrep}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedSitrep ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-teal-400" />
                              <span>Copy SITREP</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendWhatsApp}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Transmit via WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-3 bg-slate-900 rounded-md border border-slate-800 text-[11px] font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed select-all">
                      {sitrepMessage}
                    </pre>
                  </div>
                )}
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
                    <h4 className="text-xs font-semibold text-slate-900 mb-2">Evidence Parameters</h4>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {entries.map(([k, v]) => (
                        <div key={k} className="p-2 bg-white rounded border border-slate-200 shadow-2xs">
                          <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider mb-0.5">
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

          {/* Dedicated Tab: SOP & Ranger Dispatch */}
          {activeTab === "dispatch" && (
            <div className="space-y-5">
              {/* SOP Execution Management Board */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 tracking-wide">
                        Standard Operating Procedure (SOP) Compliance Matrix
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Official incident protocol for {getTaxonomyCategory(incident.category).name} &bull; Domain: {getTaxonomyCategory(incident.category).domainName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700">
                      Compliance Progress: {completedCount}/{categorySop.length} ({sopProgressPct}%)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        categorySop.forEach((step, idx) => {
                          if (!completedSopSteps[idx]) {
                            handleToggleSopStep(idx, step);
                          }
                        });
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Mark All Steps Done
                    </button>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      sopProgressPct === 100 ? "bg-emerald-500" : "bg-teal-600"
                    }`}
                    style={{ width: `${sopProgressPct}%` }}
                  />
                </div>

                <div className="space-y-2 pt-1">
                  {categorySop.map((step, idx) => {
                    const isDone = !!completedSopSteps[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleSopStep(idx, step)}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isDone
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                            : "bg-slate-50/80 border-slate-200 hover:bg-slate-100/70 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            className="shrink-0 text-slate-400 hover:text-teal-600"
                          >
                            {isDone ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <div>
                            <span
                              className={`font-semibold block ${
                                isDone ? "line-through text-emerald-900 opacity-80" : "text-slate-900"
                              }`}
                            >
                              Step {idx + 1}: {step}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {isDone
                                ? "Verified by Control Room Operator — Logged to station audit trail"
                                : "Pending operator execution on ground"}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isDone ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              Action Required
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Emergency Response Fleet Table */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-teal-600" />
                      Township Emergency Response Fleet Roster
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Live on-duty emergency response vehicles, ambulances, traffic police, and patrol teams across City of Elmina
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    6 Units On Shift
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5">Unit / Callsign</th>
                        <th className="p-2.5">Officer in Charge</th>
                        <th className="p-2.5">Patrol Sector Base</th>
                        <th className="p-2.5">Equipment</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-right">Dispatch Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {EMERGENCY_RESPONSE_FLEET.map((u) => {
                        const isNearest = u.id === nearestUnitInfo.unit.id;
                        const assignedIds = (incident.assigned_to || "").split(",").map((s) => s.trim().toLowerCase());
                        const assignedNames = (incident.assigned_to_name || "").toLowerCase();
                        const isCurrentlyAssigned =
                          assignedIds.includes(u.id.toLowerCase()) ||
                          assignedNames.includes(u.callsign.toLowerCase()) ||
                          assignedNames.includes(u.id.toLowerCase());
                        return (
                          <tr
                            key={u.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isCurrentlyAssigned
                                ? "bg-emerald-50/50"
                                : isNearest
                                ? "bg-teal-50/40"
                                : ""
                            }`}
                          >
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.callsign}</span>
                                {isNearest && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-800">
                                    Nearest ({nearestUnitInfo.etaFormatted})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {u.vehicleModel} &bull; {u.plateNumber}
                              </div>
                            </td>
                            <td className="p-2.5 text-slate-700 font-medium">
                              {u.officerInCharge}
                              <div className="text-[10px] text-slate-400">{u.contactNumber}</div>
                            </td>
                            <td className="p-2.5 text-slate-600">{u.baseLocation}</td>
                            <td className="p-2.5">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {u.equipment.slice(0, 2).map((eq, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px]"
                                  >
                                    {eq}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              {isCurrentlyAssigned ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Dispatched
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                  Available
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              {isCurrentlyAssigned ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <a
                                    href={`tel:${u.contactNumber}`}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                                  >
                                    <PhoneCall className="w-3 h-3 text-teal-600" />
                                    Call
                                  </a>
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={async () => {
                                      setIsSubmitting(true);
                                      try {
                                        const currentIds = (incident.assigned_to || "").split(",").map((s) => s.trim()).filter(Boolean);
                                        const filteredIds = currentIds.filter((id) => id !== u.id);
                                        await onAssign(
                                          incident.id,
                                          filteredIds.join(","),
                                          `Removed ${u.callsign} from response team.`
                                        );
                                      } finally {
                                        setIsSubmitting(false);
                                      }
                                    }}
                                    className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-medium transition-colors cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 text-[11px] px-2.5"
                                  onClick={async () => {
                                    setIsSubmitting(true);
                                    try {
                                      const currentIds = (incident.assigned_to || "").split(",").map((s) => s.trim()).filter(Boolean);
                                      const newIds = Array.from(new Set([...currentIds, u.id]));
                                      await onAssign(
                                        incident.id,
                                        newIds.join(","),
                                        `Assigned ${u.callsign} (${u.officerInCharge}) to response team.`
                                      );
                                    } finally {
                                      setIsSubmitting(false);
                                    }
                                  }}
                                  loading={isSubmitting}
                                >
                                  + Dispatch Unit
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Field SITREP Terminal */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 text-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                        Multi-Agency Field WhatsApp / Telegram SITREP Dispatch
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Instant situation report formatted for on-ground emergency responders & command dispatch
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopySitrep}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedSitrep ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-teal-400" />
                          <span>Copy WhatsApp Text</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit to Field Unit</span>
                    </button>
                  </div>
                </div>

                <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed select-all">
                  {sitrepMessage}
                </pre>
              </div>
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
                    Assign Responder(s)
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
          <p className="text-xs text-slate-600">
            Select one or more emergency response services for <strong>{incident.id}</strong> ({incident.title}).
            For major incidents such as vehicle collisions, you can dispatch both an <strong>Ambulance</strong> and <strong>Traffic Police</strong> simultaneously.
          </p>

          {/* Quick Preset Buttons */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Quick Multi-Agency Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedResponderIds(["ambulance", "traffic-police"])}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🚑 + 🚓</span>
                <span>Crash Preset: Ambulance + Traffic Police</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedResponderIds(["ambulance", "patrol-a"])}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🚑 + 🛡️</span>
                <span>Fall / Medical: Ambulance + Security Patrol</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedResponderIds(["fire-warden", "traffic-police", "ambulance"])}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🚒 + 🚓 + 🚑</span>
                <span>Major Fire / Rescue (All-Services)</span>
              </button>
            </div>
          </div>

          {/* Multi-Select Responder Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Available Emergency Units & Responders
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedResponderIds(responders.map((r) => r.id))}
                  className="text-teal-700 hover:text-teal-900 font-medium"
                >
                  Select All
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => setSelectedResponderIds([])}
                  className="text-slate-500 hover:text-slate-700 font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
              {responders.map((r) => {
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
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center justify-between">
                        <span>{r.name}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-200 text-teal-900">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {r.role}
                      </div>
                    </div>
                  </div>
                );
              })}
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
