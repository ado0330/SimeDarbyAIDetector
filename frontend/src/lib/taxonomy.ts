/**
 * GLOBAL EYE — Expandable Incident Taxonomy and Classification System
 *
 * Defines the comprehensive township safety, security, wildlife, infrastructure,
 * environmental, utility, traffic, property, and operational incident catalogue.
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
  | "detected"          // Evidence supports a potential incident
  | "suspected"         // Event may be occurring but needs verification
  | "sensor_reported"   // IoT / Sensor reported abnormal telemetry
  | "human_reported"    // Resident, staff, or operator submitted report
  | "confirmed"         // Authorised human operator verified the incident
  | "false_positive";   // Authorised reviewer determined alert is not genuine

export interface TaxonomyCategory {
  id: string;
  name: string;
  nameZh?: string;
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
    nameZh: "人员跌倒 / 倒地不起",
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
    nameZh: "突发医疗急救",
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
    nameZh: "溺水与水域险情",
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
    nameZh: "高危禁区/天台屋顶闯入",
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
    nameZh: "肢体冲突与群殴斗殴",
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
    nameZh: "周界安防入侵破坏",
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
    nameZh: "野生动物闯入 (野猪/猴/蛇)",
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
    nameZh: "疑似火灾与浓烟",
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
    nameZh: "可燃气体泄漏与爆炸隐患",
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
    nameZh: "供水主管道爆裂漏水",
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
    nameZh: "排水涵洞堵塞溢流",
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
    nameZh: "路面积水与城市内涝",
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
    nameZh: "树木倒塌与风暴道路阻断",
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
    nameZh: "交通事故与车辆相撞",
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
    nameZh: "违章停放占用消防应急通道",
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
    nameZh: "电梯故障与人员被困",
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
    nameZh: "变电站跳闸与大面积路灯停电",
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
    nameZh: "非法倾倒垃圾与环境污染",
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

  // 10. Operational & General
  custom_safety_hazard: {
    id: "custom_safety_hazard",
    name: "Administrator-Defined Safety Hazard",
    nameZh: "自定义与综合安全隐患",
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
 * Format category label with Chinese / English context.
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
 * Incident Correlation Rules:
 * Identifies when two or more distinct events belong to the same overarching township emergency.
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
    id: "CORR-WATER-FLOOD",
    name: "Pipe Burst leading to Roadway Flooding",
    description: "A high-pressure water main burst followed by downstream road flooding.",
    triggerCategory: "pipe_burst_leakage",
    followupCategory: "flash_flood",
    compositeName: "Cascading Water Infrastructure Failure & Road Inundation",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-RAIN-SURGE",
    name: "Heavy Storm causing Retention Overflow",
    description: "Fallen tree or storm conditions correlated with flash flood telemetry.",
    triggerCategory: "fallen_tree_storm_damage",
    followupCategory: "flash_flood",
    compositeName: "Storm Inundation & Debris Obstruction Emergency",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-SMOKE-FIRE",
    name: "Smoke Detection followed by Verified Flame",
    description: "Early smoke plume alert correlated with active fire alarm.",
    triggerCategory: "fire_smoke",
    followupCategory: "fire_smoke",
    compositeName: "Multi-Angle Confirmed Structural Fire Hazard",
    compositeSeverity: "critical",
  },
  {
    id: "CORR-CRASH-EGRESS",
    name: "Vehicle Crash blocking Emergency Route",
    description: "A road collision causing downstream emergency route obstruction.",
    triggerCategory: "road_collision",
    followupCategory: "parking_obstruction",
    compositeName: "Major Boulevard Collision & Emergency Access Blockage",
    compositeSeverity: "critical",
  },
];
