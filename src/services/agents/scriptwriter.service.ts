import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  ScriptArchitectOutputSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
} from "@/schemas/video-blueprint";
import { LAYMAN_SCRIPTWRITER_SYSTEM_PROMPT } from "./prompts";

const SCRIPT_SCHEMA_TEMPLATE = `{
  "topic": "<user topic>",
  "totalSegments": 4,
  "fullNarrationIndonesian": "<concatenated narration of all 4 segments>",
  "practicalChecklist": {
    "title": "CEK SEBELUM PAKAI / BELI:",
    "items": ["<Item 1>", "<Item 2>", "<Item 3>"]
  },
  "segments": [
    {
      "segmentIndex": 0,
      "phaseType": "EVERYDAY_CONTRAST_HOOK",
      "chapterTitle": "<Title with <highlight>highlighted words</highlight>>",
      "narrationText": "<3-4 short conversational Indonesian sentences, 4-7 words per sentence>",
      "primaryMetric": {
        "startValue": 18,
        "endValue": 65,
        "unit": "<unit from blueprint>",
        "decimals": 0,
        "isHighActive": false,
        "baselineValue": 18,
        "peakValue": 200,
        "sparklinePoints": [18, 25, 35, 50, 65]
      },
      "statusBadge": {
        "text": "<SHORT STATUS, e.g., STANDAR / AKTIF>",
        "variant": "green"
      },
      "secondaryMetric": "<Short context, e.g., 5V / 3A standar>",
      "pillLabels": [
        {
          "id": "pill_0_1",
          "componentId": "comp_1",
          "text": "<PART NAME> →",
          "direction": "RIGHT",
          "relativeTriggerRatio": 0.15,
          "durationSeconds": 4.5
        }
      ],
      "sfxCue": {
        "text": "<SHORT STAMP OR ONOMATOPOEIA>",
        "variant": "FADED_BG",
        "soundEffectFile": "pop-lock.mp3",
        "x": 540,
        "y": 530,
        "rotateDeg": -6,
        "relativeTriggerRatio": 0.25
      },
      "showChecklistCard": false
    }
  ]
}`;

export async function runScriptwriterAgent(
  blueprint: DeconstructionBlueprint
): Promise<{
  script: ScriptArchitectOutput;
  modelUsed: string;
}> {
  const userPrompt = `Write the 4-Act conversational Indonesian script, dynamic top editorial header metrics, component pill pointers, and SFX stamps for this exact topic and blueprint:

TOPIC: "${blueprint.topic}"

BLUEPRINT FROM AGENT 1:
${JSON.stringify(blueprint, null, 2)}

CRITICAL INSTRUCTIONS:
1. Write in warm, punchy, everyday spoken Indonesian (4–7 words per sentence).
2. All 4 segments in "segments" MUST have segmentIndex 0, 1, 2, 3 and phaseType:
   - 0: "EVERYDAY_CONTRAST_HOOK"
   - 1: "CORE_MECHANISM_CUTAWAY"
   - 2: "COMPONENT_ZOOM_INS"
   - 3: "PRACTICAL_TAKEAWAY_LOOP" (set "showChecklistCard": true on segment 3)
3. Every "pillLabels" item MUST reference a valid "componentId" from the blueprint (${blueprint.components.map((c) => `"${c.id}"`).join(", ")}). Note: 2D screen coordinates are computed automatically by the 3D Isometric Projection Engine!
4. Make sure "primaryMetric", "statusBadge", and "secondaryMetric" reflect the real physical numbers of "${blueprint.topic}" (unit: "${blueprint.metricUnit}", baseline: ${blueprint.baselineMetricValue}, peak: ${blueprint.peakMetricValue}).
5. Return ONLY valid JSON matching this schema structure:
${SCRIPT_SCHEMA_TEMPLATE}`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt: LAYMAN_SCRIPTWRITER_SYSTEM_PROMPT,
    userPrompt,
    schema: ScriptArchitectOutputSchema,
    preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
    temperature: 0.3,
  });

  return { script: data, modelUsed };
}
