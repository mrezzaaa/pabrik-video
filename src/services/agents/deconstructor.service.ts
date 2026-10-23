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
  "everydayCategory": "<Category in uppercase, e.g., TEKNOLOGI & REKAYASA SEHARI-HARI>",
  "coreSimpleTruth": "<One sentence layman summary of the core physical mechanism>",
  "baselineMetricValue": 18,
  "peakMetricValue": 200,
  "metricUnit": "W | V | % | °C | Bar | RPM | km/j | Gbps",
  "practicalChecklistTitle": "CEK SEBELUM PAKAI / BELI:",
  "practicalChecklistItems": [
    "<Practical checklist item 1>",
    "<Practical checklist item 2>",
    "<Practical checklist item 3>"
  ],
  "components": [
    {
      "id": "comp_1",
      "name": "<Outer Shell / Casing Name>",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#E2E8F0",
      "center3D": { "x": 0, "y": 0, "z": 10 },
      "zoomTarget": { "x": 45, "y": 80, "scale": 1.45 }
    },
    {
      "id": "comp_2",
      "name": "<Primary Internal Mechanism Name>",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#93C5FD",
      "center3D": { "x": -22, "y": 15, "z": 5 },
      "zoomTarget": { "x": 0, "y": -20, "scale": 1.65 }
    },
    {
      "id": "comp_3",
      "name": "<Sub-Component 1 Name>",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#FACC15",
      "center3D": { "x": 22, "y": -15, "z": -10 },
      "zoomTarget": { "x": -55, "y": -60, "scale": 1.75 }
    },
    {
      "id": "comp_4",
      "name": "<Sub-Component 2 / Regulator Name>",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#F87171",
      "center3D": { "x": 0, "y": 0, "z": -48 },
      "zoomTarget": { "x": 0, "y": -140, "scale": 1.8 }
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
  const userPrompt = `Deconstruct this exact Indonesian topic into a 4-Act Warm Editorial 3D Cutaway Storyboard for a general audience ("orang awam"):

TOPIC: "${topic}"

REQUIREMENTS:
1. All 4 phases, physical 3D components, metrics, and checklist items MUST be 100% specific to "${topic}".
2. Choose the most appropriate metricUnit (e.g., "W", "V", "%", "°C", "Bar", "RPM", "km/j", "Gbps") and realistic baselineMetricValue & peakMetricValue for "${topic}".
3. Define 4 distinct anatomical components with 3D coordinates ("center3D": {x, y, z} in [-65..65]) so they can be assembled in 3D space.
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
