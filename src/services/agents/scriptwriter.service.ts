import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  ScriptArchitectOutputSchema,
  ScriptJuryEvaluationSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
  type ScriptJuryEvaluation,
} from "@/schemas/video-blueprint";
import {
  LAYMAN_SCRIPTWRITER_SYSTEM_PROMPT,
  SCRIPT_JURY_SYSTEM_PROMPT,
} from "./prompts";

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
      "narrationText": "<Flowing conversational paragraph, 18-24 words total. Mixes short and medium sentences with spoken connectors, e.g., 'Tagihan listrik rumah naik terus, tapi tahukah kamu kalau atapmu bisa bikin listrik sendiri tanpa bahan bakar sama sekali?'>",
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

/**
 * Runs the Script Jury Agent to evaluate oral storytelling flow, transitions, and pacing.
 */
async function evaluateScriptWithJury(
  topic: string,
  script: ScriptArchitectOutput
): Promise<ScriptJuryEvaluation> {
  const juryPrompt = `Evaluate this Indonesian vertical explainer script for:
TOPIC: "${topic}"

FULL NARRATION:
${script.segments.map((s, idx) => `[Beat ${idx} - ${s.phaseType}] (${s.narrationText.split(/\s+/).filter(Boolean).length} words):
"${s.narrationText}"`).join("\n\n")}

CRITICAL JURY CRITERIA:
1. Spoken Flow: Does it sound natural, rhythmic, and conversational aloud (not chopped 3-word fragments)?
2. Beat Transitions: Does each beat bridge seamlessly from the previous beat using spoken connectors ("Nah,", "Dan di sinilah,", "Tapi masalahnya,", dll.)?
3. Pacing: Are word counts between 18 and 25 words per beat (tempo: 2.3-2.8 words/sec)?
4. Single Idea: Is each beat focused on exactly 1 main insight without clutter?

Score honestly. If overall score < 80 or spoken flow < 80, set passed=false and provide specific actionable suggestions.`;

  try {
    const { data } = await generateStructuredOmniroute({
      systemPrompt: SCRIPT_JURY_SYSTEM_PROMPT,
      userPrompt: juryPrompt,
      schema: ScriptJuryEvaluationSchema,
      preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
      temperature: 0.15,
    });
    return data;
  } catch (err) {
    console.warn("[Script Jury] Jury evaluation call failed, using heuristic validation:", err);
    // Heuristic fallback validation
    let wordsViolated = false;
    for (const seg of script.segments) {
      const words = seg.narrationText.trim().split(/\s+/).filter(Boolean).length;
      if (words > 28 || words < 12) wordsViolated = true;
    }
    return {
      score: wordsViolated ? 72 : 88,
      passed: !wordsViolated,
      spokenFlowScore: wordsViolated ? 70 : 85,
      beatTransitionScore: 85,
      pacingScore: wordsViolated ? 68 : 90,
      singleIdeaPerBeatScore: 85,
      critique: wordsViolated
        ? "Jumlah kata per beat melebihi batas kecepatan bicara nyaman (2.3–2.8 kata/detik)."
        : "Naskah mengalir baik.",
      improvementSuggestions: wordsViolated
        ? ["Ringkas naskah agar tidak melebihi 24 kata per beat."]
        : [],
    };
  }
}

