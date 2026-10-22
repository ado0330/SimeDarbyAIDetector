import React, { useEffect, useRef, useState } from "react";
import { Camera } from "@/types";
import {
  Video,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
  Radio,
  CheckCircle2,
} from "lucide-react";

interface SimulatedLiveCctvProps {
  cameras: Camera[];
  onUploadVideo?: (file: File, cameraId?: string) => Promise<void>;
}

const LIVE_STREAM_CONFIG = {
  id: "live_cctv_01",
  name: "Township Surveillance Camera 01 — Simulated CCTV Stream",
  locationName: "Main Gate Roundabout & Urban Access Corridor",
  defaultCameraId: "CAM-GATE-01",
  videoUrl: "/samples/cctv_live_stream.mp4",
  resolution: "1280x720 HD",
  baseFps: 30,
};

/**
 * Continuous Simulated CCTV Surveillance Terminal.
 * Clearly labeled as simulated CCTV footage while providing authentic telemetry and controls.
 */
export function SimulatedLiveCctv({ cameras }: SimulatedLiveCctvProps) {
  const [selectedCameraId, setSelectedCameraId] = useState<string>(
    cameras.find((c) => c.id === LIVE_STREAM_CONFIG.defaultCameraId)?.id || cameras[0]?.id || "CAM-GATE-01"
  );
  const [clock, setClock] = useState<Date | null>(null);
  const [showTelemetryGrid, setShowTelemetryGrid] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // Realistic dynamic telemetry values to avoid fixed static text
  const [telemetry, setTelemetry] = useState({
    bitrate: "3.8 Mbps",
    latency: "24ms",
    fps: 30,
  });

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId);
  const camName = selectedCamera?.name || LIVE_STREAM_CONFIG.locationName;

  // Real-time CCTV digital clock & dynamic simulated telemetry jitter
  useEffect(() => {
    const tick = () => {
      setClock(new Date());
      // Natural telemetry variations (3.7 - 3.9 Mbps, 22 - 26ms latency)
      const randomBitrate = (3.7 + Math.random() * 0.25).toFixed(1);
      const randomLatency = Math.floor(22 + Math.random() * 5);
      setTelemetry({
        bitrate: `${randomBitrate} Mbps`,
        latency: `${randomLatency}ms`,
        fps: 30,
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div id="simulated-live-cctv" className="bg-white rounded-lg border border-teal-300 p-5 shadow-2xs space-y-4">
      {/* Header & Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
          </span>
          <div>
            <h4 className="text-[15px] font-semibold text-slate-900 tracking-normal flex items-center gap-2">
              CCTV Monitoring Stream (Simulated Loop)
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Simulated Feed
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowTelemetryGrid((prev) => !prev)}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
              showTelemetryGrid
                ? "bg-slate-900 text-teal-400 border-slate-800"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <Layers className="w-3 h-3" />
            {showTelemetryGrid ? "HUD Overlay: On" : "HUD Overlay: Off"}
          </button>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-xs font-bold text-teal-900 tracking-normal">
            <Activity className="w-3 h-3 text-teal-600" /> Continuous Simulation Playback
          </span>
        </div>
      </div>

      <p className="text-[13px] text-slate-600 leading-relaxed">
        Simulated surveillance playback feed demonstrating real-time camera tracking and telemetry for City of Elmina township CCTV camera nodes. Operators can evaluate simulated live telemetry and automated visual monitoring.
      </p>

      {/* Main Stream Player & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Video Screen with Authentic CCTV HUD */}
        <div
          ref={playerContainerRef}
          className="lg:col-span-2 relative rounded-lg overflow-hidden bg-slate-950 aspect-video border border-slate-800 shadow-md flex items-center justify-center group"
        >
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
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 bg-gradient-to-t from-black/60 via-transparent to-black/60 tabular-nums">
              {/* Top Bar: Camera Info & Real-Time Clock */}
              <div className="flex items-center justify-between gap-2 text-xs text-white">
                <div className="min-w-0 flex items-center space-x-2 bg-black/75 px-2.5 py-1 rounded border border-white/10 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-bold tracking-normal text-[11px] whitespace-nowrap text-amber-300">SIM ● PLAYBACK</span>
                  <span className="text-white/40">|</span>
                  <span className="text-teal-300 text-[11px] font-semibold whitespace-nowrap">{selectedCameraId}</span>
                  <span className="text-white/40">|</span>
                  <span className="text-slate-300 text-[11px] leading-tight hidden sm:inline">{camName}</span>
                </div>

                <div className="bg-black/75 px-2.5 py-1 rounded border border-white/10 text-[11px] whitespace-nowrap shrink-0 text-emerald-400 font-semibold backdrop-blur-xs">
                  {clock ? clock.toISOString().replace("T", " ").slice(0, 19) : "2026-10-22 00:00:00"} MYT
                </div>
              </div>

              {/* Crosshair target & Optical Grid */}
              <div className="self-center flex items-center justify-center pointer-events-none opacity-40">
                <div className="w-16 h-16 border border-white/30 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-teal-400 rounded-full" />
                </div>
              </div>

              {/* Bottom Bar: Stream Specs & Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300 bg-black/75 px-2.5 py-1 rounded border border-white/10 backdrop-blur-xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span>{LIVE_STREAM_CONFIG.resolution}</span>
                    <span>&bull;</span>
                    <span>{telemetry.fps} FPS</span>
                    <span>&bull;</span>
                    <span>{telemetry.bitrate}</span>
                    <span>&bull;</span>
                    <span>Latency: ~{telemetry.latency}</span>
                    <span>&bull;</span>
                    <span className="text-amber-300/90 font-medium">Simulated Loop</span>
                  </div>
                  <div className="text-teal-300 font-semibold hidden md:inline">
                    🏢 City of Elmina CCTV Network (Simulated)
                  </div>
                </div>

                {/* Real-Time Live Status Banner */}
                <div className="p-2 rounded bg-black/85 border border-white/15 text-xs text-white backdrop-blur-md flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-200 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    Simulated Visual Tracking · Dynamic Camera Telemetry
                  </span>
                  <span className="text-xs text-teal-300 font-medium hidden sm:inline">
                    Simulated Node Connected · Signal Nominal
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Button in corner */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute bottom-3 right-3 p-1.5 rounded bg-black/70 hover:bg-black/90 text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Controls & Telemetry Details */}
        <div className="space-y-4 text-xs">
          {/* Active Feed Details */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 tracking-normal flex items-center gap-1.5 text-xs">
                <Video className="w-3.5 h-3.5 text-teal-600" />
                Simulated CCTV Stream
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                Simulation Active
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900">
              {LIVE_STREAM_CONFIG.name}
            </div>
            <div className="text-xs text-slate-500 leading-snug">
              Simulated H.264 camera loop demonstrating township traffic and pedestrian monitoring telemetry.
            </div>
          </div>

          {/* Source Camera Switcher */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              Source Camera Mapping (Simulated)
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 px-2.5 bg-white text-xs focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Node Telemetry Specs */}
          <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-700 tracking-normal text-xs block">
              Simulated Node Telemetry
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-xs">Location</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {selectedCamera?.name || camName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Signal Health</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 99.8% Nominal (Simulated)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Stream Resolution</span>
                <span className="tabular-nums text-slate-700">{LIVE_STREAM_CONFIG.resolution}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Framerate & Bitrate</span>
                <span className="tabular-nums text-slate-700">{telemetry.fps} FPS &bull; {telemetry.bitrate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
