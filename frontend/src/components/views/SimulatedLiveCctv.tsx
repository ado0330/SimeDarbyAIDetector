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
  name: "Township Surveillance Camera 01 — Live CCTV Stream",
  locationName: "Main Gate Roundabout & Urban Access Corridor",
  defaultCameraId: "CAM-GATE-01",
  videoUrl: "/samples/cctv_live_stream.mp4",
  resolution: "1280x720 HD",
  fps: 30,
  bitrate: "3.8 Mbps",
  latency: "24ms",
};

/**
 * Continuous Live CCTV Surveillance Terminal.
 * Displays real-time camera tracking and telemetry from City of Elmina's camera network.
 */
export function SimulatedLiveCctv({ cameras }: SimulatedLiveCctvProps) {
  const [selectedCameraId, setSelectedCameraId] = useState<string>(
    cameras.find((c) => c.id === LIVE_STREAM_CONFIG.defaultCameraId)?.id || cameras[0]?.id || "CAM-GATE-01"
  );
  const [clock, setClock] = useState<Date | null>(null);
  const [showTelemetryGrid, setShowTelemetryGrid] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId);
  const camName = selectedCamera?.name || LIVE_STREAM_CONFIG.locationName;

  // Real-time CCTV digital clock (MYT / Asia/Kuala_Lumpur)
  useEffect(() => {
    const tick = () => setClock(new Date());
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
        Continuous live surveillance telemetry feed linked directly to City of Elmina township CCTV camera nodes.
        Operators can monitor real-time visual feeds and track live camera positions.
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

              {/* Bottom Bar: Stream Specs & Status */}
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

                {/* Real-Time Live Status Banner */}
                <div className="p-2 rounded bg-black/85 border border-white/15 text-xs text-white backdrop-blur-md flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-200 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Continuous Visual Tracking · Online Stream Telemetry
                  </span>
                  <span className="text-[10px] text-emerald-300 font-medium hidden sm:inline">
                    Node Connected · 100% Signal
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

          {/* Source Camera Switcher */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              Source Camera Mapping
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
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
              Node Telemetry
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Location</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {selectedCamera?.name || camName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Signal Health</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 99.8% (Optimal)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Stream Resolution</span>
                <span className="font-mono text-slate-700">{LIVE_STREAM_CONFIG.resolution}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Framerate</span>
                <span className="font-mono text-slate-700">{LIVE_STREAM_CONFIG.fps} FPS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
