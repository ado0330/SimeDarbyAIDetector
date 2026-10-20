# Township Guardian AI — Feature Catalog & Requirements Matrix

This document maps the implementation against the Sime Darby Property Hackathon 2026 requirements.

---

## 1. Hackathon Alignment

| Criteria | Specification | Township Guardian AI Implementation |
| :--- | :--- | :--- |
| **Theme** | Township of Tomorrow | Multi-zone master-planned smart security operations center. |
| **Category** | PEOPLE — Safety & Security | Prioritizes human life-safety (pedestrian down, collisions) over property or traffic issues. |
| **Operating Modes** | Simulation & Video Analysis | **Mode A:** Deterministic 4-scenario simulation engine.<br>**Mode B:** OpenCV HOG pedestrian detector + temporal aspect-ratio fall heuristic. |
| **Design Direction** | Human-Centred Enterprise Security | Restrained dark navy / slate palette, high information density, clear hierarchy, no generic AI glowing cards or emojis. |

---

## 2. Core Functional Capabilities

### A. Dynamic Incident Intelligence
- **Multi-Factor Relative Urgency:** Uses 4 standardized dimensions: Severity (40%), Immediacy (25%), People at Risk (20%), Secondary Hazard (15%).
- **Emergency Floor Overrides:** Direct life safety threats immediately jump to the top tier with score $\ge 85.0$ and visual badging.
- **Queue Hysteresis ($\Delta \ge 2.0$):** Eliminates erratic queue jumping from minor sensor fluctuations.
- **Plain-Language Rationale:** Translates score math into concise operator sentences (e.g., *"High priority: A person has fallen near the vehicle entrance and has remained motionless for >60s."*).
- **Advisory Recommendations:** Generates role-based next steps while preserving operator dispatch authority.

### B. Control Room Operations Dashboard
- **Operational KPIs:** Active Incidents, Critical Urgency Count, Awaiting Ack, Average Response Time.
- **#1 Priority Spotlight:** Distinct visual treatment for the most critical active event.
- **Incident Queue Table:** Real-time table with rank pills (`#1`, `#2`), category badges, location, age, detection confidence, and quick action buttons.
- **Interactive Township Map:** High-contrast SVG schematic of Sime Darby Property zones (6 sectors: Central Lake, Main Gate, Commercial Hub, Precincts A & B, Sports Complex) with 10 cameras and urgency-coded pulsing pins.
- **Incident Detail Inspector Modal:**
  - Dynamic intelligence explanation & advisory recommendations
  - Mathematical scoring factor contributions table
  - Chronological event timeline
  - Immutable audit trail
  - Action buttons: Acknowledge, Assign Responder, Record Action, Override Priority, Resolve, Reopen.

### C. Mode B: Video Analysis & Human-in-the-Loop Review
- **Video Upload:** Drag-and-drop support for MP4, AVI, MOV clips with camera tagging.
- **OpenCV Computer Vision Worker:** Samples frames, runs HOG pedestrian detection, and calculates aspect-ratio stillness heuristics.
- **Event Candidate Stream:** Displays detected frames with bounding box, timestamp, and confidence.
- **Human Verification:** Operators can review candidates before prioritizing:
  - *Accept:* Immediately feeds candidate into the prioritization engine as a live incident.
  - *Reject:* Logs false alarm to audit and discards from active queue.

### D. Incident History, Audit & Reporting
- **Searchable Historical Archive:** Filter by category, resolution outcome, and date range.
- **CSV Data Export:** One-click CSV download of incident records for township management reporting.
- **Immutable Audit Trail:** All operator actions, priority overrides, and evidence updates are permanently recorded in SQLite.
- **Performance Analytics:** Category frequency breakdown, priority distribution, and mean acknowledgment time derived strictly from real persisted records.

### E. Deterministic Hackathon Demo Suite
- **Scenario A (Simultaneous Concurrency):** Ingests 3 incidents at the exact same second to demonstrate multi-factor prioritization.
- **Scenario B (Dynamic Escalation):** Injects evolving evidence on Person Fall; priority score jumps and re-ranks incident to #1 live via SSE.
- **Scenario C (Operator Response):** Acknowledges, assigns patrol responder, and resolves incident.
- **Scenario D (False Positive Audit):** Dismisses candidate with mandatory justification note.
- **One-Click Reset:** Clears transient simulation records back to clean reference baseline.
