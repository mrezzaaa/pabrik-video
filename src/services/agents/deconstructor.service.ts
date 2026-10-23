import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  DeconstructionBlueprintSchema,
  type DeconstructionBlueprint,
} from "@/schemas/video-blueprint";
import { LAYMAN_DECONSTRUCTOR_SYSTEM_PROMPT } from "./prompts";
import { loadAgentSkill } from "@/lib/skill-loader";

const BLUEPRINT_SCHEMA_TEMPLATE = `{
  "topic": "<user topic string>",
  "suggestedArchetype": "AERODYNAMIC_DRONE | ROTARY_PNEUMATIC_ENGINE | ELECTROCHEMICAL_BATTERY | ELECTRONIC_COMPUTING | PHOTOVOLTAIC_ENERGY | ANATOMICAL_ORGAN | UNIVERSAL_CUTAWAY",
  "laymanHookTitle": "<Short hook title with <highlight>key words</highlight>>",
  "everydayCategory": "<Category in uppercase, e.g., TEKNOLOGI & REKAYASA SEHARI-HARI>",
  "coreSimpleTruth": "<One sentence layman summary of the core physical mechanism>",
  "baselineMetricValue": 10,
  "peakMetricValue": 100,
  "metricUnit": "<realistic unit for this topic, e.g., jam | Bar | V | W | RPM | °C | % | km/j>",
  "practicalChecklistTitle": "CEK SEBELUM BELI / PAKAI:",
  "practicalChecklistItems": [
    "<3-4 words item 1 strictly tailored to this topic>",
    "<3-4 words item 2 strictly tailored to this topic>",
    "<3-4 words item 3 strictly tailored to this topic>"
  ],
  "components": [
    {
      "id": "comp_1",
      "name": "<Outer Shell / Casing / Body Name>",
      "anatomicalLayer": "OUTER_CUTAWAY_SHELL",
      "everydayRole": "<Relatable everyday role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#E2E8F0",
      "position3D": [0, 0, 0],
      "recommendedGeometryType": "<drone-assembly | battery-assembly | piston-assembly | turbine-assembly | circuit-board | solar-assembly | hollow-cylinder | hollow-box>",
      "zoomTarget": { "focusPosition3D": [0, 0, 0], "zoomMultiplier": 1.2 }
    },
    {
      "id": "comp_2",
      "name": "<Internal Chamber / Battery Bay / Reservoir>",
      "anatomicalLayer": "INTERNAL_CHAMBER",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#93C5FD",
      "position3D": [0, 0.2, 0],
      "recommendedGeometryType": "<box | cylinder | hollow-box | capsule>",
      "zoomTarget": { "focusPosition3D": [0, 0.2, 0], "zoomMultiplier": 1.4 }
    },
    {
      "id": "comp_3",
      "name": "<Core Active Mechanism, e.g., Rotor / Piston / Cells / CPU>",
      "anatomicalLayer": "CORE_MECHANISM",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#FACC15",
      "position3D": [0, -0.4, 0],
      "recommendedGeometryType": "<radial-array | cylinder | lathe | box>",
      "zoomTarget": { "focusPosition3D": [0, -0.4, 0], "zoomMultiplier": 1.6 }
    },
    {
      "id": "comp_4",
      "name": "<Precision Valve / Controller / Zoom Sub-Part>",
      "anatomicalLayer": "ZOOM_SUBPART",
      "everydayRole": "<Relatable role>",
      "simpleCauseEffect": "<Simple cause & effect>",
      "fillColor": "#F87171",
      "position3D": [0, 1.2, 0],
      "recommendedGeometryType": "<capsule | lathe | box | torus | tube>",
      "zoomTarget": { "focusPosition3D": [0, 1.2, 0], "zoomMultiplier": 1.8 }
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
  // Dynamically load the anatomy skill instructions
  const anatomySkill = await loadAgentSkill(".agents/skill/anatomy");

  const systemPrompt = `${LAYMAN_DECONSTRUCTOR_SYSTEM_PROMPT}

--- AGENT SKILL PLAYBOOK (.agents/skill/anatomy) ---
${anatomySkill}
---------------------------------------------------`;

  const userPrompt = `Deconstruct this exact Indonesian topic into a 4-Act Warm Editorial 3D Cutaway Storyboard for a general audience ("orang awam"):

TOPIC: "${topic}"

REQUIREMENTS:
1. All 4 phases, physical 3D components, metrics, and checklist items MUST be 100% specific to "${topic}".
2. Choose the most appropriate metricUnit and realistic baselineMetricValue & peakMetricValue for "${topic}".
3. Define at least 3-4 distinct physical anatomical components with coordinates in Three.js metric space [-2.5..2.5] following the 4 layers: OUTER_CUTAWAY_SHELL, INTERNAL_CHAMBER, CORE_MECHANISM, ZOOM_SUBPART.
4. Exactly 3 checklist items with maximum 3 to 4 words per item!
5. Return ONLY valid JSON conforming to this schema structure:
${BLUEPRINT_SCHEMA_TEMPLATE}`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt,
    userPrompt,
    schema: DeconstructionBlueprintSchema,
    preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
    temperature: 0.3,
  });

  return { blueprint: data, modelUsed };
}
