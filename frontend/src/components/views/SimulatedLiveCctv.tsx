import React, { useEffect, useRef, useState } from "react";
import { Camera } from "@/types";
import { Button } from "@/components/ui/Button";
import { Radio, Play, Square, FlaskConical, Loader2, CheckCircle } from "lucide-react";

interface SimulatedLiveCctvProps {
  cameras: Camera[];
  onUploadVideo: (file: File, cameraId?: string) => Promise<void>;
}

const FEEDS = [
  { id: "fall", label: "Pedestrian fall (prepared clip)", url: "/samples/sample_pedestrian_fall.mp4", file: "sim_live_pedestrian_fall.mp4" },
  { id: "collision", label: "Car collision (prepared clip)", url: "/samples/sample_car_collision.mp4", file: "sim_live_car_collision.mp4" },
];

type Phase = "idle" | "streaming" | "submitting" | "submitted";

/**
 * SIMULATED live CCTV. A prepared clip plays as if it were a camera feed; after a countdown the feed segment is
 * handed to the SAME analysis pipeline as an uploaded clip (Gemini / OpenCV), with no presenter action.
 * The alert is whatever the pipeline really detects. Nothing here is a real camera.
 */
export function SimulatedLiveCctv({ cameras, onUploadVideo }: SimulatedLiveCctvProps) {
  const [feedId, setFeedId] = useState(FEEDS[0].id);
  const [cameraId, setCameraId] = useState(cameras[0]?.id || "CAM-PARK-01");
  const [delay, setDelay] = useState(8);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const feed = FEEDS.find((f) => f.id === feedId) || FEEDS[0];
  const camName = cameras.find((c) => c.id === cameraId)?.name || cameraId;

  useEffect(() => {
    if (cameras.length > 0 && !cameras.some((c) => c.id === cameraId)) setCameraId(cameras[0].id);
  }, [cameras, cameraId]);

  useEffect(() => {
    const tick = () => setClock(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const submit = async () => {
    setPhase("submitting");
    try {
      const res = await fetch(feed.url);
      if (!res.ok) throw new Error(`Prepared clip not found (${res.status})`);
      const blob = await res.blob();
      await onUploadVideo(new File([blob], feed.file, { type: blob.type || "video/mp4" }), cameraId);
      setPhase("submitted");
    } catch (e: any) {
      setError(e?.message || "Could not submit the simulated feed segment");
      setPhase("idle");
    }
  };

  const start = () => {
    setError(null);
    setRemaining(delay);
    setPhase("streaming");
    if (timerRef.current) clearInterval(timerRef.current);
    let left = delay;
    timerRef.current = setInterval(() => {
      left -= 1;
      setRemaining(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        submit();
      }
    }, 1000);
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("idle");
  };

  const live = phase === "streaming" || phase === "submitting" || phase === "submitted";

  return (
    <div id="simulated-live-cctv" className="bg-white rounded-lg border border-amber-300 p-5 shadow-2xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-rose-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Simulated Live CCTV Monitoring</h4>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-900 uppercase tracking-wider">
          <FlaskConical className="w-3 h-3" /> Simulated — prepared clip, not a real camera
        </span>
      </div>

      <p className="text-[11px] text-slate-600 leading-relaxed">
        Starts a prepared clip as a camera feed. After the countdown the feed is analysed automatically by the same
        pipeline as an uploaded clip; an alert appears only if that analysis actually detects an incident.
        No file upload or click is needed at alert time.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative rounded-md overflow-hidden bg-slate-950 aspect-video border border-slate-800">
          {live ? (
            <>
              <video src={feed.url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> SIM LIVE · {cameraId}
              </div>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-200">
                {clock ? clock.toLocaleTimeString("en-GB", { timeZone: "Asia/Kuala_Lumpur" }) : "--:--:--"} MYT
              </div>
              <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-black/70 text-[11px] text-slate-100">
                {phase === "streaming" && <>AI sweep of this feed in <b>{Math.max(remaining, 0)}s</b> · {camName}</>}
                {phase === "submitting" && (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Feed segment sent to analysis pipeline…
                  </span>
                )}
                {phase === "submitted" && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle className="w-3 h-3" /> Segment submitted. Any detected incident will alert automatically.
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-500">
              Simulated feed offline
            </div>
          )}
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Prepared sequence</label>
            <select value={feedId} onChange={(e) => setFeedId(e.target.value)} disabled={phase !== "idle"}
              className="w-full h-9 rounded-md border border-slate-300 px-2 bg-white">
              {FEEDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Simulated camera</label>
            <select value={cameraId} onChange={(e) => setCameraId(e.target.value)} disabled={phase !== "idle"}
              className="w-full h-9 rounded-md border border-slate-300 px-2 bg-white">
              {cameras.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Auto-trigger after (seconds)</label>
            <input type="number" min={3} max={60} value={delay} disabled={phase !== "idle"}
              onChange={(e) => setDelay(Math.max(3, Math.min(60, Number(e.target.value) || 8)))}
              className="w-full h-9 rounded-md border border-slate-300 px-2 bg-white" />
          </div>
          {error && <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">{error}</div>}
          {phase === "idle" ? (
            <Button id="start-sim-live" onClick={start} className="w-full">
              <Play className="w-3.5 h-3.5 mr-1.5" /> Start simulated live feed
            </Button>
          ) : (
            <Button id="stop-sim-live" variant="outline" onClick={stop} className="w-full">
              <Square className="w-3.5 h-3.5 mr-1.5" /> Stop feed
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
