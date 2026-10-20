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
  formatDuration,
} from "@/lib/utils";
import {
  Search,
  Filter,
  Download,
  History,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from "lucide-react";

interface HistoryViewProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
}

export function HistoryView({ incidents, onSelectIncident }: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (statusFilter !== "all" && inc.status !== statusFilter) return false;
      if (categoryFilter !== "all" && inc.category !== categoryFilter) return false;
      if (priorityFilter !== "all" && inc.priority_level !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = inc.id.toLowerCase().includes(q);
        const matchesTitle = inc.title.toLowerCase().includes(q);
        const matchesLoc = (inc.location_name || inc.location_id || "").toLowerCase().includes(q);
        const matchesDesc = (inc.description || "").toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesLoc && !matchesDesc) return false;
      }
      return true;
    }).sort(
      (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
    );
  }, [incidents, searchQuery, statusFilter, categoryFilter, priorityFilter]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "ID",
      "Title",
      "Category",
      "Priority Level",
      "Priority Score",
      "Status",
      "Location",
      "Camera",
      "Detected At (UTC)",
      "Source",
      "Assigned To",
      "Emergency Rule",
      "Confidence",
    ];

    const rows = filtered.map((inc) => [
      inc.id,
      `"${inc.title.replace(/"/g, '""')}"`,
      inc.category,
      inc.priority_level,
      inc.priority_score.toFixed(1),
      inc.status,
      `"${(inc.location_name || inc.location_id || "").replace(/"/g, '""')}"`,
      inc.camera_name || inc.camera_id || "",
      inc.detected_at,
      inc.is_simulated ? "Simulated" : "Video Analysis",
      `"${(inc.assigned_to_name || inc.assigned_to || "").replace(/"/g, '""')}"`,
      inc.emergency_rule_triggered ? "Yes" : "No",
      inc.detection_confidence != null ? inc.detection_confidence.toFixed(2) : "N/A",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `township_guardian_incidents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Export Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search complete incident archive by ID, title, zone, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
          </div>

          {/* CSV Export Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="text-xs h-9 text-slate-700 hover:text-slate-900 border-slate-300"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-teal-700" />
            Export CSV ({filtered.length} records)
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1 text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Archive Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 px-2 text-[11px] rounded border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
            <option value="new">New (Awaiting Ack)</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-7 px-2 text-[11px] rounded border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-7 px-2 text-[11px] rounded border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="all">All Categories</option>
            <option value="person_fall">Person Fall</option>
            <option value="vehicle_obstruction">Vehicle Obstruction</option>
            <option value="fight_altercation">Altercation / Disturbance</option>
            <option value="loitering_restricted">Restricted Loitering</option>
            <option value="illegal_dumping">Illegal Dumping</option>
            <option value="fire_smoke_hazard">Fire / Smoke</option>
          </select>

          {(searchQuery || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setCategoryFilter("all");
              }}
              className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-teal-700" />
            <span>Incident Audit & Historical Archive</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
              {filtered.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">
            Persistent storage in SQLite &bull; Complete audit trail preserved
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-1">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="font-semibold text-slate-700">No historical records match criteria</div>
            <p className="text-[11px] text-slate-400">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Incident ID</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Title & Category</th>
                  <th className="p-3">Location / Zone</th>
                  <th className="p-3">Detected Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Responder</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inc) => {
                  const prio = getPriorityStyles(inc.priority_level);
                  const status = getStatusStyles(inc.status);

                  return (
                    <tr
                      key={inc.id}
                      onClick={() => onSelectIncident(inc.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono text-[11px] font-bold text-slate-800">
                        {inc.id}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${prio.pill}`}>
                          {prio.label} ({inc.priority_score.toFixed(0)})
                        </span>
                      </td>

                      <td className="p-3 min-w-[220px]">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {inc.title}
                        </div>
                        <div className="text-[10px] text-teal-700 uppercase tracking-wider font-semibold mt-0.5">
                          {formatCategory(inc.category)}
                        </div>
                      </td>

                      <td className="p-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {inc.location_name || inc.location_id}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        <div className="font-mono text-[11px]">{formatDateTime(inc.detected_at)}</div>
                        <div className="text-[10px] text-slate-400">{formatTimeAgo(inc.detected_at)}</div>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 w-max ${status.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>

                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {inc.assigned_to_name || inc.assigned_to || "—"}
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectIncident(inc.id);
                          }}
                          className="h-7 text-xs text-teal-700 hover:text-teal-900"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
