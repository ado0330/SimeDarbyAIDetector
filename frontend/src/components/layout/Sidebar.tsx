import React from "react";
import {
  LayoutDashboard,
  AlertTriangle,
  Video,
  MapPin,
  History,
  BarChart3,
  Sliders,
  Shield,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalEyeLogo } from "@/components/brand/GlobalEyeLogo";

export type NavView =
  | "overview"
  | "incidents"
  | "video"
  | "map"
  | "history"
  | "analytics"
  | "settings";

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  activeIncidentCount: number;
  criticalIncidentCount: number;
  isStreamConnected: boolean;
  mode: string;
}

export function Sidebar({
  currentView,
  onNavigate,
  activeIncidentCount,
  criticalIncidentCount,
  isStreamConnected,
  mode,
}: SidebarProps) {
  const navItems = [
    { id: "overview" as NavView, label: "Overview", icon: LayoutDashboard },
    {
      id: "incidents" as NavView,
      label: "Active Incidents",
      icon: AlertTriangle,
      badge: activeIncidentCount > 0 ? activeIncidentCount : undefined,
      criticalBadge: criticalIncidentCount > 0,
    },
    { id: "video" as NavView, label: "CCTV & Video Analysis", icon: Video },
    { id: "map" as NavView, label: "Township Map", icon: MapPin },
    { id: "history" as NavView, label: "Incident History", icon: History },
    { id: "analytics" as NavView, label: "Analytics & Trends", icon: BarChart3 },
    { id: "settings" as NavView, label: "Demo & Config", icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-4.5 border-b border-slate-800/90 flex items-center bg-slate-950/60">
        <GlobalEyeLogo variant="full" theme="dark" size="md" withTagline={true} />
      </div>

      {/* Mode Banner */}
      <div className="px-4 py-2.5 mx-3 mt-3 rounded-md bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Operation Mode:</span>
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase",
            mode === "simulation"
              ? "bg-amber-950/80 text-amber-300 border border-amber-700/50"
              : "bg-teal-950/80 text-teal-300 border border-teal-700/50"
          )}
        >
          {mode === "simulation" ? "Simulation" : "Video Analysis"}
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-teal-600 text-white font-semibold shadow-xs"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              )}
            >
              <div className="flex items-center space-x-3">
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                    item.criticalBadge
                      ? "bg-rose-500 text-white"
                      : isActive
                      ? "bg-teal-800 text-teal-100"
                      : "bg-slate-700 text-slate-200"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/90 bg-slate-950/60 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <div className="flex items-center space-x-2">
            <Radio className={cn("w-3.5 h-3.5", isStreamConnected ? "text-emerald-400 animate-pulse" : "text-amber-400")} />
            <span className="text-[11px]">
              {isStreamConnected ? "Live Feed (SSE)" : "Polling Fallback"}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">v0.1.0-proto</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
          PEOPLE — Safety & Security Command
        </p>
      </div>
    </aside>
  );
}
