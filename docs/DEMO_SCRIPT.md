# GlobalEye — Hackathon Presentation & Live Demo Script (Version 2.0)

> **Sime Darby Property Hackathon: Township of Tomorrow**  
> **Track:** PEOPLE Pillar — Safety, Security & Community Resilience  
> **Platform Version:** GlobalEye v2.0 (Google Gemini 3.5 Flash Lite Multimodal AI, Forensic CCTV Video Player, City of Elmina Spatial GIS, Shift Handover Governance)  
> **Target Duration:** 90 – 120 seconds (with optional 3-minute extended judging deep dive)  
> **Target Audience:** Sime Darby Property Judges, Technical Evaluators & SOC Command Leadership  

---

## Executive Summary & Innovation Matrix

| Innovation Dimension | Traditional Township Security | GlobalEye v2.0 Platform |
| :--- | :--- | :--- |
| **Alert Triage** | Chronological FIFO list (first-come, first-served) | **4-Factor Relative Urgency Scoring Engine** |
| **Evolving Evidence** | Static alert once created; ignores follow-up frames | **Live SSE Dynamic Re-ranking & Life-Safety Floor** |
| **Vision Intelligence** | Human eye-fatigue staring at 60+ video walls | **Google Gemini 3.5 Flash Lite Multimodal AI Vision** |
| **Video Verification** | Slow scrub through separate VMS software | **In-Modal Streaming CCTV Player with 24.0s Fast-Seek** |
| **Spatial Awareness** | Disconnected camera names (e.g. "Ch 04") | **City of Elmina Canonical GIS Map with Sector Health** |
| **Governance & Audit** | Unaudited radio calls or paper logs | **Immutable SQLite Audit Log & Shift Handover CSV Export** |

---

## Presenter Preparation Checklist (Before Entering the Room)

- [ ] **Clean Baseline State:** Open **Demo Scenarios & Prioritization Weights** tab (or Overview) and click **"Reset Baseline State"**.
- [ ] **Verify Services:** Ensure FastAPI backend (`http://127.0.0.1:8000`) and Next.js frontend (`http://localhost:3000`) are running.
- [ ] **SSE Stream Check:** Green indicator dot in top-right reads *"SSE Queue Stream Active"*.
- [ ] **Audio/Screen Resolution:** Optimal display resolution 1920×1080 (100% zoom).

---

## 90-Second Rapid-Pitch Script (The Winning Walkthrough)

### ACT 1: The Township Security Dilemma (0:00 – 0:20)
*Screen: Overview Dashboard (`/`)*

> **Presenter Narration:**  
> *"Good morning, judges. When managing a flagship master-planned township like Sime Darby's City of Elmina, central security command centers face a silent crisis: **Alert Fatigue and Priority Blindness**.*  
>  
> *When dozens of CCTV feeds detect illegal dumping, a blocked parking bay, and a medical collapse around the same minute, conventional dashboards simply stack them in chronological order. Operators waste precious minutes figuring out what requires immediate human attention.*  
>  
> *Introducing **GlobalEye** — an intelligent township incident prioritization and response coordination platform built specifically for Sime Darby Property communities."*

---

### ACT 2: Scenario 1 — Multi-Sector Concurrency (0:20 – 0:42)
*Action: Under **Demo Scenarios (v2.0)** on the right, click **Run** on **"1. Multi-Sector Concurrency"**.*

> **Presenter Narration:**  
> *"Watch our core differentiator: **Dynamic Relative Urgency Intelligence**.  
> We just ingested 3 simultaneous incidents across City of Elmina sectors at the exact same second:  
> 1. A two-vehicle collision at the Main Gate roundabout (`CAM-GATE-01`),  
> 2. A person down on the Lakeside Promenade jogging path (`CAM-PROM-02`),  
> 3. A delivery van blocking a bay at the Commercial Precinct (`CAM-MALL-01`).  
>  
> Rather than sorting by arrival time, our mathematical engine evaluated four weighted dimensions: **Severity (40%), Immediacy (25%), People at Risk (20%), and Secondary Hazards (15%)**.*  
>  
> *Notice the result: the vehicle collision and medical emergency immediately rank #1 and #2, while the parking obstruction drops to the bottom. Life and transit safety always outrank property inconveniences."*

---

### ACT 3: Scenario 2 — Dynamic Telemetry Escalation (0:42 – 1:02)
*Action: Under **Demo Scenarios (v2.0)**, click **Run** on **"2. Telemetry Escalation"**.*

