/**
 * Google Gemini Multimodal Vision Video Analysis Engine for Frontend & Edge.
 *
 * Extracts chronological keyframes from uploaded video clips in the browser
 * and sends them to the secure serverless vision API (/api/vision) powered by
 * Google's Gemini Vision (gemini-1.5-flash / gemini-2.0-flash) to detect township safety hazards:
 * - Fire & Smoke (fire_smoke)
 * - Wildlife Intrusion (wildlife_intrusion: monkeys, snakes, wild boars, monitor lizards)
 * - Restricted Area / Rooftop Intrusion (restricted_area_intrusion: rooftop edges, height hazards, electrical substations)
 * - Person Fall (person_fall)
 * - Road Collision (road_collision)
 * - Parking Obstruction (parking_obstruction)
 */

export interface GeminiKeyframe {
  timestamp: number;
  dataUrl: string;
  base64: string;
}

export interface GeminiVisionResult {
  detected: boolean;
  category: string | null;
  categoryLabel: string;
  confidence: number;
  timestamp_s: number;
  title: string;
  summary: string;
  isEmergency: boolean;
  score: number;
  modelUsed: string;
  isGeminiAi: boolean;
  /** True when no real visual analysis happened. Never treat as normal-activity verification. */
  aiUnavailable?: boolean;
  unavailableReason?: string;
  keyframes: GeminiKeyframe[];
  evidence: Record<string, any>;
  errorMessage?: string;
}

const STORAGE_KEY = "sime_darby_gemini_key";

/**
 * Retrieve saved Gemini API key if present in local storage or environment variables.
 */
export function getStoredGeminiApiKey(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
}

/**
 * Persist Gemini API key to local storage.
 */
export function storeGeminiApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key || key.trim() === "") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, key.trim());
    }
  }
}

/**
 * Test if a given Gemini API key is valid by querying the Google models endpoint.
 */
