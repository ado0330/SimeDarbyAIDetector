export type PriorityLevel = "critical" | "high" | "medium" | "low";
export type IncidentCategory = "road_collision" | "person_fall" | "parking_obstruction" | "fire_smoke";
export type IncidentStatus = "new" | "acknowledged" | "in_progress" | "resolved" | "false_positive" | "closed";
export type SourceType = "simulation" | "video_upload";
export type VerificationStatus = "unverified" | "verified" | "false_positive";

export interface ScoreFactor {
  kind: "baseline" | "evidence" | "unknown";
  dimension: "severity" | "immediacy" | "people_at_risk" | "secondary_hazard";
  label: string;
  delta: number;
  composite_delta: number;
}

export interface ScoreBreakdown {
  severity: number;
  immediacy: number;
  people_at_risk: number;
  secondary_hazard: number;
  composite_score: number;
  baseline_composite?: number;
  score_level: PriorityLevel;
  level: PriorityLevel;
  emergency: boolean;
  factors: ScoreFactor[];
  unknown_fields: string[];
  needs_verification: boolean;
  low_confidence: boolean;
  uncertainty: "low" | "medium" | "high";
  uncertainty_reasons: string[];
  config_version: string;
}

export interface Recommendation {
  code: string;
  text: string;
  rationale: string;
  advisory: string;
}

export interface IncidentEvent {
  id: number;
  event_type: string;
  message: string;
  data: Record<string, any>;
  actor: string;
  created_at: string;
}

export interface IncidentAssignment {
  id: number;
  responder_id: string;
  responder_name?: string;
  assigned_by: string;
  note?: string;
  assigned_at: string;
  unassigned_at?: string;
}

export interface EvidenceItem {
  id: number;
  kind: "frame" | "note";
  reference?: string;
  frame_url?: string;
  video_job_id?: string;
  timestamp_s?: number;
  bbox?: { x: number; y: number; w: number; h: number };
  description: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  reason?: string;
  is_simulated: boolean;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  category: IncidentCategory;
  category_label: string;
  description: string;
  location_id?: string;
  location_name?: string;
  camera_id?: string;
  camera_name?: string;
  source_type: SourceType;
  source_reference?: string;
  event_timestamp?: string;
  detected_at: string;
  last_detected_at: string;
  created_at: string;
  updated_at: string;
  status: IncidentStatus;
  severity_score: number;
  immediacy_score: number;
  people_at_risk_score: number;
  secondary_hazard_score: number;
  priority_score: number;
  rank_score: number;
  priority_level: PriorityLevel;
  computed_priority_level: PriorityLevel;
  emergency_rule_triggered: boolean;
  priority_overridden: boolean;
  override_reason?: string;
  detection_confidence?: number;
  verification_status: VerificationStatus;
  needs_verification: boolean;
  uncertainty: "low" | "medium" | "high";
  priority_explanation: string;
  recommended_action: string;
  assigned_to?: string;
  assigned_to_name?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  closed_at?: string;
  resolution_type?: "resolved" | "false_positive";
  resolution_note?: string;
  is_simulated: boolean;
  detection_count: number;
  evidence: Record<string, any>;
  metadata: Record<string, any>;
  seconds_since_detection: number;
  queue_position?: number;
}

export interface IncidentDetail extends Incident {
  score_breakdown: ScoreBreakdown;
  triggered_rules: Array<{ id: string; description: string; floor: string; emergency: boolean }>;
  recommendations: Recommendation[];
  events: IncidentEvent[];
  assignments: IncidentAssignment[];
  evidence_items: EvidenceItem[];
  audit: AuditLog[];
  allowed_status_transitions: IncidentStatus[];
}

export interface Location {
  id: string;
  name: string;
  zone: string;
  description: string;
  map_x: number;
  map_y: number;
}

export interface Camera {
  id: string;
  name: string;
  location_id: string;
  map_x: number;
  map_y: number;
  is_simulated: boolean;
}

export interface Responder {
  id: string;
  name: string;
  role: string;
}

export interface ReferenceData {
  locations: Location[];
  cameras: Camera[];
  responders: Responder[];
  categories: Array<{ id: string; label: string }>;
  display_timezone: string;
}

export interface AnalyticsSummary {
  mode: string;
  totals: {
    incidents: number;
    active: number;
    critical_active: number;
    awaiting_acknowledgement: number;
    in_progress: number;
    resolved: number;
    false_positive: number;
    simulated: number;
    from_video_analysis: number;
    emergency_tier_active: number;
    needing_verification_active: number;
  };
  avg_acknowledgement_seconds?: number;
  avg_resolution_seconds?: number;
  acknowledgement_sample_size: number;
  resolution_sample_size: number;
  by_severity_active: Record<PriorityLevel, number>;
  by_severity_all: Record<PriorityLevel, number>;
  by_category: Array<{
    category: string;
    label: string;
    count: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  by_status: Record<string, number>;
  per_day: Array<{ date: string; count: number }>;
  top_incidents: Array<{
    id: string;
    title: string;
    priority_level: PriorityLevel;
    priority_score: number;
    status: IncidentStatus;
    emergency: boolean;
    is_simulated: boolean;
  }>;
  recent_activity: Array<{
    id: number;
    incident_id: string;
    incident_title?: string;
    event_type: string;
    message: string;
    actor: string;
    created_at: string;
  }>;
}

export interface VideoCandidate {
  id: number;
  video_job_id: string;
  category: string;
  timestamp_s: number;
  end_timestamp_s?: number;
  confidence?: number;
  bbox?: { x: number; y: number; w: number; h: number };
  evidence: Record<string, any>;
  details: Record<string, any>;
  frame_url?: string;
  model_id: string;
  model_version: string;
  preview: ScoreBreakdown & { explanation: string };
  status: "pending" | "accepted" | "rejected";
  incident_id?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
  created_at: string;
  source: string;
  source_clip?: string;
  urgent_review: boolean;
}

export interface VideoJob {
  id: string;
  original_filename: string;
  size_bytes: number;
  camera_id?: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  duration_s?: number;
  fps?: number;
  frame_count?: number;
  frames_analyzed: number;
  detector_id?: string;
  detector_version?: string;
  detector_available: boolean;
  detector_note?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  video_available: boolean;
  video_url?: string;
  candidate_count: number;
  candidates?: VideoCandidate[];
}

export interface ScoringConfigData {
  scoring: {
    version: string;
    disclaimer: string;
    weights: {
      severity: number;
      immediacy: number;
      people_at_risk: number;
      secondary_hazard: number;
    };
    thresholds: {
      critical: number;
      high: number;
      medium: number;
    };
    low_confidence_threshold: number;
    rank_hysteresis: number;
    dedup_window_seconds: number;
    baselines: Record<string, Record<string, number>>;
    rules: Array<{
      id: string;
      description: string;
      categories: string[];
      floor: string;
      emergency: boolean;
      conditions: Array<{ field: string; op: string; value: any }>;
    }>;
  };
  mode: string;
  video: {
    max_upload_mb: number;
    max_video_seconds: number;
    allowed_extensions: string[];
    frame_sample_interval_seconds: number;
    retention_hours: number;
  };
}
