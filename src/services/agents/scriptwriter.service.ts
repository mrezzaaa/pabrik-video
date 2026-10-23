import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  ScriptArchitectOutputSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
} from "@/schemas/video-blueprint";
import { LAYMAN_SCRIPTWRITER_SYSTEM_PROMPT } from "./prompts";
import { loadAgentSkill } from "@/lib/skill-loader";

const SCRIPT_SCHEMA_TEMPLATE = `{
  "topic": "<user topic>",
  "totalSegments": 4,
  "fullNarrationIndonesian": "<concatenated narration of all 4 segments>",
  "practicalChecklist": {
    "title": "CEK SEBELUM BELI / PAKAI:",
    "items": ["<3-4 words item 1>", "<3-4 words item 2>", "<3-4 words item 3>"]
  },
  "segments": [
    {
      "segmentIndex": 0,
      "phaseType": "EVERYDAY_CONTRAST_HOOK",
      "chapterTitle": "<Action Title with <highlight>key words</highlight>>",
      "narrationText": "<Conversational Indonesian narration, 18-24 words total. Short punchy sentences (3-7 words).>",
      "primaryMetric": {
        "startValue": 18,
        "endValue": 65,
        "unit": "<unit from blueprint>",
        "decimals": 0,
        "isHighActive": false,
        "baselineValue": 18,
        "peakValue": 200,
        "sparklinePoints": [0, 20, 60, 100]
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
          "text": "<2-3 words label> →",
          "direction": "RIGHT",
          "relativeTriggerRatio": 0.15,
          "durationSeconds": 4.0
        }
      ],
      "sfxCue": {
        "text": "<SHORT ONOMATOPOEIA, e.g., PSSST!>",
        "variant": "STEAM_YELLOW_BLUE",
        "soundEffectFile": "pop-lock.mp3",
        "x": 680,
        "y": 640,
        "rotateDeg": -8,
        "relativeTriggerRatio": 0.3
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
  // Dynamically load the anatomy skill instructions
  const anatomySkill = await loadAgentSkill(".agents/skill/anatomy");

  const systemPrompt = `${LAYMAN_SCRIPTWRITER_SYSTEM_PROMPT}

--- AGENT SKILL PLAYBOOK (.agents/skill/anatomy) ---
${anatomySkill}
---------------------------------------------------`;

  const userPrompt = `Write the conversational spoken-word Indonesian script and telemetry metadata for this topic:

TOPIC: "${blueprint.topic}"
CATEGORY: "${blueprint.everydayCategory}"
CORE MECHANISM: "${blueprint.coreSimpleTruth}"
METRIC UNIT: "${blueprint.metricUnit}" (Baseline: ${blueprint.baselineMetricValue}, Peak: ${blueprint.peakMetricValue})

BLUEPRINT COMPONENTS:
${JSON.stringify(blueprint.components, null, 2)}

BLUEPRINT PHASES:
${JSON.stringify(blueprint.phases, null, 2)}

STRICT REQUIREMENTS:
1. Spoken sentence length: 3 to 7 words per sentence. Natural Indonesian conversational cadence ("gaya video Bandeng Presto kitabedah.id").
2. Target word count: 18 to 24 words per segment.
3. Practical checklist: Exactly 3 items, maximum 3-4 words per item!
4. Pill labels: Maximum 1-2 pills per segment, each maximum 2-3 words with directional arrow (e.g., "DURI LUNAK →", "← UAP TERKURUNG").
5. Return ONLY valid JSON conforming to this schema structure:
${SCRIPT_SCHEMA_TEMPLATE}`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt,
    userPrompt,
    schema: ScriptArchitectOutputSchema,
    preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
    temperature: 0.3,
  });

  return { script: data, modelUsed };
}
