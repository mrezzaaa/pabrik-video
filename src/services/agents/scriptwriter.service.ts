import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  ScriptArchitectOutputSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
} from "@/schemas/video-blueprint";
import { LAYMAN_SCRIPTWRITER_SYSTEM_PROMPT } from "./prompts";

export function buildFallbackScript(blueprint: DeconstructionBlueprint): ScriptArchitectOutput {
  const c0 = blueprint.components[0]?.id ?? "comp_pot_body";
  const c1 = blueprint.components[1]?.id ?? "comp_water_fluid";
  const c2 = blueprint.components[2]?.id ?? "comp_core_item";
  const c3 = blueprint.components[3]?.id ?? "comp_pressure_valve";
  const c4 = blueprint.components[4]?.id ?? c3;

  const isTumbler = blueprint.primaryArchetype === "THERMAL_TUMBLER";

  if (isTumbler) {
    const segments: ScriptArchitectOutput["segments"] = [
      {
        segmentIndex: 0,
        phaseType: "EVERYDAY_CONTRAST_HOOK",
        chapterTitle: "Kenapa air di tumbler <highlight>awet panas?</highlight>",
        narrationText:
          "Taruh kopi di gelas biasa? Cepat dingin! Di tumbler, panasnya awet seharian. Kok bisa?",
        primaryMetric: {
          startValue: 92.0,
          endValue: 92.0,
          unit: "°C",
          decimals: 1,
          isHighActive: false,
          baselineValue: 28,
          peakValue: 92,
          sparklinePoints: [92, 92, 92, 92, 92],
        },
        statusBadge: {
          text: "PANAS AWET",
          variant: "green",
        },
        secondaryMetric: "12 jam tahan",
        pillLabels: [
          {
            id: "pill_0_1",
            componentId: c0,
            text: "BODI ADEM →",
            direction: "RIGHT",
            anchor: blueprint.components[0]?.defaultAnchor ?? { x: 310, y: 1020 },
            relativeTriggerRatio: 0.12,
            durationSeconds: 4.5,
          },
          {
            id: "pill_0_2",
            componentId: c1,
            text: "← KOPI 92°C",
            direction: "LEFT",
            anchor: blueprint.components[1]?.defaultAnchor ?? { x: 540, y: 1080 },
            relativeTriggerRatio: 0.35,
            durationSeconds: 4.0,
          },
        ],
        sfxCue: {
          text: "BERJAM-JAM",
          variant: "FADED_BG",
          soundEffectFile: "bubble.mp3",
          x: 540,
          y: 520,
          rotateDeg: -6,
          relativeTriggerRatio: 0.25,
        },
        showChecklistCard: false,
      },
      {
        segmentIndex: 1,
        phaseType: "CORE_MECHANISM_CUTAWAY",
        chapterTitle: "Dinding ganda <highlight>hampa udara</highlight>",
        narrationText:
          "Rahasianya ada di celah dua dinding baja. Udaranya disedot habis. Panas nggak bisa nyebrang keluar!",
        primaryMetric: {
          startValue: 92.0,
          endValue: 91.5,
          unit: "°C",
          decimals: 1,
          isHighActive: true,
          baselineValue: 28,
          peakValue: 92,
          sparklinePoints: [92.0, 91.9, 91.8, 91.6, 91.5],
        },
        statusBadge: {
          text: "TERKUNCI",
          variant: "red",
        },
        secondaryMetric: "0,0 udara",
        pillLabels: [
          {
            id: "pill_1_1",
            componentId: c2,
            text: "← CELAH VAKUM",
            direction: "LEFT",
            anchor: blueprint.components[2]?.defaultAnchor ?? { x: 750, y: 980 },
            relativeTriggerRatio: 0.15,
            durationSeconds: 5.0,
          },
          {
            id: "pill_1_2",
            componentId: c1,
            text: "PANAS MANTUL →",
            direction: "RIGHT",
            anchor: { x: 360, y: 1120 },
            relativeTriggerRatio: 0.45,
            durationSeconds: 4.5,
          },
        ],
        sfxCue: {
          text: "TERKUNCI",
          variant: "RED_STAMP",
          soundEffectFile: "pop-lock.mp3",
          x: 720,
          y: 660,
          rotateDeg: -8,
          relativeTriggerRatio: 0.3,
        },
        showChecklistCard: false,
      },
      {
        segmentIndex: 2,
        phaseType: "COMPONENT_ZOOM_INS",
        chapterTitle: "Karet silikon: <highlight>penjaga uap</highlight>",
        narrationText:
          "Panas paling rawan kabur lewat tutup atas. Makanya dipasang karet silikon rapat pengunci uap.",
        primaryMetric: {
          startValue: 91.5,
          endValue: 90.8,
          unit: "°C",
          decimals: 1,
          isHighActive: true,
          baselineValue: 28,
          peakValue: 92,
          sparklinePoints: [91.5, 91.3, 91.1, 90.9, 90.8],
        },
        statusBadge: {
          text: "RAPAT!",
          variant: "red",
        },
        secondaryMetric: "anti bocor",
        pillLabels: [
          {
            id: "pill_2_1",
            componentId: c3,
            text: "KARET SILIKON →",
            direction: "RIGHT",
            anchor: blueprint.components[3]?.defaultAnchor ?? { x: 540, y: 690 },
            relativeTriggerRatio: 0.15,
            durationSeconds: 4.8,
          },
        ],
        sfxCue: {
          text: "PSSST!",
          variant: "STEAM_YELLOW_BLUE",
          soundEffectFile: "steam-hiss.mp3",
          x: 710,
          y: 620,
          rotateDeg: -10,
          relativeTriggerRatio: 0.35,
        },
        showChecklistCard: false,
      },
      {
        segmentIndex: 3,
        phaseType: "PRACTICAL_TAKEAWAY_LOOP",
        chapterTitle: "Tiga ciri tumbler <highlight>vakum asli!</highlight>",
        narrationText:
          "Minuman awet panas maupun dingin. Sebelum beli tumbler, wajib cek tiga bagian ini ya!",
        primaryMetric: {
          startValue: 90.8,
          endValue: 90.5,
          unit: "°C",
          decimals: 1,
          isHighActive: false,
          baselineValue: 28,
          peakValue: 92,
          sparklinePoints: [91.0, 90.9, 90.8, 90.6, 90.5],
        },
        statusBadge: {
          text: "AMAN",
          variant: "green",
        },
        secondaryMetric: "+18 jam awet",
        pillLabels: [
          {
            id: "pill_3_1",
            componentId: c0,
            text: "BAJA 304 →",
            direction: "RIGHT",
            anchor: blueprint.components[0]?.defaultAnchor ?? { x: 310, y: 1020 },
            relativeTriggerRatio: 0.12,
            durationSeconds: 4.5,
          },
        ],
        showChecklistCard: true,
      },
    ];

    return {
      topic: blueprint.topic,
      totalSegments: 4,
      fullNarrationIndonesian: segments.map((s) => s.narrationText).join(" "),
      practicalChecklist: {
        title: blueprint.practicalChecklistTitle,
        items: blueprint.practicalChecklistItems,
      },
      segments,
    };
  }

  // Flagship Reference: Bandeng Presto / Pressure Cooker Cutaway Style
  const segments: ScriptArchitectOutput["segments"] = [
    {
      segmentIndex: 0,
      phaseType: "EVERYDAY_CONTRAST_HOOK",
      chapterTitle: blueprint.laymanHookTitle,
      narrationText:
        "Rebus di panci biasa berjam-jam? Duri bandeng tetap keras! Soalnya air mentok di seratus derajat.",
      primaryMetric: {
        startValue: 100.0,
        endValue: 100.0,
        unit: "°C",
        decimals: 1,
        isHighActive: false,
        baselineValue: 100,
        peakValue: 120,
        sparklinePoints: [98, 100, 100, 100, 100],
      },
      statusBadge: {
        text: "MENDIDIH",
        variant: "green",
      },
      secondaryMetric: "terbuka",
      pillLabels: [
        {
          id: "pill_0_1",
          componentId: c2,
          text: "DURI KERAS →",
          direction: "RIGHT",
          anchor: { x: 340, y: 1130 },
          relativeTriggerRatio: 0.12,
          durationSeconds: 4.8,
        },
        {
          id: "pill_0_2",
          componentId: c1,
          text: "← MENTOK 100°C",
          direction: "LEFT",
          anchor: { x: 720, y: 1040 },
          relativeTriggerRatio: 0.35,
          durationSeconds: 4.2,
        },
      ],
      sfxCue: {
        text: "BERJAM-JAM",
        variant: "FADED_BG",
        soundEffectFile: "bubble.mp3",
        x: 540,
        y: 530,
        rotateDeg: -5,
        relativeTriggerRatio: 0.2,
      },
      showChecklistCard: false,
    },
    {
      segmentIndex: 1,
      phaseType: "CORE_MECHANISM_CUTAWAY",
      chapterTitle: "Uap dikurung, <highlight>titik didih naik</highlight>",
      narrationText:
        "Presto ditutup rapat. Uap dikurung di dalam. Tekanan naik, titik didih tembus seratus dua puluh derajat!",
      primaryMetric: {
        startValue: 100.0,
        endValue: 120.5,
        unit: "°C",
        decimals: 1,
        isHighActive: true,
        baselineValue: 100,
        peakValue: 120.5,
        sparklinePoints: [100, 105, 112, 117, 120.5],
      },
      statusBadge: {
        text: "BERTEKANAN",
        variant: "red",
      },
      secondaryMetric: "0,6 kg/cm²",
      pillLabels: [
        {
          id: "pill_1_1",
          componentId: c0,
          text: "← UAP TERKURUNG",
          direction: "LEFT",
          anchor: { x: 700, y: 880 },
          relativeTriggerRatio: 0.12,
          durationSeconds: 5.5,
        },
        {
          id: "pill_1_2",
          componentId: c2,
          text: "DURI LUNAK →",
          direction: "RIGHT",
          anchor: { x: 340, y: 1130 },
          relativeTriggerRatio: 0.42,
          durationSeconds: 5.0,
        },
      ],
      sfxCue: {
        text: "TERKUNCI",
        variant: "RED_STAMP",
        soundEffectFile: "pop-lock.mp3",
        x: 730,
        y: 670,
        rotateDeg: -8,
        relativeTriggerRatio: 0.25,
      },
      showChecklistCard: false,
    },
    {
      segmentIndex: 2,
      phaseType: "COMPONENT_ZOOM_INS",
      chapterTitle: "Pemberat: <highlight>penjaga tekanan</highlight>",
      narrationText:
        "Kelebihan uap? Pemberat langsung buang angin. Kalau mampet, katup cadangan dan pengunci siap jaga aman.",
      primaryMetric: {
        startValue: 120.5,
        endValue: 119.2,
        unit: "°C",
        decimals: 1,
        isHighActive: true,
        baselineValue: 100,
        peakValue: 120.5,
        sparklinePoints: [118, 120.5, 120.0, 119.5, 119.2],
      },
      statusBadge: {
        text: "TERKUNCI",
        variant: "red",
      },
      secondaryMetric: "1,0 kg/cm²",
      pillLabels: [
        {
          id: "pill_2_1",
          componentId: c3,
          text: "PEMBERAT →",
          direction: "RIGHT",
          anchor: { x: 380, y: 670 },
          relativeTriggerRatio: 0.1,
          durationSeconds: 5.0,
        },
        {
          id: "pill_2_2",
          componentId: c4,
          text: "← PENGUNCI TUTUP",
          direction: "LEFT",
          anchor: { x: 720, y: 740 },
          relativeTriggerRatio: 0.4,
          durationSeconds: 4.5,
        },
      ],
      sfxCue: {
        text: "PSSST!",
        variant: "STEAM_YELLOW_BLUE",
        soundEffectFile: "steam-hiss.mp3",
        x: 680,
        y: 590,
        rotateDeg: -10,
        relativeTriggerRatio: 0.22,
      },
      showChecklistCard: false,
    },
    {
      segmentIndex: 3,
      phaseType: "PRACTICAL_TAKEAWAY_LOOP",
      chapterTitle: "Tiga pengaman <highlight>wajib dicek!</highlight>",
      narrationText:
        "Duri lunak, hemat enam puluh sembilan menit. Sebelum beli presto, wajib cek tiga pengaman ini ya!",
      primaryMetric: {
        startValue: 119.2,
        endValue: 100.0,
        unit: "°C",
        decimals: 1,
        isHighActive: false,
        baselineValue: 100,
        peakValue: 120.5,
        sparklinePoints: [119, 114, 108, 103, 100],
      },
      statusBadge: {
        text: "AMAN",
        variant: "green",
      },
      secondaryMetric: "+69 menit",
      pillLabels: [
        {
          id: "pill_3_1",
          componentId: c2,
          text: "SIAP SANTAP →",
          direction: "RIGHT",
          anchor: { x: 350, y: 1130 },
          relativeTriggerRatio: 0.15,
          durationSeconds: 5.0,
        },
      ],
      showChecklistCard: true,
    },
  ];

  return {
    topic: blueprint.topic,
    totalSegments: 4,
    fullNarrationIndonesian: segments.map((s) => s.narrationText).join(" "),
    practicalChecklist: {
      title: blueprint.practicalChecklistTitle,
      items: blueprint.practicalChecklistItems,
    },
    segments,
  };
}

export async function runScriptwriterAgent(blueprint: DeconstructionBlueprint): Promise<{
  script: ScriptArchitectOutput;
  modelUsed: string;
}> {
  const fallback = buildFallbackScript(blueprint);

  const userPrompt = `Tulis naskah voiceover Bahasa Indonesia yang santai, hangat, dan mudah dipahami orang awam (maksimal 4-7 kata per kalimat) untuk storyboard berikut:

STORYBOARD BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

Kembalikan HANYA JSON valid dengan struktur persis seperti contoh berikut:
${JSON.stringify(fallback, null, 2)}`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt: LAYMAN_SCRIPTWRITER_SYSTEM_PROMPT,
    userPrompt,
    schema: ScriptArchitectOutputSchema,
    preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
    temperature: 0.35,
    fallbackGenerator: () => fallback,
  });

  return { script: data, modelUsed };
}
