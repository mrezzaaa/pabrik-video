import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  DeconstructionBlueprintSchema,
  type DeconstructionBlueprint,
} from "@/schemas/video-blueprint";
import { LAYMAN_DECONSTRUCTOR_SYSTEM_PROMPT } from "./prompts";

const BLUEPRINT_SCHEMA_TEMPLATE = `{
  "topic": "<user topic string>",
  "laymanHookTitle": "<Short hook title with <highlight>key words</highlight>>",
  "everydayCategory": "<Category in uppercase, e.g., TEKNOLOGI BATERAI & DAYA>",
  "coreSimpleTruth": "<One sentence layman summary of the core mechanism>",
  "containerType": "dual-chamber | layered-stack | cylinder-cutaway | box-cutaway | circuit-board | mechanical-housing",
  "baselineMetricValue": 18,
  "peakMetricValue": 200,
  "metricUnit": "W | V | % | °C | Bar | RPM",
  "practicalChecklistTitle": "CEK SEBELUM PAKAI / BELI:",
  "practicalChecklistItems": [
    "<Practical checklist item 1>",
    "<Practical checklist item 2>",
    "<Practical checklist item 3>"
  ],
  "components": [
    {
      "id": "comp_1",
      "name": "<Part 1 Name>",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#93C5FD",
      "defaultAnchor": { "x": 340, "y": 820 },
      "zoomTarget": { "x": 60, "y": 120, "scale": 1.5 }
    },
    {
      "id": "comp_2",
      "name": "<Part 2 Name>",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#FACC15",
      "defaultAnchor": { "x": 540, "y": 980 },
      "zoomTarget": { "x": 0, "y": 0, "scale": 1.65 }
    },
    {
      "id": "comp_3",
      "name": "<Part 3 Name>",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#86EFAC",
      "defaultAnchor": { "x": 740, "y": 1120 },
      "zoomTarget": { "x": -70, "y": -90, "scale": 1.75 }
    },
    {
      "id": "comp_4",
      "name": "<Part 4 Name>",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#F87171",
      "defaultAnchor": { "x": 540, "y": 1260 },
      "zoomTarget": { "x": 0, "y": -160, "scale": 1.8 }
    }
  ],
  "phases": [
    {
      "phaseIndex": 0,
      "phaseType": "EVERYDAY_CONTRAST_HOOK",
      "title": "<Act 1 Title>",
      "everydayContrastOrHook": "<Contrast between normal vs special state>",
      "simpleExplanation": "<Simple explanation>",
      "targetDurationSeconds": 7,
      "focusComponentIds": ["comp_1", "comp_2"]
    },
    {
      "phaseIndex": 1,
      "phaseType": "CORE_MECHANISM_CUTAWAY",
      "title": "<Act 2 Title>",
      "everydayContrastOrHook": "<Core cutaway mechanism>",
      "simpleExplanation": "<Simple explanation>",
      "targetDurationSeconds": 12,
      "focusComponentIds": ["comp_2", "comp_3"]
    },
    {
      "phaseIndex": 2,
      "phaseType": "COMPONENT_ZOOM_INS",
      "title": "<Act 3 Title>",
      "everydayContrastOrHook": "<Specific internal part zoom-in>",
      "simpleExplanation": "<Simple explanation>",
      "targetDurationSeconds": 10,
      "focusComponentIds": ["comp_3", "comp_4"]
    },
    {
      "phaseIndex": 3,
      "phaseType": "PRACTICAL_TAKEAWAY_LOOP",
      "title": "<Act 4 Title>",
      "everydayContrastOrHook": "<Practical takeaway & checklist>",
      "simpleExplanation": "<Simple explanation>",
      "targetDurationSeconds": 9,
      "focusComponentIds": ["comp_1", "comp_2", "comp_3", "comp_4"]
    }
  ]
}`;

export async function runDeconstructorAgent(topic: string): Promise<{
  blueprint: DeconstructionBlueprint;
  modelUsed: string;
}> {
  const userPrompt = `Deconstruct this exact Indonesian topic into a 4-Act Warm Editorial Cutaway Storyboard for a general audience ("orang awam"):

TOPIC: "${topic}"

REQUIREMENTS:
1. All 4 phases, components, metrics, and checklist items MUST be 100% specific to "${topic}".
2. Choose the most appropriate metricUnit (e.g., "W", "V", "%", "°C", "Bar", "RPM") and realistic baselineMetricValue & peakMetricValue for "${topic}".
3. Choose the best containerType from: "dual-chamber", "layered-stack", "cylinder-cutaway", "box-cutaway", "circuit-board", "mechanical-housing".
4. Return ONLY valid JSON conforming to this schema structure:
${BLUEPRINT_SCHEMA_TEMPLATE}`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt: LAYMAN_DECONSTRUCTOR_SYSTEM_PROMPT,
    userPrompt,
    schema: DeconstructionBlueprintSchema,
    preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
    temperature: 0.3,
  });

  return { blueprint: data, modelUsed };
}
