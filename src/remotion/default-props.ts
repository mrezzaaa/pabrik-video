import type {
  RemotionCompositionProps,
  WordTiming,
} from "@/schemas/video-blueprint";
import { DEFAULT_ISO_CONFIG, projectIso3D } from "./iso-engine/iso-math";

function computeClientWordTimings(
  narrationText: string,
  segmentStartSec: number,
  segmentDurationSec: number,
  fps = 60
): WordTiming[] {
  const words = narrationText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return [];

  const weights = words.map((w) => {
    const baseLen = Math.max(w.replace(/[^a-zA-Z0-9]/g, "").length, 2);
    const commaPause = /[,;:]/.test(w) ? 2.5 : 0;
    const periodPause = /[.!?]/.test(w) ? 4.0 : 0;
    return baseLen + commaPause + periodPause;
  });

  const totalWeight = weights.reduce((acc, v) => acc + v, 0) || 1;
  let cursorSec = segmentStartSec;

  return words.map((word, idx) => {
    const sliceDuration = (weights[idx] / totalWeight) * segmentDurationSec;
    const startSec = Number(cursorSec.toFixed(3));
    const endSec = Number(
      (idx === words.length - 1
        ? segmentStartSec + segmentDurationSec
        : cursorSec + sliceDuration
      ).toFixed(3)
    );
    cursorSec = endSec;

    return {
      word,
      startSec,
      endSec,
      startFrame: Math.floor(startSec * fps),
      endFrame: Math.max(
        Math.ceil(endSec * fps),
        Math.floor(startSec * fps) + 1
      ),
    };
  });
}

function projectAnchor(x: number, y: number, z: number) {
  const pt = projectIso3D({ x, y, z }, DEFAULT_ISO_CONFIG);
  return {
    x: Math.round(pt.sx),
    y: Math.round(pt.sy),
  };
}

/**
 * Default Studio Preview Composition Props:
 * "Mekanisme kerja baterai Lithium-Ion saat fast charging 200W"
 * Compiled with Universal 3D-to-SVG Isometric Cutaway Builders (hollowBox3D, box3D, tubePath3D, particleStreams)
 */