export async function testGeminiApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  if (!key || key.trim() === "") {
    return { valid: false, error: "API key is empty." };
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash?key=${encodeURIComponent(key.trim())}`
    );
    if (res.ok) {
      return { valid: true };
    }
    const errData = await res.json().catch(() => ({}));
    return {
      valid: false,
      error: errData?.error?.message || `HTTP ${res.status}: Failed to authenticate with Gemini API`,
    };
  } catch (err: any) {
    return { valid: false, error: err.message || "Network error reaching Google Gemini API" };
  }
}

/**
 * Extract chronological keyframes from a video file using HTML5 Video and Canvas.
 */
export function extractVideoKeyframes(
  file: File | string,
  maxFrames: number = 6
): Promise<GeminiKeyframe[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    try {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.preload = "auto";

      const url = typeof file === "string" ? file : URL.createObjectURL(file);
      video.src = url;

      const frames: GeminiKeyframe[] = [];
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 270;

      let duration = 0;
      let targetTimes: number[] = [];
      let currentIndex = 0;

      const cleanup = () => {
        if (typeof file !== "string") {
          try {
            URL.revokeObjectURL(url);
          } catch {
            // ignore cleanup errors
          }
        }
        resolve(frames);
      };

      const timer = setTimeout(() => {
        cleanup();
      }, 9000);

      video.onloadedmetadata = () => {
        duration = video.duration || 10;
        if (!isFinite(duration) || duration <= 0) {
          duration = 10;
        }

        const count = Math.min(maxFrames, 6);
        const interval = duration / (count + 1);
        targetTimes = [];
        for (let i = 1; i <= count; i++) {
          targetTimes.push(parseFloat((i * interval).toFixed(2)));
        }

        currentIndex = 0;
        video.currentTime = targetTimes[0] || 1;
      };

      video.onseeked = () => {
        try {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
            const base64 = dataUrl.split(",")[1] || "";
            frames.push({
              timestamp: targetTimes[currentIndex] || 0,
              dataUrl,
              base64,
            });
          }
        } catch {
          // ignore canvas capture issue
        }

        currentIndex++;
        if (currentIndex < targetTimes.length) {
          video.currentTime = targetTimes[currentIndex];
        } else {
          clearTimeout(timer);
          cleanup();
        }
      };

      video.onerror = () => {
        clearTimeout(timer);
        cleanup();
      };
    } catch {
      resolve([]);
    }
  });
}

/**
 * Analyze an uploaded video clip.
 * 1. Queries the server-side /api/vision route (which reads GEMINI_API_KEY from Vercel environment variables).
 * 2. If the API key is not present or the endpoint fails, returns an explicit "AI unavailable" result
 *    (no filename-based guessing).
 */
export async function analyzeVideoWithGemini(
  file: File,
  cameraName: string = "Elmina Central Park Trail #1",
  customKey?: string
): Promise<GeminiVisionResult> {
  const apiKey = (customKey || getStoredGeminiApiKey()).trim();

  // Step 1: Extract keyframes from video
  const keyframes = await extractVideoKeyframes(file, 6);

  // Step 2: Query serverless vision endpoint
  if (keyframes.length > 0) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) {
        headers["x-gemini-api-key"] = apiKey;
      }

      const res = await fetch("/api/vision", {
        method: "POST",
        headers,
        body: JSON.stringify({
          cameraName,
          frames: keyframes.map((k) => ({ timestamp: k.timestamp, base64: k.base64 })),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          // If Gemini reported NO incident (normal routine activity verified):
          if (
            !json.detected ||
            !json.category ||
            json.category === "null" ||
            json.category === "none" ||
            json.category === "normal" ||
            json.category === "normal_activity"
          ) {
            return {
              detected: false,
              category: null,
              categoryLabel: "Normal Activity (No Incident)",
              confidence: Number(json.confidence) || 0.95,
              timestamp_s: Number(json.timestamp_s) || 0.0,
              title: json.title || `Normal Activity Verified — ${cameraName}`,
              summary:
                json.summary ||
                `Multimodal CCTV scan verified normal township activity on ${cameraName}. No safety hazards or incidents observed.`,
              isEmergency: false,
              score: 0,
              modelUsed: json.modelUsed || "gemini-3.5-flash-lite",
              isGeminiAi: true,
              keyframes,
              evidence: json.evidence || { status: "normal_routine", hazard_level: "none" },
            };
          }

          // Real safety or security incident detected:
          const { score, isEmergency, label } = getCategoryScoring(json.category);
          return {
            detected: true,
            category: json.category,
            categoryLabel: label,
            confidence: Number(json.confidence) || 0.92,
            timestamp_s: Number(json.timestamp_s) || 2.0,
            title: json.title || `${label} Detected`,
            summary: json.summary || `Multimodal CCTV scan detected ${label}.`,
            isEmergency,
            score,
            modelUsed: json.modelUsed || "gemini-3.5-flash-lite",
            isGeminiAi: true,
            keyframes,
            evidence: json.evidence || {},
          };
        }
      }
    } catch (serverErr) {
      console.warn("Server-side Gemini Vision route unavailable, falling back to heuristics:", serverErr);
    }
  }

  // Step 3: Direct browser fallback heuristics
  const reason =
    keyframes.length === 0
      ? "Frames could not be extracted from this clip in the browser."
      : "The Gemini vision service is unreachable or not configured. No incident was created; review the clip manually.";
  return buildAiUnavailableResult(cameraName, keyframes, reason);
}

/**
 * AI-unavailable result. Returned when real video analysis could not be completed (no API key,
 * network/API failure, no extractable frames). It NEVER infers an incident from the filename or any
 * other non-visual signal: no category, no confidence, no incident is produced.
 */
export function buildAiUnavailableResult(
  cameraName: string,
  keyframes: GeminiKeyframe[],
  reason: string
): GeminiVisionResult {
  return {
    detected: false,
    category: null,
    categoryLabel: "AI Analysis Unavailable",
    confidence: 0,
    timestamp_s: 0,
    title: `AI analysis unavailable — ${cameraName}`,
    summary: `No visual analysis was performed. ${reason}`,
    isEmergency: false,
    score: 0,
    modelUsed: "none",
    isGeminiAi: false,
    aiUnavailable: true,
    unavailableReason: reason,
    keyframes,
    evidence: {},
  };
}

/**
 * Sanitizes and normalizes evidence parameters for an incident.
 * Filters out internal software/technical keys (model_used, is_gemini, video_job_id, filename)
 * Does NOT fabricate missing values.
 */
export function sanitizeIncidentEvidence(
  category: string,
  rawEvidence: Record<string, any> = {}
): Record<string, any> {
  const TECHNICAL_KEYS = new Set([
    "video_job_id",
    "file_name",
    "filename",
    "thumbnail",
    "model_used",
    "is_gemini",
    "ai_model",
    "model",
    "is_gemini_ai",
    "detector_id",
    "source",
    "analyzed_frames",
    "raw_response",
    "status",
    "evidence_frame",
    "notes",
  ]);

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawEvidence)) {
    if (!TECHNICAL_KEYS.has(k.toLowerCase()) && v !== null && v !== undefined && typeof v !== "object") {
      clean[k] = v;
    }
  }

  // Only evidence actually reported by the analysis is kept. Missing parameters stay unknown
  // (the prioritization engine treats unknown as uncertainty); we never invent observations.
  return clean;
}

function getCategoryScoring(category: string): {
  score: number;
  isEmergency: boolean;
  label: string;
} {
  switch (category) {
    case "fire_smoke":
      return { score: 96.5, isEmergency: true, label: "Suspected Fire / Smoke" };
    case "restricted_area_intrusion":
      return { score: 94.0, isEmergency: true, label: "Restricted Danger Zone (Rooftop / Height)" };
    case "person_fall":
      return { score: 91.5, isEmergency: true, label: "Person Fall / Motionless" };
    case "wildlife_intrusion":
      return { score: 88.0, isEmergency: true, label: "Wildlife Intrusion (Wild Animal)" };
    case "road_collision":
      return { score: 84.0, isEmergency: false, label: "Road Collision / Vehicle Crash" };
    case "fallen_tree_storm_damage":
      return { score: 79.0, isEmergency: false, label: "Fallen Tree / Severe Storm Obstruction" };
    case "parking_obstruction":
      return { score: 42.0, isEmergency: false, label: "Emergency Access Obstruction" };
    default:
      return { score: 85.0, isEmergency: true, label: formatCategoryName(category) };
  }
}

export function formatCategoryName(cat: string): string {
  const map: Record<string, string> = {
    fire_smoke: "Suspected Fire / Smoke",
    wildlife_intrusion: "Wildlife Intrusion",
    restricted_area_intrusion: "Restricted / Rooftop Danger Zone",
    person_fall: "Person Fall / Down",
    road_collision: "Road Collision",
    fallen_tree_storm_damage: "Fallen Tree & Storm Damage",
    parking_obstruction: "Parking Obstruction",
  };
  return map[cat] || cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
