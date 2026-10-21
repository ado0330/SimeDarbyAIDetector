/**
 * Sime Darby Property — Auxiliary Police (Polis Bantuan) & Township Ranger Operations
 *
 * Real-world township fleet data, dispatch telemetry, SOP coordination, and
 * field WhatsApp/Telegram SITREP formatting for City of Elmina & township sectors.
 */

import { IncidentDetail } from "@/types";

export interface AuxiliaryUnit {
  id: string;
  callsign: string;
  unitCode: string;
  officerInCharge: string;
  unitType: "patrol_vehicle" | "rapid_motorcycle" | "community_ranger" | "hazard_warden" | "traffic_marshal";
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

export const AUXILIARY_PATROL_FLEET: AuxiliaryUnit[] = [
  {
    id: "patrol-a",
    callsign: "PB-Alpha (Vehicle 4x4)",
    unitCode: "PB-01",
    officerInCharge: "Sjn. Mohd Fairuz & Konst. Hafiz",
    unitType: "patrol_vehicle",
    assignedZoneId: "LOC-GATE",
    baseLocation: "Main Gate Roundabout & Boulevard",
    status: "on_patrol",
    coordinates: { x: 150, y: 350 },
    gpsLocation: "3.1942° N, 101.5011° E",
    contactNumber: "+60 19-382 9101",
    equipment: ["First-Aid Trauma Kit", "Traffic Detour Cones", "Heavy Tow Straps", "Halon Fire Extinguisher"],
    vehicleModel: "Toyota Hilux 2.8 4x4",
    plateNumber: "SDP 4101",
  },
  {
    id: "patrol-b",
    callsign: "PB-Bravo (Rapid Motorcycle)",
    unitCode: "PB-02",
    officerInCharge: "Kpl. Bryan Tan",
    unitType: "rapid_motorcycle",
    assignedZoneId: "LOC-PROM",
    baseLocation: "Lakeside Promenade",
    status: "available",
    coordinates: { x: 490, y: 460 },
    gpsLocation: "3.1988° N, 101.5120° E",
    contactNumber: "+60 19-382 9102",
    equipment: ["Automated External Defibrillator (AED)", "Tactical High-Power Searchlight", "Water Rescue Lifebuoy Throw-bag"],
    vehicleModel: "Honda CB500X",
    plateNumber: "SDP 2208",
  },
  {
    id: "first-aid",
    callsign: "PB-Charlie (Community Ranger)",
    unitCode: "PB-03",
    officerInCharge: "Konst. Siti Nurhaliza",
    unitType: "community_ranger",
    assignedZoneId: "LOC-PARK",
    baseLocation: "Central Park Playground",
    status: "on_patrol",
    coordinates: { x: 380, y: 270 },
    gpsLocation: "3.1965° N, 101.5065° E",
    contactNumber: "+60 19-382 9103",
    equipment: ["Pediatric First-Aid Kit", "Emergency PA Megaphone", "Township Trunk Radio", "Bicycle First-Response Bag"],
    vehicleModel: "Trek Police Mountain Bike",
    plateNumber: "SDP BIKE-03",
  },
  {
    id: "fire-warden",
    callsign: "PB-Delta (Hazard & Rescue Warden)",
    unitCode: "PB-04",
    officerInCharge: "PB Ahmad Shahril & PB Wong",
    unitType: "hazard_warden",
    assignedZoneId: "LOC-RESA",
    baseLocation: "Residensi Aman (Block A)",
    status: "available",
    coordinates: { x: 710, y: 160 },
    gpsLocation: "3.1920° N, 101.5090° E",
    contactNumber: "+60 19-382 9104",
    equipment: ["Hydraulic Cutters", "Telescopic Ladder", "Chainsaw & Storm Clear Gear", "Dry Powder Extinguishers"],
    vehicleModel: "Ford Transit Hazard Van",
    plateNumber: "SDP 8831",
  },
  {
    id: "traffic-marshal",
    callsign: "PB-Echo (Traffic & Access Marshal)",
    unitCode: "PB-05",
    officerInCharge: "PB Suresh Kumar",
    unitType: "traffic_marshal",
    assignedZoneId: "LOC-MALL",
    baseLocation: "Harmoni Mall - Parking Deck B",
    status: "available",
    coordinates: { x: 810, y: 340 },
    gpsLocation: "3.1995° N, 101.5180° E",
    contactNumber: "+60 19-382 9105",
    equipment: ["Wheel Immobilizer Clamps", "Radar Speed Gun", "Emergency LED Flares", "Tow Contact List"],
    vehicleModel: "Proton X70 Security Spec",
    plateNumber: "SDP 5055",
  },
];

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
 * Finds the closest Auxiliary Police patrol unit for an incident's camera or location.
 */
export function findNearestAuxiliaryUnit(
  locationId?: string,
  cameraId?: string
): {
  unit: AuxiliaryUnit;
  distanceMeters: number;
  etaMinutes: number;
  etaFormatted: string;
} {
  // Target position from camera or zone defaults
  let target = { x: 450, y: 300 };
  if (cameraId && CAMERA_MAP_POSITIONS[cameraId]) {
    target = CAMERA_MAP_POSITIONS[cameraId];
  } else if (locationId) {
    const matched = AUXILIARY_PATROL_FLEET.find((u) => u.assignedZoneId === locationId);
    if (matched) {
      target = matched.coordinates;
    }
  }

  // Calculate Euclidean distances
  let nearest = AUXILIARY_PATROL_FLEET[0];
  let minDistance = Number.MAX_VALUE;

  for (const unit of AUXILIARY_PATROL_FLEET) {
    const dx = unit.coordinates.x - target.x;
    const dy = unit.coordinates.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = unit;
    }
  }

