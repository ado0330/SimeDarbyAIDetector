import React, { useState } from "react";
import {
  Incident,
  Location,
  Camera as CameraType,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getPriorityStyles,
  getStatusStyles,
  formatCategory,
  formatTimeAgo,
} from "@/lib/utils";
import {
  AUXILIARY_PATROL_FLEET,
  AuxiliaryUnit,
  findNearestAuxiliaryUnit,
} from "@/lib/auxiliaryUnits";
import {
  MapPin,
  Camera,
  Layers,
  AlertTriangle,
  Shield,
  Eye,
  Maximize2,
  Info,
  CheckCircle2,
  Car,
  Radio,
  PhoneCall,
  Navigation,
} from "lucide-react";

interface TownshipMapViewProps {
  incidents: Incident[];
  locations: Location[];
  cameras: CameraType[];
  onSelectIncident: (id: string) => void;
}

// Coordinate definitions for our 6 canonical township zones (normalized 0-1000 x 0-600 SVG canvas)
const ZONE_LAYOUTS: Record<
  string,
  {
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    type: "residential" | "park" | "commercial" | "infrastructure";
    labelX: number;
    labelY: number;
  }
> = {
  "LOC-GATE": {
    x: 40,
    y: 220,
    width: 220,
    height: 180,
    name: "Main Gate Roundabout",
    type: "infrastructure",
    labelX: 150,
    labelY: 300,
  },
  "LOC-SCH": {
    x: 300,
    y: 40,
    width: 280,
    height: 150,
    name: "Sentosa School Drop-off",
    type: "infrastructure",
    labelX: 440,
    labelY: 105,
  },
  "LOC-RESA": {
    x: 640,
    y: 40,
    width: 320,
    height: 210,
    name: "Residensi Aman (Block A)",
    type: "residential",
    labelX: 800,
    labelY: 135,
  },
  "LOC-PARK": {
    x: 300,
    y: 220,
    width: 300,
    height: 170,
    name: "Central Park Playground",
    type: "park",
    labelX: 450,
    labelY: 295,
  },
  "LOC-PROM": {
    x: 300,
    y: 410,
    width: 320,
    height: 160,
    name: "Lakeside Promenade",
    type: "park",
    labelX: 460,
    labelY: 480,
  },
  "LOC-MALL": {
    x: 650,
    y: 280,
    width: 310,
    height: 280,
    name: "Harmoni Mall - Parking Deck B",
    type: "commercial",
    labelX: 805,
    labelY: 410,
  },
  // Backward-compatibility aliases for legacy keys
  zone_entrance: { x: 40, y: 220, width: 220, height: 180, name: "Main Gate Roundabout", type: "infrastructure", labelX: 150, labelY: 300 },
  zone_residence_a: { x: 640, y: 40, width: 320, height: 210, name: "Residensi Aman (Block A)", type: "residential", labelX: 800, labelY: 135 },
  zone_lake_park: { x: 300, y: 220, width: 300, height: 170, name: "Central Park Playground", type: "park", labelX: 450, labelY: 295 },
  zone_commercial: { x: 650, y: 280, width: 310, height: 280, name: "Harmoni Mall - Parking Deck B", type: "commercial", labelX: 805, labelY: 410 },
  zone_residence_b: { x: 640, y: 40, width: 320, height: 210, name: "Residensi Aman (Block A)", type: "residential", labelX: 800, labelY: 135 },
  zone_sports_complex: { x: 300, y: 410, width: 320, height: 160, name: "Lakeside Promenade", type: "park", labelX: 460, labelY: 480 },
};

// Coordinate mapping for 10 CCTV Cameras (matches backend reference data)
const CAMERA_COORDINATES: Record<string, { x: number; y: number; zoneId: string }> = {
  "CAM-GATE-01": { x: 100, y: 310, zoneId: "LOC-GATE" },
  "CAM-GATE-02": { x: 200, y: 310, zoneId: "LOC-GATE" },
  "CAM-SCH-01": { x: 440, y: 145, zoneId: "LOC-SCH" },
  "CAM-RESA-01": { x: 740, y: 130, zoneId: "LOC-RESA" },
  "CAM-RESA-02": { x: 860, y: 180, zoneId: "LOC-RESA" },
  "CAM-PARK-01": { x: 450, y: 320, zoneId: "LOC-PARK" },
  "CAM-PROM-01": { x: 390, y: 490, zoneId: "LOC-PROM" },
  "CAM-PROM-02": { x: 530, y: 490, zoneId: "LOC-PROM" },
  "CAM-MALL-01": { x: 750, y: 360, zoneId: "LOC-MALL" },
  "CAM-MALL-02": { x: 860, y: 440, zoneId: "LOC-MALL" },
  // Backward-compatibility aliases
  cam_gate_01: { x: 100, y: 310, zoneId: "LOC-GATE" },
  cam_gate_02: { x: 200, y: 310, zoneId: "LOC-GATE" },
  cam_res_a1: { x: 740, y: 130, zoneId: "LOC-RESA" },
  cam_res_a2: { x: 860, y: 180, zoneId: "LOC-RESA" },
  cam_park_01: { x: 450, y: 320, zoneId: "LOC-PARK" },
  cam_park_02: { x: 530, y: 490, zoneId: "LOC-PROM" },
  cam_comm_01: { x: 750, y: 360, zoneId: "LOC-MALL" },
  cam_comm_02: { x: 860, y: 440, zoneId: "LOC-MALL" },
  cam_res_b1: { x: 860, y: 180, zoneId: "LOC-RESA" },
  cam_sports_01: { x: 390, y: 490, zoneId: "LOC-PROM" },
};

