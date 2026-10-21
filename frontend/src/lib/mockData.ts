import {
  Location,
  Camera,
  Responder,
  Incident,
  IncidentDetail,
  ScoringConfigData,
  AnalyticsSummary,
  VideoJob,
  VideoCandidate,
} from "@/types";

export const FALLBACK_LOCATIONS: Location[] = [
  {
    id: "LOC-GATE",
    name: "Main Gate Roundabout",
    zone: "Roads & Access",
    map_x: 14,
    map_y: 52,
    description: "Primary vehicle entrance and roundabout at Boulevard.",
  },
  {
    id: "LOC-PROM",
    name: "Lakeside Promenade",
    zone: "Public Realm",
    map_x: 60,
    map_y: 20,
    description: "Pedestrian promenade along the township central lake.",
  },
  {
    id: "LOC-MALL",
    name: "Harmoni Mall - Parking Deck B",
    zone: "Retail",
    map_x: 80,
    map_y: 60,
    description: "Multi-storey parking next to the retail precinct.",
  },
  {
    id: "LOC-RESA",
    name: "Residensi Aman - Block A",
    zone: "Residential",
    map_x: 38,
    map_y: 78,
    description: "Residential tower with emergency fire-access lane.",
  },
  {
    id: "LOC-PARK",
    name: "Central Park Playground",
    zone: "Public Realm",
    map_x: 46,
    map_y: 48,
    description: "Community park with playground, jogging track, and benches.",
  },
  {
    id: "LOC-SCH",
    name: "Sentosa School Drop-off",
    zone: "Education",
    map_x: 26,
    map_y: 22,
    description: "School pick-up and drop-off bay.",
  },
];

export const FALLBACK_CAMERAS: Camera[] = [
  { id: "CAM-GATE-01", name: "Gate Roundabout North Approach", location_id: "LOC-GATE", map_x: 17, map_y: 47, is_simulated: true },
  { id: "CAM-GATE-02", name: "Gate Security Booth", location_id: "LOC-GATE", map_x: 11, map_y: 57, is_simulated: true },
  { id: "CAM-PROM-01", name: "Promenade East Walkway", location_id: "LOC-PROM", map_x: 66, map_y: 17, is_simulated: true },
  { id: "CAM-PROM-02", name: "Promenade Lake Edge", location_id: "LOC-PROM", map_x: 56, map_y: 24, is_simulated: true },
  { id: "CAM-MALL-01", name: "Deck B Level 1 Entry", location_id: "LOC-MALL", map_x: 84, map_y: 56, is_simulated: true },
  { id: "CAM-MALL-02", name: "Deck B Service Road", location_id: "LOC-MALL", map_x: 76, map_y: 66, is_simulated: true },
  { id: "CAM-RESA-01", name: "Block A Lobby", location_id: "LOC-RESA", map_x: 34, map_y: 74, is_simulated: true },
  { id: "CAM-RESA-02", name: "Block A Fire Access Lane", location_id: "LOC-RESA", map_x: 43, map_y: 82, is_simulated: true },
  { id: "CAM-PARK-01", name: "Playground Bench Area", location_id: "LOC-PARK", map_x: 50, map_y: 52, is_simulated: true },
  { id: "CAM-SCH-01", name: "School Drop-off Bay", location_id: "LOC-SCH", map_x: 29, map_y: 26, is_simulated: true },
];

export const FALLBACK_RESPONDERS: Responder[] = [
  { id: "ambulance", name: "Ambulance & Paramedics", role: "Emergency medical & trauma response" },
  { id: "traffic-police", name: "Traffic Police & Enforcement", role: "Traffic control & accident investigation" },
  { id: "patrol-a", name: "Security Patrol Alpha", role: "Site security & perimeter patrol" },
  { id: "patrol-b", name: "Security Patrol Bravo", role: "Site security & rapid response" },
  { id: "fire-warden", name: "Fire & Rescue (Bomba)", role: "Firefighting & rescue operations" },
  { id: "first-aid", name: "On-site First-Aid Team", role: "First aid & triage" },
  { id: "traffic-marshal", name: "Traffic Marshal", role: "Traffic & access control" },
  { id: "facilities", name: "Township Facilities & Maintenance", role: "Infrastructure & hazard clearing" },
  { id: "parking-mgmt", name: "Parking Management", role: "Parking enforcement" },
];

