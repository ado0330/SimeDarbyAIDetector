import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PriorityLevel, IncidentStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d) + " MYT";
  } catch {
    return isoString;
  }
}

export function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - past) / 1000));
    if (diffSec < 45) return "Just now";
    if (diffSec < 90) return "1 min ago";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 7200) return "1 hour ago";
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    return `${Math.floor(diffSec / 86400)} days ago`;
  } catch {
    return "";
  }
}

export function formatIncidentId(id?: string | null): string {
  if (!id) return "";
  const m = id.match(/^(?:INC\s*[-–]\s*|INC-VID-?|INC-)(\d+)$/i);
  if (m) {
    const num = parseInt(m[1], 10);
    if (!isNaN(num) && num < 10000) {
      return `INC - ${String(num).padStart(3, "0")}`;
    }
  }
  return id;
}

export const PRIORITY_BADGE_LAYOUT = "inline-flex items-center justify-center gap-1 whitespace-nowrap w-max max-w-full shrink-0 px-3 py-1.5 rounded-md text-xs font-bold leading-tight uppercase";

export function getPriorityStyles(level: PriorityLevel) {
  switch (level) {
    case "critical":
      return {
        badge: `${PRIORITY_BADGE_LAYOUT} bg-[#D32F2F] text-white border-transparent`,
        pill: `${PRIORITY_BADGE_LAYOUT} bg-[#D32F2F] text-white border-transparent`,
        dot: "bg-rose-600",
        border: "border-l-rose-600",
        bgHover: "hover:bg-rose-50/40",
        label: "Critical",
      };
    case "high":
      return {
        badge: `${PRIORITY_BADGE_LAYOUT} bg-[#F57C00] text-white border-transparent`,
        pill: `${PRIORITY_BADGE_LAYOUT} bg-[#F57C00] text-white border-transparent`,
        dot: "bg-amber-500",
        border: "border-l-amber-500",
        bgHover: "hover:bg-amber-50/40",
        label: "High",
      };
    case "medium":
      return {
        badge: `${PRIORITY_BADGE_LAYOUT} bg-[#1565C0] text-white border-transparent`,
        pill: `${PRIORITY_BADGE_LAYOUT} bg-[#1565C0] text-white border-transparent`,
        dot: "bg-sky-500",
        border: "border-l-sky-500",
        bgHover: "hover:bg-sky-50/40",
        label: "Medium",
      };
    case "low":
    default:
      return {
        badge: `${PRIORITY_BADGE_LAYOUT} bg-[#616161] text-white border-transparent`,
        pill: `${PRIORITY_BADGE_LAYOUT} bg-[#616161] text-white border-transparent`,
        dot: "bg-slate-400",
        border: "border-l-slate-400",
        bgHover: "hover:bg-slate-50",
        label: "Low",
      };
  }
}

export const STATUS_BADGE_LAYOUT = "inline-flex items-center justify-center gap-1.5 whitespace-nowrap w-max shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-semibold leading-tight";

export function getStatusStyles(status: IncidentStatus) {
  switch (status) {
    case "new":
      return {
        badge: `${STATUS_BADGE_LAYOUT} bg-[#FFF3DB] text-[#986000] border-[#986000]/10`,
        label: "Awaiting Ack",
        dot: "bg-[#986000]",
      };
    case "acknowledged":
      return {
        badge: `${STATUS_BADGE_LAYOUT} bg-[#E6F4EA] text-[#287D48] border-[#287D48]/10`,
        label: "Acknowledged",
        dot: "bg-[#287D48]",
      };
    case "in_progress":
      return {
        badge: `${STATUS_BADGE_LAYOUT} bg-teal-50 text-teal-800 border-teal-200`,
        label: "In Progress",
        dot: "bg-teal-600",
      };
    case "resolved":
      return {
        badge: `${STATUS_BADGE_LAYOUT} bg-emerald-50 text-emerald-800 border-emerald-200`,
        label: "Resolved",
        dot: "bg-emerald-600",
      };
    case "false_positive":
      return {
        badge: `${STATUS_BADGE_LAYOUT} bg-slate-100 text-slate-600 border-slate-200`,
        label: "False Positive",
        dot: "bg-slate-400",
      };
    case "closed":
      return {
        badge: `${STATUS_BADGE_LAYOUT} bg-slate-100 text-slate-500 border-slate-200`,
        label: "Closed",
        dot: "bg-slate-400",
      };
    default:
      return {
        badge: `${STATUS_BADGE_LAYOUT} bg-slate-100 text-slate-700 border-slate-200`,
        label: status,
        dot: "bg-slate-400",
      };
  }
}

export function formatCategory(cat: string): string {
  const map: Record<string, string> = {
    road_collision: "Road Collision",
    person_fall: "Person Fall / Motionless",
    parking_obstruction: "Emergency Access Obstruction",
    fire_smoke: "Suspected Fire / Smoke",
    wildlife_intrusion: "Wildlife Intrusion",
    restricted_area_intrusion: "Restricted Danger Zone (Rooftop)",
    pipe_burst_leakage: "Water Main Pipe Burst",
    flash_flood: "Flash Flooding / Inundation",
    lift_entrapment: "Elevator Passenger Entrapment",
    physical_altercation: "Physical Altercation / Brawl",
    medical_emergency: "Acute Medical Emergency",
    drowning_water_distress: "Water Distress / Drowning Risk",
    unauthorized_trespass: "Perimeter Security Breach",
    gas_leak_explosion_risk: "Gas Leak / Explosion Risk",
    drainage_blockage: "Drainage / Culvert Blockage",
    fallen_tree_storm_damage: "Fallen Tree / Storm Damage",
    power_outage_electrical: "Electrical / Substation Trip",
    illegal_dumping: "Illegal Waste Dumping",
    custom_safety_hazard: "Custom Safety Hazard",
  };
  return map[cat] || cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function extractVideoThumbnail(file: File | string): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(undefined);
      return;
    }
    try {
      const url = typeof file === "string" ? file : URL.createObjectURL(file);
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "metadata";
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      let resolved = false;
      const finish = (result?: string) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(2.0, Math.max(0.1, (video.duration || 3) * 0.25));
        } catch {
          finish(undefined);
        }
      };

      video.onseeked = () => {
        if (resolved) return;
        try {
          const canvas = document.createElement("canvas");
          const width = video.videoWidth || 320;
          const height = video.videoHeight || 180;
          canvas.width = Math.min(width, 480);
          canvas.height = Math.round((canvas.width / width) * height) || 270;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
            finish(dataUrl);
            return;
          }
        } catch {
          // ignore canvas capture issue
        }
        finish(undefined);
      };

      video.onerror = () => finish(undefined);
      setTimeout(() => finish(undefined), 2500);
    } catch {
      resolve(undefined);
    }
  });
}

