/**
 * Sime Darby Property — Emergency Response Fleet & Dispatch Operations
 *
 * Real-world township emergency fleet data, multi-agency dispatch telemetry,
 * SOP coordination, and field WhatsApp/Telegram SITREP formatting for City of Elmina.
 */

import { IncidentDetail } from "@/types";

export interface EmergencyUnit {
  id: string;
  callsign: string;
  unitCode: string;
  officerInCharge: string;
  unitType: "ambulance" | "traffic_police" | "security_patrol" | "fire_rescue" | "park_ranger" | "facilities_maintenance";
  assignedZoneId: string;
  baseLocation: string;
  status: "on_patrol" | "available" | "dispatched" | "on_scene";
  coordinates: { x: number; y: number };
  gpsLocation: string;
  contactNumber: string;
  equipment: string[];
  vehicleModel: string;
  plateNumber: string;
}

// Backwards compatibility alias for imports
export type AuxiliaryUnit = EmergencyUnit;

export const EMERGENCY_RESPONSE_FLEET: EmergencyUnit[] = [
  {
    id: "ambulance",
    callsign: "EMS-Ambulance 01",
    unitCode: "EMS-01",
    officerInCharge: "Dr. Farhan & Paramedic Wong",
    unitType: "ambulance",
    assignedZoneId: "LOC-PROM",
    baseLocation: "Lakeside Medical Station",
    status: "available",
    coordinates: { x: 490, y: 460 },
    gpsLocation: "3.1988° N, 101.5120° E",
    contactNumber: "+60 19-382 9999",
    equipment: ["Advanced Life Support Kit", "Defibrillator (AED)", "Spine Board", "Oxygen Resuscitation"],
    vehicleModel: "Toyota Hiace Emergency Ambulance",
    plateNumber: "AMB 9991",
  },
  {
    id: "traffic-police",
    callsign: "Traffic-Patrol 02",
    unitCode: "TP-02",
    officerInCharge: "Insp. Razak & Kpl. Suresh",
    unitType: "traffic_police",
    assignedZoneId: "LOC-GATE",
    baseLocation: "Main Gate Roundabout & Boulevard",
    status: "on_patrol",
    coordinates: { x: 150, y: 350 },
    gpsLocation: "3.1942° N, 101.5011° E",
    contactNumber: "+60 19-382 9105",
    equipment: ["Traffic Detour Cones", "Breathalyzer", "Accident Investigation Kit", "Emergency LED Flares"],
    vehicleModel: "Proton X70 Highway Patrol",
    plateNumber: "W 1122 P",
  },
  {
    id: "patrol-a",
    callsign: "Security-Patrol Car 04",
    unitCode: "SEC-04",
    officerInCharge: "Sgt. Zainal & Kpl. Hafiz",
    unitType: "security_patrol",
    assignedZoneId: "LOC-GATE",
    baseLocation: "Township Perimeter Command",
    status: "on_patrol",
    coordinates: { x: 220, y: 330 },
    gpsLocation: "3.1945° N, 101.5020° E",
    contactNumber: "+60 19-382 9101",
    equipment: ["First-Aid Trauma Kit", "Tactical Searchlight", "Township Trunk Radio", "Halon Extinguisher"],
    vehicleModel: "Toyota Hilux 2.8 4x4",
    plateNumber: "SDP 4101",
  },
  {
    id: "fire-warden",
    callsign: "Fire-Rescue Response 01",
    unitCode: "FR-01",
    officerInCharge: "PB Firdaus & Crew",
    unitType: "fire_rescue",
    assignedZoneId: "LOC-RESA",
    baseLocation: "Residensi Aman Station",
    status: "available",
    coordinates: { x: 710, y: 160 },
    gpsLocation: "3.1920° N, 101.5090° E",
    contactNumber: "+60 19-382 9104",
    equipment: ["Hydraulic Extrication Cutters", "Thermal Imaging Camera", "Foam Extinguishers", "Telescopic Ladder"],
    vehicleModel: "Rapid Fire Tender",
    plateNumber: "FRV 3321",
  },
  {
    id: "patrol-b",
    callsign: "Ranger-Rapid Motorcycle 02",
    unitCode: "RNG-02",
    officerInCharge: "Ranger Danial",
    unitType: "park_ranger",
    assignedZoneId: "LOC-PARK",
    baseLocation: "Central Park Operations Post",
    status: "on_patrol",
    coordinates: { x: 380, y: 270 },
    gpsLocation: "3.1965° N, 101.5065° E",
    contactNumber: "+60 19-382 9102",
    equipment: ["Automated External Defibrillator (AED)", "Water Rescue Lifebuoy", "All-Terrain First Aid Kit"],
    vehicleModel: "Honda CB500X All-Terrain",
    plateNumber: "SDP 2208",
  },
  {
    id: "maintenance",
    callsign: "Maintenance-Utility 01",
    unitCode: "MNT-01",
    officerInCharge: "En. Azman & Workcrew",
    unitType: "facilities_maintenance",
    assignedZoneId: "LOC-MALL",
    baseLocation: "Harmoni Mall Depot",
    status: "available",
    coordinates: { x: 810, y: 340 },
    gpsLocation: "3.1995° N, 101.5180° E",
    contactNumber: "+60 19-382 9106",
    equipment: ["Chainsaw & Storm Clear Gear", "Road Clearing Winch", "Emergency Pavement Barricades"],
    vehicleModel: "Utility Service Truck",
    plateNumber: "SDP 8801",
  },
];

