# Township Guardian AI — Hackathon Presentation & Live Demo Script

**Target Duration:** 90 – 120 seconds  
**Audience:** Sime Darby Property Judges & Technical Evaluators  
**Theme:** Township of Tomorrow (PEOPLE — Safety & Security)

---

## 1. Hook & Problem Statement (0:00 – 0:25)

> *"Good morning, judges. When managing a modern master-planned township with dozens of CCTV cameras, security teams face a critical challenge: **Alert Fatigue and Priority Blindness**.*
>
> *When an illegal dumping event, a parking obstruction, and a medical emergency happen around the same time, standard dashboards simply list them in chronological order. Operators waste precious minutes figuring out what matters first.*
>
> *Introducing **Township Guardian AI** — an intelligent township incident prioritization and response coordination platform built specifically for Sime Darby Property communities."*

---

## 2. Core Innovation: Dynamic Incident Intelligence (0:25 – 0:50)

> *"Our core differentiator is **Dynamic Incident Intelligence**. Watch what happens when multiple incidents occur at the same second."*

### Action:
1. Click **"A. Simultaneous"** in the top navigation bar.
2. Point to the **Active Queue** on screen.

### Explanation:
> *"We just triggered 3 simultaneous incidents at 08:00 AM: a road collision at the Main Gate, a person down at Lakeside, and a parking obstruction at the commercial mall.*
>
> *Rather than sorting by timestamp, our backend prioritization engine mathematically evaluated four dimensions: **Severity (40%), Immediacy (25%), People at Risk (20%), and Secondary Hazards (15%)**.*
>
> *The road collision and medical emergency immediately take precedence over the parking violation."*

---

## 3. Dynamic Re-ranking on Evolving Evidence (0:50 – 1:15)

> *"In real security operations, evidence changes. Watch the queue re-evaluate live."*

### Action:
1. Click **"B. Dynamic Escalate"** in the header.
2. Observe the Lakeside Person Down alert automatically jump to **Rank #1** with an Emergency Override badge.

### Explanation:
> *"Follow-up camera frames detected that the victim at Lakeside has remained motionless for over 90 seconds without bystanders. Our engine detected this threat to life, elevated the priority score, and instantly broadcasted an SSE event that re-ranked the incident to Rank #1 live, without reloading the page."*

---

## 4. Human-Centred Explainability & Response (1:15 – 1:40)

> *"Security operators under pressure need answers, not black-box AI jargon."*

### Action:
1. Click on the **#1 Incident (Person Down)** to open the **Incident Detail Inspector**.
2. Briefly point out the **Dynamic Assessment** text, **Scoring Factors** tab, and **Recommended Action**.
3. Click **"Acknowledge Alert"**, then **"Assign Responder"** & select **"On-site First-Aid Team"**.

### Explanation:
> *"Township Guardian generates a plain-language explanation of why this incident was ranked #1 and provides advisory next steps.*
>
> *The operator acknowledges the alert, assigns the on-duty first-aid team, and logs the response. Every decision is permanently recorded in our SQLite immutable audit log."*

---

## 5. Vision Pipeline & Township Map (1:40 – 2:00)

### Action:
1. Click **"Township Map"** in the sidebar. Show the 6 master-planned sectors and CCTV pins.
2. Click **"CCTV & Video Analysis"** in the sidebar. Show the OpenCV candidate review stream.

### Explanation:
> *"Beyond simulation, Mode B runs our real OpenCV computer vision pipeline: extracting frames, detecting pedestrian bounding boxes, and analyzing temporal posture changes for fall detection.*
>
> *Township Guardian AI provides Sime Darby Property with a credible, production-ready security command platform that protects residents, eliminates alert fatigue, and saves lives in the Township of Tomorrow.*
>
> *Thank you, and we welcome your questions!"*
