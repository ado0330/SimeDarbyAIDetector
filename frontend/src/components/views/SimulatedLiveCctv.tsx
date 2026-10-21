import React, { useEffect, useRef, useState } from "react";
import { Camera } from "@/types";
import { Button } from "@/components/ui/Button";
import {
  Play,
  Square,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Activity,
  Layers,
  Video,
  ShieldAlert,
} from "lucide-react";

interface SimulatedLiveCctvProps {
  cameras: Camera[];
  onUploadVideo: (file: File, cameraId?: string) => Promise<void>;
}

const LIVE_STREAM_CONFIG = {
  id: "live_cctv_01",
  name: "Township Surveillance Camera 01 — Live CCTV Stream",
  locationName: "Main Gate Roundabout & Urban Access Corridor",
  defaultCameraId: "CAM-GATE-01",
  videoUrl: "/samples/cctv_live_stream.mp4",
  fileName: "cctv_live_stream.mp4",
  resolution: "1280x720 HD",
  fps: 30,
  bitrate: "3.8 Mbps",
  latency: "24ms",
};

type Phase = "monitoring" | "countdown" | "analyzing" | "detected";

/**
 * Continuous Live CCTV Surveillance Terminal.
 * Streams continuous video immediately on mount with authentic CCTV HUD telemetry.
 * Operators can link to the live camera feed and trigger an automated AI Threat Sweep
 * to detect incidents without manual file uploads.
 */
