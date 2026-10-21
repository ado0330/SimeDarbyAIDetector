import React, { useState, useRef, useEffect } from "react";
import {
  VideoJob,
  VideoCandidate,
  Camera,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { SimulatedLiveCctv } from "@/components/views/SimulatedLiveCctv";
import { Badge } from "@/components/ui/Badge";
import {
  formatDateTime,
  formatTimeAgo,
  formatCategory,
} from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Video,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Camera as CameraIcon,
  FileVideo,
  ShieldAlert,
  ArrowRight,
  Info,
  Loader2,
  Filter,
  Download,
  Sparkles,
} from "lucide-react";

export interface SampleClip {
  id: string;
  name: string;
  filename: string;
  url: string;
  size?: string;
}

export const SAMPLE_VIDEO_CLIPS: SampleClip[] = [
  {
    id: "sample-fallen-tree",
    name: "Fallen Tree",
    filename: "sample_fallen_tree.mp4",
    url: "/samples/sample_fallen_tree.mp4",
    size: "2.7 MB",
  },
  {
    id: "sample-wildlife-intrusion",
    name: "Wildlife Intrusion",
    filename: "sample_wildlife_intrusion.mp4",
    url: "/samples/sample_wildlife_intrusion.mp4",
    size: "1.8 MB",
  },
  {
    id: "sample-car-accident",
    name: "Car accident",
    filename: "sample_car_accident.mp4",
    url: "/samples/sample_car_accident.mp4",
    size: "5.4 MB",
  },
];

interface VideoAnalysisViewProps {
  videos: VideoJob[];
  candidates: VideoCandidate[];
  cameras: Camera[];
  onUploadVideo: (file: File, cameraId?: string) => Promise<void>;
  onReviewCandidate: (id: number, decision: "accept" | "reject", note?: string) => Promise<void>;
  onSelectIncident: (id: string) => void;
  onRefresh: () => void;
}

