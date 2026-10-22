import React, { useEffect, useState } from "react";
import { User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function TopHeader({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
}: TopHeaderProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        new Intl.DateTimeFormat("en-MY", {
          timeZone: "Asia/Kuala_Lumpur",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now) + " MYT"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="min-h-20 bg-white border-b border-slate-200/90 px-4 py-4 sm:px-6 flex flex-wrap gap-3 items-center justify-between shrink-0 z-20">
      <div>
        <h2 className="text-2xl font-bold text-[#172B4D] tracking-tight leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3">
        {/* Clock */}
        <div className="hidden md:flex flex-col text-right pr-3 border-r border-slate-200">
          <span className="text-[13px] tabular-nums font-semibold text-slate-700">{timeStr}</span>
          <span className="text-xs text-slate-400">Township Ops Center</span>
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          loading={isRefreshing}
          className="text-slate-600"
          title="Refresh current state"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>

        {/* Operator Profile */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-xs font-semibold text-slate-800">Control Supervisor</div>
            <div className="text-xs text-slate-500">Security Operations Center</div>
          </div>
        </div>
      </div>
    </header>
  );
}
