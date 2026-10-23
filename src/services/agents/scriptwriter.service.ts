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
      "narrationText": "<MINIMUM 20 TO 28 SPOKEN WORDS. Chain 3-5 punchy Indonesian sentences, e.g., 'Nah, ini bagian utamanya. Kuncinya ada di komponen kecil ini. Semakin tinggi tekanannya, semakin keras ia bekerja. Makanya perlu dicek rutin.'>",
      "primaryMetric": {
        "startValue": 10,
        "endValue": 85,
        "unit": "<unit from blueprint>",
        "decimals": 0,
        "isHighActive": false,
        "baselineValue": 10,
        "peakValue": 100,
        "sparklinePoints": [0, 25, 60, 100]
      },
      "statusBadge": {
        "text": "<SHORT STATUS, e.g., STANDAR / EFISIEN / OPTIMAL>",
        "variant": "green"
      },
      "secondaryMetric": "<Short context string strictly relevant to this topic, e.g., Bobot 1.2 kg or Tekanan 18 Bar or Daya 350W or Tegangan 4.2V>",
      "pillLabels": [
        {
          "id": "pill_0_1",
          "componentId": "comp_1",
          "text": "<exact component name from blueprint> →",
          "direction": "RIGHT",
          "relativeTriggerRatio": 0.15,
          "durationSeconds": 4.0
        }
      ],
      "sfxCue": {
        "text": "<SHORT ONOMATOPOEIA / STAMP, e.g., WHOOSH! / KLIK! / SURGE! / BZZZT!>",
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

  const baseUserPrompt = `Write the conversational spoken-word Indonesian script and telemetry metadata for this topic:

TOPIC: "${blueprint.topic}"
CATEGORY: "${blueprint.everydayCategory}"
CORE MECHANISM: "${blueprint.coreSimpleTruth}"
METRIC UNIT: "${blueprint.metricUnit}" (Baseline: ${blueprint.baselineMetricValue}, Peak: ${blueprint.peakMetricValue})

BLUEPRINT COMPONENTS:
${JSON.stringify(blueprint.components, null, 2)}

BLUEPRINT PHASES:
${JSON.stringify(blueprint.phases, null, 2)}

STRICT REQUIREMENTS:
1. ⚠️ WORD COUNT ENFORCEMENT: Each narrationText MUST be 18 to 28 spoken words minimum. Count words! Target 4 acts × ~11 words each = 40-50 second total video.
2. Sentence style: 3 to 7 words per sentence, chain 3-5 sentences per segment. Natural Indonesian conversational cadence.
3. Practical checklist: Exactly 3 items, maximum 3-4 words per item!
4. Pill labels: Maximum 1-2 pills per segment, each maximum 2-3 topic-specific words with directional arrow.
5. Return ONLY valid JSON conforming to this schema structure:
${SCRIPT_SCHEMA_TEMPLATE}`;

  // Retry loop: enforce minimum 20 words per segment post-generation
  const MAX_WORD_COUNT_RETRIES = 3;
  let lastResult: { data: ScriptArchitectOutput; modelUsed: string } | null = null;
  let shortSegmentFeedback = "";

  for (let attempt = 0; attempt < MAX_WORD_COUNT_RETRIES; attempt++) {
    const userPrompt = attempt === 0
      ? baseUserPrompt
      : `${baseUserPrompt}\n\n⚠️ REJECTED: ${shortSegmentFeedback}\nRewrite narrationText for ALL 4 segments so each has at least 20 words.`;

    const result = await generateStructuredOmniroute({
      systemPrompt,
      userPrompt,
      schema: ScriptArchitectOutputSchema,
      preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
      temperature: 0.3,
    });

    // Validate word counts per segment
    const shortSegments = result.data.segments
      .map((seg, idx) => ({
        idx,
        wordCount: seg.narrationText.trim().split(/\s+/).filter(Boolean).length,
        preview: seg.narrationText.slice(0, 80),
      }))
      .filter((s) => s.wordCount < 20);

    if (shortSegments.length === 0) {
      // All segments pass word count check
      console.log(`[Scriptwriter] ✅ All 4 segments passed word count (attempt ${attempt + 1})`);
      return { script: result.data, modelUsed: result.modelUsed };
    }

    shortSegmentFeedback = shortSegments
      .map((s) => `Act ${s.idx}: only ${s.wordCount} words ("${s.preview}...")`)
      .join("; ");
    console.warn(`[Scriptwriter] ⚠️ Short segments detected (attempt ${attempt + 1}): ${shortSegmentFeedback}`);
    lastResult = result;
  }

  // All retries exhausted — throw with details so BullMQ marks job FAILED
  throw new Error(
    `Scriptwriter failed to produce ≥20 words per segment after ${MAX_WORD_COUNT_RETRIES} attempts.\nShort segments: ${shortSegmentFeedback}`
  );
}