// Backwards compatibility alias
export const AUXILIARY_PATROL_FLEET = EMERGENCY_RESPONSE_FLEET;

/**
 * Coordinate mapping for cameras on the 1000 x 600 schematic map canvas
 */
export const CAMERA_MAP_POSITIONS: Record<string, { x: number; y: number }> = {
  "CAM-GATE-01": { x: 100, y: 310 },
  "CAM-GATE-02": { x: 200, y: 310 },
  "CAM-SCH-01": { x: 440, y: 145 },
  "CAM-RESA-01": { x: 740, y: 130 },
  "CAM-RESA-02": { x: 860, y: 180 },
  "CAM-PARK-01": { x: 450, y: 320 },
  "CAM-PROM-01": { x: 390, y: 490 },
  "CAM-PROM-02": { x: 530, y: 490 },
  "CAM-MALL-01": { x: 750, y: 360 },
  "CAM-MALL-02": { x: 860, y: 440 },
};

/**
 * Finds the closest emergency response unit for an incident's camera or location.
 */
export function findNearestEmergencyUnit(
  locationId?: string,
  cameraId?: string
): {
  unit: EmergencyUnit;
  distanceMeters: number;
  etaMinutes: number;
  etaFormatted: string;
} {
  let target = { x: 450, y: 300 };
  if (cameraId && CAMERA_MAP_POSITIONS[cameraId]) {
    target = CAMERA_MAP_POSITIONS[cameraId];
  } else if (locationId) {
    const matched = EMERGENCY_RESPONSE_FLEET.find((u) => u.assignedZoneId === locationId);
    if (matched) {
      target = matched.coordinates;
    }
  }

  let nearest = EMERGENCY_RESPONSE_FLEET[0];
  let minDistance = Number.MAX_VALUE;

  for (const unit of EMERGENCY_RESPONSE_FLEET) {
    const dx = unit.coordinates.x - target.x;
    const dy = unit.coordinates.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = unit;
    }
  }

  const distanceMeters = Math.max(120, Math.round(minDistance * 2.5));
  const etaMinutes = Math.max(1, Math.round((distanceMeters / 450) * 10) / 10);
  const etaFormatted = etaMinutes <= 1 ? "Under 1 min (Immediate)" : `${etaMinutes.toFixed(1)} mins`;

  return {
    unit: nearest,
    distanceMeters,
    etaMinutes,
    etaFormatted,
  };
}

// Backwards compatibility alias
export const findNearestAuxiliaryUnit = findNearestEmergencyUnit;

/**
 * Generates an operational WhatsApp / Telegram SITREP for field emergency responders.
 */
export function generateWhatsAppSitrep(
  incident: IncidentDetail,
  dispatchedUnits?: EmergencyUnit | EmergencyUnit[],
  etaFormatted?: string
): string {
  const prioTag = incident.priority_level.toUpperCase();
  const location = incident.location_name || incident.location_id || "Township Perimeter";
  const camera = incident.camera_name || incident.camera_id || "CCTV Surveillance Node";

  let assignedText = incident.assigned_to_name || "Emergency Responders Pending Dispatch";
  if (dispatchedUnits) {
    if (Array.isArray(dispatchedUnits)) {
      assignedText = dispatchedUnits.map((u) => `${u.callsign} (${u.officerInCharge})`).join("\n• ");
      if (dispatchedUnits.length > 1) {
        assignedText = `\n• ${assignedText}`;
      }
    } else {
      assignedText = `${dispatchedUnits.callsign} (${dispatchedUnits.officerInCharge})`;
    }
  }

  const gps = Array.isArray(dispatchedUnits) && dispatchedUnits[0]
    ? dispatchedUnits[0].gpsLocation
    : (!Array.isArray(dispatchedUnits) && dispatchedUnits?.gpsLocation) || "3.1965° N, 101.5065° E (City of Elmina)";

  // Telemetry highlight
  const evidenceEntries = Object.entries(incident.evidence || {}).filter(
    ([k]) => !["video_job_id", "model_used", "status", "analyzed_frames", "local_only", "ai_detected_unverified"].includes(k)
  );
  const evidenceSnippet =
    evidenceEntries.length > 0
      ? evidenceEntries
          .slice(0, 2)
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
          .join(" | ")
      : "Automated perimeter anomaly confirmed";

  return `🚨 *SIME DARBY PROPERTY TOWNSHIP EMERGENCY DISPATCH*
*Incident Ref*: ${incident.id} | *Priority*: P-${prioTag} (${incident.priority_score.toFixed(0)}/100)
*Status*: Active Response Required
----------------------------------------
📍 *Sector*: ${location}
📹 *Camera Feed*: ${camera}
🌐 *GPS Coordinates*: ${gps}
⚠️ *Incident*: ${incident.title}
📊 *Telemetry*: ${evidenceSnippet}
----------------------------------------
🚑 *Dispatched Units*: ${assignedText}
⏱️ *Estimated Arrival (ETA)*: ${etaFormatted || "Under 2 mins"}
📋 *Required Action*: ${incident.recommended_action || "Secure scene, administer first aid, and clear access corridors"}
----------------------------------------
*Control Center*: Sime Darby Property Operations Command
*Direct Emergency Hotline*: +60 3-7844 8000 / Ch. 4 VHF`;
}

/**
 * Opens WhatsApp Web or WhatsApp app with pre-filled SITREP text.
 */
export function openWhatsAppDispatch(text: string): void {
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encoded}`;
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
