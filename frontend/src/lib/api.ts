import {
  Incident,
  IncidentDetail,
  ReferenceData,
  AnalyticsSummary,
  VideoJob,
  VideoCandidate,
  ScoringConfigData,
  PriorityLevel,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Name": "Demo Administrator",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.error?.message) {
        errorMsg = data.error.message;
      } else if (data.detail) {
        errorMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Platform & Configuration
  getHealth: () => fetchJson<{ status: string; database: string; mode: string; detector: any; server_time: string }>("/api/health"),
  getReference: () => fetchJson<ReferenceData>("/api/reference"),
  getConfig: () => fetchJson<ScoringConfigData>("/api/config"),

  // Incidents
  getIncidents: (params?: {
    status?: string;
    category?: string;
    priority?: string;
    source?: string;
    sort?: "queue" | "newest";
    q?: string;
    limit?: number;
  }) => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set("status", params.status);
    if (params?.category) qp.set("category", params.category);
    if (params?.priority) qp.set("priority", params.priority);
    if (params?.source) qp.set("source", params.source);
    if (params?.sort) qp.set("sort", params.sort);
    if (params?.q) qp.set("q", params.q);
    if (params?.limit) qp.set("limit", String(params.limit));
    const qs = qp.toString();
    return fetchJson<{ items: Incident[]; total: number }>(`/api/incidents${qs ? `?${qs}` : ""}`);
  },

  getIncident: (id: string) => fetchJson<IncidentDetail>(`/api/incidents/${id}`),

  createIncident: (body: any) =>
    fetchJson<{ incident: IncidentDetail; priority_changed: boolean; ranking_changed: boolean; message: string }>(
      "/api/incidents",
      { method: "POST", body: JSON.stringify(body) }
    ),

  acknowledge: (id: string, note?: string) =>
    fetchJson<{ incident: IncidentDetail; message: string }>(`/api/incidents/${id}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),

  assign: (id: string, responder_id: string, note?: string) =>
    fetchJson<{ incident: IncidentDetail; message: string }>(`/api/incidents/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ responder_id, note }),
    }),

  recordAction: (id: string, action_type: string, note: string) =>
    fetchJson<{ incident: IncidentDetail; message: string }>(`/api/incidents/${id}/actions`, {
      method: "POST",
      body: JSON.stringify({ action_type, note }),
    }),

  updateEvidence: (id: string, evidence: Record<string, any>, note?: string) =>
    fetchJson<{ incident: IncidentDetail; priority_changed: boolean; ranking_changed: boolean; message: string }>(
      `/api/incidents/${id}/evidence`,
      { method: "POST", body: JSON.stringify({ evidence, note }) }
    ),

  recalculate: (id: string, reason?: string) =>
    fetchJson<{ incident: IncidentDetail; priority_changed: boolean; ranking_changed: boolean; message: string }>(
      `/api/incidents/${id}/recalculate`,
      { method: "POST", body: JSON.stringify({ reason }) }
    ),

  overridePriority: (id: string, level: PriorityLevel | null, reason: string) =>
    fetchJson<{ incident: IncidentDetail; priority_changed: boolean; ranking_changed: boolean; message: string }>(
      `/api/incidents/${id}/override-priority`,
      { method: "POST", body: JSON.stringify({ level, reason }) }
    ),

  verify: (id: string, verification: "verified" | "false_positive", note?: string) =>
    fetchJson<{ incident: IncidentDetail; message: string }>(`/api/incidents/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ verification, note }),
    }),

  resolve: (id: string, resolution_type: "resolved" | "false_positive" = "resolved", note?: string) =>
    fetchJson<{ incident: IncidentDetail; message: string }>(`/api/incidents/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution_type, note }),
    }),

  reopen: (id: string, reason: string) =>
    fetchJson<{ incident: IncidentDetail; message: string }>(`/api/incidents/${id}/reopen`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // Analytics
  getAnalyticsSummary: (params?: { category?: string; priority?: string; status?: string }) => {
    const qp = new URLSearchParams();
    if (params?.category) qp.set("category", params.category);
    if (params?.priority) qp.set("priority", params.priority);
    if (params?.status) qp.set("status", params.status);
    const qs = qp.toString();
    return fetchJson<AnalyticsSummary>(`/api/analytics/summary${qs ? `?${qs}` : ""}`);
  },

  // Video Analysis
  getVideoStatus: () => fetchJson<{ detector: any; limits: any; supported_events: string[]; note: string }>("/api/video/status"),
  getVideos: () => fetchJson<VideoJob[]>("/api/videos"),
  getVideo: (id: string) => fetchJson<VideoJob>(`/api/videos/${id}`),
  deleteVideo: (id: string) => fetchJson<VideoJob>(`/api/videos/${id}`, { method: "DELETE" }),

  uploadVideo: async (file: File, cameraId?: string): Promise<VideoJob> => {
    const fd = new FormData();
    fd.append("file", file);
    if (cameraId) fd.append("camera_id", cameraId);

    const res = await fetch(`${BASE_URL}/api/videos`, {
      method: "POST",
      body: fd,
      headers: {
        "X-Admin-Name": "Demo Administrator",
      },
    });

    if (!res.ok) {
      let err = `Upload failed (${res.status})`;
      try {
        const d = await res.json();
        if (d.error?.message) err = d.error.message;
      } catch {}
      throw new Error(err);
    }

    return res.json();
  },

  getCandidates: (status?: string) => {
    const qs = status ? `?status=${status}` : "";
    return fetchJson<VideoCandidate[]>(`/api/candidates${qs}`);
  },

  reviewCandidate: (id: number, decision: "accept" | "reject", note?: string) =>
    fetchJson<{ candidate: VideoCandidate; mutation?: any }>(`/api/candidates/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ decision, note }),
    }),

  // Demo Controls
  triggerDemo: (scenario: "simultaneous" | "escalate" | "human_intervention" | "false_positive" | "low_confidence_fire") =>
    fetchJson<{ scenario: string; message: string; results: any[]; queue: any[]; simulated: boolean }>("/api/demo/trigger", {
      method: "POST",
      body: JSON.stringify({ scenario }),
    }),

  resetDemo: () => fetchJson<{ removed_simulated_incidents: number; seeded_history_incidents: number; message: string }>("/api/demo/reset", {
    method: "POST",
  }),

  // Server-Sent Events subscription for dynamic recalculation updates
  subscribeQueueEvents: (onEvent: (event: any) => void) => {
    if (typeof window === "undefined") return () => {};
    try {
      const es = new EventSource(`${BASE_URL}/api/stream`);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent(data);
        } catch {
          // heartbeat or unparseable
        }
      };
      return () => {
        es.close();
      };
    } catch {
      return () => {};
    }
  },
};