export const FALLBACK_CONFIG: ScoringConfigData = {
  mode: "operational",
  scoring: {
    version: "2.0",
    disclaimer: "Dynamic multi-factor prioritization weights matrix.",
    weights: {
      severity: 0.4,
      immediacy: 0.25,
      people_at_risk: 0.2,
      secondary_hazard: 0.15,
    },
    thresholds: {
      critical: 80,
      high: 60,
      medium: 35,
    },
    low_confidence_threshold: 0.5,
    rank_hysteresis: 2.0,
    dedup_window_seconds: 300,
    baselines: {
      person_fall: { severity: 75, immediacy: 65, people_at_risk: 60, secondary_hazard: 30 },
      road_collision: { severity: 65, immediacy: 50, people_at_risk: 50, secondary_hazard: 55 },
      fire_smoke: { severity: 85, immediacy: 75, people_at_risk: 70, secondary_hazard: 80 },
      parking_obstruction: { severity: 20, immediacy: 15, people_at_risk: 10, secondary_hazard: 30 },
    },
    rules: [
      {
        id: "R-FALL-PERSISTENT",
        description: "Person motionless on ground for > 60s without bystanders near water edge",
        categories: ["person_fall"],
        floor: "critical",
        emergency: true,
        conditions: [{ field: "motionless_seconds", op: ">=", value: 60 }],
      },
      {
        id: "R-COLLISION-MULTI",
        description: "Multi-vehicle collision blocking active township traffic lane",
        categories: ["road_collision"],
        floor: "high",
        emergency: false,
        conditions: [{ field: "vehicles_involved", op: ">=", value: 2 }],
      },
      {
        id: "R-FIRE-CONFIRMED",
        description: "Confirmed fire or smoke plume near residential or school structure",
        categories: ["fire_smoke"],
        floor: "critical",
        emergency: true,
        conditions: [{ field: "structural_proximity_m", op: "<=", value: 10 }],
      },
    ],
  },
  video: {
    max_upload_mb: 150,
    max_video_seconds: 300,
    allowed_extensions: [".mp4", ".mov", ".avi", ".mkv", ".webm"],
    frame_sample_interval_seconds: 1.0,
    retention_hours: 24,
  },
};

export const FALLBACK_INCIDENTS: Incident[] = [];

export function createEmptyAnalytics(baseDate?: Date | string): AnalyticsSummary {
  const days: { date: string; count: number }[] = [];
  if (baseDate) {
    const now = typeof baseDate === "string" ? new Date(baseDate) : baseDate;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().slice(0, 10),
        count: 0,
      });
    }
  }
  return {
    mode: "operational",
    totals: {
      incidents: 0,
      active: 0,
      critical_active: 0,
      awaiting_acknowledgement: 0,
      in_progress: 0,
      resolved: 0,
      false_positive: 0,
      simulated: 0,
      from_video_analysis: 0,
      emergency_tier_active: 0,
      needing_verification_active: 0,
    },
    avg_acknowledgement_seconds: null,
    avg_resolution_seconds: null,
    acknowledgement_sample_size: 0,
    resolution_sample_size: 0,
    by_severity_active: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    by_severity_all: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    by_category: [],
    by_status: {
      new: 0,
      acknowledged: 0,
      in_progress: 0,
      resolved: 0,
      false_positive: 0,
    },
    per_day: days,
    top_incidents: [],
    recent_activity: [],
  };
}

