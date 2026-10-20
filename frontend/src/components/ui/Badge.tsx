import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "critical" | "high" | "medium" | "low" | "outline" | "emergency" | "simulated";
  children: React.ReactNode;
}

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    critical: "bg-rose-50 text-rose-800 border-rose-300 font-semibold",
    high: "bg-amber-50 text-amber-900 border-amber-300 font-medium",
    medium: "bg-sky-50 text-sky-800 border-sky-300 font-medium",
    low: "bg-slate-100 text-slate-700 border-slate-300",
    outline: "bg-transparent text-slate-700 border-slate-300",
    emergency: "bg-rose-600 text-white border-rose-700 font-bold uppercase tracking-wider",
    simulated: "bg-slate-200 text-slate-800 border-slate-300 font-mono text-[10px] tracking-wide",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
