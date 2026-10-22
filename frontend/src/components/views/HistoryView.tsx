import React, { useState, useMemo } from "react";
import {
  Incident,
  PriorityLevel,
  IncidentCategory,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  getPriorityStyles,
  getStatusStyles,
  formatDateTime,
  formatTimeAgo,
  formatCategory,
  formatDuration,
} from "@/lib/utils";
import { TAXONOMY_CATALOGUE, INCIDENT_DOMAINS } from "@/lib/taxonomy";
import {
  Search,
  Filter,
  Download,
  Trash2,
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
  onClearHistory?: (includeActive: boolean) => Promise<void>;
}

export function HistoryView({ incidents, onSelectIncident, onClearHistory }: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showClearModal, setShowClearModal] = useState(false);
  const [includeActiveInClear, setIncludeActiveInClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

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
      inc.is_simulated ? "Telemetry" : "CCTV Video Analysis",
      `"${(inc.assigned_to_name || inc.assigned_to || "").replace(/"/g, '""')}"`,
      inc.emergency_rule_triggered ? "Yes" : "No",
      inc.detection_confidence != null ? inc.detection_confidence.toFixed(2) : "N/A",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `globaleye_incidents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmClear = async () => {
    if (!onClearHistory) return;
    setIsClearing(true);
    try {
      await onClearHistory(includeActiveInClear);
      setShowClearModal(false);
      setIncludeActiveInClear(false);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Export Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search complete incident archive by ID, title, zone, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2">
            {/* CSV Export Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              className="text-sm h-9 text-slate-700 hover:text-slate-900 border-slate-300"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-teal-700" />
              Export CSV ({filtered.length} records)
            </Button>

            {/* Clear History Button */}
            {onClearHistory && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowClearModal(true)}
                className="text-xs h-9 text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-300"
                title="Clear incident records from history"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                Clear History
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1 text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold text-xs tracking-normal">Archive Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 px-2 text-xs rounded border border-slate-200 bg-slate-50 font-medium"
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
            className="h-7 px-2 text-xs rounded border border-slate-200 bg-slate-50 font-medium"
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

          {(searchQuery || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setCategoryFilter("all");
              }}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold ml-auto cursor-pointer"
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
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
              {filtered.length}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-normal">
            Persistent storage in SQLite &bull; Complete audit trail preserved
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-1">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="font-semibold text-slate-700">No historical records match criteria</div>
            <p className="text-sm text-slate-500">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] font-medium">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold tracking-normal text-xs">
                <tr>
                  <th className="p-3 min-w-[115px] whitespace-nowrap">Incident ID</th>
                  <th className="p-3 min-w-[180px] whitespace-nowrap">Priority</th>
                  <th className="p-3">Title & Category</th>
                  <th className="p-3">Location / Zone</th>
                  <th className="p-3">Detected Time</th>
                  <th className="p-3 min-w-[175px] whitespace-nowrap">Status</th>
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
                      className={`cursor-pointer transition-colors ${inc.priority_level === "critical" ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50/80"}`}
                    >
                      <td className="p-3 min-w-[115px] whitespace-nowrap tabular-nums text-[13px] font-semibold text-slate-800">
                        {inc.id}
                      </td>

                      <td className="p-3 min-w-[180px] whitespace-nowrap">
                        <span className={prio.pill}>
                          {prio.label} ({inc.priority_score.toFixed(0)})
                        </span>
                      </td>

                      <td className="p-3 min-w-[220px]">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {inc.title}
                        </div>
                        <div className="text-xs text-teal-700 tracking-normal font-semibold mt-0.5">
                          {formatCategory(inc.category)}
                        </div>
                      </td>

                      <td className="p-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="whitespace-nowrap">
                            {inc.location_name || inc.location_id}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 min-w-[235px] text-slate-700 whitespace-nowrap">
                        <div className="tabular-nums text-[13px]">{formatDateTime(inc.detected_at)}</div>
                        <div className="mt-1 text-xs font-normal text-slate-500">{formatTimeAgo(inc.detected_at)}</div>
                      </td>

                      <td className="p-3 min-w-[175px] whitespace-nowrap">
                        <span className={status.badge}>
                          <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${status.dot}`} />
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

      {/* Clear History Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear Incident History"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleConfirmClear}
              loading={isClearing}
            >
              Confirm Clear
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs text-slate-600">
          <p>
            Are you sure you want to clear incident records? This permanently removes the selected records from the local SQLite database.
          </p>

          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeActiveInClear}
                onChange={(e) => setIncludeActiveInClear(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="font-semibold text-slate-800">
                Also purge active incidents (complete database reset)
              </span>
            </label>
            <p className="text-xs text-slate-500 pl-6 leading-relaxed">
              {includeActiveInClear
                ? "Warning: All active incident queue alerts and all historical records will be permanently deleted."
                : "Default: Only resolved, closed, and false-positive records will be cleared. Active incidents in the triage queue will remain untouched."}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

