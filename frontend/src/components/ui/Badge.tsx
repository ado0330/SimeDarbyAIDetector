import React from "react";
import { cn, getPriorityStyles } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "critical" | "high" | "medium" | "low" | "outline" | "emergency" | "simulated";
  children: React.ReactNode;
}

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    critical: getPriorityStyles("critical").badge,
    high: getPriorityStyles("high").badge,
    medium: getPriorityStyles("medium").badge,
    low: getPriorityStyles("low").badge,
    outline: "bg-transparent text-slate-700 border-slate-300",
    emergency: "bg-rose-600 text-white border-rose-700 font-bold tracking-normal",
    simulated: "bg-slate-200 text-slate-800 border-slate-300 tabular-nums text-xs tracking-normal",
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
