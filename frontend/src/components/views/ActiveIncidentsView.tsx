import React, { useState, useMemo } from "react";
import {
  Incident,
  PriorityLevel,
  IncidentCategory,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getPriorityStyles,
  getStatusStyles,
  formatDateTime,
  formatTimeAgo,
  formatCategory,
} from "@/lib/utils";
import { TAXONOMY_CATALOGUE, INCIDENT_DOMAINS } from "@/lib/taxonomy";
import {
  Search,
  Filter,
  ArrowUpDown,
  ShieldAlert,
  MapPin,
  Camera,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
} from "lucide-react";

interface ActiveIncidentsViewProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  onAcknowledgeIncident: (id: string) => void;
  selectedIncidentId?: string | null;
}

export function ActiveIncidentsView({
  incidents,
  onSelectIncident,
  onAcknowledgeIncident,
  selectedIncidentId,
}: ActiveIncidentsViewProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all_active");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"rank" | "time_desc" | "time_asc" | "confidence">("rank");

  // Filter and sort active incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Status filter
      if (statusFilter === "all_active") {
        if (["resolved", "false_positive", "closed"].includes(inc.status)) return false;
      } else if (statusFilter !== "all") {
        if (inc.status !== statusFilter) return false;
      }

      // Category filter
      if (categoryFilter !== "all" && inc.category !== categoryFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "all" && inc.priority_level !== priorityFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter === "simulated" && !inc.is_simulated) return false;
      if (sourceFilter === "video" && inc.is_simulated) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = inc.title.toLowerCase().includes(q);
        const matchesId = inc.id.toLowerCase().includes(q);
        const matchesLoc = (inc.location_name || inc.location_id || "").toLowerCase().includes(q);
        const matchesCam = (inc.camera_name || inc.camera_id || "").toLowerCase().includes(q);
        const matchesDesc = (inc.description || "").toLowerCase().includes(q);
        const matchesExpl = (inc.priority_explanation || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesLoc && !matchesCam && !matchesDesc && !matchesExpl) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "rank") {
        const PRIORITY_ORDER: Record<string, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        const pDiff = (PRIORITY_ORDER[b.priority_level] || 0) - (PRIORITY_ORDER[a.priority_level] || 0);
        if (pDiff !== 0) return pDiff;
        return (b.priority_score || b.rank_score || 0) - (a.priority_score || a.rank_score || 0);
      }
      if (sortBy === "time_desc") {
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      }
      if (sortBy === "time_asc") {
        return new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime();
      }
      if (sortBy === "confidence") {
        return (b.detection_confidence || 0) - (a.detection_confidence || 0);
      }
      return 0;
    });
  }, [incidents, searchQuery, categoryFilter, priorityFilter, statusFilter, sourceFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search active incidents by title, ID, camera, or zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-medium text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-2 text-xs rounded-md border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option value="rank">Priority Rank (Engine Score)</option>
              <option value="time_desc">Newest Detected</option>
              <option value="time_asc">Oldest Active</option>
              <option value="confidence">Detection Confidence</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1 text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold text-xs tracking-normal">Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 px-2 text-xs rounded border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="all_active">All Active Queue</option>
            <option value="new">Awaiting Ack (New)</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="all">Include Resolved & Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-7 px-2 text-xs rounded border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-7 px-2 text-xs rounded border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="all">All Incident Categories</option>
            {INCIDENT_DOMAINS.map((dom) => {
              const cats = Object.values(TAXONOMY_CATALOGUE).filter((c) => c.domain === dom.id);
              if (cats.length === 0) return null;
              return (
                <optgroup key={dom.id} label={dom.name}>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-7 px-2 text-xs rounded border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="all">All Sources</option>
            <option value="simulated">Township Telemetry</option>
            <option value="video">CCTV Video Analysis</option>
          </select>

          {(categoryFilter !== "all" || priorityFilter !== "all" || statusFilter !== "all_active" || sourceFilter !== "all" || searchQuery) && (
            <button
              onClick={() => {
                setCategoryFilter("all");
                setPriorityFilter("all");
                setStatusFilter("all_active");
                setSourceFilter("all");
                setSearchQuery("");
              }}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Incident Queue Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center space-x-2">
            <span>Operational Incident Queue</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
              {filteredIncidents.length}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-normal">
            Prioritized by Engine Multi-Factor Relative Urgency
          </span>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-[15px] font-semibold text-slate-700">No Incidents Found</h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              No active incidents match your filter criteria. Clear filters to see all township incidents.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredIncidents.map((inc, index) => {
              const prioStyles = getPriorityStyles(inc.priority_level);
              const statusStyles = getStatusStyles(inc.status);
              const isSelected = selectedIncidentId === inc.id;

              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className={`p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? "bg-teal-50/50 ring-2 ring-teal-600 ring-inset"
                      : inc.priority_level === "critical" ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50/90"
                  }`}
                >
                  {/* Left Column: Rank, Priority Pill, Category, Title, Rationale */}
                  <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded bg-slate-900 text-white tabular-nums text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      #{index + 1}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Top Badges Line */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={prioStyles.pill}>
                          {prioStyles.label} ({inc.priority_score.toFixed(1)})
                        </span>

                        {inc.emergency_rule_triggered && (
                          <Badge variant="emergency" className="flex items-center gap-1 text-xs">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            Emergency Tier
                          </Badge>
                        )}

                        <span className={statusStyles.badge}>
                          <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${statusStyles.dot}`} />
                          {statusStyles.label}
                        </span>

                        {inc.is_simulated ? (
                          <Badge variant="outline" className="border-slate-300 text-slate-700 font-medium">
                            Telemetry
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-teal-400 text-teal-800 bg-teal-50/60 font-semibold">
                            CCTV Vision
                          </Badge>
                        )}

                        <span className="text-xs tabular-nums text-slate-500">
                          {inc.id}
                        </span>
                      </div>

                      {/* Title & Category */}
                      <div>
                        <span className="text-xs font-semibold text-teal-700 tracking-normal mr-2">
                          {formatCategory(inc.category)}:
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {inc.title}
                        </span>
                      </div>

                      {/* Dynamic Intelligence Rationale */}
                      <p className="text-sm text-slate-600 leading-snug line-clamp-2">
                        {inc.priority_explanation}
                      </p>

                      {/* Location & Camera Context */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {inc.location_name || inc.location_id}
                        </span>
                        <span className="flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-slate-500" />
                          {inc.camera_name || inc.camera_id || "Unassigned"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {formatTimeAgo(inc.detected_at)} ({formatDateTime(inc.detected_at)})
                        </span>
                        {inc.detection_confidence !== null && inc.detection_confidence !== undefined && (
                          <span className="text-slate-500 tabular-nums text-xs">
                            Conf: {(inc.detection_confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center space-x-2 shrink-0 md:self-center pl-10 md:pl-0">
                    {inc.status === "new" && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcknowledgeIncident(inc.id);
                        }}
                        className="bg-blue-700 hover:bg-blue-800 h-8 text-xs font-medium"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Ack
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIncident(inc.id);
                      }}
                      className="h-8 text-xs font-medium"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Inspect
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
