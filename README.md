# GlobalEye

> **Intelligent Township Incident Prioritization & Emergency Response Coordination Platform**  
> *(Formerly Township Guardian AI)*  
> **Competition:** Sime Darby Property University Hackathon 2026  
> **Theme:** Township of Tomorrow  
> **Category:** PEOPLE — Safety & Security  

---

## 1. Overview

In modern master-planned communities like Sime Darby Property's City of Elmina or Bandar Bukit Raja, security command centers are inundated with alerts across dozens of CCTV feeds. Traditional monitoring platforms present incidents in simple chronological order, leading to alert fatigue and delayed responses during critical life-safety emergencies.

**GlobalEye** solves this through **Dynamic Incident Intelligence**:
1. **Multi-Factor Relative Urgency:** Rather than sorting by timestamps or fixed static scores, the engine continuously calculates relative urgency across all concurrent incidents using a standardized 4-dimension formula.
2. **Dynamic Re-ranking on Evolving Evidence:** When follow-up CCTV frames or operator notes arrive, the engine recalculates priorities in real time, promoting urgent threats (e.g. an unresponsive fall victim) to the top of the queue via live Server-Sent Events (SSE).
3. **Plain-Language Explainability:** Replaces obscure machine learning metrics with human-oriented situational explanations and advisory response actions.
4. **Human-in-the-Loop Governance:** Preserves complete operator authority with full acknowledgment, assignment, action logging, manual priority overrides, and immutable audit logs.
5. **Multimodal AI Vision Engine (Gemini 3.5 Flash Lite):** Integrates Google Gemini multimodal vision (`gemini-3.5-flash-lite` with fallback chain) for zero-shot recognition of road collisions, pedestrian falls, fire/smoke, and parking obstructions from CCTV video frames, automatically promoting detections into the active incident queue.
6. **In-Modal CCTV Surveillance Player:** Security operators can review and watch the actual uploaded CCTV video footage directly in the incident inspector with 1-click "Jump to Detection Point" quick-seek.
7. **Authentic Computer Vision Baseline (Mode B):** Runs real OpenCV pedestrian frame extraction and temporal posture-heuristic fall detection with candidate review streams.
8. **One-Click Pre-packaged Demo Footage:** Built-in sample CCTV video for instant evaluation without requiring external video files.
9. **Incident History Governance:** Instant audit-safe history clearing and CSV export for shift transitions.
10. **Official Vector Brand Identity System:** Custom-engineered "Horizon Apex" logo and icon system communicating panoramic vision, spatial awareness, and triage prioritization.

---

## 2. Platform Architecture

```
SimeDarbyAIDetector/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers (incidents, platform, videos, config)
│   │   ├── services/        # Prioritization engine, queue sorting, recommendations, video service
│   │   ├── vision/          # OpenCV HOG detector, posture heuristic, and Gemini multimodal analyzer
│   │   ├── database.py      # SQLite engine with strict UTC datetime handling
│   │   ├── models.py        # 9 ORM entities (Location, Camera, Incident, AuditLog, etc.)
│   │   └── config.py        # Pydantic environment configuration (with Gemini API runtime settings)
│   ├── samples/             # Bundled sample CCTV footage (.mp4) for 1-click test
│   └── tests/               # 74 unit and integration tests (100% passing)
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js 16 App Router (page.tsx, layout.tsx, icon.svg)
│   │   ├── components/
│   │   │   ├── brand/       # GlobalEyeLogo.tsx (reusable vector logo system component)
│   │   │   ├── layout/      # Sidebar.tsx, TopHeader.tsx
│   │   │   ├── views/       # 7 views: Overview, Incidents, Map, Video, History, Analytics, Demo
│   │   │   ├── modals/      # IncidentDetailModal.tsx (with embedded CCTV video player)
│   │   │   └── ui/          # Badge, Button, Card, Modal
│   │   ├── lib/             # API client, SSE subscriber, date/time and styling utils
│   │   └── types/           # Complete TypeScript domain schemas
│   └── public/
│       ├── brand/           # Official SVG brand assets (logo, symbol, mono, light, dark, favicon)
│       └── samples/         # Downloadable sample CCTV clip for evaluation
│
└── docs/                    # Architecture, API specifications, Feature matrix, Demo script
```

