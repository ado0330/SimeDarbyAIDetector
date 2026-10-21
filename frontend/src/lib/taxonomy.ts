/**
 * GLOBAL EYE — Comprehensive Multi-Source Township Incident Taxonomy
 *
 * Defines the expandable incident catalogue covering human safety, security,
 * wildlife, fire, utilities, flooding, traffic, smart infrastructure, and operational domains.
 */

export type IncidentDomain =
  | "human_safety"
  | "security_access"
  | "wildlife_nature"
  | "fire_hazards"
  | "water_utilities"
  | "weather_flooding"
  | "traffic_mobility"
  | "smart_infrastructure"
  | "environment_sanitation"
  | "operational_general";

export type DetectionMethod =
  | "cctv_vision"
  | "iot_telemetry"
  | "human_report"
  | "external_integration"
  | "multi_source_correlated"
  | "manual_entry";

export type IncidentLifecycleState =
  | "detected"
  | "suspected"
  | "sensor_reported"
  | "human_reported"
  | "confirmed"
  | "false_positive";

export interface TaxonomyCategory {
  id: string;
  name: string;
  domain: IncidentDomain;
  domainName: string;
  description: string;
  defaultSeverity: "critical" | "high" | "medium" | "low";
  supportedMethods: DetectionMethod[];
  primaryMethod: DetectionMethod;
  sopWorkflow: string[];
  evidenceFields: string[];
  icon: string;
  badgeColor: string;
}

export const INCIDENT_DOMAINS: { id: IncidentDomain; name: string; icon: string }[] = [
  { id: "human_safety", name: "Human Safety & Medical", icon: "UserX" },
  { id: "security_access", name: "Security & Restricted Access", icon: "ShieldAlert" },
  { id: "wildlife_nature", name: "Wildlife & Animal Hazards", icon: "Trees" },
  { id: "fire_hazards", name: "Fire, Smoke & Explosions", icon: "Flame" },
  { id: "water_utilities", name: "Water, Drainage & Utilities", icon: "Droplets" },
  { id: "weather_flooding", name: "Flooding & Natural Hazards", icon: "CloudRain" },
  { id: "traffic_mobility", name: "Traffic, Mobility & Parking", icon: "Car" },
  { id: "smart_infrastructure", name: "Smart Infra, Lifts & Energy", icon: "Building" },
  { id: "environment_sanitation", name: "Waste & Environment", icon: "Trash2" },
  { id: "operational_general", name: "Operational & Other", icon: "HelpCircle" },
];

