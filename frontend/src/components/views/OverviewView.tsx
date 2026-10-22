import React from "react";
import {
  Incident,
  AnalyticsSummary,
} from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getPriorityStyles,
  getStatusStyles,
  formatDateTime,
  formatTimeAgo,
  formatCategory,
  formatDuration,
} from "@/lib/utils";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Camera,
  ArrowRight,
  ShieldAlert,
  Activity,
  UserCheck,
  Video,
} from "lucide-react";

interface OverviewViewProps {
  incidents: Incident[];
  analytics: AnalyticsSummary | null;
  onSelectIncident: (id: string) => void;
  onNavigateToIncidents: () => void;
  onAcknowledgeIncident: (id: string) => void;
  onNavigateToVideo?: () => void;
  onNavigateToMap?: () => void;
}

export function OverviewView({
  incidents,
  analytics,
  onSelectIncident,
  onNavigateToIncidents,
  onAcknowledgeIncident,
  onNavigateToVideo,
  onNavigateToMap,
}: OverviewViewProps) {
  // Active queue strictly sorted from high priority to low priority (Critical > High > Medium > Low)
  const PRIORITY_ORDER: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const activeIncidents = incidents
    .filter((inc) => !["resolved", "false_positive", "closed"].includes(inc.status))
    .sort((a, b) => {
      const pDiff = (PRIORITY_ORDER[b.priority_level] || 0) - (PRIORITY_ORDER[a.priority_level] || 0);
      if (pDiff !== 0) return pDiff;
      const sDiff = (b.priority_score || b.rank_score || 0) - (a.priority_score || a.rank_score || 0);
      if (sDiff !== 0) return sDiff;
      return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
    });

  const criticalCount = activeIncidents.filter((inc) => inc.priority_level === "critical").length;
  const highCount = activeIncidents.filter((inc) => inc.priority_level === "high").length;
  const pendingAckCount = activeIncidents.filter((inc) => inc.status === "new").length;

  const topIncident = activeIncidents.length > 0 ? activeIncidents[0] : null;

  const topPrioStyles = topIncident ? getPriorityStyles(topIncident.priority_level) : null;
  const topStatusStyles = topIncident ? getStatusStyles(topIncident.status) : null;

  return (
    <div className="space-y-6">
      {/* 1. Operational Situation KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Incidents */}
        <div className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-normal">Active Incidents</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{activeIncidents.length}</span>
            <span className="text-xs text-slate-500">requiring attention</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Critical / High:</span>
            <span className="font-semibold text-rose-700">{criticalCount + highCount}</span>
          </div>
        </div>

        {/* KPI 2: Critical Urgency */}
        <div className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-normal">Critical Urgency</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-rose-700">{criticalCount}</span>
            <span className="text-xs text-slate-500">priority tier</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>High Priority:</span>
            <span className="font-semibold text-amber-700">{highCount}</span>
          </div>
        </div>

        {/* KPI 3: Awaiting Acknowledgment */}
        <div className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-normal">Awaiting Ack</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-700">{pendingAckCount}</span>
            <span className="text-xs text-slate-500">unreviewed alerts</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Status:</span>
            <span className={pendingAckCount > 0 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
              {pendingAckCount > 0 ? "Action Required" : "All Acknowledged"}
            </span>
          </div>
        </div>

        {/* KPI 4: Mean Ack Time */}
        <div className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-normal">Avg Acknowledge Time</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">
              {analytics?.avg_acknowledgement_seconds
                ? formatDuration(analytics.avg_acknowledgement_seconds)
                : "—"}
            </span>
            <span className="text-xs text-slate-500">
              {analytics?.acknowledgement_sample_size ? `${analytics.acknowledgement_sample_size} acked` : "stored metrics"}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Logged Incidents:</span>
            <span className="font-semibold text-slate-700">{analytics?.totals?.incidents ?? incidents.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Top-Priority Incident Spotlight */}
      {topIncident ? (
        <div className="bg-white rounded-lg border-2 border-slate-300 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
            <div className="flex items-center space-x-2.5">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white tabular-nums text-xs font-bold">
                RANK #1
              </span>
              <span className={topPrioStyles?.pill}>
                Priority {topPrioStyles?.label} ({topIncident.priority_score.toFixed(1)}/100)
              </span>
              {topIncident.emergency_rule_triggered && (
                <Badge variant="emergency" className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Emergency Override
                </Badge>
              )}
              {topIncident.is_simulated ? (
                <Badge variant="simulated">Simulation</Badge>
              ) : (
                <Badge variant="outline" className="border-teal-400 text-teal-800 bg-teal-50/60 font-semibold">
                  Video Analysis
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Detected {formatTimeAgo(topIncident.detected_at)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div>
                <span className="text-xs font-semibold text-teal-700 tracking-normal">
                  {formatCategory(topIncident.category)}
                </span>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight mt-0.5">
                  {topIncident.title}
                </h3>
              </div>

              {/* Plain-Language Intelligence Rationale */}
              <div className="p-3.5 rounded-md bg-teal-50/70 border border-teal-200/90 text-xs">
                <div className="font-semibold text-teal-950 flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-teal-700" />
                  Dynamic Prioritization Assessment
                </div>
                <p className="text-slate-800 leading-relaxed">
                  {topIncident.priority_explanation}
                </p>
              </div>

              {/* Location & Camera Context */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {topIncident.location_name || topIncident.location_id}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Camera className="w-4 h-4 text-slate-400" />
                  {topIncident.camera_name || topIncident.camera_id || "Unassigned Feed"}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  {topIncident.assigned_to_name ? `Assigned to: ${topIncident.assigned_to_name}` : "Unassigned Responder"}
                </span>
              </div>
            </div>

            {/* Quick Action Box */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 tracking-normal block mb-1">
                  Advisory Action
                </span>
                <p className="text-sm text-slate-800 font-medium leading-normal mb-3">
                  {topIncident.recommended_action || "Inspect CCTV feed and verify situation on the ground."}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200">
                {topIncident.status === "new" && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full bg-blue-700 hover:bg-blue-800"
                    onClick={() => onAcknowledgeIncident(topIncident.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Acknowledge Alert
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => onSelectIncident(topIncident.id)}
                >
                  Inspect & Respond
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">All Clear in Township</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            No active incidents currently require operator attention. All surveillance streams and township sectors are clear.
          </p>
          {onNavigateToVideo && (
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={onNavigateToVideo}
                className="text-teal-800 border-teal-200 bg-teal-50/50 hover:bg-teal-50 text-sm font-semibold"
              >
                <Video className="w-3.5 h-3.5 mr-1.5 text-teal-700" />
                Upload Footage or Test Sample Video &rarr;
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 3. Two-Column Layout: Active Queue Preview & Township Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Queue Preview */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Active Queue Summary ({activeIncidents.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToIncidents}
              className="text-teal-700 hover:text-teal-900 text-[13px] font-semibold p-0 h-auto"
            >
              View Full Incident Queue &rarr;
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
            {activeIncidents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Active incident queue is empty.
              </div>
            ) : (
              activeIncidents.slice(0, 5).map((inc, idx) => {
                const prio = getPriorityStyles(inc.priority_level);
                const status = getStatusStyles(inc.status);
                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc.id)}
                    className="group p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-6 text-center tabular-nums text-xs font-bold text-slate-500">
                        #{idx + 1}
                      </span>
                      <span className={prio.pill}>
                        {prio.label} ({inc.priority_score.toFixed(0)})
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {inc.title}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                          <span>{inc.location_name || inc.location_id}</span>
                          <span>&bull;</span>
                          <span>{formatTimeAgo(inc.detected_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto flex min-w-[165px] items-center justify-end gap-2 shrink-0">
                      <span className={status.badge}>
                        <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      <ArrowRight className="w-7 h-7 shrink-0 rounded-md p-1.5 text-slate-400 transition-colors group-hover:bg-slate-100 group-hover:text-slate-600" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Township Operations & Quick Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              Township Surveillance Operations
            </h3>
          </div>

          <div className="space-y-3">
            {/* Quick Action: CCTV Video Ingest */}
            {onNavigateToVideo && (
              <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-md bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">CCTV Video Ingest</div>
                      <div className="text-xs text-slate-500">Live AI Vision Analysis</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={onNavigateToVideo}
                    className="h-7 text-[13px] px-3"
                  >
                    Upload Clip
                  </Button>
                </div>
                <p className="text-[13px] text-slate-600 leading-snug">
                  Upload footage clips to analyze posture heuristics, falls, and perimeter security events.
                </p>
              </div>
            )}

            {/* Quick Action: Township Map */}
            {onNavigateToMap && (
              <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-md bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Township GIS Map</div>
                      <div className="text-xs text-slate-500">City of Elmina Sectors</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onNavigateToMap}
                    className="h-7 text-[13px] px-3 text-sky-700 border-sky-200 hover:bg-sky-50"
                  >
                    Open Map
                  </Button>
                </div>
                <p className="text-[13px] text-slate-600 leading-snug">
                  Inspect camera network locations, township zones, and live alert clusters across City of Elmina.
                </p>
              </div>
            )}

            {/* System Protocol Box */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                Human-in-the-Loop Governance
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                All algorithmic scoring and vision detections serve as advisory intelligence. Final dispatch and resolution authority remains with control room operators.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