export function computeDynamicAnalytics(incidents: Incident[], baseDate?: Date | string): AnalyticsSummary {
  const now = baseDate ? (typeof baseDate === "string" ? new Date(baseDate) : baseDate) : new Date();
  const dayMap = new Map<string, number>();
  const daysList: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    dayMap.set(dateStr, 0);
    daysList.push({ date: dateStr, count: 0 });
  }

  let activeCount = 0;
  let criticalActive = 0;
  let awaitingAck = 0;
  let inProgress = 0;
  let resolved = 0;
  let falsePositive = 0;
  let simulated = 0;
  let fromVideo = 0;
  let emergencyActive = 0;
  let needingVerificationActive = 0;

  const severityActive: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const severityAll: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const statusCounts: Record<string, number> = {
    new: 0,
    acknowledged: 0,
    in_progress: 0,
    resolved: 0,
    false_positive: 0,
  };
  const categoryMap = new Map<
    string,
    { label: string; count: number; critical: number; high: number; medium: number; low: number }
  >();

  let totalAckSeconds = 0;
  let ackCount = 0;
  let totalResSeconds = 0;
  let resCount = 0;

  for (const inc of incidents) {
    const incDate = (inc.detected_at || inc.created_at || "").slice(0, 10);
    if (dayMap.has(incDate)) {
      dayMap.set(incDate, (dayMap.get(incDate) || 0) + 1);
    }

    const isActive = !["resolved", "false_positive", "closed"].includes(inc.status);
    if (isActive) {
      activeCount++;
      severityActive[inc.priority_level] = (severityActive[inc.priority_level] || 0) + 1;
      if (inc.priority_level === "critical") criticalActive++;
      if (inc.emergency_rule_triggered) emergencyActive++;
      if (inc.needs_verification) needingVerificationActive++;
    }

    severityAll[inc.priority_level] = (severityAll[inc.priority_level] || 0) + 1;
    statusCounts[inc.status] = (statusCounts[inc.status] || 0) + 1;

    if (inc.status === "new") awaitingAck++;
    if (inc.status === "in_progress") inProgress++;
    if (inc.status === "resolved") resolved++;
    if (inc.status === "false_positive") falsePositive++;

    if (inc.is_simulated) {
      simulated++;
    } else {
      fromVideo++;
    }

    const catKey = inc.category || "other";
    const catLabel = inc.category_label || catKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, { label: catLabel, count: 0, critical: 0, high: 0, medium: 0, low: 0 });
    }
    const catEntry = categoryMap.get(catKey)!;
    catEntry.count++;
    if (inc.priority_level === "critical") catEntry.critical++;
    if (inc.priority_level === "high") catEntry.high++;
    if (inc.priority_level === "medium") catEntry.medium++;
    if (inc.priority_level === "low") catEntry.low++;

    if (inc.status !== "new" && inc.detected_at && inc.updated_at) {
      const diffS = Math.max(1, (new Date(inc.updated_at).getTime() - new Date(inc.detected_at).getTime()) / 1000);
      totalAckSeconds += Math.min(diffS, 600);
      ackCount++;
    }
    if (inc.status === "resolved" && inc.detected_at && inc.updated_at) {
      const diffS = Math.max(5, (new Date(inc.updated_at).getTime() - new Date(inc.detected_at).getTime()) / 1000);
      totalResSeconds += Math.min(diffS, 3600);
      resCount++;
    }
  }

  const perDay = daysList.map((d) => ({
    date: d.date,
    count: dayMap.get(d.date) || 0,
  }));

  const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    label: data.label,
    count: data.count,
    critical: data.critical,
    high: data.high,
    medium: data.medium,
    low: data.low,
  }));

  return {
    mode: "operational",
    totals: {
      incidents: incidents.length,
      active: activeCount,
      critical_active: criticalActive,
      awaiting_acknowledgement: awaitingAck,
      in_progress: inProgress,
      resolved,
      false_positive: falsePositive,
      simulated,
      from_video_analysis: fromVideo,
      emergency_tier_active: emergencyActive,
      needing_verification_active: needingVerificationActive,
    },
    avg_acknowledgement_seconds: ackCount > 0 ? totalAckSeconds / ackCount : null,
    avg_resolution_seconds: resCount > 0 ? totalResSeconds / resCount : null,
    acknowledgement_sample_size: ackCount,
    resolution_sample_size: resCount,
    by_severity_active: severityActive,
    by_severity_all: severityAll,
    by_category: byCategory,
    by_status: statusCounts,
    per_day: perDay,
    top_incidents: incidents.slice(0, 5).map((i) => ({
      id: i.id,
      title: i.title,
      priority_level: i.priority_level,
      priority_score: i.priority_score,
      status: i.status,
      emergency: i.emergency_rule_triggered,
      is_simulated: i.is_simulated,
    })),
    recent_activity: [],
  };
}

