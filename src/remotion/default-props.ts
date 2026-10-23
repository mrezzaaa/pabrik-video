import type {
  RemotionCompositionProps,
  WordTiming,
} from "@/schemas/video-blueprint";
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

function projectStageAnchor(stageX: number, stageY: number) {
  return {
    x: Math.round(Math.max(200, Math.min(880, 40 + stageX))),
    y: Math.round(Math.max(620, Math.min(1420, 520 + stageY))),
  };
}

/**
 * Default Studio Preview Composition Props:
 * "Mekanisme kerja baterai Lithium-Ion saat fast charging 200W"
 * Compiled with Freeform Multi-Layered Isometric Vector Cutaway Stage (viewBox="0 0 1000 1000")
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

  const anchorCathode = projectStageAnchor(380, 460);
  const anchorSeparator = projectStageAnchor(500, 460);
  const anchorAnode = projectStageAnchor(620, 460);
  const anchorBms = projectStageAnchor(500, 720);

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
      objectFormFactor: "Dual-Cell Fast Charging Li-Ion Cutaway",
      anatomyDecomposition: {
        outerStructure:
          "Casing aluminium pelindung baterai Dual-Cell dengan belahan melintang 90°",
        cutawayCrossSection:
          "Penampang melintang memperlihatkan katoda LiCoO2 dan anoda grafit",
        coreInternalParts:
          "Membran separator polimer mikro dan modul chip BMS dual-charge pump",
        movingMechanism:
          "Distribusi arus elektron 200W dari port USB-C menuju sel kembar",
      },
      svgDefsMarkup: `
        <linearGradient id="grad-alu" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F1F5F9" />
          <stop offset="100%" stop-color="#CBD5E1" />
        </linearGradient>
        <linearGradient id="grad-cathode" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#BFDBFE" />
          <stop offset="100%" stop-color="#60A5FA" />
        </linearGradient>
        <linearGradient id="grad-anode" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#BBF7D0" />
          <stop offset="100%" stop-color="#4ADE80" />
        </linearGradient>
        <linearGradient id="grad-sep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FEF08A" />
          <stop offset="100%" stop-color="#FACC15" />
        </linearGradient>
      `,
      parts: [
        {
          partId: "part_outer_housing",
          componentId: "comp_bms",
          name: "Casing Dual-Cell Aluminium",
          layerOrder: 10,
          isCutawayWall: true,
          anchorPoint: { x: 300, y: 340 },
          svgMarkup: `<path d="M 220 280 L 500 120 L 780 280 L 780 620 L 500 780 L 220 620 Z" fill="url(#grad-alu)" stroke="#1E293B" stroke-width="2.5" fill-opacity="0.3" stroke-dasharray="6 4" stroke-linejoin="round" />`,
          animation: {
            type: "none",
            dx: 0,
            dy: 0,
            rotateDeg: 0,
            scaleFactor: 1,
            speed: 1,
            activeInPhases: [0, 1, 2, 3],
          },
        },
        {
          partId: "part_cathode_cell",
          componentId: "comp_cathode",
          name: "Katoda LiCoO₂ (+)",
          layerOrder: 20,
          isCutawayWall: false,
          anchorPoint: { x: 380, y: 460 },
          svgMarkup: `<path d="M 320 400 L 440 330 L 440 600 L 320 670 Z" fill="url(#grad-cathode)" stroke="#1E293B" stroke-width="2.5" stroke-linejoin="round" />`,
          animation: {
            type: "pulse",
            dx: 0,
            dy: 0,
            rotateDeg: 0,
            scaleFactor: 1.05,
            speed: 1.2,
            activeInPhases: [0, 1, 2, 3],
          },
        },
        {
          partId: "part_separator_membrane",
          componentId: "comp_separator",
          name: "Membran Separator",
          layerOrder: 30,
          isCutawayWall: false,
          anchorPoint: { x: 500, y: 460 },
          svgMarkup: `<path d="M 460 320 L 520 285 L 520 570 L 460 605 Z" fill="url(#grad-sep)" stroke="#1E293B" stroke-width="2.5" stroke-linejoin="round" />`,
          animation: {
            type: "translate",
            dx: 0,
            dy: 5,
            rotateDeg: 0,
            scaleFactor: 1,
            speed: 1.1,
            activeInPhases: [1, 2, 3],
          },
        },
        {
          partId: "part_anode_graphite",
          componentId: "comp_anode",
          name: "Anoda Grafit (-)",
          layerOrder: 40,
          isCutawayWall: false,
          anchorPoint: { x: 620, y: 460 },
          svgMarkup: `<path d="M 540 275 L 660 345 L 660 615 L 540 545 Z" fill="url(#grad-anode)" stroke="#1E293B" stroke-width="2.5" stroke-linejoin="round" />`,
          animation: {
            type: "pulse",
            dx: 0,
            dy: 0,
            rotateDeg: 0,
            scaleFactor: 1.05,
            speed: 1.2,
            activeInPhases: [0, 1, 2, 3],
          },
        },
        {
          partId: "part_bms_controller",
          componentId: "comp_bms",
          name: "Chip BMS Dual-Pump 200W",
          layerOrder: 50,
          isCutawayWall: false,
          anchorPoint: { x: 500, y: 720 },
          svgMarkup: `<polygon points="360,680 640,680 580,760 300,760" fill="#F87171" stroke="#1E293B" stroke-width="2.5" stroke-linejoin="round" />`,
          animation: {
            type: "none",
            dx: 0,
            dy: 0,
            rotateDeg: 0,
            scaleFactor: 1,
            speed: 1,
            activeInPhases: [0, 1, 2, 3],
          },
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
