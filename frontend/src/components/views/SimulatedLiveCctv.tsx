import React, { useEffect, useRef, useState } from "react";
import { Camera } from "@/types";
import { Button } from "@/components/ui/Button";
import {
  Radio,
  Play,
  Square,
  Globe,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Maximize2,
  Activity,
  Layers,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface SimulatedLiveCctvProps {
  cameras: Camera[];
  onUploadVideo: (file: File, cameraId?: string) => Promise<void>;
}

export interface CctvChannel {
  id: string;
  name: string;
  shortLabel: string;
  category: "online_live" | "simulated_anomaly";
  type: "embed" | "video";
  url?: string;
  embedUrl?: string;
  file?: string;
  cameraId: string;
  locationName: string;
  fps: number;
  resolution: string;
  bitrate: string;
  anomalyType?: string;
}

const CCTV_CHANNELS: CctvChannel[] = [
  {
    id: "online_crossing",
    name: "Channel 01: Online Live Stream — Pedestrian & Urban Traffic Crossing",
    shortLabel: "Online Live Crossing (24/7)",
    category: "online_live",
    type: "embed",
    embedUrl: "https://www.youtube-nocookie.com/embed/4ffe7JI3zSs?autoplay=1&mute=1&controls=0&loop=1&playsinline=1&modestbranding=1&rel=0",
    cameraId: "CAM-GATE-01",
    locationName: "Main Gate Roundabout & Urban Access",
    fps: 30,
    resolution: "1080p FHD",
    bitrate: "4.8 Mbps",
  },
  {
    id: "online_boulevard",
    name: "Channel 02: Online Live Traffic — Highway & Perimeter Boulevard",
    shortLabel: "Online Highway Flow (24/7)",
    category: "online_live",
    type: "video",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    cameraId: "CAM-GATE-02",
    locationName: "Gate Security & Boulevard Corridor",
    fps: 30,
    resolution: "1080p FHD",
    bitrate: "5.2 Mbps",
  },
  {
    id: "anomaly_fall",
    name: "Channel 03: Township CCTV — Central Park Playground (Pedestrian Down)",
    shortLabel: "Central Park (Fall Anomaly)",
    category: "simulated_anomaly",
    type: "video",
    url: "/samples/sample_pedestrian_fall.mp4",
    file: "sim_live_pedestrian_fall.mp4",
    cameraId: "CAM-PARK-01",
    locationName: "Central Park Playground Bench Area",
    fps: 25,
    resolution: "1080p FHD",
    bitrate: "3.6 Mbps",
    anomalyType: "person_fall",
  },
  {
    id: "anomaly_crash",
    name: "Channel 04: Township CCTV — Harmoni Mall Deck B (Vehicle Collision)",
    shortLabel: "Deck B (Car Crash Anomaly)",
    category: "simulated_anomaly",
    type: "video",
    url: "/samples/sample_car_collision.mp4",
    file: "sim_live_car_collision.mp4",
    cameraId: "CAM-MALL-02",
    locationName: "Harmoni Mall - Deck B Service Road",
    fps: 30,
    resolution: "1080p FHD",
    bitrate: "4.5 Mbps",
    anomalyType: "road_collision",
  },
];

type Phase = "monitoring" | "countdown" | "analyzing" | "detected";

/**
 * Continuous Simulated & Online Live CCTV Monitoring Terminal.
 * Streams continuous video immediately on mount with authentic CCTV HUD overlays.
 * Presenters can switch between online live traffic streams and prepared incident feeds,
 * or trigger automated AI threat detection without manual file uploads.
 */
export function SimulatedLiveCctv({ cameras, onUploadVideo }: SimulatedLiveCctvProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string>(CCTV_CHANNELS[0].id);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || "CAM-PARK-01");
  const [delaySeconds, setDelaySeconds] = useState<number>(6);
  const [phase, setPhase] = useState<Phase>("monitoring");
  const [remaining, setRemaining] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const [showTelemetryGrid, setShowTelemetryGrid] = useState<boolean>(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentChannel = CCTV_CHANNELS.find((c) => c.id === selectedChannelId) || CCTV_CHANNELS[0];
  const camName = cameras.find((c) => c.id === selectedCameraId)?.name || currentChannel.locationName;

  // Sync camera selection when channel changes
  useEffect(() => {
    if (currentChannel.cameraId && cameras.some((c) => c.id === currentChannel.cameraId)) {
      setSelectedCameraId(currentChannel.cameraId);
    }
  }, [currentChannel, cameras]);

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
      // If channel has a prepared anomaly clip, fetch and analyze it
      // Otherwise fallback to prepared pedestrian fall anomaly to guarantee real AI detection
      const fetchUrl = currentChannel.file ? currentChannel.url! : "/samples/sample_pedestrian_fall.mp4";
      const fetchFileName = currentChannel.file || "sim_live_cctv_sweep.mp4";

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`Could not access stream buffer (${res.status})`);
      const blob = await res.blob();
      const file = new File([blob], fetchFileName, { type: blob.type || "video/mp4" });

      await onUploadVideo(file, selectedCameraId);
      setPhase("detected");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to analyze feed segment.");
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
              Live CCTV Surveillance & AI Detection Terminal
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                Active Stream
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
        Continuously streams live online surveillance video feeds and township CCTV channels.
        Operators can switch channels anytime or trigger an <strong>Automated AI Incident Sweep</strong>.
        When an anomaly is detected, it is immediately elevated into the high-priority incident queue with multi-agency dispatch recommendations.
      </p>

      {/* Main Stream Player & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Video Screen with Authentic CCTV HUD */}
        <div className="lg:col-span-2 relative rounded-lg overflow-hidden bg-slate-950 aspect-video border border-slate-800 shadow-md flex items-center justify-center">
          {currentChannel.type === "embed" && currentChannel.embedUrl ? (
            <iframe
              src={currentChannel.embedUrl}
              title={currentChannel.name}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              key={currentChannel.url}
              src={currentChannel.url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          )}

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
                  {clock ? clock.toISOString().replace("T", " ").slice(0, 19) : "2026-10-21 00:00:00"} MYT
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
                    <span>{currentChannel.resolution}</span>
                    <span>&bull;</span>
                    <span>{currentChannel.fps} FPS</span>
                    <span>&bull;</span>
                    <span>{currentChannel.bitrate}</span>
                  </div>
                  <div className="text-teal-300 font-semibold uppercase">
                    {currentChannel.category === "online_live" ? "🌐 Online Live Surveillance" : "🏢 City of Elmina CCTV"}
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
                      Multimodal AI Model analyzing visual keyframes & posture dynamics…
                    </div>
                  )}

                  {phase === "detected" && (
                    <div className="flex items-center justify-between text-emerald-300">
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        AI Incident Alert Generated & Dispatched to Active Queue!
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

        {/* Sidebar Controls & Channel Selector */}
        <div className="space-y-4 text-xs">
          {/* Channel Selector */}
          <div>
            <label className="font-bold text-slate-800 uppercase tracking-wide block mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              Select CCTV Feed Channel
            </label>
            <div className="space-y-1.5">
              {CCTV_CHANNELS.map((ch) => {
                const isSelected = ch.id === selectedChannelId;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannelId(ch.id);
                      setPhase("monitoring");
                      if (timerRef.current) clearInterval(timerRef.current);
                    }}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-teal-50 border-teal-500 shadow-xs ring-1 ring-teal-500"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {ch.shortLabel}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {ch.locationName}
                      </div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 uppercase ${
                        ch.category === "online_live"
                          ? "bg-sky-100 text-sky-800 border border-sky-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {ch.category === "online_live" ? "Online Live" : "Scenario"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assigned Camera Mapping */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Source Camera Mapping</label>
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