export async function runScriptwriterAgent(
  blueprint: DeconstructionBlueprint
): Promise<{
  script: ScriptArchitectOutput;
  modelUsed: string;
}> {
  let promptAttempt = `Write the 4-Act conversational Indonesian script, dynamic top editorial header metrics, component pill pointers, and SFX stamps for this exact topic and blueprint:

TOPIC: "${blueprint.topic}"

BLUEPRINT FROM AGENT 1:
${JSON.stringify(blueprint, null, 2)}

CRITICAL SPOKEN-WORD INSTRUCTIONS:
1. WRITE FOR THE EAR: Write as if speaking aloud to a friend over coffee.
2. VARY SENTENCE LENGTH: Combine short and medium sentences naturally. FORBIDDEN: Do not write a series of 2-4 word sentence fragments separated by periods!
3. SEAMLESS CONNECTORS: Use natural Indonesian transitions between beats ("Nah,", "Dan di sinilah,", "Tapi ada satu masalah,", "Untungnya,"). The opening sentence of Beat N MUST connect smoothly to the end of Beat N-1.
4. ONE IDEA PER BEAT: Focus on one core visual-physical concept per beat.
5. PACING LIMIT: 18 to 24 words per beat (never exceed 25 words). Target speaking speed is 2.3–2.8 words/second.
6. All 4 segments in "segments" MUST have segmentIndex 0, 1, 2, 3 and phaseType:
   - 0: "EVERYDAY_CONTRAST_HOOK"
   - 1: "CORE_MECHANISM_CUTAWAY"
   - 2: "COMPONENT_ZOOM_INS"
   - 3: "PRACTICAL_TAKEAWAY_LOOP" (set "showChecklistCard": true on segment 3)
7. Every "pillLabels" item MUST reference a valid "componentId" from the blueprint (${blueprint.components.map((c) => `"${c.id}"`).join(", ")}).
8. Make sure "primaryMetric", "statusBadge", and "secondaryMetric" reflect real physical numbers of "${blueprint.topic}".
9. Return ONLY valid JSON matching this schema structure:
${SCRIPT_SCHEMA_TEMPLATE}`;

  let finalScript: ScriptArchitectOutput | null = null;
  let finalModelUsed = env.OMNIROUTE_PRIMARY_MODEL;
  let juryResult: ScriptJuryEvaluation | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, modelUsed } = await generateStructuredOmniroute({
      systemPrompt: LAYMAN_SCRIPTWRITER_SYSTEM_PROMPT,
      userPrompt: promptAttempt,
      schema: ScriptArchitectOutputSchema,
      preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
      temperature: 0.25,
    });

    finalModelUsed = modelUsed;

    // Word count safety check (if any beat > 27 words, force revision)
    const segmentWordCounts = data.segments.map(
      (s) => s.narrationText.trim().split(/\s+/).filter(Boolean).length
    );
    const hasWordCountViolation = segmentWordCounts.some((cnt) => cnt > 27);

    // Run Stage Jury
    juryResult = await evaluateScriptWithJury(blueprint.topic, data);

    if (juryResult.passed && !hasWordCountViolation) {
      data.juryEvaluation = juryResult;
      finalScript = data;
      break;
    }

    console.warn(
      `[Scriptwriter Agent] Script revision requested by Jury (Score: ${juryResult.score}, passed: ${juryResult.passed}, words: [${segmentWordCounts.join(", ")}]): ${juryResult.critique}`
    );

    // Build self-correcting prompt with Jury feedback
    promptAttempt = `The previous script draft received a quality score of ${juryResult.score}/100 and was REJECTED by the Jury.

JURY CRITIQUE:
${juryResult.critique}

IMPROVEMENT SUGGESTIONS:
${juryResult.improvementSuggestions.map((s) => `- ${s}`).join("\n")}
${hasWordCountViolation ? "- PERINGATAN: Jumlah kata melebihi batas! Maksimal 22-24 kata per beat agar ritme bicara santai (2.3-2.8 kata/detik)." : ""}

PREVIOUS REJECTED NARRATION:
${data.segments.map((s, idx) => `Beat ${idx}: "${s.narrationText}" (${segmentWordCounts[idx]} kata)`).join("\n")}

Please REWRITE the script to completely fix these issues. Ensure smooth spoken flow, natural transitions between beats ("nah", "dan di sinilah", dll.), and exactly 18-24 words per beat. Output valid JSON:`;

    finalScript = data; // Keep last attempt as fallback
  }

  if (finalScript && juryResult) {
    finalScript.juryEvaluation = juryResult;
  }

  return { script: finalScript!, modelUsed: finalModelUsed };
}