export const TAXONOMY_CATALOGUE: Record<string, TaxonomyCategory> = {
  // 1. Human Safety & Medical
  person_fall: {
    id: "person_fall",
    name: "Person Fall / Motionless",
    domain: "human_safety",
    domainName: "Human Safety & Medical",
    description: "Pedestrian slip, trip, collapse, or unresponsive posture on walkway, road, or stairs.",
    defaultSeverity: "critical",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Verify CCTV feed immediately",
      "Dispatch nearest first-aid ranger patrol",
      "Escalate to Emergency Medical Services (999/112) if unresponsive",
    ],
    evidenceFields: ["motionless_seconds", "hazardous_location", "bystander_assisting", "fall_from_height"],
    icon: "UserX",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
  },
  medical_emergency: {
    id: "medical_emergency",
    name: "Acute Medical Emergency",
    domain: "human_safety",
    domainName: "Human Safety & Medical",
    description: "Cardiac arrest, seizure, heatstroke, or acute physical distress in township public spaces.",
    defaultSeverity: "critical",
    supportedMethods: ["human_report", "cctv_vision"],
    primaryMethod: "human_report",
    sopWorkflow: [
      "Contact Emergency Ambulance 999",
      "Deploy Automated External Defibrillator (AED) patrol unit",
      "Clear access route for ambulance arrival",
    ],
    evidenceFields: ["consciousness_level", "breathing", "aed_deployed"],
    icon: "HeartPulse",
    badgeColor: "bg-red-100 text-red-800 border-red-300",
  },
  drowning_water_distress: {
    id: "drowning_water_distress",
    name: "Water Distress / Drowning Risk",
    domain: "human_safety",
    domainName: "Human Safety & Medical",
    description: "Person struggling in retention pond, lake, swimming pool, or deep drainage canal.",
    defaultSeverity: "critical",
    supportedMethods: ["cctv_vision", "human_report", "iot_telemetry"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Sound local audio distress siren",
      "Dispatch water rescue team with lifebuoy",
      "Notify BOMBA Water Rescue Unit (PPDA)",
    ],
    evidenceFields: ["water_depth", "flotation_device_present", "persons_in_water"],
    icon: "LifeBuoy",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },

  // 2. Security & Restricted Access
  restricted_area_intrusion: {
    id: "restricted_area_intrusion",
    name: "Restricted Danger Zone (Rooftop / Height)",
    domain: "security_access",
    domainName: "Security & Restricted Access",
    description: "Unauthorized person on commercial rooftop ledge, electrical substation, construction fence, or water treatment perimeter.",
    defaultSeverity: "critical",
    supportedMethods: ["cctv_vision", "iot_telemetry", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Trigger CCTV automated audio warning: 'Restricted area, step back'",
      "Dispatch auxiliary security patrol to secure access ladder/door",
      "Lock down rooftop elevator access",
    ],
    evidenceFields: ["height_fall_hazard", "substation_voltage", "entry_method"],
    icon: "Building",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
  },
  physical_altercation: {
    id: "physical_altercation",
    name: "Physical Altercation / Public Affray",
    domain: "security_access",
    domainName: "Security & Restricted Access",
    description: "Violent confrontation, assault, brawl, or menacing behavior in commercial squares or parks.",
    defaultSeverity: "high",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Dispatch security patrol dual-officer unit",
      "Monitor on high-definition PTZ camera tracking",
      "Notify Royal Malaysia Police (PDRM) if weapons or bodily injury visible",
    ],
    evidenceFields: ["weapons_detected", "persons_involved", "crowd_gathering"],
    icon: "ShieldAlert",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
  unauthorized_trespass: {
    id: "unauthorized_trespass",
    name: "Perimeter Security Breach",
    domain: "security_access",
    domainName: "Security & Restricted Access",
    description: "Breach of residential gated perimeter fence, unauthorized vehicle tailgating, or forced entry.",
    defaultSeverity: "high",
    supportedMethods: ["cctv_vision", "iot_telemetry", "human_report"],
    primaryMethod: "iot_telemetry",
    sopWorkflow: [
      "Inspect fence vibration sensor / thermal camera feed",
      "Dispatch perimeter mobile guard",
      "Notify boom gate security personnel",
    ],
    evidenceFields: ["perimeter_sector", "fence_tamper_sensor", "vehicle_plate"],
    icon: "Lock",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },

  // 3. Wildlife & Animal Hazards
  wildlife_intrusion: {
    id: "wildlife_intrusion",
    name: "Wildlife Intrusion (Wild Animal)",
    domain: "wildlife_nature",
    domainName: "Wildlife & Animal Hazards",
    description: "Wild boars, aggressive macaques, venomous snakes (cobras/vipers), or large monitor lizards in residential roads or parks.",
    defaultSeverity: "high",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Send mobile app push notification to nearby joggers/residents",
      "Dispatch trained township wildlife management warden",
      "Coordinate with PERHILITAN (Wildlife Dept) for safe relocation",
    ],
    evidenceFields: ["animal_species", "pack_size", "proximity_to_pedestrians", "aggressive_behavior"],
    icon: "Trees",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },

  // 4. Fire, Smoke & Explosions
  fire_smoke: {
    id: "fire_smoke",
    name: "Suspected Fire / Smoke Plume",
    domain: "fire_hazards",
    domainName: "Fire, Smoke & Explosions",
    description: "Open flames, expanding smoke plume, wild grass fire, or electrical fire hazard.",
    defaultSeverity: "critical",
    supportedMethods: ["cctv_vision", "iot_telemetry", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Immediate human camera verification (zero suppression)",
      "Call Fire & Rescue BOMBA (994 / 999)",
      "Activate township fire warden & local evacuation protocols",
    ],
    evidenceFields: ["smoke_or_flame_visible", "spreading", "people_in_vicinity", "blocks_emergency_access"],
    icon: "Flame",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
  },
  gas_leak_explosion_risk: {
    id: "gas_leak_explosion_risk",
    name: "Gas Leak / Explosion Risk",
    domain: "fire_hazards",
    domainName: "Fire, Smoke & Explosions",
    description: "LPG / natural gas concentration alarm or strong odor reported near commercial kitchens or residences.",
    defaultSeverity: "critical",
    supportedMethods: ["iot_telemetry", "human_report"],
    primaryMethod: "iot_telemetry",
    sopWorkflow: [
      "Isolate main gas supply valve remotely",
      "Evacuate 100m perimeter; prohibit open flames / vehicle starts",
      "Notify BOMBA hazardous materials (HAZMAT) squad",
    ],
    evidenceFields: ["ppm_concentration", "wind_direction", "affected_units"],
    icon: "AlertOctagon",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
  },

  // 5. Water, Plumbing & Drainage
  pipe_burst_leakage: {
    id: "pipe_burst_leakage",
    name: "Water Main Pipe Burst / High-Pressure Leak",
    domain: "water_utilities",
    domainName: "Water, Drainage & Utilities",
    description: "Subsurface main water pipe rupture causing gushing surface water, pressure drop, and road subsidence risk.",
    defaultSeverity: "high",
    supportedMethods: ["iot_telemetry", "cctv_vision", "human_report"],
    primaryMethod: "iot_telemetry",
    sopWorkflow: [
      "Inspect municipal flow telemetry sensor",
      "Dispatch township plumbing emergency response team",
      "Shut sectional isolation valve to prevent road washout",
      "Correlate with potential downstream road flooding",
    ],
    evidenceFields: ["pressure_drop_bar", "flow_rate_loss_pct", "road_subsidence_risk"],
    icon: "Droplets",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
  },
  drainage_blockage: {
    id: "drainage_blockage",
    name: "Drainage / Culvert Blockage",
    domain: "water_utilities",
    domainName: "Water, Drainage & Utilities",
    description: "Debris, tree branches, or silt blocking primary stormwater monsoon drain before heavy rain.",
    defaultSeverity: "medium",
    supportedMethods: ["cctv_vision", "iot_telemetry", "human_report"],
    primaryMethod: "iot_telemetry",
    sopWorkflow: [
      "Dispatch maintenance excavator / cleanout contractor",
      "Clear grate inlet before storm front arrives",
    ],
    evidenceFields: ["culvert_headroom_remaining", "debris_volume_m3"],
    icon: "Waves",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },

  // 6. Flooding, Weather & Natural
  flash_flood: {
    id: "flash_flood",
    name: "Flash Flooding / Retention Surge",
    domain: "weather_flooding",
    domainName: "Flooding & Natural Hazards",
    description: "Rapid stormwater inundation of township roadway underpasses, parking aprons, or retention lake spillway surge.",
    defaultSeverity: "critical",
    supportedMethods: ["iot_telemetry", "cctv_vision", "external_integration"],
    primaryMethod: "iot_telemetry",
    sopWorkflow: [
      "Deploy electronic flood warning signboards",
      "Dispatch traffic marshals to close flooded road lanes",
      "Check automatic retention pond pump status",
    ],
    evidenceFields: ["water_depth_cm", "rate_of_rise_cm_min", "vehicles_submerged"],
    icon: "CloudRain",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
  },
  fallen_tree_storm_damage: {
    id: "fallen_tree_storm_damage",
    name: "Fallen Tree / Severe Storm Obstruction",
    domain: "weather_flooding",
    domainName: "Flooding & Natural Hazards",
    description: "Uprooted trees or massive branches blocking main entry boulevards or striking power lines after thunderstorm.",
    defaultSeverity: "high",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Verify power line clearance with electrical team",
      "Dispatch landscape chainsaw emergency team",
      "Divert traffic to secondary township gate",
    ],
    evidenceFields: ["power_lines_contacted", "road_lanes_blocked", "vehicle_damaged"],
    icon: "Wind",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },

  // 7. Traffic, Mobility & Parking
  road_collision: {
    id: "road_collision",
    name: "Road Collision / Vehicle Crash",
    domain: "traffic_mobility",
    domainName: "Traffic, Mobility & Parking",
    description: "Two-vehicle collision, motorcycle skid, or vehicle impact with pedestrian or roadside guardrail.",
    defaultSeverity: "high",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Check camera feed for motionless persons / trapped occupants",
      "Dispatch traffic marshal to secure crash site",
      "Escalate to Police (PDRM) and Ambulance if injuries observed",
    ],
    evidenceFields: ["vehicles_involved", "persons_involved", "traffic_blocked", "motionless_after_impact"],
    icon: "Car",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
  },
  parking_obstruction: {
    id: "parking_obstruction",
    name: "Parking / Emergency Route Obstruction",
    domain: "traffic_mobility",
    domainName: "Traffic, Mobility & Parking",
    description: "Vehicle parked illegally across fire hydrant, emergency ambulance gate, or double-parked blocking egress.",
    defaultSeverity: "low",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Query vehicle license plate in resident database",
      "Send SMS automated move request to owner",
      "Dispatch tow-truck if emergency access route is compromised",
    ],
    evidenceFields: ["blocks_emergency_access", "duration_minutes", "plate_number"],
    icon: "AlertTriangle",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
  },

  // 8. Smart Utilities & Infrastructure
  lift_entrapment: {
    id: "lift_entrapment",
    name: "Elevator Passenger Entrapment",
    domain: "smart_infrastructure",
    domainName: "Smart Infra, Lifts & Energy",
    description: "Commercial or residential elevator halted between floors with occupants inside.",
    defaultSeverity: "critical",
    supportedMethods: ["iot_telemetry", "human_report"],
    primaryMethod: "iot_telemetry",
    sopWorkflow: [
      "Establish direct two-way audio intercom with trapped passengers",
      "Reassure occupants; check cabin ventilation status",
      "Dispatch certified lift technician and BOMBA rescue squad",
    ],
    evidenceFields: ["passengers_count", "cabin_temperature", "between_floors"],
    icon: "ArrowUpDown",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
  },
  power_outage_electrical: {
    id: "power_outage_electrical",
    name: "Substation Trip / Streetlight Blackout",
    domain: "smart_infrastructure",
    domainName: "Smart Infra, Lifts & Energy",
    description: "Medium voltage electrical failure causing blackout along main boulevards or exposed wiring risk.",
    defaultSeverity: "high",
    supportedMethods: ["iot_telemetry", "external_integration", "human_report"],
    primaryMethod: "iot_telemetry",
    sopWorkflow: [
      "Switch backup generator for critical CCTV nodes",
      "Notify Tenaga Nasional Berhad (TNB) electrical grid desk",
      "Deploy auxiliary battery mobile lights to key intersections",
    ],
    evidenceFields: ["affected_substation", "streetlights_offline", "exposed_live_wires"],
    icon: "Zap",
    badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },

  // 9. Environment, Waste & Sanitation
  illegal_dumping: {
    id: "illegal_dumping",
    name: "Illegal Waste Dumping / Pollution",
    domain: "environment_sanitation",
    domainName: "Waste & Environment",
    description: "Commercial lorry dumping construction debris, toxic drums, or bulk garbage in undeveloped township reserve.",
    defaultSeverity: "medium",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Record vehicle registration number from CCTV",
      "Dispatch security patrol to document site",
      "File report with Department of Environment (DOE)",
    ],
    evidenceFields: ["waste_type", "chemical_odor", "lorry_plate"],
    icon: "Trash2",
    badgeColor: "bg-stone-100 text-stone-800 border-stone-300",
  },

  // Additional Master Catalogue Categories
  road_pavement_defect: {
    id: "road_pavement_defect",
    name: "Pothole, Sinkhole & Road Subsidence",
    domain: "traffic_mobility",
    domainName: "Traffic, Mobility & Parking",
    description: "Large crater, opening sinkhole, or severe pavement depression creating imminent vehicle crash or rim hazard.",
    defaultSeverity: "medium",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Place emergency reflective cones and warning signs around pavement void",
      "Notify municipal works maintenance for cold-mix patch / trench restoration",
    ],
    evidenceFields: ["diameter_meters", "depth_cm", "lane_closed"],
    icon: "AlertTriangle",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
  structural_facility_damage: {
    id: "structural_facility_damage",
    name: "Building Façade & Structural Damage",
    domain: "smart_infrastructure",
    domainName: "Smart Infra, Lifts & Energy",
    description: "Detached building façade panel, broken overhead glass, fallen canopy, or structural masonry collapse.",
    defaultSeverity: "high",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Cordon off perimeter beneath damaged structure with warning barrier tape",
      "Dispatch certified structural engineer to assess load integrity",
    ],
    evidenceFields: ["component_type", "fall_zone_pedestrians", "building_sector"],
    icon: "Building",
    badgeColor: "bg-red-100 text-red-800 border-red-300",
  },
  crowd_surge_congestion: {
    id: "crowd_surge_congestion",
    name: "Crowd Surge & Egress Congestion",
    domain: "security_access",
    domainName: "Security & Restricted Access",
    description: "Excessive crowd density, compression, or blocked emergency evacuation route during community events.",
    defaultSeverity: "high",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Open secondary emergency release gates",
      "Broadcast directional public address audio instructions",
      "Deploy crowd control marshals to relieve bottlenecks",
    ],
    evidenceFields: ["crowd_density_m2", "egress_blocked", "compression_risk"],
    icon: "Users",
    badgeColor: "bg-violet-100 text-violet-800 border-violet-300",
  },
  construction_safety_hazard: {
    id: "construction_safety_hazard",
    name: "Construction & Worksite Hazard",
    domain: "operational_general",
    domainName: "Operational & Other",
    description: "Unsecured deep trench, crane load hazard, or contractor materials falling onto public road.",
    defaultSeverity: "high",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Issue immediate Stop-Work order on affected site sector",
      "Dispatch safety auditor to inspect contractor perimeter barriers",
    ],
    evidenceFields: ["contractor_name", "public_road_affected", "trench_unprotected"],
    icon: "HardHat",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
  },
  early_warning_subsidence: {
    id: "early_warning_subsidence",
    name: "Early-Warning Slope & Ground Movement",
    domain: "weather_flooding",
    domainName: "Flooding & Natural Hazards",
    description: "Sensor-detected geotechnical slope movement, retaining wall bulging, or foundation settlement developing over time.",
    defaultSeverity: "high",
    supportedMethods: ["iot_telemetry", "human_report"],
    primaryMethod: "iot_telemetry",
    sopWorkflow: [
      "Review inclinometer and geotechnical sensor trend data",
      "Dispatch structural engineer to conduct on-site physical survey",
      "Install temporary diversion barriers if slope movement accelerates",
    ],
    evidenceFields: ["displacement_mm", "slope_angle_delta", "rainfall_accumulation_mm"],
    icon: "TrendingDown",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
  },
  cyber_physical_system_outage: {
    id: "cyber_physical_system_outage",
    name: "Security & Sensor System Outage",
    domain: "operational_general",
    domainName: "Operational & Other",
    description: "Telemetry cluster loss, CCTV node disconnection, or monitoring system communication failure creating blind spots.",
    defaultSeverity: "high",
    supportedMethods: ["external_integration", "iot_telemetry"],
    primaryMethod: "external_integration",
    sopWorkflow: [
      "Initiate auxiliary heartbeat telemetry ping",
      "Dispatch field network technician to inspect PoE switch cabinet",
      "Route mobile security patrol to cover visual blind zone",
    ],
    evidenceFields: ["nodes_offline_count", "sector_blind_zone", "duration_minutes"],
    icon: "ServerCrash",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
  },
  accessibility_obstruction: {
    id: "accessibility_obstruction",
    name: "Accessibility & Mobility Pathway Blockage",
    domain: "traffic_mobility",
    domainName: "Traffic, Mobility & Parking",
    description: "Wheelchair ramp, tactile paving, or accessible crossing blocked by construction hoarding, vehicles, or debris.",
    defaultSeverity: "medium",
    supportedMethods: ["cctv_vision", "human_report"],
    primaryMethod: "cctv_vision",
    sopWorkflow: [
      "Dispatch facility warden to remove obstruction immediately",
      "Issue non-compliance citation if commercial contractor material",
    ],
    evidenceFields: ["path_type", "accessible_alternative_distance_m"],
    icon: "Accessibility",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
  },

  // 10. Operational & General
  custom_safety_hazard: {
    id: "custom_safety_hazard",
    name: "Administrator-Defined Safety Hazard",
    domain: "operational_general",
    domainName: "Operational & Other",
    description: "Novel, multi-source, or operator-entered township incident not matching pre-existing automated categories.",
    defaultSeverity: "medium",
    supportedMethods: ["manual_entry", "human_report", "multi_source_correlated"],
    primaryMethod: "manual_entry",
    sopWorkflow: [
      "Operator review of custom incident description",
      "Assign appropriate departmental responder",
      "Record corrective action in township incident audit log",
    ],
    evidenceFields: ["custom_notes", "reported_by"],
    icon: "HelpCircle",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
  },
};