> **Presenter Narration:**  
> *"In real township operations, evidence evolves as cameras stream new frames. Watch the queue live:  
> Follow-up camera telemetry at Lakeside Promenade (`CAM-PROM-02`) detects that the victim has remained completely motionless for over 90 seconds beside deep water with no bystanders nearby.  
>  
> Our engine triggers life-safety rule `R-FALL-PERSISTENT`, enforcing an **Emergency Floor score of 85+**.  
> Instantly, over a real-time Server-Sent Events stream, the medical incident re-ranks straight to **Rank #1** with an Emergency Override badge — without the operator ever refreshing the browser!"*

---

### ACT 4: Scenario 3 & 4 — Gemini Multimodal AI & In-Modal CCTV Player (1:02 – 1:32)
*Action 1: Click **"CCTV Video Analysis"** in the sidebar. Click **"1-Click Test: Load Sample Clip"** (or show analyzed car collision).*  
*Action 2: Click the incident to open the **Incident Detail Inspector** modal.*  
*Action 3: Point to the video player, then click the **"Jump to Detection Point (24.0s)"** button.*

> **Presenter Narration:**  
> *"GlobalEye is not just a simulation — it runs our **Google Gemini 3.5 Flash Lite Multimodal AI Vision Pipeline**.  
> When CCTV clips are ingested, Gemini extracts keyframes, performs multimodal scene reasoning, detects vehicle impacts and person falls, and automatically promotes structured candidates to the active queue.  
>  
> Even better, we built an **In-Modal CCTV Surveillance Video Player** directly into the inspector.  
> With our dual-mode switcher, operators can toggle between raw video footage and AI keyframe bounding boxes.  
> And watch this: clicking **'Jump to Detection Point (24.0s)'** instantly scrubs the video player directly to the exact moment of impact! Operators can forensically verify automated alerts in under 3 seconds."*

---

### ACT 5: Scenario 5 — Operator Triage, Emergency Override & Shift Handover (1:32 – 1:52)
*Action 1: In the modal, click **"Acknowledge Alert"**, then assign **"On-site First-Aid Team"**.*  
*Action 2: Briefly click **"Override Priority"**, showing the mandatory rationale field.*  
*Action 3: Navigate to **"Incident Archive"** in the sidebar. Highlight **"Clear History"** and **"Export CSV"**.*

> **Presenter Narration:**  
> *"GlobalEye strictly adheres to human-in-the-loop governance: AI advises, humans decide.  
> The operator acknowledges the alert, assigns the dedicated On-site First-Aid Team, and logs operational notes.  
> If field conditions differ, operators can execute a **Manual Priority Override** — requiring a mandatory rationale that is permanently logged to our immutable SQLite audit trail.  
>  
> At the end of a shift, our **Shift Handover Governance** allows incoming supervisors to clear transient records with 1-click while preserving all compliance audit trails and exporting complete CSV incident reports."*

---

### ACT 6: Scenario 6 & Closing — Township of Tomorrow (1:52 – 2:05)
*Action: Click **"Township Map"** in sidebar showing the City of Elmina master plan with sector pins.*

> **Presenter Narration:**  
> *"Finally, GlobalEye enforces **Safety Invariance**: our Scenario 6 tests low-confidence smoke near residential towers — proving that AI uncertainty flags for human verification but **never down-ranks life safety**.  
>  
> Mapped directly across City of Elmina's 6 master sectors, GlobalEye delivers Sime Darby Property an enterprise-grade security command intelligence platform that eliminates alert fatigue, accelerates emergency response, and protects resident lives in the Township of Tomorrow.  
>  
> *Thank you, judges! We are ready for your questions."*

---

## 3-Minute Extended Judging & Technical Evaluation Deep Dive

If judges request a longer technical demonstration or ask technical questions, use this guide:

### A. Mathematical Prioritization Engine & Hysteresis (§7)
- **Composite Score Formula:**
  $$\text{Priority Score} = (0.40 \times \text{Severity}) + (0.25 \times \text{Immediacy}) + (0.20 \times \text{PeopleAtRisk}) + (0.15 \times \text{SecondaryHazard})$$
