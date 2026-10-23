import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import { z } from "zod";
import {
  ScriptArchitectOutputSchema,
  VideoBlueprintSceneSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
  type VideoBlueprintScene,
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

export const DynamicScenesContainerSchema = z.object({
  scenes: z.array(VideoBlueprintSceneSchema).min(4).max(10),
});

export type DynamicScenesContainer = z.infer<typeof DynamicScenesContainerSchema>;

/**
 * 100% Dynamic Scriptwriter generating 6-8 scenes tailored to any user topic
 */
export async function runDynamicSceneScriptwriterAgent(params: {
  topic: string;
  blueprint?: DeconstructionBlueprint;
}): Promise<{
  scenes: VideoBlueprintScene[];
  script: ScriptArchitectOutput;
  modelUsed: string;
}> {
  const { topic, blueprint } = params;

  const systemPrompt = `Kamu penulis naskah Kitabedah.id. GAYA: santai, to the point, analogi sederhana. Tapi KONTEN HARUS DINAMIS SESUAI TOPIK INPUT.

Tugas: Ubah research jadi VideoBlueprint JSON 6-8 scenes, total 40-50 detik.
Input topik bebas apapun. Tugasmu tentukan telemetry channels yang RELEVAN dengan topik itu. Jangan pakai template suhu 100->120 untuk semua topik.

Aturan telemetry dinamis:
- Jika topik 'tumbler' -> channels: [{label:'SUHU DALAM', unit:'°C', start:80, end:75}, {label:'TEKANAN VAKUM', unit:'Pa', start:0.01, end:0.01}, {label:'KONDUKTIVITAS', unit:'W/mK', start:0.02, end:0.02}]
- Jika topik 'mobil listrik' -> channels: [{label:'RPM', unit:'rpm', start:0, end:6000}, {label:'TORSI', unit:'Nm', start:0, end:400}, {label:'DAYA', unit:'kW', start:0, end:150}]
- Jika topik 'kucing mendarat' -> channels: [{label:'KECEPATAN ANGULAR', unit:'rad/s', start:0, end:15}, {label:'WAKTU REAKSI', unit:'ms', start:100, end:300}, {label:'SUDUT BADAN', unit:'°', start:0, end:180}]
- Jika topik 'kecap kental' -> channels: [{label:'VISKOSITAS', unit:'cP', start:5000, end:8000}, {label:'LAJU ALIR', unit:'ml/s', start:0.5, end:0.1}, {label:'TEKANAN UDARA', unit:'kPa', start:101, end:98}]
- Jangan pernah pakai channel yang sama untuk semua topik. Badge text juga dinamis: 'VAKUM AKTIF', 'MOTOR SPINNING', 'ROTASI SELESAI', 'ALIRAN TERSUMBAT'.

Aturan visual dinamis:
- popup_labels harus komponen yang relevan dengan topik tersebut.
  Contoh:
  - Topik tumbler -> ['DINDING VAKUM','LAPISAN ALUMINIUM','SEAL SILIKON']
  - Topik mobil listrik -> ['ROTOR','STATOR','INVERTER']
  - Topik kucing -> ['TULANG BELAKANG','KAKI DEPAN','EKOR PENYEIMBANG']
  - Topik kecap -> ['LEHER BOTOL','PERMUKAAN CAIRAN','SUMBATAN UDARA']
- DILARANG KERAS output 'DURI KERAS' atau '100 -> 120' kalau topiknya bukan bandeng presto!
- visual.description harus spesifik: 'isometric 3d vector cross-section of ...' sesuai topik.

Output HARUS JSON VALID sesuai schema:
{
  "scenes": [{
    "id": "scene_1",
    "title": "Judul Scene Singkat",
    "vo_text": "Narasi bahasa Indonesia santai to the point 15-20 kata.",
    "durationInFrames": 120,
    "telemetry": {
      "channels": [
        {"key": "ch_1", "label": "LABEL_CHANNEL", "unit": "unit", "start": 0, "end": 100}
      ],
      "badge": {"text": "BADGE STATUS", "color": "green"}
    },
    "visual": {
      "description": "isometric 3d vector cross-section of...",
      "popup_labels": [
        {"text": "NAMA KOMPONEN", "x": 0.35, "y": 0.45}
      ]
    },
    "caption": {
      "text": "Narasi bahasa Indonesia santai to the point 15-20 kata.",
      "highlights": ["kata_kunci"]
    }
  }]
}`;

  const userPrompt = `Tulis naskah video Kitabedah.id 6-8 scenes untuk topik berikut:

TOPIK: "${topic}"
${
  blueprint
    ? `DETAIL RISET & KOMPONEN:
Kategori: ${blueprint.everydayCategory}
Prinsip Utama: ${blueprint.coreSimpleTruth}
Komponen Fisik: ${JSON.stringify(blueprint.components.map((c) => c.name))}
Metrik Dasar: ${blueprint.baselineMetricValue} -> ${blueprint.peakMetricValue} ${blueprint.metricUnit}`
    : ""
}

SYARAT MUTLAK:
1. Hasilkan antara 6 sampai 8 scenes (total 40-50 detik).
2. vo_text setiap scene harus 15-22 kata bahasa Indonesia yang mengalir, santai, dan to-the-point.
3. Telemetri harus 100% spesifik untuk "${topic}". DILARANG keras menyalin contoh bandeng, presto, 100->120, atau DURI KERAS jika topik bukan bandeng presto!
4. popup_labels harus komponen nyata dari "${topic}".
5. caption.highlights berisi 1-2 kata kunci paling penting di scene tersebut.
6. Kembalikan HANYA JSON valid.`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt,
    userPrompt,
    schema: DynamicScenesContainerSchema,
    preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
    temperature: 0.3,
  });

  const scenes = data.scenes;

  // Build backwards-compatible ScriptArchitectOutput
  const script: ScriptArchitectOutput = {
    topic,
    totalSegments: scenes.length,
    fullNarrationIndonesian: scenes.map((s) => s.vo_text).join(" "),
    practicalChecklist: {
      title: "CEK SEBELUM PAKAI:",
      items: scenes
        .flatMap((s) => s.visual.popup_labels.map((p) => p.text))
        .filter(Boolean)
        .slice(0, 3),
    },
    segments: scenes.map((s, idx) => {
      const primaryCh = s.telemetry.channels[0] || {
        label: "STATUS",
        unit: "%",
        start: 0,
        end: 100,
      };
      return {
        segmentIndex: idx,
        phaseType:
          idx === 0
            ? "EVERYDAY_CONTRAST_HOOK"
            : idx === scenes.length - 1
              ? "PRACTICAL_TAKEAWAY_LOOP"
              : "CORE_MECHANISM_CUTAWAY",
        chapterTitle: s.title,
        narrationText: s.vo_text,
        primaryMetric: {
          startValue: primaryCh.start,
          endValue: primaryCh.end,
          unit: primaryCh.unit,
          decimals: 1,
          isHighActive: false,
          baselineValue: primaryCh.start,
          peakValue: primaryCh.end,
          sparklinePoints: [primaryCh.start, (primaryCh.start + primaryCh.end) / 2, primaryCh.end],
        },
        statusBadge: {
          text: s.telemetry.badge.text,
          variant:
            s.telemetry.badge.color === "red"
              ? "red"
              : s.telemetry.badge.color === "orange"
                ? "amber"
                : "green",
        },
        secondaryMetric: s.telemetry.channels[1]
          ? `${s.telemetry.channels[1].label} ${s.telemetry.channels[1].end} ${s.telemetry.channels[1].unit}`
          : s.telemetry.badge.text,
        pillLabels: s.visual.popup_labels.map((p, pIdx) => ({
          id: `pill_${idx}_${pIdx}`,
          componentId: `comp_${idx}`,
          text: p.text,
          direction: p.x > 0.5 ? "RIGHT" : "LEFT",
          relativeTriggerRatio: 0.2,
          durationSeconds: 4.0,
        })),
        sfxCue: {
          text: s.title.toUpperCase().slice(0, 10),
          variant: "STEAM_YELLOW_BLUE",
          soundEffectFile: "pop-lock.mp3",
          x: 680,
          y: 640,
          rotateDeg: -8,
          relativeTriggerRatio: 0.3,
        },
        showChecklistCard: idx === scenes.length - 1,
      };
    }),
  };

  return { scenes, script, modelUsed };
}