export function TownshipMapView({
  incidents,
  locations,
  cameras,
  onSelectIncident,
}: TownshipMapViewProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>("LOC-PARK");
  const [showCameras, setShowCameras] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showPatrolUnits, setShowPatrolUnits] = useState(true);

  // Active incidents
  const activeIncidents = incidents.filter(
    (inc) => !["resolved", "false_positive", "closed"].includes(inc.status)
  );

  // Incidents in selected zone
  const zoneIncidents = activeIncidents.filter(
    (inc) => inc.location_id === selectedZoneId
  );

  // Cameras in selected zone
  const zoneCameras = cameras.filter(
    (cam) => cam.location_id === selectedZoneId
  );

  const selectedZone = locations.find((l) => l.id === selectedZoneId) || {
    id: selectedZoneId,
    name: ZONE_LAYOUTS[selectedZoneId]?.name || selectedZoneId,
    description: "Sime Darby Property master-planned community sector.",
    zone_type: ZONE_LAYOUTS[selectedZoneId]?.type || "general",
  };

  return (
    <div className="space-y-4">
      {/* Map Header Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 xl:p-2 2xl:p-3.5 shadow-2xs flex flex-wrap xl:flex-nowrap items-center gap-2 xl:gap-1">
        <div className="min-w-0 xl:shrink-0 flex flex-wrap xl:flex-nowrap items-center gap-x-1.5 gap-y-1">
          <div className="min-w-0 xl:shrink-0 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 shrink-0 text-teal-700" />
            <h3 className="text-sm xl:text-[11px] min-[1400px]:text-xs 2xl:text-sm font-semibold uppercase text-slate-800 tracking-normal xl:whitespace-nowrap">
              Township Security GIS & Schematic Operations Map
            </h3>
          </div>
          <span className="text-xs xl:text-[10px] min-[1400px]:text-[11px] 2xl:text-xs text-slate-400 whitespace-nowrap">&bull; City of Elmina Operations Sector</span>
        </div>

        <div className="w-full xl:w-auto max-w-full xl:ml-auto flex flex-wrap xl:flex-nowrap shrink-0 items-center gap-1 text-xs">
          <label className="inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap cursor-pointer text-slate-600 bg-slate-50 px-2 xl:px-1 2xl:px-2 py-1 rounded border border-slate-200">
            <input
              type="checkbox"
              checked={showCameras}
              onChange={(e) => setShowCameras(e.target.checked)}
              className="w-3 h-3 shrink-0 rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs xl:text-[10px] min-[1400px]:text-[11px] 2xl:text-xs font-medium">Show 10 Cameras</span>
          </label>

          <label className="inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap cursor-pointer text-slate-600 bg-slate-50 px-2 xl:px-1 2xl:px-2 py-1 rounded border border-slate-200">
            <input
              type="checkbox"
              checked={showPatrolUnits}
              onChange={(e) => setShowPatrolUnits(e.target.checked)}
              className="w-3 h-3 shrink-0 rounded text-sky-600 focus:ring-sky-500"
            />
            <span className="text-xs xl:text-[10px] min-[1400px]:text-[11px] 2xl:text-xs font-medium flex items-center gap-1">
              <Car className="w-2.5 h-2.5 shrink-0 text-sky-600" />
              Emergency Response Fleet (6)
            </span>
          </label>

          <label className="inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap cursor-pointer text-slate-600 bg-slate-50 px-2 xl:px-1 2xl:px-2 py-1 rounded border border-slate-200">
            <input
              type="checkbox"
              checked={showIncidents}
              onChange={(e) => setShowIncidents(e.target.checked)}
              className="w-3 h-3 shrink-0 rounded text-rose-600 focus:ring-rose-500"
            />
            <span className="text-xs xl:text-[10px] min-[1400px]:text-[11px] 2xl:text-xs font-medium">Show Active Pins ({activeIncidents.length})</span>
          </label>
        </div>
      </div>

      {/* Main Map & Zone Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* SVG Interactive Canvas */}
        <div className="lg:col-span-2 bg-slate-900 rounded-lg border border-slate-800 p-3 overflow-hidden shadow-sm relative">
          {/* Map Compass & Legend */}
          <div className="absolute top-5 left-5 z-10 bg-slate-950/80 backdrop-blur-xs border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-teal-400">TOWNSHIP SECTOR A</div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
              <span>Critical Alert</span>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 ml-1" />
              <span>High Alert</span>
              <span className="inline-block w-2 h-2 rounded-full bg-teal-400 ml-1" />
              <span>Online CCTV</span>
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 ml-1" />
              <span>PB Patrol Unit</span>
            </div>
          </div>

          <svg
            viewBox="0 0 1000 600"
            className="w-full h-auto select-none"
            style={{ minHeight: "440px" }}
          >
            {/* Grid Pattern Background */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="1000" height="600" fill="#0f172a" />
            <rect width="1000" height="600" fill="url(#grid)" />

            {/* Road Networks */}
            <g stroke="#334155" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none">
              {/* Main Arterial Boulevard */}
              <path d="M 0 310 Q 200 310 280 310 T 630 280 L 1000 280" />
              {/* North-South Spine */}
              <path d="M 615 0 L 615 600" />
              {/* Perimeter Ring Access */}
              <path d="M 280 50 L 280 550" />
            </g>
            <g stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" fill="none">
              <path d="M 0 310 L 1000 280" />
              <path d="M 615 0 L 615 600" />
            </g>

            {/* Central Lake Body */}
            <ellipse
              cx="460"
              cy="420"
              rx="120"
              ry="75"
              fill="#0e7490"
              fillOpacity="0.3"
              stroke="#0891b2"
              strokeWidth="2"
            />
            <text x="460" y="425" fill="#38bdf8" fontSize="12" textAnchor="middle" fontWeight="600" opacity="0.8">
              ELMINA CENTRAL LAKE
            </text>

            {/* Township Zones */}
            {Object.entries(ZONE_LAYOUTS)
              .filter(([k]) => k.startsWith("LOC-"))
              .map(([zoneKey, layout]) => {
                const isSelected = selectedZoneId === zoneKey;
                const hasAlerts = activeIncidents.some((i) => i.location_id === zoneKey);
                const hasCritical = activeIncidents.some(
                  (i) => i.location_id === zoneKey && i.priority_level === "critical"
                );

                let fillColor = "#1e293b";
                let strokeColor = "#475569";
                if (layout.type === "park") {
                  fillColor = "#064e3b";
                  strokeColor = "#059669";
                } else if (layout.type === "commercial") {
                  fillColor = "#1e1b4b";
                  strokeColor = "#4338ca";
                } else if (layout.type === "infrastructure") {
                  fillColor = "#172554";
                  strokeColor = "#2563eb";
                }

                return (
                  <g
                    key={zoneKey}
                    onClick={() => setSelectedZoneId(zoneKey)}
                    className="cursor-pointer transition-opacity"
                  >
                    <rect
                      x={layout.x}
                      y={layout.y}
                      width={layout.width}
                      height={layout.height}
                      rx="8"
                      fill={fillColor}
                      fillOpacity={isSelected ? 0.8 : 0.45}
                      stroke={
                        isSelected
                          ? "#14b8a6"
                          : hasCritical
                            ? "#f43f5e"
                            : hasAlerts
                              ? "#f59e0b"
                              : strokeColor
                      }
                      strokeWidth={isSelected ? 3 : 1.5}
                      strokeDasharray={isSelected ? "none" : hasAlerts ? "4 4" : "none"}
                    />
                    <text
                      x={layout.labelX}
                      y={layout.labelY}
                      fill="#f1f5f9"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {layout.name}
                    </text>
                    <text
                      x={layout.labelX}
                      y={layout.labelY + 16}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="middle"
                      className="select-none pointer-events-none tracking-normal"
                    >
                      {layout.type}
                    </text>
                  </g>
                );
              })}

            {/* Cameras Markers */}
            {showCameras &&
              Object.entries(CAMERA_COORDINATES)
                .filter(([k]) => k.startsWith("CAM-"))
                .map(([camId, coords]) => {
                  const isUnderSelectedZone = coords.zoneId === selectedZoneId;
                  return (
                    <g key={camId} className="cursor-pointer">
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r={isUnderSelectedZone ? 7 : 5}
                        fill="#0f172a"
                        stroke="#2dd4bf"
                        strokeWidth="2"
                      />
                      <circle cx={coords.x} cy={coords.y} r="2.5" fill="#2dd4bf" />
                      <text
                        x={coords.x}
                        y={coords.y - 9}
                        fill="#99f6e4"
                        fontSize="8"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {camId}
                      </text>
                    </g>
                  );
                })}

            {/* Auxiliary Patrol Units */}
            {showPatrolUnits &&
              AUXILIARY_PATROL_FLEET.map((u) => {
                const isSelectedZoneUnit = u.assignedZoneId === selectedZoneId;
                return (
                  <g key={u.id} className="cursor-pointer group">
                    <title>{`${u.callsign} — ${u.officerInCharge} (${u.vehicleModel}) — Status: ${u.status}`}</title>
                    {/* Stable hit area to prevent hover flickering */}
                    <circle
                      cx={u.coordinates.x}
                      cy={u.coordinates.y}
                      r="16"
                      fill="transparent"
                    />
                    {/* Soft radar pulse ring */}
                    <circle
                      cx={u.coordinates.x}
                      cy={u.coordinates.y}
                      r={isSelectedZoneUnit ? "16" : "13"}
                      fill="#38bdf8"
                      opacity="0.2"
                      className="pointer-events-none"
                    />
                    {/* Unit body */}
                    <circle
                      cx={u.coordinates.x}
                      cy={u.coordinates.y}
                      r={isSelectedZoneUnit ? "9.5" : "8"}
                      fill="#0284c7"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="transition-colors duration-150 group-hover:fill-sky-400 group-hover:stroke-sky-100"
                    />
                    {/* Inner symbol */}
                    <text
                      x={u.coordinates.x}
                      y={u.coordinates.y + 2.5}
                      fill="#ffffff"
                      fontSize="6.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      PB
                    </text>
                    {/* Unit Code Label */}
                    <text
                      x={u.coordinates.x}
                      y={u.coordinates.y - 11}
                      fill="#7dd3fc"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      stroke="#0f172a"
                      strokeWidth="2"
                      paintOrder="stroke"
                      className="pointer-events-none select-none"
                    >
                      {u.unitCode}
                    </text>
                  </g>
                );
              })}

            {/* Active Dispatch Trajectory Lines */}
            {showPatrolUnits &&
              showIncidents &&
              activeIncidents.map((inc) => {
                let coords = { x: 500, y: 300 };
                if (inc.camera_id && CAMERA_COORDINATES[inc.camera_id]) {
                  coords = CAMERA_COORDINATES[inc.camera_id];
                } else if (inc.location_id && ZONE_LAYOUTS[inc.location_id]) {
                  coords = {
                    x: ZONE_LAYOUTS[inc.location_id].labelX,
                    y: ZONE_LAYOUTS[inc.location_id].labelY + 28,
                  };
                }

                // Find assigned unit or nearest unit
                let unit = AUXILIARY_PATROL_FLEET.find(
                  (u) => u.id === inc.assigned_to || u.callsign === inc.assigned_to_name
                );
                if (!unit) {
                  unit = findNearestAuxiliaryUnit(inc.location_id, inc.camera_id).unit;
                }

                const midX = (unit.coordinates.x + coords.x) / 2;
                const midY = (unit.coordinates.y + coords.y) / 2;

                return (
                  <g key={`traj-${inc.id}`} className="pointer-events-none opacity-80">
                    <line
                      x1={unit.coordinates.x}
                      y1={unit.coordinates.y}
                      x2={coords.x}
                      y2={coords.y}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <rect
                      x={midX - 22}
                      y={midY - 7}
                      width="44"
                      height="14"
                      rx="3"
                      fill="#0f172a"
                      stroke="#0284c7"
                      strokeWidth="0.8"
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      fill="#7dd3fc"
                      fontSize="7.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      ETA 1.5m
                    </text>
                  </g>
                );
              })}

            {/* Active Incident Urgency Pins */}
            {showIncidents &&
              activeIncidents.map((inc) => {
                // Find location coords
                let coords = { x: 500, y: 300 };
                if (inc.camera_id && CAMERA_COORDINATES[inc.camera_id]) {
                  coords = CAMERA_COORDINATES[inc.camera_id];
                } else if (inc.location_id && ZONE_LAYOUTS[inc.location_id]) {
                  coords = {
                    x: ZONE_LAYOUTS[inc.location_id].labelX,
                    y: ZONE_LAYOUTS[inc.location_id].labelY + 28,
                  };
                }

                const isCrit = inc.priority_level === "critical";
                const isHigh = inc.priority_level === "high";
                const pinColor = isCrit ? "#f43f5e" : isHigh ? "#f59e0b" : "#3b82f6";

                return (
                  <g
                    key={inc.id}
                    onClick={() => onSelectIncident(inc.id)}
                    className="cursor-pointer group"
                  >
                    <title>{`${inc.title} — Priority ${inc.priority_score.toFixed(0)} (${inc.priority_level.toUpperCase()})`}</title>
                    {/* Invisible stable hit target to completely prevent jittering/flicker */}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r="22"
                      fill="transparent"
                      className="cursor-pointer"
                    />
                    {/* Hover Glow Aura (highlights smoothly without shifting coordinates) */}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r="15"
                      fill={pinColor}
                      opacity="0"
                      className="pointer-events-none transition-opacity duration-150 group-hover:opacity-40"
                    />
                    {/* Pulsing ring for critical/high */}
                    {(isCrit || isHigh) && (
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r="16"
                        fill="none"
                        stroke={pinColor}
                        strokeWidth="1.5"
                        opacity="0.6"
                        className="pointer-events-none"
                      />
                    )}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r="9"
                      fill={pinColor}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="pointer-events-none transition-all duration-150 group-hover:stroke-2"
                    />
                    <circle cx={coords.x} cy={coords.y} r="3.5" fill="#ffffff" className="pointer-events-none" />
                    <text
                      x={coords.x}
                      y={coords.y + 19}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      stroke="#0f172a"
                      strokeWidth="2"
                      paintOrder="stroke"
                      className="pointer-events-none select-none"
                    >
                      {inc.priority_score.toFixed(0)}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        {/* Right Column: Zone Inspector */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-500 text-xs tracking-normal font-semibold">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>Selected Sector</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mt-1">
                {selectedZone.name}
              </h3>
              <p className="text-[13px] text-slate-600 mt-1 leading-normal">
                {selectedZone.description || "Designated zone in Sime Darby Property township plan."}
              </p>
            </div>

            {/* Zone Active Incidents */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pb-2 border-b border-slate-100">
                <span>Active Incidents in Sector</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                  {zoneIncidents.length}
                </span>
              </div>

              {zoneIncidents.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  No active incidents in this sector.
                </div>
              ) : (
                <div className="space-y-2 mt-2 max-h-52 overflow-y-auto pr-1">
                  {zoneIncidents.map((inc) => {
                    const prio = getPriorityStyles(inc.priority_level);
                    return (
                      <div
                        key={inc.id}
                        onClick={() => onSelectIncident(inc.id)}
                        className="p-2.5 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className={prio.pill}>
                            {prio.label} ({inc.priority_score.toFixed(0)})
                          </span>
                          <span className="text-xs text-slate-400 tabular-nums">
                            {formatTimeAgo(inc.detected_at)}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-900 mt-1 truncate">
                          {inc.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Zone Assigned Cameras */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pb-2 border-b border-slate-100">
                <span>Assigned CCTV Feeds</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                  {zoneCameras.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                {zoneCameras.map((cam) => (
                  <div key={cam.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-xs">{cam.id}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {cam.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone Assigned Emergency Response Unit */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pb-2 border-b border-slate-100">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-sky-600" />
                  Assigned Emergency Response Unit
                </span>
                <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold text-xs">
                  Sector Unit
                </span>
              </div>

              {(() => {
                const sectorUnit =
                  AUXILIARY_PATROL_FLEET.find((u) => u.assignedZoneId === selectedZoneId) ||
                  AUXILIARY_PATROL_FLEET[0];
                return (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mt-2 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <span>{sectorUnit.callsign}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {sectorUnit.status === "on_patrol" ? "On Patrol" : "Available"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Officer: <span className="font-medium text-slate-800">{sectorUnit.officerInCharge}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {sectorUnit.vehicleModel} &bull; Plate {sectorUnit.plateNumber}
                    </div>
                    <div className="pt-1.5 flex items-center justify-between border-t border-slate-200 text-xs">
                      <span className="text-slate-500 tabular-nums text-xs">{sectorUnit.gpsLocation}</span>
                      <a
                        href={`tel:${sectorUnit.contactNumber}`}
                        className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 text-xs"
                      >
                        <PhoneCall className="w-3 h-3" />
                        Call Unit
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-400 leading-tight">
              Interactive schematic aligned with Sime Darby Property digital masterplan framework.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