export function SimulatedLiveCctv({ cameras, onUploadVideo }: SimulatedLiveCctvProps) {
  const [selectedCameraId, setSelectedCameraId] = useState<string>(
    cameras.find((c) => c.id === LIVE_STREAM_CONFIG.defaultCameraId)?.id || cameras[0]?.id || "CAM-GATE-01"
  );
  const [delaySeconds, setDelaySeconds] = useState<number>(6);
  const [phase, setPhase] = useState<Phase>("monitoring");
  const [remaining, setRemaining] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const [showTelemetryGrid, setShowTelemetryGrid] = useState<boolean>(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const camName = cameras.find((c) => c.id === selectedCameraId)?.name || LIVE_STREAM_CONFIG.locationName;

  // Real-time CCTV digital clock (MYT / Asia/Kuala_Lumpur)
  useEffect(() => {
    const tick = () => setClock(new Date());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Submit feed segment for AI Multimodal threat analysis
  const executeAiAnalysisSweep = async () => {
    setPhase("analyzing");
    setErrorMsg(null);
    try {
      const res = await fetch(LIVE_STREAM_CONFIG.videoUrl);
      if (!res.ok) throw new Error(`Could not access CCTV stream buffer (${res.status})`);
      const blob = await res.blob();
      const file = new File([blob], LIVE_STREAM_CONFIG.fileName, { type: blob.type || "video/mp4" });

      await onUploadVideo(file, selectedCameraId);
      setPhase("detected");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to analyze CCTV stream segment.");
      setPhase("monitoring");
    }
  };

  // Start auto-trigger countdown
  const startCountdown = () => {
    setErrorMsg(null);
    setRemaining(delaySeconds);
    setPhase("countdown");
    if (timerRef.current) clearInterval(timerRef.current);

    let left = delaySeconds;
    timerRef.current = setInterval(() => {
      left -= 1;
      setRemaining(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        executeAiAnalysisSweep();
      }
    }, 1000);
  };

  // Stop countdown and return to active monitoring
  const stopCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("monitoring");
  };

  return (
    <div id="simulated-live-cctv" className="bg-white rounded-lg border border-teal-300 p-5 shadow-2xs space-y-4">
      {/* Header & Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              Live CCTV Surveillance Stream
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                Active Feed
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowTelemetryGrid((prev) => !prev)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
              showTelemetryGrid
                ? "bg-slate-900 text-teal-400 border-slate-800"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <Layers className="w-3 h-3" />
            {showTelemetryGrid ? "HUD Overlay: On" : "HUD Overlay: Off"}
          </button>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-[10px] font-bold text-teal-900 uppercase tracking-wider">
            <Activity className="w-3 h-3 text-teal-600" /> Continuous Monitoring
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-600 leading-relaxed">
        Live surveillance link to township camera nodes across City of Elmina.
        Operators can monitor real-time video telemetry or trigger an <strong>Instant AI Threat Sweep</strong> to automatically detect incidents and dispatch response units.
      </p>

      {/* Main Stream Player & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Video Screen with Authentic CCTV HUD */}
        <div className="lg:col-span-2 relative rounded-lg overflow-hidden bg-slate-950 aspect-video border border-slate-800 shadow-md flex items-center justify-center">
          <video
            ref={videoRef}
            src={LIVE_STREAM_CONFIG.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />

          {/* CCTV HUD Telemetry Overlay */}
          {showTelemetryGrid && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 bg-gradient-to-t from-black/60 via-transparent to-black/60 font-mono">
              {/* Top Bar: Camera Info & Real-Time Clock */}
              <div className="flex items-center justify-between text-xs text-white">
                <div className="flex items-center space-x-2 bg-black/70 px-2.5 py-1 rounded border border-white/10 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="font-bold tracking-wider text-[11px]">REC ● LIVE</span>
                  <span className="text-white/40">|</span>
                  <span className="text-teal-300 text-[11px] font-semibold">{selectedCameraId}</span>
                  <span className="text-white/40">|</span>
                  <span className="text-slate-300 text-[10px] hidden sm:inline">{camName}</span>
                </div>

                <div className="bg-black/70 px-2.5 py-1 rounded border border-white/10 text-[11px] text-emerald-400 font-semibold backdrop-blur-xs">
                  {clock ? clock.toISOString().replace("T", " ").slice(0, 19) : "2026-10-22 00:00:00"} MYT
                </div>
              </div>

              {/* Crosshair target & Optical Grid */}
              <div className="self-center flex items-center justify-center pointer-events-none opacity-40">
                <div className="w-16 h-16 border border-white/30 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-teal-400 rounded-full" />
                </div>
              </div>

              {/* Bottom Bar: Stream Specs & Analysis Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-300 bg-black/70 px-2.5 py-1 rounded border border-white/10 backdrop-blur-xs">
                  <div className="flex items-center gap-3">
                    <span>{LIVE_STREAM_CONFIG.resolution}</span>
                    <span>&bull;</span>
                    <span>{LIVE_STREAM_CONFIG.fps} FPS</span>
                    <span>&bull;</span>
                    <span>{LIVE_STREAM_CONFIG.bitrate}</span>
                    <span>&bull;</span>
                    <span>Latency: {LIVE_STREAM_CONFIG.latency}</span>
                  </div>
                  <div className="text-teal-300 font-semibold uppercase">
                    🏢 City of Elmina CCTV Network
                  </div>
                </div>

                {/* Real-Time AI Status Banner */}
                <div className="p-2 rounded bg-black/85 border border-white/15 text-xs text-white backdrop-blur-md">
                  {phase === "monitoring" && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-200 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Continuous Visual Feed · Normal Activity Telemetry
                      </span>
                      <span className="text-[10px] text-teal-300 font-medium hidden sm:inline">
                        AI Engine Ready
                      </span>
                    </div>
                  )}

                  {phase === "countdown" && (
                    <div className="flex items-center justify-between text-amber-300">
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        AI Threat Sweep Triggering in {Math.max(remaining, 0)}s…
                      </span>
                      <span className="text-[10px] text-amber-200">
                        Scanning frames for anomalies
                      </span>
                    </div>
                  )}

                  {phase === "analyzing" && (
                    <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                      Multimodal AI Model analyzing visual keyframes & threat posture…
                    </div>
                  )}

                  {phase === "detected" && (
                    <div className="flex items-center justify-between text-emerald-300">
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        AI Threat Detected! Alert Logged in Active Priority Queue.
                      </span>
                      <button
                        type="button"
                        onClick={() => setPhase("monitoring")}
                        className="pointer-events-auto px-2 py-0.5 rounded bg-emerald-950 text-emerald-200 border border-emerald-500 text-[10px] font-semibold hover:bg-emerald-900"
                      >
                        Reset Status
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-4 text-xs">
          {/* Active Feed Details */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                <Video className="w-3.5 h-3.5 text-teal-600" />
                Active CCTV Stream
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Connected
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900">
              {LIVE_STREAM_CONFIG.name}
            </div>
            <div className="text-[11px] text-slate-500 leading-snug">
              Direct RTSP/H.264 camera telemetry feed linked to township traffic monitoring infrastructure.
            </div>
          </div>

          {/* Source Camera Assignment */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Source Camera Mapping
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={phase === "countdown" || phase === "analyzing"}
              className="w-full h-9 rounded-md border border-slate-300 px-2.5 bg-white text-xs focus:ring-2 focus:ring-teal-500"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-Trigger Delay Seconds */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Auto-Trigger Sweep Delay (Seconds)
            </label>
            <input
              type="number"
              min={3}
              max={60}
              value={delaySeconds}
              disabled={phase === "countdown" || phase === "analyzing"}
              onChange={(e) => setDelaySeconds(Math.max(3, Math.min(60, Number(e.target.value) || 6)))}
              className="w-full h-9 rounded-md border border-slate-300 px-3 bg-white text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="space-y-2 pt-1">
            <Button
              id="instant-ai-sweep"
              variant="primary"
              className="w-full text-xs font-bold py-2 shadow-xs"
              onClick={executeAiAnalysisSweep}
              loading={phase === "analyzing"}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-teal-200" />
              Instant AI Threat Sweep
            </Button>

            {phase === "countdown" ? (
              <Button
                id="stop-sim-live"
                variant="outline"
                onClick={stopCountdown}
                className="w-full text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                <Square className="w-3.5 h-3.5 mr-1.5" /> Stop Countdown ({remaining}s)
              </Button>
            ) : (
              <Button
                id="start-sim-live"
                variant="secondary"
                onClick={startCountdown}
                disabled={phase === "analyzing"}
                className="w-full text-xs"
              >
                <Play className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                Start Auto-Trigger Sweep ({delaySeconds}s)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