---

## 3. Prioritization Mathematical Formula

The prioritization engine evaluates each incident across four orthogonal dimensions normalized to $[0, 100]$:

$$\text{Priority Score} = (0.40 \times \text{Severity}) + (0.25 \times \text{Immediacy}) + (0.20 \times \text{PeopleAtRisk}) + (0.15 \times \text{SecondaryHazard})$$

- **Severity (40%):** Inherent hazard severity (e.g., Cardiac arrest / fall: 75, Vehicle collision: 65, Illegal dumping: 20).
- **Immediacy (25%):** Time-sensitive progression (e.g., motionless $>60\text{s}$: $+20$, lake edge proximity: $+15$).
- **People at Risk (20%):** Vulnerability assessment ($0$ bystanders: high vulnerability, crowd exposure: $+25$).
- **Secondary Hazard (15%):** Environmental or egress obstruction (e.g., blocked emergency gate, water hazard).
- **Hysteresis Smoothing ($\Delta \ge 2.0$):** Prevents queue jumping from micro-fluctuations.
- **Emergency Floor Rules:** Confirmed threats to human life enforce a minimum score of $85.0$ and trigger the Emergency Tier.

---

## 4. Quickstart Guide

### Prerequisites
- Python 3.9+ (tested with Python 3.9.6)
- Node.js 18+ (tested with Node 26.10.0 / npm 11.19.1)

### Step 1: Run the Backend
```bash
cd backend

# Create virtual environment & install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run FastAPI server on port 8000
uvicorn app.main:app --port 8000
```
Backend will be available at: `http://127.0.0.1:8000` (API docs at `http://127.0.0.1:8000/docs`).

### Step 2: Run the Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open your browser and navigate to: **`http://localhost:3000`**

### Step 3: Run the Test Suite
```bash
cd backend
.venv/bin/pytest -v
```
**Test Results:** `74 passed in 1.62s` (100% coverage across prioritization, queue hysteresis, workflows, API, clear history, demo scenarios, Gemini vision integration, and OpenCV video pipeline).

---

## 5. Live Demonstration Walkthrough — Version 2.0 Suite

The application includes the updated **Version 2.0 Demonstration Suite** accessible from the **Overview Dashboard** (right-column demo panel) and **Demo Scenarios & Prioritization Weights** tab:

1. **Scenario 1: Multi-Sector Concurrency (The Morning Rush)**
   - Click **Run** on **"1. Multi-Sector Concurrency"**.
   - Ingests 3 incidents at the exact same timestamp across City of Elmina sectors:
     - `CAM-GATE-01` (Main Entry Boulevard): 2-vehicle collision blocking roundabout approach.
     - `CAM-PROM-02` (Lakeside Promenade): Person down on lake-edge path.
     - `CAM-MALL-01` (Commercial Precinct): Delivery van parked across 2 bays.
   - Shows how the 4-factor relative urgency engine immediately ranks the life-safety threats (#1 and #2) above property/traffic infractions (#3) regardless of timestamp.

2. **Scenario 2: Dynamic Telemetry Escalation (Life-Safety Emergency Floor)**
   - Click **Run** on **"2. Telemetry Escalation"**.
   - Injects follow-up CCTV evidence on `CAM-PROM-02`: the subject has remained motionless for over 90 seconds without bystanders next to deep water.
   - The engine triggers `R-FALL-PERSISTENT`, enforcing the Emergency Floor score ($\ge 85.0$), promoting the incident to **Rank #1**, and broadcasting a real-time SSE event that re-orders the queue live on screen without page refresh.

3. **Scenario 3: Gemini 3.5 Flash Lite Multimodal Video Intelligence**
   - Navigate to **"CCTV & Video Analysis"** in the sidebar.
   - Click **"1-Click Test: Load Sample Clip"** or upload your own real surveillance clip (`car_accident.mp4`, etc.).
   - Google Gemini Multimodal Vision (`gemini-3.5-flash-lite`) extracts keyframes, performs multimodal scene reasoning, classifies the collision/fall, extracts structured evidence, and auto-promotes the candidate directly into the **Active Incident Queue**!

4. **Scenario 4: In-Modal CCTV Surveillance Video Player & 24.0s Fast-Seek**
   - Click the promoted video incident to open the **Incident Detail Inspector**.
   - Watch the actual CCTV surveillance video stream directly in the browser via HTML5 byte-range streaming.
   - Click **"Jump to Detection Point (24.0s)"** to immediately scrub playback to the exact second of collision/fall impact.
   - Toggle seamlessly between **Watch CCTV Footage** and **Keyframe Evidence** (annotated AI HUD).

5. **Scenario 5: Operator Response, Override & Shift Handover Governance**
   - In the inspector, click **"Acknowledge Alert"**, assign the **On-site First-Aid Team**, and record operational action logs.
   - Demonstrate **Manual Priority Override**: adjust priority tier with a mandatory operator rationale field permanently recorded to the SQLite audit log.
   - Navigate to **"Incident Archive"** and demonstrate **Shift Handover Governance**: purge active memory with **"Clear History"** for the incoming shift while preserving all audit trails, and export a complete compliance CSV.

6. **Scenario 6: Safety Invariance & Uncertainty Handling (Low-Confidence Fire)**
   - Click **Run** on **"6. Safety Invariant (Fire)"**.
   - Simulates a low-confidence smoke detection near residential blocks (`CAM-RESA-02`, confidence: 0.41).
   - Proves GlobalEye's **Safety Invariance Principle**: AI uncertainty flags `needs_verification = True` to request human review, but **never down-ranks life-safety urgency**.

7. **Interactive City of Elmina Township GIS Map**
   - Navigate to **"Township Map"** to inspect the 6 master-planned sectors, 10 camera feeds, and pulsing urgency pins positioned at exact geographic coordinates with jitter-free tooltips.

8. **Reset Baseline State**
   - Click **"Reset Baseline State"** at any time to purge simulated test records and restore the pristine reference baseline state.

---

## 6. Technical Stack & Integrity Commitments

- **Backend:** FastAPI, Python 3.9, SQLite, SQLAlchemy 2, OpenCV (`opencv-python-headless 4.14.0`), Google Gemini Multimodal REST API (`gemini-3.5-flash-lite`), Server-Sent Events (SSE).
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, HTML5 Video Streaming.
- **Brand Identity:** Custom-engineered vector SVG system (`/public/brand/`) with accessible `<GlobalEyeLogo>` React component.
- **Enterprise Design Direction:** Clean, human-centred security operations center aesthetic. No generic AI glowing borders, floating cards, or robot emojis. High contrast, clear hierarchy, and accessible density.
- **Visual Honesty:** No fabricated CCTV feeds or artificial response times. Every button performs its stated action against the SQLite backend, and simulated alerts are explicitly badged `[SIMULATED]`.

---

## 7. Documentation Index

- [System Architecture & Mathematics](docs/ARCHITECTURE.md)
- [REST & SSE API Specification](docs/API.md)
- [Feature Catalog & Requirements Matrix](docs/FEATURES.md)
- [Hackathon Presentation Script (90-120s)](docs/DEMO_SCRIPT.md)
- [Engineering Decisions Log](DECISIONS.md)
- [Task Tracker](TASKS.md)
- [Progress Log](PROGRESS.md)