/**
 * Retrieve category definition by id.
 */
export function getTaxonomyCategory(id: string): TaxonomyCategory {
  return (
    TAXONOMY_CATALOGUE[id] || {
      id,
      name: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      domain: "operational_general",
      domainName: "Operational & Other",
      description: "Custom township incident.",
      defaultSeverity: "medium",
      supportedMethods: ["manual_entry"],
      primaryMethod: "manual_entry",
      sopWorkflow: ["Review incident telemetry and assign responder."],
      evidenceFields: [],
      icon: "HelpCircle",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    }
  );
}

/**
 * Incident Correlation Rules (Section 29: Master Cascading Incidents)
 * Identifies when an initial event triggers downstream township consequences.
 */
export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  triggerCategory: string;
  followupCategory: string;
  compositeName: string;
  compositeSeverity: "critical" | "high";
}

export const CORRELATION_RULES: CorrelationRule[] = [
  {
    id: "CORR-TREE-ROAD",
    name: "Fallen Tree causing Road Blockage & Collision Risk",
    description: "A fallen tree or broken branch obstructs travel lanes, creating vehicular crash hazard.",
    triggerCategory: "fallen_tree_storm_damage",
    followupCategory: "road_collision",
    compositeName: "Tree Fall & Roadway Traffic Obstruction Hazard",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-TREE-POWER",
    name: "Fallen Tree causing Power Line Damage & Blackout",
    description: "Fallen tree striking overhead medium-voltage power lines causing localized blackout.",
    triggerCategory: "fallen_tree_storm_damage",
    followupCategory: "power_outage_electrical",
    compositeName: "Severe Tree Fall & Power Grid Outage Emergency",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-WATER-FLOOD",
    name: "Pipe Burst leading to Roadway Flooding",
    description: "A high-pressure water main burst followed by downstream road flooding.",
    triggerCategory: "pipe_burst_leakage",
    followupCategory: "flash_flood",
    compositeName: "Cascading Water Infrastructure Failure & Road Inundation",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-WATER-SUBSIDENCE",
    name: "Pipe Leak causing Road Subsidence & Sinkhole",
    description: "Underground water main failure washing away soil foundations and creating road sinkholes.",
    triggerCategory: "pipe_burst_leakage",
    followupCategory: "road_pavement_defect",
    compositeName: "Subsurface Water Main Rupture & Roadway Collapse",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-STORM-CASCADE",
    name: "Monsoon Storm causing Inundation & Debris",
    description: "Intense rainfall overwhelming drainage culverts while storm winds fell branches.",
    triggerCategory: "fallen_tree_storm_damage",
    followupCategory: "flash_flood",
    compositeName: "Storm Inundation & Debris Obstruction Emergency",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-COLLISION-EGRESS",
    name: "Vehicle Crash blocking Emergency Route",
    description: "A road collision causing downstream emergency route obstruction.",
    triggerCategory: "road_collision",
    followupCategory: "parking_obstruction",
    compositeName: "Major Boulevard Collision & Emergency Access Blockage",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-FIRE-EGRESS",
    name: "Structural Fire with Blocked Evacuation",
    description: "Fire and smoke plume detected where emergency egress path is obstructed.",
    triggerCategory: "fire_smoke",
    followupCategory: "parking_obstruction",
    compositeName: "Structural Fire & Blocked Emergency Egress Emergency",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-ELECTRICAL-LIFT",
    name: "Substation Trip causing Elevator Passenger Entrapment",
    description: "Electrical grid failure stalling elevators between floors with trapped occupants.",
    triggerCategory: "power_outage_electrical",
    followupCategory: "lift_entrapment",
    compositeName: "Power Outage & Multi-Cabin Lift Entrapment Crisis",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-WILDLIFE-TRAFFIC",
    name: "Wild Animal entering Roadway causing Collision Hazard",
    description: "Wild boar pack or large monitor lizard crossing highway leading to sudden braking and collision.",
    triggerCategory: "wildlife_intrusion",
    followupCategory: "road_collision",
    compositeName: "Wildlife Road Intrusion & Multi-Vehicle Crash Risk",
    compositeSeverity: "high",
  },
  {
    id: "CORR-WALL-SUBSIDENCE",
    name: "Retaining Wall Bulging leading to Soil Collapse",
    description: "Geotechnical slope movement developing into retaining wall displacement.",
    triggerCategory: "early_warning_subsidence",
    followupCategory: "structural_facility_damage",
    compositeName: "Geotechnical Slope Movement & Retaining Wall Collapse",
    compositeSeverity: "critical",
  },
];
