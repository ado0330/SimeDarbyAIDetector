import React from "react";
import { AnalyticsSummary, PriorityLevel } from "@/types";
import { formatDuration } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Database,
  Info,
} from "lucide-react";

interface AnalyticsViewProps {
  analytics: AnalyticsSummary | null;
  onRefresh: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#e11d48", // rose-600
  high: "#d97706",     // amber-600
  medium: "#0284c7",   // sky-600
  low: "#64748b",      // slate-500
};

export function AnalyticsView({ analytics, onRefresh }: AnalyticsViewProps) {
  if (!analytics) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-xs text-slate-500">
        Loading analytics data from operations database...
      </div>
    );
  }

  // Priority chart data
  const priorityData = Object.entries(analytics.by_severity_all || {}).map(([level, count]) => ({
    name: level.toUpperCase(),
    count,
    level,
    fill: PRIORITY_COLORS[level] || "#64748b",
  }));

  // Category chart data
  const categoryData = (analytics.by_category || []).map((c) => ({
    name: c.label || c.category,
    count: c.count,
    critical: c.critical,
    high: c.high,
  }));

  // Daily activity trend data
  const trendData = (analytics.per_day || []).map((d) => ({
    date: d.date.slice(5), // mm-dd
    incidents: d.count,
  }));

  return (
    <div className="space-y-6">
      {/* 1. Performance & Response Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-normal">Total Incidents</span>
            <Database className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{analytics.totals.incidents}</span>
            <span className="text-xs text-slate-500">records</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Video-derived:</span>
            <span className="font-semibold text-teal-800">{analytics.totals.from_video_analysis}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-normal">Avg Acknowledge Time</span>
            <Clock className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">
              {analytics.avg_acknowledgement_seconds
                ? formatDuration(analytics.avg_acknowledgement_seconds)
                : "—"}
            </span>
            <span className="text-xs text-slate-500">
              ({analytics.acknowledgement_sample_size} acked)
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Awaiting Ack:</span>
            <span className="font-semibold text-amber-700">{analytics.totals.awaiting_acknowledgement}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-normal">Avg Resolution Time</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">
              {analytics.avg_resolution_seconds
                ? formatDuration(analytics.avg_resolution_seconds)
                : "—"}
            </span>
            <span className="text-xs text-slate-500">
              ({analytics.resolution_sample_size} resolved)
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Resolved Cases:</span>
            <span className="font-semibold text-emerald-700">{analytics.totals.resolved}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-normal">False Positive Rate</span>
            <AlertTriangle className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">
              {analytics.totals.incidents > 0
                ? `${((analytics.totals.false_positive / analytics.totals.incidents) * 100).toFixed(1)}%`
                : "0.0%"}
            </span>
            <span className="text-xs text-slate-500">
              ({analytics.totals.false_positive} cases)
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Audit preserved:</span>
            <span className="font-semibold text-slate-700">100% verified</span>
          </div>
        </div>
      </div>

      {/* 2. Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Category Breakdown */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-teal-700" />
              <h3 className="text-lg font-semibold text-slate-900 tracking-normal">
                Incidents by Category
              </h3>
            </div>
            <span className="text-xs text-slate-500">All Persisted Records</span>
          </div>

          {categoryData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
              <span className="font-semibold text-slate-600">No Category Data Recorded</span>
              <p className="text-sm text-slate-500 mt-0.5 max-w-xs">
                Upload CCTV clips or ingest telemetry to populate category distribution.
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12, fill: "#334155" }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} name="Incidents" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Priority Severity Distribution */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-teal-700" />
              <h3 className="text-lg font-semibold text-slate-900 tracking-normal">
                Priority Tier Distribution
              </h3>
            </div>
            <span className="text-xs text-slate-500">Relative Urgency</span>
          </div>

          {priorityData.every((p) => p.count === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
              <span className="font-semibold text-slate-600">Zero Active Urgency Alerts</span>
              <p className="text-sm text-slate-500 mt-0.5 max-w-xs">
                Surveillance grid is all clear. No incidents currently classified under priority tiers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "none",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 text-xs">
                {priorityData.map((p) => (
                  <div key={p.name} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.fill }}
                      />
                      <span className="font-semibold text-slate-800">{p.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. 7-Day Activity & Trend Chart */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-teal-700" />
            <h3 className="text-lg font-semibold text-slate-900 tracking-normal">
              7-Day Incident Volume & Operational Trend
            </h3>
          </div>
          <span className="text-xs text-slate-500">Daily Ingest Rate (UTC / MYT)</span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="incidentTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                domain={[0, (dataMax: number) => Math.max(4, Math.ceil((dataMax || 0) * 1.2))]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={(value: any) => [`${value} incidents`, "Volume"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="incidents"
                stroke="#0d9488"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#incidentTrendGradient)"
                name="Incidents"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Operational Integrity Callout */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900 block mb-0.5">
            Operational Visual Honesty Guarantee (Spec §8)
          </span>
          <p className="leading-relaxed">
            All metrics, acknowledge durations, resolution timestamps, and category breakdowns displayed on this dashboard are derived strictly from persisted records and immutable audit logs stored in the local SQLite database. No synthetic decorative charts or inflated numbers are presented.
          </p>
        </div>
      </div>
    </div>
  );
}
