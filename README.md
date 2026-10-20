# Township Guardian AI

> **Intelligent Township Incident Prioritization & Emergency Response Coordination Platform**  
> **Competition:** Sime Darby Property University Hackathon 2026  
> **Theme:** Township of Tomorrow  
> **Category:** PEOPLE — Safety & Security  

---

## 1. Overview

In modern master-planned communities like Sime Darby Property's City of Elmina or Bandar Bukit Raja, security command centers are inundated with alerts across dozens of CCTV feeds. Traditional monitoring platforms present incidents in simple chronological order, leading to alert fatigue and delayed responses during critical life-safety emergencies.

**Township Guardian AI** solves this through **Dynamic Incident Intelligence**:
1. **Multi-Factor Relative Urgency:** Rather than sorting by timestamps or fixed static scores, the engine continuously calculates relative urgency across all concurrent incidents using a standardized 4-dimension formula.
2. **Dynamic Re-ranking on Evolving Evidence:** When follow-up CCTV frames or operator notes arrive, the engine recalculates priorities in real time, promoting urgent threats (e.g. an unresponsive fall victim) to the top of the queue via live Server-Sent Events (SSE).
3. **Plain-Language Explainability:** Replaces obscure machine learning metrics with human-oriented situational explanations and advisory response actions.
4. **Human-in-the-Loop Governance:** Preserves complete operator authority with full acknowledgment, assignment, action logging, manual priority overrides, and immutable audit logs.
5. **Authentic Computer Vision (Mode B):** Runs real OpenCV pedestrian frame extraction and temporal posture-heuristic fall detection with candidate review streams.

---

## 2. Platform Architecture

```
SimeDarbyAIDetector/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers (incidents, platform, videos)
│   │   ├── services/        # Prioritization engine, queue sorting, recommendations, demo
│   │   ├── vision/          # OpenCV HOG detector, temporal posture heuristic
│   │   ├── database.py      # SQLite engine with strict UTC datetime handling
│   │   ├── models.py        # 9 ORM entities (Location, Camera, Incident, AuditLog, etc.)
│   │   └── config.py        # Pydantic environment configuration
│   └── tests/               # 70 unit and integration tests (100% passing)
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js 16 App Router (page.tsx, layout.tsx, globals.css)
│   │   ├── components/
│   │   │   ├── layout/      # Sidebar.tsx, TopHeader.tsx
│   │   │   ├── views/       # 7 views: Overview, Incidents, Map, Video, History, Analytics, Demo
│   │   │   ├── modals/      # IncidentDetailModal.tsx
│   │   │   └── ui/          # Badge, Button, Card, Modal
│   │   ├── lib/             # API client, SSE subscriber, date/time and styling utils
│   │   └── types/           # Complete TypeScript domain schemas
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
**Test Results:** `70 passed in 1.42s` (100% coverage across prioritization, queue hysteresis, workflows, API, demo scenarios, and OpenCV video pipeline).

---

## 5. Live Demonstration Walkthrough (Spec §15)

The application includes built-in one-click scenario runners in the top navigation bar and on the Overview view:

1. **Scenario A: Multi-Incident Concurrency**
   - Click **"Quick Demo: A. Simultaneous"**.
   - Ingests 3 incidents at the exact same timestamp (Road collision at Main Gate, Person down at Lakeside, Parking obstruction at Mall).
   - Shows how multi-factor prioritization immediately identifies the life-safety threat as Rank #1.

2. **Scenario B: Dynamic Evidence Escalation**
   - Click **"Quick Demo: B. Dynamic Escalate"**.
   - Injects follow-up CCTV evidence: the victim has remained motionless for over 90 seconds without bystanders.
   - The engine elevates the priority score, promotes the incident to Rank #1, and broadcasts an SSE queue event that re-orders the queue live on screen.

3. **Scenario C: Operator Response Workflow**
   - Click on the #1 Incident card to open the **Incident Inspector**.
   - Acknowledge the alert, assign the **On-site First-Aid Team**, and record an operational action log.
   - Review the complete chronological timeline and audit trail.

4. **Scenario D: False Positive Dismissal**
   - Close a non-issue detection with mandatory justification, preserving audit integrity in SQLite.

5. **Mode B: Real Video Upload & Candidate Review**
   - Navigate to **"CCTV & Video Analysis"** in the sidebar.
   - Upload any CCTV video clip (.mp4, .avi, .mov).
   - Inspect extracted frames, posture-heuristic detections, and click **"Accept & Prioritize"** to convert a candidate into a live incident.

6. **Interactive Township Map**
   - Navigate to **"Township Map"** to inspect the 6 master-planned sectors (City of Elmina schematic), 10 camera feeds, and pulsing urgency pins.

7. **Reset Baseline State**
   - Click **"Reset"** at any time to clean up simulated records and restore the pristine reference baseline.

---

## 6. Technical Stack & Integrity Commitments

- **Backend:** FastAPI, Python 3.9, SQLite, SQLAlchemy, OpenCV (`opencv-python-headless 4.14.0`), Server-Sent Events (SSE).
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts.
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