  // Convert canvas units to realistic meters (canvas width 1000 ≈ 2.5 km across township)
  // 1 canvas unit ≈ 2.5 meters
  const distanceMeters = Math.max(120, Math.round(minDistance * 2.5));

  // Average response speed: 30 km/h in township pedestrian/internal roads = ~500m/min
  const etaMinutes = Math.max(1, Math.round((distanceMeters / 450) * 10) / 10);
  const etaFormatted = etaMinutes <= 1 ? "Under 1 min (Immediate)" : `${etaMinutes.toFixed(1)} mins`;

  return {
    unit: nearest,
    distanceMeters,
    etaMinutes,
    etaFormatted,
  };
}

/**
 * Generates an operational WhatsApp / Telegram SITREP for field rangers.
 */
export function generateWhatsAppSitrep(
  incident: IncidentDetail,
  unit?: AuxiliaryUnit,
  etaFormatted?: string
): string {
  const prioTag = incident.priority_level.toUpperCase();
  const location = incident.location_name || incident.location_id || "Township Perimeter";
  const camera = incident.camera_name || incident.camera_id || "CCTV Surveillance Node";
  const gps = unit?.gpsLocation || "3.1965° N, 101.5065° E (City of Elmina)";
  const assigned = unit
    ? `${unit.callsign} (${unit.officerInCharge})`
    : incident.assigned_to_name || "Nearest Auxiliary Unit Pending";

  // Telemetry highlight
  const evidenceEntries = Object.entries(incident.evidence || {}).filter(
    ([k]) => !["video_job_id", "model_used", "status", "analyzed_frames"].includes(k)
  );
  const evidenceSnippet =
    evidenceEntries.length > 0
      ? evidenceEntries
          .slice(0, 2)
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
          .join(" | ")
      : "Automated perimeter anomaly confirmed";

  return `🚨 *SIME DARBY PROPERTY TOWNSHIP ALERT*
*Ref*: ${incident.id} | *Priority*: P-${prioTag} (${incident.priority_score.toFixed(0)}/100)
*Status*: Active Response Required
----------------------------------------
📍 *Sector*: ${location}
📹 *Camera Node*: ${camera}
🌐 *GPS Coordinates*: ${gps}
⚠️ *Incident*: ${incident.title}
📊 *Telemetry*: ${evidenceSnippet}
----------------------------------------
👮 *Dispatched Patrol*: ${assigned}
⏱️ *Estimated Arrival (ETA)*: ${etaFormatted || "2.0 mins"}
📋 *Required Action*: ${incident.recommended_action || "Secure perimeter and verify situation on site"}
----------------------------------------
*Control Center*: Sime Darby Polis Bantuan Central Command
*Direct Dispatch Hotline*: +60 3-7844 8000 / Ch. 4 VHF`;
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
