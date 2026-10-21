# GlobalEye — Expandable Incident Taxonomy & Multi-Source Architecture

This document defines the structured, extensible incident management taxonomy for **Township Guardian AI / GlobalEye**, covering human safety, security, wildlife, infrastructure, environmental, utility, traffic, property, and operational incidents.

---

## 1. Multi-Source Detection Methodology (Requirement #4)

GlobalEye explicitly distinguishes between detection methods rather than claiming a single computer-vision model can detect everything:

| Detection Method | Description | Example Categories |
| :--- | :--- | :--- |
| **`cctv_vision`** | Multimodal Vision-Language Models (Google Gemini 1.5 Flash) and specialized frame heuristics. | `fire_smoke`, `wildlife_intrusion`, `restricted_area_intrusion`, `person_fall`, `road_collision`, `illegal_dumping` |
| **`iot_telemetry`** | Subsurface acoustic sensors, flow meters, water level pressure transducers, smoke alarms, vibration sensors. | `pipe_burst_leakage`, `flash_flood`, `lift_entrapment`, `power_outage_electrical`, `gas_leak_explosion_risk` |
| **`human_report`** | Community resident mobile app submissions, auxiliary security patrols, township hotline calls. | `medical_emergency`, `physical_altercation`, `unauthorized_trespass`, `vandalism` |
| **`external_integration`** | Malaysian Meteorological Dept (METMalaysia) storm warnings, municipal water board / TNB grid API. | `flash_flood`, `power_outage_electrical`, `fallen_tree_storm_damage` |
| **`multi_source_correlated`** | Cascading correlation between sensor readings, vision feeds, and emergency calls. | `pipe_burst_leakage` $\to$ `flash_flood`, `road_collision` $\to$ `parking_obstruction` |
| **`manual_entry`** | Control room supervisor manual incident dispatch for novel or dynamic township hazards. | `custom_safety_hazard` |

---

## 2. Six Distinct Incident Lifecycle States (Requirement #5)

Every incident transitions through explicit lifecycle states:

1. **`detected`**: Telemetry or computer vision evidence indicates a potential active incident.
2. **`suspected`**: An event may be occurring but requires verification due to low sensor confidence or missing corroboration.
3. **`sensor_reported`**: An automated IoT sensor or infrastructure telemetry node reported an abnormal condition.
4. **`human_reported`**: An on-site resident, security guard, or visitor submitted a direct report.
5. **`confirmed`**: An authorized control room operator or human responder verified the incident.
6. **`false_positive`**: An authorized reviewer inspected the telemetry/feed and marked it as a false alarm with an audit trail note.

---

## 3. Comprehensive Incident Catalogue

### Domain 1: Human Safety & Medical Emergencies
- **`person_fall`**: Pedestrian collapse, slip, or motionless state (> 15s) on pavement, road, or stairs. Default Severity: **Critical**.
- **`medical_emergency`**: Cardiac arrest, heatstroke, or physical distress in public township squares. Default Severity: **Critical**.
- **`drowning_water_distress`**: Water distress in retention ponds, lakeside promenades, or community swimming pools. Default Severity: **Critical**.

### Domain 2: Violence, Security & Restricted Area Intrusion
- **`restricted_area_intrusion`**: Unauthorized persons on commercial rooftop ledges, electrical substations, or construction fences. Default Severity: **Critical**.
- **`physical_altercation`**: Violent assault, brawl, or public affray. Default Severity: **High**.
- **`unauthorized_trespass`**: Perimeter security fence breach, tailgating, or forced entry. Default Severity: **High**.

### Domain 3: Wildlife & Animal Hazards
- **`wildlife_intrusion`**: Wild boars, aggressive macaques, venomous snakes (cobras/vipers), or monitor lizards in residential roads or parks. Default Severity: **High**.

### Domain 4: Fire, Smoke & Explosion Hazards
- **`fire_smoke`**: Open flames, thick smoke plume, grass fire, or thermal hazard. Default Severity: **Critical**.
- **`gas_leak_explosion_risk`**: Flammable gas concentration or LPG odor near commercial kitchens or residences. Default Severity: **Critical**.

### Domain 5: Water Supply, Plumbing & Drainage Failures
- **`pipe_burst_leakage`**: Subsurface main pipe rupture causing high-pressure gushing and road subsidence. Default Severity: **High**.
- **`drainage_blockage`**: Debris or silt blocking primary monsoon stormwater culvert before storm. Default Severity: **Medium**.

### Domain 6: Flooding, Severe Weather & Natural Hazards
- **`flash_flood`**: Rapid roadway inundation, retention pond overflow, or underpass flooding. Default Severity: **Critical**.
- **`fallen_tree_storm_damage`**: Uprooted trees blocking primary boulevards or impacting utility poles after storm. Default Severity: **High**.

### Domain 7: Road Accidents, Traffic & Parking
- **`road_collision`**: Vehicle crash, car/motorcycle collision, or pedestrian impact. Default Severity: **High**.
- **`parking_obstruction`**: Vehicle illegally blocking fire hydrants or designated emergency egress gates. Default Severity: **Low** (escalates to High if emergency route blocked).

### Domain 8: Smart Utilities, Lifts & Energy Infrastructure
- **`lift_entrapment`**: Elevator stalled between floors with trapped occupants. Default Severity: **Critical**.
- **`power_outage_electrical`**: Substation breaker trip, streetlamp blackout, or exposed live wires. Default Severity: **High**.

### Domain 9: Waste, Sanitation & Environmental Pollution
- **`illegal_dumping`**: Commercial lorry dumping hazardous waste, chemicals, or bulk debris in township reserves. Default Severity: **Medium**.

### Domain 10: Operational & Administrator-Defined
- **`custom_safety_hazard`**: Operator-defined dynamic township hazard not matching pre-existing categories. Default Severity: **Medium**.

---

## 4. Incident Correlation Engine (Requirement #8)

Cascading multi-event relationships are automatically detected:
1. **`CORR-WATER-FLOOD`**: Water main burst (`pipe_burst_leakage`) followed by downstream road flooding (`flash_flood`).
2. **`CORR-RAIN-SURGE`**: Storm fallen tree (`fallen_tree_storm_damage`) correlated with flash flooding (`flash_flood`).
3. **`CORR-SMOKE-FIRE`**: Early smoke plume alert corroborated by thermal fire alarm (`fire_smoke`).
4. **`CORR-CRASH-EGRESS`**: Roadway collision (`road_collision`) blocking an emergency access route (`parking_obstruction`).

---

## 5. Google Gemini Multimodal Vision Integration

- Video clips uploaded in the browser are decoded into chronological base64 keyframes using HTML5 Canvas.
- Frames are transmitted to Google's Gemini Vision API (`gemini-1.5-flash` with fallback to `gemini-2.0-flash`).
- Gemini performs multimodal reasoning across the frame sequence to determine:
  - Exact hazard category (fire, wildlife, rooftop intrusion, collapse, collision)
  - Specific descriptive title describing actual scene content
  - Detailed visual summary of subjects, animals, vehicles, and actions
  - Confidence percentage and timestamp
- API keys can be provided via environment variables (`NEXT_PUBLIC_GEMINI_API_KEY` / `GEMINI_API_KEY`) or pasted directly into the in-app Gemini API Key Modal, saved securely to `localStorage`.
