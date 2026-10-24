import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import { z } from "zod";
import {
  DeconstructionBlueprintSchema,
  type DeconstructionBlueprint,
} from "@/schemas/video-blueprint";
import { LAYMAN_DECONSTRUCTOR_SYSTEM_PROMPT } from "./prompts";
import { loadAgentSkill } from "@/lib/skill-loader";

const BLUEPRINT_SCHEMA_TEMPLATE = `{
  "topic": "<user topic string>",
  "suggestedArchetype": "<Free string archetype matching the topic, e.g., FELINE_RIGHTING_REFLEX, VACUUM_INSULATION_DYNAMICS, VISCOUS_FLUID_DYNAMICS, ELECTROMAGNETIC_MOTOR>",
  "laymanHookTitle": "<Short hook title with <highlight>key words</highlight>>",
  "everydayCategory": "<Category in uppercase, e.g., TEKNOLOGI & REKAYASA SEHARI-HARI>",
  "coreSimpleTruth": "<One sentence layman summary of the core physical mechanism>",
  "baselineMetricValue": 10,
  "peakMetricValue": 100,
  "metricUnit": "<realistic unit for this topic, e.g., jam | Bar | V | W | RPM | °C | % | km/j | rad/s | cP>",
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
      "recommendedGeometryType": "<box | cylinder | capsule | lathe | tube | torus | liquid | hollow-cylinder | hollow-box>",
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
      "title": "<Short Dynamic Topic-Specific Title, e.g. Rangka X or Cepat Dingin?>",
      "everydayContrastOrHook": "<Contrast between normal vs special state>",
      "simpleExplanation": "<Simple explanation>",
      "cameraDirection": {
        "shotType": "WIDE_SHOT",
        "focusComponentIds": ["comp_1"],
        "focusPosition3D": [0, 0, 0],
        "zoomMultiplier": 1.0,
        "explodeFactor": 0
      },
      "objectState": {
        "visibleComponentIds": ["comp_1"],
        "cutawayEnabled": false,
        "exploded": false
      },
      "targetDurationSeconds": 8
    },
    {
      "phaseIndex": 1,
      "phaseType": "CORE_MECHANISM_CUTAWAY",
      "title": "<Core Mechanism Specific Title, e.g. Dinding Ganda or Motor Brushless>",
      "everydayContrastOrHook": "<Core cutaway mechanism>",
      "simpleExplanation": "<Simple explanation>",
      "cameraDirection": {
        "shotType": "CUTAWAY_50",
        "focusComponentIds": ["comp_1", "comp_2"],
        "focusPosition3D": [0, 0.2, 0],
        "zoomMultiplier": 1.4,
        "explodeFactor": 0.2
      },
      "objectState": {
        "visibleComponentIds": ["comp_1", "comp_2", "comp_3"],
        "cutawayEnabled": true,
        "exploded": false
      },
      "targetDurationSeconds": 10
    },
    {
      "phaseIndex": 2,
      "phaseType": "COMPONENT_ZOOM_INS",
      "title": "<Component Zoom Specific Title, e.g. Ruang Hampa or Sensor Gyro>",
      "everydayContrastOrHook": "<Specific internal part zoom-in>",
      "simpleExplanation": "<Simple explanation>",
      "cameraDirection": {
        "shotType": "EXPLODED_VIEW",
        "focusComponentIds": ["comp_3"],
        "focusPosition3D": [0, -0.4, 0],
        "zoomMultiplier": 1.8,
        "explodeFactor": 0.8
      },
      "objectState": {
        "visibleComponentIds": ["comp_2", "comp_3", "comp_4"],
        "cutawayEnabled": true,
        "exploded": true
      },
      "targetDurationSeconds": 10
    },
    {
      "phaseIndex": 3,
      "phaseType": "PRACTICAL_TAKEAWAY_LOOP",
      "title": "<Takeaway Specific Title, e.g. Tutup Rapat or Kalibrasi Arah>",
      "everydayContrastOrHook": "<Practical takeaway & checklist>",
      "simpleExplanation": "<Simple explanation>",
      "cameraDirection": {
        "shotType": "CLOSE_UP",
        "focusComponentIds": ["comp_4"],
        "focusPosition3D": [0, 1.2, 0],
        "zoomMultiplier": 2.2,
        "explodeFactor": 0
      },
      "objectState": {
        "visibleComponentIds": ["comp_1", "comp_2", "comp_3", "comp_4"],
        "cutawayEnabled": false,
        "exploded": false
      },
      "targetDurationSeconds": 9
    }
  ]
}`;

export const TechnicalResearchOutputSchema = z.object({
  core_question: z.string(),
  facts: z.array(z.string()).min(3),
  mechanism_steps: z.array(z.string()).min(3),
  key_components: z.array(z.string()).min(3),
});

export type TechnicalResearchOutput = z.infer<typeof TechnicalResearchOutputSchema>;

export async function runResearchAgent(topic: string): Promise<{
  research: TechnicalResearchOutput;
  modelUsed: string;
}> {
  const systemPrompt = `Kamu peneliti teknik. Input topik bebas. Output JSON: {core_question, facts:[5 fakta fisika], mechanism_steps:[3-5 langkah], key_components:[komponen yang perlu divisualisasikan]}. Jangan halusinasi angka.`;

  const userPrompt = `Teliti topik ini secara teknis dan faktual:
TOPIK: "${topic}"

Output JSON valid sesuai schema:
{
  "core_question": "Pertanyaan inti fisika/teknik",
  "facts": ["5 fakta fisika teruji"],
  "mechanism_steps": ["3-5 langkah kerja berurutan"],
  "key_components": ["komponen fisik utama yang perlu divisualisasikan"]
}`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt,
    userPrompt,
    schema: TechnicalResearchOutputSchema,
    preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
    temperature: 0.2,
  });

  return { research: data, modelUsed };
}

export async function runDeconstructorAgent(topic: string): Promise<{
  blueprint: DeconstructionBlueprint;
  modelUsed: string;
}> {
  // Step 1: Execute technical research agent
  const { research, modelUsed: researchModel } = await runResearchAgent(topic);

  // Step 2: Dynamically load the anatomy skill instructions
  const anatomySkill = await loadAgentSkill(".agents/skills/anatomy");

  const systemPrompt = `${LAYMAN_DECONSTRUCTOR_SYSTEM_PROMPT}

--- AGENT SKILL PLAYBOOK (.agents/skills/anatomy) ---
${anatomySkill}
---------------------------------------------------`;

  const userPrompt = `Deconstruct this exact Indonesian topic into a 4-Act Warm Editorial 3D Cutaway Storyboard for a general audience ("orang awam"):

TOPIC: "${topic}"

RESEARCH FINDINGS (FROM TECHNICAL RESEARCHER):
- Core Question: "${research.core_question}"
- Physics Facts: ${JSON.stringify(research.facts)}
- Mechanism Steps: ${JSON.stringify(research.mechanism_steps)}
- Key Components: ${JSON.stringify(research.key_components)}

REQUIREMENTS:
1. All 4 phases, physical 3D components, metrics, and checklist items MUST be 100% specific to "${topic}".
2. Choose the most appropriate metricUnit and realistic baselineMetricValue & peakMetricValue for "${topic}".
3. Define at least 3-4 distinct physical anatomical components matching the research key components.
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

  return { blueprint: data, modelUsed: `${researchModel} -> ${modelUsed}` };
}

