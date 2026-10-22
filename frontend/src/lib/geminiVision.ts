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
  duration_s?: number;
  title: string;
  summary: string;
  isEmergency: boolean;
  score: number;
  priorityLevel?: "low" | "medium" | "high" | "critical";
  evidenceScores?: {
    severity: number;
    immediacy: number;
    people_at_risk: number;
    secondary_hazard: number;
  };
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite?key=${encodeURIComponent(key.trim())}`
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

export interface ExtractedKeyframesData {
  keyframes: GeminiKeyframe[];
  duration: number;
}

/**
 * Extract chronological keyframes from a video file using HTML5 Video and Canvas.
 */
export function extractVideoKeyframes(
  file: File | string,
  maxFrames: number = 24
): Promise<ExtractedKeyframesData> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ keyframes: [], duration: 0 });
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
        resolve({
          keyframes: frames,
          duration: isFinite(duration) && duration > 0 ? parseFloat(duration.toFixed(1)) : 8.0,
        });
      };

      const timer = setTimeout(() => {
        cleanup();
      }, 18000);

      video.onloadedmetadata = () => {
        duration = video.duration || 10;
        if (!isFinite(duration) || duration <= 0) {
          duration = 10;
        }

        const count = Math.min(maxFrames, 24);
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
      resolve({ keyframes: [], duration: 0 });
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

  // Step 1: Extract keyframes and real duration from video (24 frames for high accuracy)
  const { keyframes, duration } = await extractVideoKeyframes(file, 24);

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
              duration_s: duration,
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

          // Real safety or security incident detected (follows deterministic formula):
          const priorityData = calculatePriorityByFormula(json.category, json.evidence);
          return {
            detected: true,
            category: json.category,
            categoryLabel: priorityData.label,
            confidence: Number(json.confidence) || 0.92,
            timestamp_s: Number(json.timestamp_s) || 2.0,
            duration_s: duration,
            title: json.title || `${priorityData.label} Detected`,
            summary: json.summary || `Multimodal CCTV scan detected ${priorityData.label}.`,
            isEmergency: priorityData.isEmergency,
            score: priorityData.score,
            priorityLevel: priorityData.level,
            evidenceScores: priorityData.scores,
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
  return buildAiUnavailableResult(cameraName, keyframes, reason, duration);
}

/**
 * AI-unavailable result. Returned when real video analysis could not be completed (no API key,
 * network/API failure, no extractable frames). It NEVER infers an incident from the filename or any
 * other non-visual signal: no category, no confidence, no incident is produced.
 */
export function buildAiUnavailableResult(
  cameraName: string,
  keyframes: GeminiKeyframe[],
  reason: string,
  duration?: number
): GeminiVisionResult {
  return {
    detected: false,
    category: null,
    categoryLabel: "AI Analysis Unavailable",
    confidence: 0,
    timestamp_s: 0,
    duration_s: duration || 0,
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

export function calculatePriorityByFormula(
  category: string,
  evidence: Record<string, any> = {}
): {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  isEmergency: boolean;
  label: string;
  scores: {
    severity: number;
    immediacy: number;
    people_at_risk: number;
    secondary_hazard: number;
  };
} {
  // 1. Baselines from Sime Darby Township Guardian Prioritization Engine
  const baselines: Record<
    string,
    { severity: number; immediacy: number; people_at_risk: number; secondary_hazard: number }
  > = {
    fire_smoke: { severity: 85, immediacy: 80, people_at_risk: 55, secondary_hazard: 80 },
    road_collision: { severity: 70, immediacy: 70, people_at_risk: 50, secondary_hazard: 45 },
    person_fall: { severity: 45, immediacy: 55, people_at_risk: 20, secondary_hazard: 10 },
    wildlife_intrusion: { severity: 65, immediacy: 75, people_at_risk: 60, secondary_hazard: 35 },
    fallen_tree_storm_damage: { severity: 60, immediacy: 65, people_at_risk: 35, secondary_hazard: 55 },
    parking_obstruction: { severity: 15, immediacy: 15, people_at_risk: 5, secondary_hazard: 20 },
    restricted_area_intrusion: { severity: 80, immediacy: 80, people_at_risk: 40, secondary_hazard: 70 },
    pipe_burst_leakage: { severity: 60, immediacy: 65, people_at_risk: 30, secondary_hazard: 60 },
    flash_flood: { severity: 75, immediacy: 80, people_at_risk: 65, secondary_hazard: 70 },
  };

  const base = baselines[category] || { severity: 50, immediacy: 50, people_at_risk: 30, secondary_hazard: 30 };
  let sev = base.severity;
  let imm = base.immediacy;
  let ppl = base.people_at_risk;
  let sec = base.secondary_hazard;

  let isEmergency = false;
  let floorLevel: "low" | "medium" | "high" | "critical" = "low";

  // 2. Dynamic Evidence Modifiers
  if (category === "person_fall") {
    const isUnconscious = Boolean(evidence.unconscious || evidence.person_unconscious);
    const motionlessSeconds = Number(evidence.motionless_seconds || evidence.person_motionless_seconds) || 0;

    if (isUnconscious) {
      sev += 40;
      imm += 35;
      ppl += 20;
      isEmergency = true;
      floorLevel = "high";
    }
    if (motionlessSeconds >= 60) {
      sev += 25;
      imm += 30;
      isEmergency = true;
      floorLevel = "high";
    } else if (motionlessSeconds >= 30) {
      sev += 10;
      imm += 15;
    } else if (motionlessSeconds >= 10) {
      sev += 5;
      imm += 5;
    }
    if (evidence.hazardous_location) {
      sev += 15;
      sec += 30;
    }
    if (evidence.fall_from_height) {
      sev += 20;
      floorLevel = "high";
      isEmergency = true;
    }
    if (evidence.person_attempting_to_stand) {
      sev -= 15;
      imm -= 15;
    }
    if (evidence.bystander_assisting) {
      imm -= 10;
    }
  } else if (category === "fire_smoke") {
    if (evidence.spreading) {
      sev += 10;
      imm += 10;
      ppl += 15;
      sec += 10;
      isEmergency = true;
      floorLevel = "critical";
    }
    if (evidence.people_in_vicinity) {
      ppl += 20;
      if (evidence.smoke_or_flame_visible !== false) {
        isEmergency = true;
        floorLevel = "critical";
      }
    }
    if (evidence.blocks_emergency_access) {
      sec += 10;
    }
  } else if (category === "road_collision") {
    if (evidence.person_motionless_after_impact || evidence.motionless_after_impact) {
      sev += 15;
      imm += 10;
      isEmergency = true;
      floorLevel = "critical";
    }
    const persons = Number(evidence.persons_involved) || 0;
    if (persons >= 3) {
      sev += 5;
      ppl += 25;
      isEmergency = true;
      floorLevel = "critical";
    } else if (persons >= 2) {
      ppl += 12;
    }
    if (Number(evidence.vehicles_involved) >= 2) {
      sev += 8;
    }
    if (evidence.blocks_emergency_access) {
      imm += 10;
      sec += 25;
    }
  } else if (category === "wildlife_intrusion") {
    if (evidence.aggressive_behavior) {
      sev += 15;
      imm += 15;
      ppl += 15;
    }
    if (evidence.proximity_to_pedestrians === "close" || evidence.proximity_to_pedestrians === "high") {
      ppl += 15;
    }
  } else if (category === "fallen_tree_storm_damage") {
    if (evidence.blocks_emergency_access) {
      imm += 10;
      sec += 25;
      floorLevel = "high";
    }
    if (evidence.power_lines_contacted) {
      sev += 20;
      sec += 30;
      floorLevel = "high";
    }
  } else if (category === "parking_obstruction") {
    if (evidence.blocks_emergency_access) {
      sev += 35;
      imm += 40;
      ppl += 20;
      sec += 40;
      floorLevel = "high";
    }
    if (evidence.blocks_traffic_lane) {
      imm += 15;
      sec += 15;
    }
  }

  // Clamping per dimension to [0, 100]
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  sev = clamp(sev);
  imm = clamp(imm);
  ppl = clamp(ppl);
  sec = clamp(sec);

  // Deterministic formula weights: 0.40 severity, 0.25 immediacy, 0.20 people_at_risk, 0.15 secondary_hazard
  const composite_score = parseFloat((0.40 * sev + 0.25 * imm + 0.20 * ppl + 0.15 * sec).toFixed(1));

  // Thresholds: critical: >= 80, high: >= 60, medium: >= 35, low: < 35
  let level: "low" | "medium" | "high" | "critical" = "low";
  if (composite_score >= 80) {
    level = "critical";
  } else if (composite_score >= 60) {
    level = "high";
  } else if (composite_score >= 35) {
    level = "medium";
  } else {
    level = "low";
  }

  // Emergency floor enforcement
  const rankOrder = { low: 1, medium: 2, high: 3, critical: 4 };
  if (rankOrder[floorLevel] > rankOrder[level]) {
    level = floorLevel;
  }

  let label = formatCategoryName(category);
  if (category === "person_fall" && (evidence.unconscious || evidence.person_unconscious)) {
    label = "Person Fall / Unconscious";
  }

  return {
    score: composite_score,
    level,
    isEmergency,
    label,
    scores: {
      severity: sev,
      immediacy: imm,
      people_at_risk: ppl,
      secondary_hazard: sec,
    },
  };
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
