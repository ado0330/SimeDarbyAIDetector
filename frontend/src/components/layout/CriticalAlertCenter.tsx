import React, { useEffect, useRef, useState } from "react";
import { Incident } from "@/types";
import { Button } from "@/components/ui/Button";
import { AlertOctagon, Volume2, VolumeX, ArrowUpRight, BellRing } from "lucide-react";
import {
  playCriticalAlertSound,
  isSoundEnabled,
  setSoundEnabled,
  registerAudioUnlockListener,
} from "@/lib/sound";

/** Demo workflow thresholds. Prototype values, deliberately short so the escalation is demonstrable. */
export const ESCALATION_AFTER_SECONDS = 45;
export const ESCALATION_SUPERVISOR = "Pn. Aishah Rahman (Duty Supervisor)";
const STORAGE_KEY = "globaleye_escalated_ids";

interface Props {
  incidents: Incident[];
  backendConnected: boolean;
  onAcknowledge: (id: string) => void;
  onOpen: (id: string) => void;
  /** Must persist the escalation server-side (audit trail) and reject on failure. */
  onEscalate: (id: string, supervisor: string, elapsedSeconds: number) => Promise<void>;
}

const mmss = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

function loadEscalated(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function CriticalAlertCenter({ incidents, backendConnected, onAcknowledge, onOpen, onEscalate }: Props) {
  // 0 until mounted: avoids reading the wall clock during prerender.
  const [now, setNow] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [escalated, setEscalated] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const inflight = useRef<Set<string>>(new Set());

  // Initialize sound settings and register user gesture listener on mount
  useEffect(() => {
    setSoundOn(isSoundEnabled());
    registerAudioUnlockListener();
  }, []);

  useEffect(() => setEscalated(loadEscalated()), []);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  // Critical = critical tier or an emergency rule fired. Still "unacknowledged" only while status === "new".
  const unacked = (now === 0 ? [] : incidents)
    .filter((i) => i.status === "new" && (i.priority_level === "critical" || i.emergency_rule_triggered))
    .map((i) => ({ i, elapsed: (now - Date.parse(i.created_at || i.detected_at)) / 1000 }))
    .sort((a, b) => b.i.rank_score - a.i.rank_score);

  const hasUnacked = unacked.length > 0;
  const anyEscalated = unacked.some(({ i }) => escalated.has(i.id));

  // Periodic audible siren while critical unacknowledged alerts remain active
  useEffect(() => {
    if (!soundOn || !hasUnacked) return;
    playCriticalAlertSound(anyEscalated);
    const t = setInterval(() => playCriticalAlertSound(anyEscalated), 4500);
    return () => clearInterval(t);
  }, [soundOn, hasUnacked, anyEscalated]);

  // Escalate (once per incident) when the unacknowledged window is exceeded. Only recorded if the server confirms.
  useEffect(() => {
    if (!backendConnected) return;
    unacked.forEach(({ i, elapsed }) => {
      if (elapsed < ESCALATION_AFTER_SECONDS || escalated.has(i.id) || inflight.current.has(i.id)) return;
      inflight.current.add(i.id);
      onEscalate(i.id, ESCALATION_SUPERVISOR, elapsed)
        .then(() => {
          setEscalated((prev) => {
            const next = new Set(prev).add(i.id);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
            return next;
          });
        })
        .catch(() => setFailed((prev) => new Set(prev).add(i.id)))
        .finally(() => inflight.current.delete(i.id));
    });
  }, [unacked, backendConnected, escalated, onEscalate]);

  const toggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      await playCriticalAlertSound(false);
    }
  };

  if (!hasUnacked) {
    return (
      <div className="flex justify-end px-6 pt-2">
        <button
          id="alert-sound-toggle"
          type="button"
          onClick={toggleSound}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
        >
          {soundOn ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Critical alert sound: <strong className="text-emerald-700">ON</strong></span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-500" />
              <span>Critical alert sound: <strong className="text-rose-600">MUTED (click to enable)</strong></span>
            </>
          )}
        </button>
      </div>
    );
  }

  const { i: top, elapsed } = unacked[0];
  const isEsc = escalated.has(top.id);
  const escFailed = failed.has(top.id) && !isEsc;
  const untilEsc = ESCALATION_AFTER_SECONDS - elapsed;

  return (
    <div id="critical-alert-banner" role="alert" aria-live="assertive"
      className="bg-rose-700 text-white px-6 py-3 flex flex-wrap items-center gap-4 border-b-4 border-rose-900 shadow-lg">
      <AlertOctagon className="w-7 h-7 shrink-0 text-white animate-pulse" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-rose-200">
          Critical alert · {unacked.length} unacknowledged
        </div>
        <div className="text-sm font-bold truncate">
          {top.title} <span className="font-normal text-rose-100">— {top.location_name || top.camera_name || top.camera_id}</span>
        </div>
        <div className="text-[11px] text-rose-100">
          Unacknowledged for <b className="font-mono text-sm text-white">{mmss(elapsed)}</b>
          {isEsc ? (
            <> · <b>ESCALATED to {ESCALATION_SUPERVISOR}</b> (logged in audit trail)</>
          ) : escFailed ? (
            <> · escalation NOT logged (server error)</>
          ) : !backendConnected ? (
            <> · backend disconnected: escalation cannot be recorded</>
          ) : (
            <> · escalates to {ESCALATION_SUPERVISOR} in <b className="font-mono">{mmss(untilEsc)}</b></>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          id="alert-sound-toggle"
          type="button"
          onClick={toggleSound}
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer ${
            soundOn
              ? "bg-rose-900/80 hover:bg-rose-950 text-white"
              : "bg-slate-900/80 hover:bg-slate-950 text-rose-300"
          }`}
          title={soundOn ? "Click to mute alert sound" : "Click to unmute alert sound"}
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5 text-emerald-300" /> : <VolumeX className="w-3.5 h-3.5 text-rose-300" />}
          {soundOn ? "Sound ON" : "Muted"}
        </button>
        <Button id="banner-open" size="sm" variant="outline" onClick={() => onOpen(top.id)}
          className="bg-white/10 border-white/40 text-white hover:bg-white/20">
          <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Open
        </Button>
        <Button id="banner-acknowledge" size="sm" onClick={() => onAcknowledge(top.id)}
          className="bg-white text-rose-800 hover:bg-rose-50 font-bold">
          <BellRing className="w-3.5 h-3.5 mr-1" /> Acknowledge
        </Button>
      </div>
    </div>
  );
}