export function buildDefaultCompositionProps(): RemotionCompositionProps {
  const topic = "Mekanisme kerja baterai Lithium-Ion saat fast charging 200W";
  const fps = 60;

  const actNarrations = [
    "Cas HP biasa butuh sejam. Pakai fast charging dua ratus Watt, cuma sepuluh menit penuh!",
    "Rahasianya baterai dibagi dua sel paralel. Ion Lithium nyebrang dua kali lebih cepat dari katoda ke anoda.",
    "Membran separator jaga agar gak korslet. Chip pintar juga atur arus biar suhu tetap adem.",
    "Baterai penuh kilat dan tetap awet. Sebelum pakai cas dua ratus Watt, cek tiga hal ini ya!",
  ];

  const durations = [7, 11, 10, 9];
  let cursorSec = 0;
  let cursorFrames = 0;

  const timings = durations.map((dur, idx) => {
    const startSec = cursorSec;
    const endSec = cursorSec + dur;
    const startFrame = cursorFrames;
    const durationInFrames = dur * fps;
    const endFrame = startFrame + durationInFrames;
    cursorSec = endSec;
    cursorFrames = endFrame;
    return {
      startSec,
      endSec,
      startFrame,
      endFrame,
      durationInFrames,
      wordTimings: computeClientWordTimings(
        actNarrations[idx],
        startSec,
        dur,
        fps
      ),
    };
  });

  const anchorCathode = projectAnchor(-28, 12, 10);
  const anchorSeparator = projectAnchor(0, 0, 12);
  const anchorAnode = projectAnchor(28, -12, 10);
  const anchorBms = projectAnchor(0, 0, -48);

  return {
    jobId: "demo-battery-200w",
    topic,
    laymanHookTitle: "Cas baterai 200W <highlight>kok bisa kilat?</highlight>",
    everydayCategory: "TEKNOLOGI BATERAI & FAST CHARGING",
    coreSimpleTruth:
      "Arsitektur Dual-Cell membagi arus 200W ke dua jalur paralel",
    width: 1080,
    height: 1920,
    fps: 60,
    durationInFrames: cursorFrames,
    aspectRatioMode: "SHORTS_9_16",
    practicalChecklist: {
      title: "CEK SEBELUM FAST CHARGING:",
      items: [
        "Kabel asli 10A / E-Marker",
        "Adaptor resmi GaN 200W",
        "Suhu HP di bawah 40°C",
      ],
    },
    visualScene: {
      subjectTitle: "DUAL-CELL LITHIUM-ION 200W",
      anatomyDecomposition: {
        outerHousingShell:
          "Casing aluminium pelindung baterai Dual-Cell dengan belahan melintang 90°",
        primaryInternalMechanism:
          "Elektroda Katoda LiCoO₂ dan Anoda Grafit kembar yang bekerja paralel",
        zoomInSubComponents:
          "Membran Separator berpori mikro dan modul Chip BMS Dual-Charge Pump",
        physicalMediumFlow:
          "Aliran ion Lithium (Li+) menyeberangi separator dan elektron 200W dari port USB-C",
      },
      parts: [
        {
          partId: "part_outer_housing",
          componentId: "comp_bms",
          name: "Casing Dual-Cell Aluminium",
          builderType: "hollowBox3D",
          materialColor: "#E2E8F0",
          cutaway: true,
          opacity: 1,
          params: {
            center: { x: 0, y: 0, z: 0 },
            axis: "Z",
            size: { w: 112, d: 96, h: 128 },
            wallThickness: 10,
          },
          animation: {
            type: "none",
            axis: "Z",
            speed: 1,
            amplitude: 0,
          },
        },
        {
          partId: "part_cathode_cell",
          componentId: "comp_cathode",
          name: "Katoda LiCoO₂ (+)",
          builderType: "box3D",
          materialColor: "#93C5FD",
          cutaway: false,
          opacity: 1,
          params: {
            center: { x: -28, y: 12, z: 10 },
            axis: "Z",
            size: { w: 30, d: 58, h: 74 },
            wallThickness: 6,
          },
          animation: {
            type: "pulse",
            axis: "Z",
            speed: 1.2,
            amplitude: 4,
          },
        },
        {
          partId: "part_separator_membrane",
          componentId: "comp_separator",
          name: "Membran Separator",
          builderType: "box3D",
          materialColor: "#FACC15",
          cutaway: false,
          opacity: 0.95,
          params: {
            center: { x: 0, y: 0, z: 12 },
            axis: "Z",
            size: { w: 10, d: 64, h: 78 },
            wallThickness: 4,
          },
          animation: {
            type: "oscillate",
            axis: "Z",
            speed: 1.1,
            amplitude: 3,
          },
        },
        {
          partId: "part_anode_graphite",
          componentId: "comp_anode",
          name: "Anoda Grafit (-)",
          builderType: "box3D",
          materialColor: "#86EFAC",
          cutaway: false,
          opacity: 1,
          params: {
            center: { x: 28, y: -12, z: 10 },
            axis: "Z",
            size: { w: 30, d: 58, h: 74 },
            wallThickness: 6,
          },
          animation: {
            type: "pulse",
            axis: "Z",
            speed: 1.2,
            amplitude: 4,
          },
        },
        {
          partId: "part_bms_controller",
          componentId: "comp_bms",
          name: "Chip BMS Dual-Pump 200W",
          builderType: "box3D",
          materialColor: "#F87171",
          cutaway: false,
          opacity: 1,
          params: {
            center: { x: 0, y: 0, z: -46 },
            axis: "Z",
            size: { w: 84, d: 62, h: 20 },
            wallThickness: 6,
          },
          animation: {
            type: "none",
            axis: "Z",
            speed: 1,
            amplitude: 0,
          },
        },
        {
          partId: "part_dual_busbar",
          componentId: "comp_bms",
          name: "Jalur Arus Paralel 10A",
          builderType: "tubePath3D",
          materialColor: "#FDBA74",
          cutaway: false,
          opacity: 1,
          params: {
            center: { x: 0, y: 0, z: -25 },
            axis: "Z",
            tubeRadius: 5,
            wallThickness: 4,
            path3D: [
              { x: -28, y: 12, z: -36 },
              { x: 0, y: 0, z: -44 },
              { x: 28, y: -12, z: -36 },
            ],
          },
          animation: {
            type: "none",
            axis: "Z",
            speed: 1,
            amplitude: 0,
          },
        },
      ],
      particleStreams: [
        {
          id: "stream_li_ions_upper",
          type: "ions",
          color: "#38BDF8",
          path3D: [
            { x: -28, y: 12, z: 26 },
            { x: 0, y: 0, z: 28 },
            { x: 28, y: -12, z: 26 },
          ],
          count: 10,
          speed: 1.8,
          size: 10,
          activeInPhases: [0, 1, 2, 3],
        },
        {
          id: "stream_li_ions_lower",
          type: "ions",
          color: "#38BDF8",
          path3D: [
            { x: -28, y: 12, z: -4 },
            { x: 0, y: 0, z: -2 },
            { x: 28, y: -12, z: -4 },
          ],
          count: 10,
          speed: 1.8,
          size: 10,
          activeInPhases: [1, 2, 3],
        },
        {
          id: "stream_fast_electrons",
          type: "electrons",
          color: "#FACC15",
          path3D: [
            { x: 0, y: 18, z: -56 },
            { x: 16, y: 4, z: -36 },
            { x: 28, y: -12, z: 8 },
          ],
          count: 9,
          speed: 2.2,
          size: 9,
          activeInPhases: [0, 1, 2],
        },
      ],
    },
    phases: [
      {
        segmentIndex: 0,
        phaseType: "EVERYDAY_CONTRAST_HOOK",
        chapterTitle:
          "Cas baterai 200W <highlight>kok bisa kilat?</highlight>",
        narrationText: actNarrations[0],
        audioUrl: "",
        startFrame: timings[0].startFrame,
        endFrame: timings[0].endFrame,
        durationInFrames: timings[0].durationInFrames,
        wordTimings: timings[0].wordTimings,
        camera: {
          startFrame: timings[0].startFrame,
          endFrame: timings[0].endFrame,
          x: 0,
          y: 0,
          scale: 1.0,
        },
        primaryMetric: {
          startValue: 18,
          endValue: 200,
          unit: "W",
          decimals: 0,
          isHighActive: true,
          baselineValue: 18,
          peakValue: 200,
          sparklinePoints: [18, 45, 90, 145, 200],
        },
        statusBadge: {
          text: "FAST CHARGE",
          variant: "red",
        },
        secondaryMetric: "20V / 10A Arus",
        activeComponentIds: ["comp_bms", "comp_cathode"],
        showChecklistCard: false,
      },
      {
        segmentIndex: 1,
        phaseType: "CORE_MECHANISM_CUTAWAY",
        chapterTitle: "Dibagi dua sel, <highlight>ion ngebut 2x!</highlight>",
        narrationText: actNarrations[1],
        audioUrl: "",
        startFrame: timings[1].startFrame,
        endFrame: timings[1].endFrame,
        durationInFrames: timings[1].durationInFrames,
        wordTimings: timings[1].wordTimings,
        camera: {
          startFrame: timings[1].startFrame,
          endFrame: timings[1].endFrame,
          x: 0,
          y: -25,
          scale: 1.18,
        },
        primaryMetric: {
          startValue: 15,
          endValue: 75,
          unit: "%",
          decimals: 0,
          isHighActive: true,
          baselineValue: 0,
          peakValue: 100,
          sparklinePoints: [15, 30, 48, 62, 75],
        },
        statusBadge: {
          text: "DUAL-CELL",
          variant: "red",
        },
        secondaryMetric: "2x 100W Paralel",
        activeComponentIds: ["comp_cathode", "comp_anode"],
        showChecklistCard: false,
      },
      {
        segmentIndex: 2,
        phaseType: "COMPONENT_ZOOM_INS",
        chapterTitle: "Separator & BMS: <highlight>penjaga suhu</highlight>",
        narrationText: actNarrations[2],
        audioUrl: "",
        startFrame: timings[2].startFrame,
        endFrame: timings[2].endFrame,
        durationInFrames: timings[2].durationInFrames,
        wordTimings: timings[2].wordTimings,
        camera: {
          startFrame: timings[2].startFrame,
          endFrame: timings[2].endFrame,
          x: 0,
          y: -75,
          scale: 1.48,
        },
        primaryMetric: {
          startValue: 34.5,
          endValue: 38.2,
          unit: "°C",
          decimals: 1,
          isHighActive: false,
          baselineValue: 30,
          peakValue: 45,
          sparklinePoints: [34.5, 35.8, 37.0, 37.8, 38.2],
        },
        statusBadge: {
          text: "SUHU AMAN",
          variant: "green",
        },
        secondaryMetric: "4,2 V Stabil",
        activeComponentIds: ["comp_separator", "comp_bms"],
        showChecklistCard: false,
      },
      {
        segmentIndex: 3,
        phaseType: "PRACTICAL_TAKEAWAY_LOOP",
        chapterTitle:
          "Penuh 10 menit, <highlight>baterai tetap awet!</highlight>",
        narrationText: actNarrations[3],
        audioUrl: "",
        startFrame: timings[3].startFrame,
        endFrame: timings[3].endFrame,
        durationInFrames: timings[3].durationInFrames,
        wordTimings: timings[3].wordTimings,
        camera: {
          startFrame: timings[3].startFrame,
          endFrame: timings[3].endFrame,
          x: 0,
          y: 10,
          scale: 1.02,
        },
        primaryMetric: {
          startValue: 80,
          endValue: 100,
          unit: "%",
          decimals: 0,
          isHighActive: false,
          baselineValue: 0,
          peakValue: 100,
          sparklinePoints: [80, 86, 92, 97, 100],
        },
        statusBadge: {
          text: "PENUH 100%",
          variant: "green",
        },
        secondaryMetric: "10 menit selesai",
        activeComponentIds: [
          "comp_cathode",
          "comp_separator",
          "comp_anode",
          "comp_bms",
        ],
        showChecklistCard: true,
      },
    ],
    pillCallouts: [
      {
        id: "pill_bat_0",
        componentId: "comp_bms",
        startFrame: timings[0].startFrame + 35,
        endFrame: timings[0].endFrame - 15,
        text: "ARUS 200W MASUK →",
        direction: "RIGHT",
        anchor: anchorBms,
      },
      {
        id: "pill_bat_1",
        componentId: "comp_cathode",
        startFrame: timings[1].startFrame + 30,
        endFrame: timings[1].endFrame - 20,
        text: "KATODA LiCoO₂ →",
        direction: "RIGHT",
        anchor: anchorCathode,
      },
      {
        id: "pill_bat_2",
        componentId: "comp_anode",
        startFrame: timings[1].startFrame + 120,
        endFrame: timings[1].endFrame - 15,
        text: "← ANODA GRAFIT",
        direction: "LEFT",
        anchor: anchorAnode,
      },
      {
        id: "pill_bat_3",
        componentId: "comp_separator",
        startFrame: timings[2].startFrame + 30,
        endFrame: timings[2].endFrame - 20,
        text: "PEMISAH (SEPARATOR) →",
        direction: "RIGHT",
        anchor: anchorSeparator,
      },
      {
        id: "pill_bat_4",
        componentId: "comp_bms",
        startFrame: timings[3].startFrame + 30,
        endFrame: timings[3].endFrame - 20,
        text: "← DUAL-CELL AMAN",
        direction: "LEFT",
        anchor: anchorBms,
      },
    ],
    sfxOverlays: [
      {
        id: "sfx_bat_0",
        startFrame: timings[0].startFrame + 60,
        endFrame: timings[0].startFrame + 190,
        text: "200 WATT!",
        variant: "STEAM_YELLOW_BLUE",
        x: 720,
        y: 610,
        rotateDeg: -8,
      },
      {
        id: "sfx_bat_1",
        startFrame: timings[1].startFrame + 75,
        endFrame: timings[1].startFrame + 210,
        text: "DUAL-CELL",
        variant: "RED_STAMP",
        x: 730,
        y: 640,
        rotateDeg: -7,
      },
    ],
    sfxTriggers: [],
  };
}
