import { NextRequest, NextResponse } from "next/server";

const GEMINI_VISION_PROMPT = `You are the expert CCTV vision analysis engine for Sime Darby Property Township Guardian Security & Safety Operations.
Analyze these chronological video frames captured from a township security camera.

CRITICAL FIRST DIRECTIVE:
Determine if this video footage shows NORMAL ROUTINE ACTIVITY or an ABNORMAL SAFETY HAZARD / INCIDENT.
The vast majority of township CCTV footage is NORMAL. YOU MUST DEFAULT TO NORMAL ACTIVITY UNLESS CLEAR, UNMISTAKABLE VISUAL EVIDENCE OF A SAFETY HAZARD OR VIOLATION IS VISIBLE.

STEP 1: NORMAL ACTIVITY CHECK:
If the video shows normal routine township life:
- Pedestrians walking normally, strolling, jogging, sitting on benches, exercising, or standing upright.
- Vehicles driving smoothly along roads, parking legally, or cycling normally.
- Normal landscape, trees swaying naturally, calm streets, or normal weather conditions.
-> For ALL normal situations above, you MUST return:
{
  "detected": false,
  "category": null,
  "is_danger": false,
  "confidence": 0.95,
  "timestamp_s": 0.0,
  "title": "Normal Activity Verified — No Incident",
  "summary": "Routine township activity observed. Pedestrians or vehicles moving normally without any falls, safety hazards, or security violations.",
  "evidence": {
    "status": "normal_routine",
    "hazard_level": "none"
  }
}

STEP 2: ABNORMAL INCIDENT CLASSIFICATION (ONLY IF AN ACTUAL HAZARD OCCURRED):
Only if an unmistakable incident is visible, set "detected": true, "is_danger": true, and classify into ONE of:
1. "fire_smoke": Open flames, thick smoke plume, hazardous burning, fire flare, or wildfire. (NOT cigarette smoke or vehicle exhaust).
2. "wildlife_intrusion": Hazardous wild animals (wild boars, large snakes, aggressive monkeys, monitor lizards) in public areas. (NOT domestic pets on leash or common birds).
3. "restricted_area_intrusion": Unauthorized person climbing onto a rooftop, roof structure, electrical substation, or dangerous height ledge.
4. "person_fall": A person who ACTUALLY collapsed, fell, tripped, slipped, or is lying prostrate/motionless horizontally on the ground.
   IMPORTANT: A person walking upright, jogging, standing, bending, or sitting is strictly NORMAL and NEVER a person_fall!
5. "road_collision": Active vehicle crash, collision, rollover, or vehicle hitting a pedestrian/cyclist.
6. "parking_obstruction": Vehicle severely blocking an active emergency fire egress route, ambulance path, or fire hydrant.
7. "pipe_burst_leakage": High-pressure ruptured water main or street geyser flooding road.
8. "flash_flood": Rapid roadway inundation or storm surge flooding.
9. "fallen_tree_storm_damage": Entire fallen tree or large branch blocking roads or crushing property.
10. "road_pavement_defect": Opening sinkhole, crater, or road pavement collapse.
11. "structural_facility_damage": Falling building façade, loose roof sheets, broken overhead glass.
12. "illegal_dumping": Vehicle illegally dumping bulk trash or chemical drums in public reserve.
13. "physical_altercation": Violent fight, assault, or physical brawl between individuals.

CRITICAL RULES FOR "evidence" FIELD:
- The "evidence" object MUST ONLY contain domain physical parameters describing what actually occurred in the incident.
- DO NOT mention AI models, Gemini, software algorithms, cameras, or filenames.
- Extract real visual parameters such as:
  * For "person_fall": "motionless_seconds" (number), "hazardous_location" (boolean), "bystander_assisting" (boolean), "person_attempting_to_stand" (boolean)
  * For "road_collision": "vehicles_involved" (number), "traffic_blocked" (boolean), "motionless_after_impact" (boolean), "persons_involved" (number)
  * For "fire_smoke": "smoke_or_flame_visible" (boolean), "spreading" (boolean), "people_in_vicinity" (boolean), "blocks_emergency_access" (boolean)
  * For "wildlife_intrusion": "animal_species" (string), "pack_size" (number), "proximity_to_pedestrians" (string), "aggressive_behavior" (boolean)
  * For "restricted_area_intrusion": "height_fall_hazard" (boolean), "entry_method" (string), "danger_zone" (string)
  * For "parking_obstruction": "blocks_emergency_access" (boolean), "duration_minutes" (number), "blocks_traffic_lane" (boolean)

RULES:
- NEVER hallucinate or force an incident. If you are uncertain or the scene is peaceful, IT IS NORMAL ACTIVITY ("detected": false, "category": null).
- "title": Specific and descriptive of the exact scene (e.g., "Normal Activity Verified — No Incident" or "Wild Boar on Walking Trail").
- "summary": 2-3 accurate sentences describing the visual sequence observed across the frames.
- Respond STRICTLY with valid JSON (no markdown formatting, just raw JSON).`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = (
      request.headers.get("x-gemini-api-key") ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      ""
    ).trim();

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY not configured in environment variables" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { frames, cameraName } = body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { success: false, error: "No video frames provided for analysis" },
        { status: 400 }
      );
    }

    const configuredModel = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite").trim();
    const modelsToTry = [
      configuredModel,
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-1.5-flash",
    ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

    const parts: any[] = [{ text: GEMINI_VISION_PROMPT }];
    for (const frame of frames) {
      if (frame.base64) {
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: frame.base64,
          },
        });
      }
    }

    let lastError = "";

    for (const model of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Model ${model} failed (${response.status}): ${errText}`;
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text || "";

        let cleaned = rawText.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
        if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned);

        const rawDetected = Boolean(parsed.detected);
        const rawCategory = parsed.category;
        const isActuallyDetected =
          rawDetected &&
          Boolean(rawCategory) &&
          rawCategory !== "null" &&
          rawCategory !== "none" &&
          rawCategory !== "normal" &&
          rawCategory !== "normal_activity";

        const category = isActuallyDetected ? rawCategory : null;

        // Clean evidence object: filter out any technical keys
        const rawEvidence = parsed.evidence || {};
        const cleanEvidence: Record<string, any> = {};
        const FORBIDDEN_KEYS = new Set([
          "model_used",
          "is_gemini",
          "ai_model",
          "model",
          "video_job_id",
          "filename",
          "file_name",
          "thumbnail",
          "status",
        ]);

        for (const [k, v] of Object.entries(rawEvidence)) {
          if (!FORBIDDEN_KEYS.has(k.toLowerCase()) && v !== null && v !== undefined && typeof v !== "object") {
            cleanEvidence[k] = v;
          }
        }

        return NextResponse.json({
          success: true,
          modelUsed: model,
          detected: isActuallyDetected,
          category: category,
          confidence: parseFloat(parsed.confidence) || (isActuallyDetected ? 0.92 : 0.95),
          timestamp_s: parseFloat(parsed.timestamp_s) || 0.0,
          is_danger: isActuallyDetected ? Boolean(parsed.is_danger) : false,
          title: parsed.title || (isActuallyDetected ? "Township Incident Detected" : "Normal Surveillance Activity"),
          summary:
            parsed.summary ||
            (isActuallyDetected
              ? "Incident detected by multimodal vision engine."
              : "Normal surveillance activity verified. No safety hazards or incidents detected."),
          evidence: cleanEvidence,
        });
      } catch (err: any) {
        lastError = err.message || "Failed model request";
      }
    }

    return NextResponse.json(
      { success: false, error: lastError || "All Gemini models failed" },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