- **Hysteresis Damping Factor:** $\Delta \ge 2.0$ points required for queue rank swapping. This prevents "queue jitter" or alert oscillation when scores fluctuate by tiny fractions.
- **Emergency Rule Floors:** Life-critical triggers (e.g. `R-FALL-PERSISTENT`, confirmed vehicle rollover, active smoke near occupied buildings) enforce hard floor scores ($\ge 85.0$), ensuring human life always trumps asset property scores.

### B. Google Gemini 3.5 Flash Lite Vision Architecture
- **Model:** `gemini-3.5-flash-lite` selected for sub-second latency and high spatial reasoning capability.
- **Contract:** Strict JSON schema extraction returning:
  - `category`: `road_collision`, `person_fall`, `parking_obstruction`, `fire_smoke`
  - `confidence`: $0.00 - 1.00$
  - `severity_rationale`: Plain-language explanation for control room operators
  - `evidence`: Structured attributes (`vehicles_involved`, `person_motionless_seconds`, `hazardous_location`)
  - `detection_timestamp_seconds`: Keyframe offset (e.g. `24.0s`)
- **Auto-Promotion:** Candidates meeting confidence thresholds are ingested directly through the prioritization engine into the live queue, emitting a broker event to all connected SOC clients.

### C. In-Modal Video Player & HTTP 206 Streaming Architecture
- **Backend:** `FastAPI` endpoint `/api/video/jobs/{job_id}/stream` supports RFC 7233 HTTP 206 Partial Content (Byte-Range requests).
- **Frontend:** Native HTML5 `<video>` element with custom controls, jump-to-timestamp synchronization, and dual-mode toggle between raw MP4 stream and OpenCV/Gemini keyframe canvas HUD.

### D. Township GIS Map & Spatial Health
- **Location Hierarchy:** Canonical City of Elmina model with 6 distinct sectors:
  - Main Entry Boulevard (`LOC-GATE`)
  - Commercial Precinct & Mall (`LOC-MALL`)
  - Elmina Central Park (`LOC-PARK`)
  - Lakeside Promenade (`LOC-PROM`)
  - Residential Enclave A (`LOC-RESA`)
  - Community & School Zone (`LOC-SCH`)
- **Camera Pins:** Real-time visual status encoding (`critical` = red pulsing ring, `active` = amber pin, `normal` = slate dot). Tooltip hovering engineered with CSS pointer-events damping to eliminate cursor shaking/jitter.

---

## Judge Defense & Technical Q&A Cheat-Sheet

#### Q1: "Why not let AI automatically dispatch the police or ambulances?"
> *"In safety-critical township environments, false dispatches cause emergency service fines, public panic, and liability. GlobalEye enforces the **Human-in-the-Loop** principle: AI rapidly detects, extracts evidence, and ranks relative urgency in real-time; the licensed human operator validates the 24.0s video clip in under 3 seconds and triggers the dispatch with full legal accountability."*

#### Q2: "What happens if a camera has low confidence, like smoke that looks like steam?"
> *"That is our **Scenario 6: Safety Invariance Principle**. Most naive AI systems multiply score by confidence, which dangerously lowers a potential fire to low priority! GlobalEye separates confidence from urgency: low confidence sets `needs_verification = True`, warning the operator to check it, but **never lowers the priority score**. If it might be a fire in a residential building, it stays at the top of the queue."*

#### Q3: "What if the township loses internet connectivity to Google Gemini?"
> *"GlobalEye is architected with graceful degradation. If cloud LLM connectivity drops, the system seamlessly falls back to our local OpenCV edge detector (`app/vision/detector.py`), which uses temporal posture aspect-ratio heuristics to detect falls without cloud dependencies. Furthermore, all prioritization math, database persistence, and queue re-ranking execute locally on-premise."*

#### Q4: "How does this scale to an entire city with thousands of cameras?"
> *"Our architecture decouples ingestion, computer vision, and prioritization into asynchronous micro-services:  
> 1. Video frame extraction runs on edge NVRs or background worker threads.  
> 2. The prioritization engine runs lightweight $O(N \log N)$ mathematics in under 5 milliseconds per batch.  
> 3. SSE streams push lightweight JSON diffs only when rank positions change, allowing thousands of simultaneous SOC terminals without database polling."*

---

## Visual Branding Note (Horizon Apex Identity)

When presenting, note the **Horizon Apex** logo mark:
- **Panoramic Outer Arcs:** 360° township-wide surveillance vision.
- **Nested Orbital Rings:** Protective community guardianship.
- **Central 4-Point Diamond:** Dynamic prioritisation focus directing operator attention to the incidents that matter most.
