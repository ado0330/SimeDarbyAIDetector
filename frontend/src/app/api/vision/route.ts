import { NextRequest, NextResponse } from "next/server";

const GEMINI_VISION_PROMPT = `You are the core AI vision engine for Sime Darby Property Township Guardian CCTV Security & Safety Operations.
Analyze these chronological video frames captured from a township security camera.

Determine if any safety hazard or security incident occurred.
Classify into exactly ONE of these incident categories:
1. "fire_smoke": Open flames, thick smoke plume, hazardous burning, fire flare, or wildfire/grass fire.
2. "wildlife_intrusion": Wild or hazardous animals (wild boars, monkeys, venomous snakes, monitor lizards, stray aggressive animal packs) trespassing into pedestrian walkways, residential yards, or park facilities.
3. "restricted_area_intrusion": Unauthorized persons trespassing in high-danger restricted zones (persons on rooftop edges, climbing roof structures, electrical substations, construction perimeters, dangerous heights, retention pond banks).
4. "person_fall": A person collapsed, fell, tripped, slipped, or is lying motionless / unresponsive on the ground, road, or stairs.
5. "road_collision": Vehicle collision, car crash, motorcycle skid, vehicle hitting pedestrian or cyclist.
6. "parking_obstruction": Vehicle blocking emergency fire egress route, fire hydrant, or double parked obstructing access.
7. "pipe_burst_leakage": High-pressure water main burst or street flooding from plumbing failure.
8. "flash_flood": Rapid roadway or path inundation from storm/monsoon overflow.

If normal peaceful township activity without any safety hazard, set "detected": false and "category": null.

RULES:
- "title": MUST be specific, descriptive, and vivid to THIS exact video scene (mention colors, actions, animals, or exact location like "Wild Boar on Walking Trail", "Trespasser on Commercial Rooftop Edge", "Smoke Plume Rising from Residential Garden", "Pedestrian Slip & Fall on Pavement"). NEVER use generic placeholders.
- "summary": 2-3 detailed sentences describing the sequence of visual events observed across the frames.
- "is_danger": true for any safety hazard (fire, wildlife, rooftop trespass, collapse, collision, flooding, pipe burst).

Respond STRICTLY with valid JSON (no markdown formatting, just raw JSON):
{
  "detected": true,
  "category": "fire_smoke",
  "confidence": 0.95,
  "timestamp_s": 2.5,
  "is_danger": true,
  "title": "Specific Descriptive Incident Title",
  "summary": "Detailed visual description of subjects, vehicles, animals, actions, and environment.",
  "evidence": {
    "hazard_level": "critical",
    "subjects_involved": 1,
    "environment": "park / road / residential / rooftop",
    "notes": "key visual facts"
  }
}`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = (
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
              temperature: 0.15,
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

        return NextResponse.json({
          success: true,
          modelUsed: model,
          detected: Boolean(parsed.detected),
          category: parsed.category || "person_fall",
          confidence: parseFloat(parsed.confidence) || 0.92,
          timestamp_s: parseFloat(parsed.timestamp_s) || 2.0,
          title: parsed.title || "Township Incident Detected",
          summary: parsed.summary || "Multimodal vision analysis completed.",
          evidence: parsed.evidence || {},
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