export function VideoAnalysisView({
  videos,
  candidates,
  cameras,
  onUploadVideo,
  onReviewCandidate,
  onSelectIncident,
  onRefresh,
}: VideoAnalysisViewProps) {
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || "CAM-PARK-01");
  const [isUploading, setIsUploading] = useState(false);
  const [analyzingClipId, setAnalyzingClipId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync selected camera when cameras load
  useEffect(() => {
    if (cameras.length > 0 && (!selectedCameraId || !cameras.some((c) => c.id === selectedCameraId))) {
      setSelectedCameraId(cameras[0].id);
    }
  }, [cameras, selectedCameraId]);

  // Direct one-click sample analysis
  const handleAnalyzeSample = async (clip: SampleClip) => {
    setAnalyzingClipId(clip.id);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const res = await fetch(clip.url);
      if (!res.ok) throw new Error(`Could not load ${clip.filename} (${res.status})`);
      const blob = await res.blob();
      const file = new File([blob], clip.filename, { type: blob.type || "video/mp4" });
      const effectiveCam = selectedCameraId || (cameras.length > 0 ? cameras[0].id : "CAM-PARK-01");
      await onUploadVideo(file, effectiveCam);
      setUploadSuccess(`Loaded and analyzed "${clip.name}" successfully.`);
    } catch (err: any) {
      setUploadError(err.message || `Failed to analyze ${clip.name}`);
    } finally {
      setAnalyzingClipId(null);
    }
  };

  // File selection handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const effectiveCam = selectedCameraId || (cameras.length > 0 ? cameras[0].id : "CAM-PARK-01");
      await onUploadVideo(file, effectiveCam);
      setUploadSuccess(`Uploaded "${file.name}" successfully. Frame extraction & CV analysis queued.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload video clip");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReview = async (id: number, decision: "accept" | "reject") => {
    setReviewingId(id);
    try {
      await onReviewCandidate(id, decision, decision === "accept" ? "Accepted by operator from candidate review stream" : "Rejected by operator as false alarm");
      onRefresh();
    } catch (err: any) {
      alert(`Error reviewing candidate: ${err.message}`);
    } finally {
      setReviewingId(null);
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    if (filterStatus === "pending") return c.status === "pending";
    if (filterStatus === "accepted") return c.status === "accepted";
    if (filterStatus === "rejected") return c.status === "rejected";
    return true;
  });

  const pendingCount = candidates.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* 1. Download Sample Videos */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-teal-700" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Download Sample Videos
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            {SAMPLE_VIDEO_CLIPS.length} Clips Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_VIDEO_CLIPS.map((clip) => (
            <div
              key={clip.id}
              className="p-3 rounded-lg bg-slate-50/80 border border-slate-200 flex flex-col justify-between gap-2.5 hover:bg-slate-100/70 transition-colors"
            >
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {clip.name}
                </span>
                {clip.size && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    {clip.size} &bull; MP4
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(analyzingClipId) || isUploading}
                  onClick={() => handleAnalyzeSample(clip)}
                  className="inline-flex items-center justify-center h-8 flex-1 px-2.5 rounded border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Load and analyze this sample with Multimodal AI"
                >
                  {analyzingClipId === clip.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600" />
                      Analyze
                    </>
                  )}
                </button>
                <a
                  href={clip.url}
                  download={clip.filename}
                  className="inline-flex items-center justify-center h-8 px-3 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SimulatedLiveCctv cameras={cameras} />

      {/* 2. Video Upload Section & Processing Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upload Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Upload className="w-4 h-4 text-teal-700" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Upload CCTV Footage Clip
            </h4>
          </div>

          {uploadError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Camera Assignment */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Assign Source Camera
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 px-3 text-xs bg-white focus:ring-2 focus:ring-teal-500"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropzone / Upload Button */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-teal-50/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/avi,video/quicktime,video/x-msvideo"
              onChange={handleFileChange}
              className="hidden"
            />
            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                <div className="text-xs font-semibold text-slate-800">Processing upload...</div>
                <div className="text-[11px] text-slate-500">Transmitting to vision worker</div>
              </div>
            ) : (
              <div className="space-y-2">
                <FileVideo className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-800">
                  Click to select CCTV video clip
                </div>
                <p className="text-[11px] text-slate-500">
                  MP4, AVI, MOV, WebM up to 150MB (max 300s duration)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Video Jobs History / Status */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Video className="w-4 h-4 text-teal-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Video Analysis Jobs ({videos.length})
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">Recent CCTV Ingests</span>
          </div>

          {videos.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 space-y-1">
              <FileVideo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-semibold text-slate-700">No CCTV clips processed yet</div>
              <p className="text-[11px] text-slate-400">
                Upload a video clip on the left to initiate frame extraction and pedestrian posture heuristics.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {videos.map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {job.original_filename}
                      </span>
                      <span
                        className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${job.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : job.status === "processing"
                              ? "bg-amber-100 text-amber-800 animate-pulse"
                              : job.status === "failed"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-200 text-slate-700"
                          }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Camera: {job.camera_id || "Unspecified"}</span>
                      <span>&bull;</span>
                      <span>{job.frames_analyzed} frames analyzed</span>
                      {job.duration_s != null && (
                        <>
                          <span>&bull;</span>
                          <span>{job.duration_s.toFixed(1)}s duration</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-bold ${
                        job.candidate_count === 0 ? "text-emerald-700" : "text-teal-800"
                      }`}
                    >
                      {job.candidate_count === 0
                        ? "Normal (0 Incidents)"
                        : `${job.candidate_count} ${job.candidate_count === 1 ? "candidate" : "candidates"}`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatTimeAgo(job.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Candidate Review Stream (Human-in-the-Loop) */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Extracted Event Candidates (Human Review Required)
              </h3>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                  {pendingCount} Pending
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Review posture-heuristic detections before they enter the active township incident queue.
            </p>
          </div>

          {/* Filter Status */}
          <div className="flex items-center space-x-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 px-2 text-xs rounded border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Candidates ({candidates.length})</option>
              <option value="pending">Pending Review Only</option>
              <option value="accepted">Accepted (Incidents Created)</option>
              <option value="rejected">Rejected (False Alarms)</option>
            </select>
          </div>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 space-y-1">
            <Info className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <div className="font-semibold text-slate-700">No candidates found</div>
            <p className="text-[11px] text-slate-400">
              {filterStatus === "pending"
                ? "All candidate detections have been reviewed."
                : "No candidates currently in this view."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCandidates.map((c) => {
              const isUrgent = c.urgent_review;
              const isReviewing = reviewingId === c.id;

              return (
                <div
                  key={c.id}
                  className={`p-4 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${c.status === "pending"
                      ? isUrgent
                        ? "bg-rose-50/40"
                        : "bg-white"
                      : "bg-slate-50/50"
                    }`}
                >
                  {/* Left: Frame thumbnail & Candidate details */}
                  <div className="flex items-start space-x-4 min-w-0 flex-1">
                    {/* Frame Snapshot */}
                    <div className="w-32 h-20 bg-slate-900 rounded border border-slate-300 overflow-hidden shrink-0 relative flex items-center justify-center">
                      {c.frame_url ? (
                        <img
                          src={c.frame_url}
                          alt="Candidate Evidence Frame"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-[10px] text-slate-400 text-center px-1">
                          Frame preview
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 text-white font-mono text-[9px] rounded">
                        {c.timestamp_s.toFixed(1)}s
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-900 text-white">
                          Candidate #{c.id}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.status === "pending"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : c.status === "accepted"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-200 text-slate-700 border border-slate-300"
                            }`}
                        >
                          {c.status.replace("_", " ")}
                        </span>

                        {isUrgent && (
                          <Badge variant="emergency" className="text-[10px]">
                            Urgent Review
                          </Badge>
                        )}

                        <span className="text-[11px] text-slate-500">
                          Clip: {c.source_clip || `Job ${c.video_job_id}`}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-900">
                        {formatCategory(c.category)} &bull; Confidence: {c.confidence != null ? `${(c.confidence * 100).toFixed(0)}%` : "Heuristic"}
                      </div>

                      <p className="text-xs text-slate-600 leading-snug">
                        {c.details?.explanation ||
                          "Persistent horizontal bounding box aspect ratio detected without translation."}
                      </p>

                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Extracted {formatTimeAgo(c.created_at)}</span>
                        {c.incident_id && (
                          <>
                            <span>&bull;</span>
                            <button
                              onClick={() => onSelectIncident(c.incident_id!)}
                              className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer underline flex items-center gap-1"
                            >
                              Linked Incident: {c.incident_id}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Review Actions */}
                  <div className="flex items-center space-x-2 shrink-0 pl-36 md:pl-0">
                    {c.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleReview(c.id, "accept")}
                          loading={isReviewing}
                          className="bg-emerald-700 hover:bg-emerald-800 text-xs h-8"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Accept & Prioritize
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(c.id, "reject")}
                          loading={isReviewing}
                          className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs h-8"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject (False Alarm)
                        </Button>
                      </>
                    ) : (
                      <div className="text-right text-xs text-slate-500">
                        <div>Reviewed by {c.reviewed_by || "Operator"}</div>
                        <div className="text-[10px] text-slate-400">
                          {c.reviewed_at ? formatDateTime(c.reviewed_at) : "Processed"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