export const FALLBACK_ANALYTICS: AnalyticsSummary = createEmptyAnalytics();

export function createFallbackDetail(inc: Incident): IncidentDetail {
  return {
    ...inc,
    score_breakdown: {
      severity: inc.severity_score,
      immediacy: inc.immediacy_score,
      people_at_risk: inc.people_at_risk_score,
      secondary_hazard: inc.secondary_hazard_score,
      composite_score: inc.priority_score,
      score_level: inc.priority_level,
      level: inc.priority_level,
      emergency: inc.emergency_rule_triggered,
      factors: [
        {
          kind: "baseline",
          dimension: "severity",
          label: `${inc.category_label} Baseline Severity`,
          delta: inc.severity_score,
          composite_delta: inc.severity_score * 0.4,
        },
        {
          kind: "baseline",
          dimension: "immediacy",
          label: "Time Sensitivity Profile",
          delta: inc.immediacy_score,
          composite_delta: inc.immediacy_score * 0.25,
        },
        {
          kind: "baseline",
          dimension: "people_at_risk",
          label: "Exposed Population Risk",
          delta: inc.people_at_risk_score,
          composite_delta: inc.people_at_risk_score * 0.2,
        },
        {
          kind: "baseline",
          dimension: "secondary_hazard",
          label: "Environmental Vulnerability",
          delta: inc.secondary_hazard_score,
          composite_delta: inc.secondary_hazard_score * 0.15,
        },
      ],
      unknown_fields: [],
      needs_verification: inc.needs_verification,
      low_confidence: false,
      uncertainty: inc.uncertainty,
      uncertainty_reasons: [],
      config_version: "2.0",
    },
    triggered_rules: inc.emergency_rule_triggered
      ? [
          {
            id: "R-FALL-PERSISTENT",
            description: "Person motionless on ground for > 60s without bystanders",
            floor: "critical",
            emergency: true,
          },
        ]
      : [],
    recommendations: [
      {
        code: "REC-ACT-01",
        text: inc.recommended_action,
        rationale: "Automated advisory determined by incident category and spatial telemetry.",
        advisory: "High Priority — immediate dispatch recommended",
      },
    ],
    events: [
      {
        id: 1,
        event_type: "detected",
        message: `${inc.title} detected and prioritized with score ${inc.priority_score.toFixed(1)}`,
        data: { priority_score: inc.priority_score },
        actor: "System Vision AI",
        created_at: inc.detected_at,
      },
    ],
    assignments: inc.assigned_to
      ? [
          {
            id: 1,
            responder_id: inc.assigned_to,
            responder_name: inc.assigned_to_name,
            assigned_by: "Control Room Supervisor",
            assigned_at: inc.updated_at,
          },
        ]
      : [],
    evidence_items: [
      {
        id: 1,
        kind: "frame",
        video_url: inc.video_url || "/samples/sample_cctv_fall.mp4",
        timestamp_s: inc.metadata?.video_timestamp_s ?? 24.0,
        frame_url: inc.evidence?.thumbnail,
        description: `Visual evidence frame captured from ${inc.camera_name || "camera feed"}.`,
        created_at: inc.detected_at,
      },
    ],
    audit: [
      {
        id: 1,
        entity_type: "incident",
        entity_id: inc.id,
        action: "incident_created",
        actor: "GlobalEye Prioritization Engine",
        new_value: { priority_score: inc.priority_score, priority_level: inc.priority_level },
        is_simulated: inc.is_simulated,
        created_at: inc.created_at,
      },
    ],
    allowed_status_transitions: ["acknowledged", "in_progress", "resolved", "false_positive"],
  };
}

export const FALLBACK_VIDEOS: VideoJob[] = [];

export const FALLBACK_CANDIDATES: VideoCandidate[] = [];
