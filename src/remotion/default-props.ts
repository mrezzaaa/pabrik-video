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
      endFrame: Math.max(Math.ceil(endSec * fps), Math.floor(startSec * fps) + 1),
    };
  });
}

/**
 * Default Studio Preview Composition Props:
 * "Mekanisme kerja baterai Lithium-Ion saat fast charging 200W"
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
      wordTimings: computeClientWordTimings(actNarrations[idx], startSec, dur, fps),
    };
  });

  return {
    jobId: "demo-battery-200w",
    topic,
    laymanHookTitle: "Cas baterai 200W <highlight>kok bisa kilat?</highlight>",
    everydayCategory: "TEKNOLOGI BATERAI & FAST CHARGING",
    coreSimpleTruth: "Arsitektur Dual-Cell membagi arus 200W ke dua jalur paralel",
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
    scene: {
      containerType: "dual-chamber",
      containerTitle: "DUAL-CELL LITHIUM-ION 200W",
      containerSubtitle: "BELAHAN MELINTANG SEL BATERAI",
      outerBounds: {
        x: 210,
        y: 630,
        width: 660,
        height: 750,
        wallThickness: 24,
        outerFill: "#E2E8F0",
        interiorFill: "#F8FAFC",
      },
      internalLayers: [
        {
          id: "layer_cathode",
          componentId: "comp_cathode",
          name: "Katoda (LiCoO₂)",
          everydayRole: "Gudang asal ion Lithium",
          zIndex: 1,
          fillColor: "#93C5FD",
          outlineColor: "#1E293B",
          strokeWidth: 2.5,
          bounds: { x: 245, y: 695, width: 255, height: 470, rx: 16 },
          anchorScreenCoord: { x: 340, y: 920 },
          customSvgElements: [
            {
              id: "cathode_plate_1",
              shape: "rect",
              x: 270,
              y: 775,
              width: 205,
              height: 45,
              rx: 8,
              fill: "#60A5FA",
              stroke: "#1E293B",
              strokeWidth: 2.5,
              opacity: 1,
              label: "SEL A (+)",
            },
            {
              id: "cathode_plate_2",
              shape: "rect",
              x: 270,
              y: 1060,
              width: 205,
              height: 45,
              rx: 8,
              fill: "#60A5FA",
              stroke: "#1E293B",
              strokeWidth: 2.5,
              opacity: 1,
              label: "SEL B (+)",
            },
          ],
        },
        {
          id: "layer_separator",
          componentId: "comp_separator",
          name: "Membran Separator",
          everydayRole: "Saringan ion anti-korslet",
          zIndex: 2,
          fillColor: "#FACC15",
          outlineColor: "#1E293B",
          strokeWidth: 2.5,
          bounds: { x: 512, y: 695, width: 56, height: 470, rx: 12 },
          anchorScreenCoord: { x: 540, y: 830 },
          customSvgElements: [],
        },
        {
          id: "layer_anode",
          componentId: "comp_anode",
          name: "Anoda Grafit",
          everydayRole: "Parkiran ion saat penuh",
          zIndex: 3,
          fillColor: "#86EFAC",
          outlineColor: "#1E293B",
          strokeWidth: 2.5,
          bounds: { x: 580, y: 695, width: 255, height: 470, rx: 16 },
          anchorScreenCoord: { x: 735, y: 920 },
          customSvgElements: [
            {
              id: "anode_grid_1",
              shape: "rect",
              x: 605,
              y: 775,
              width: 205,
              height: 45,
              rx: 8,
              fill: "#4ADE80",
              stroke: "#1E293B",
              strokeWidth: 2.5,
              opacity: 1,
              label: "GRAFIT LAPIS 1",
            },
            {
              id: "anode_grid_2",
              shape: "rect",
              x: 605,
              y: 1060,
              width: 205,
              height: 45,
              rx: 8,
              fill: "#4ADE80",
              stroke: "#1E293B",
              strokeWidth: 2.5,
              opacity: 1,
              label: "GRAFIT LAPIS 2",
            },
          ],
        },
        {
          id: "layer_bms_port",
          componentId: "comp_bms",
          name: "Chip BMS & Dual-Pump",
          everydayRole: "Membagi arus 200W (2x 100W)",
          zIndex: 4,
          fillColor: "#F87171",
          outlineColor: "#1E293B",
          strokeWidth: 2.5,
          bounds: { x: 245, y: 1190, width: 590, height: 150, rx: 18 },
          anchorScreenCoord: { x: 540, y: 1265 },
          customSvgElements: [
            {
              id: "usbc_port",
              shape: "rect",
              x: 450,
              y: 1270,
              width: 180,
              height: 52,
              rx: 14,
              fill: "#FACC15",
              stroke: "#1E293B",
              strokeWidth: 2.5,
              opacity: 1,
              label: "USB-C 200W IN",
            },
          ],
        },
      ],
      customSvgElements: [],
      particleFlows: [
        {
          id: "flow_li_ions_top",
          type: "ions",
          color: "#38BDF8",
          from: { x: 360, y: 880 },
          to: { x: 720, y: 880 },
          count: 10,
          speed: 1.8,
          size: 13,
          activeInPhases: [0, 1, 2, 3],
        },
        {
          id: "flow_li_ions_bottom",
          type: "ions",
          color: "#38BDF8",
          from: { x: 360, y: 1010 },
          to: { x: 720, y: 1010 },
          count: 10,
          speed: 1.8,
          size: 13,
          activeInPhases: [1, 2, 3],
        },
        {
          id: "flow_electrons_bms",
          type: "electrons",
          color: "#FACC15",
          from: { x: 540, y: 1320 },
          to: { x: 710, y: 1140 },
          count: 8,
          speed: 2.1,
          size: 12,
          activeInPhases: [0, 1, 2],
        },
      ],
    },
    phases: [
      {
        segmentIndex: 0,
        phaseType: "EVERYDAY_CONTRAST_HOOK",
        chapterTitle: "Cas baterai 200W <highlight>kok bisa kilat?</highlight>",
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
          y: -30,
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
          y: -90,
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
        chapterTitle: "Penuh 10 menit, <highlight>baterai tetap awet!</highlight>",
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
        anchor: { x: 540, y: 1265 },
      },
      {
        id: "pill_bat_1",
        componentId: "comp_cathode",
        startFrame: timings[1].startFrame + 30,
        endFrame: timings[1].endFrame - 20,
        text: "KATODA LiCoO₂ →",
        direction: "RIGHT",
        anchor: { x: 340, y: 920 },
      },
      {
        id: "pill_bat_2",
        componentId: "comp_anode",
        startFrame: timings[1].startFrame + 120,
        endFrame: timings[1].endFrame - 15,
        text: "← ANODA GRAFIT",
        direction: "LEFT",
        anchor: { x: 735, y: 920 },
      },
      {
        id: "pill_bat_3",
        componentId: "comp_separator",
        startFrame: timings[2].startFrame + 30,
        endFrame: timings[2].endFrame - 20,
        text: "PEMISAH (SEPARATOR) →",
        direction: "RIGHT",
        anchor: { x: 540, y: 830 },
      },
      {
        id: "pill_bat_4",
        componentId: "comp_bms",
        startFrame: timings[3].startFrame + 30,
        endFrame: timings[3].endFrame - 20,
        text: "← DUAL-CELL AMAN",
        direction: "LEFT",
        anchor: { x: 540, y: 1265 },
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
