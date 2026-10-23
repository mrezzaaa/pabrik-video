import type {
  RemotionCompositionProps,
  WordTiming,
  IsoSceneGraph,
  FramePillCallout,
  PhaseTimelineBlock,
  ThreeNode,
} from "@/schemas/video-blueprint";
import { project3DTo2D } from "./projection";
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "./constants";

function computeClientWordTimings(
  narrationText: string,
  segmentStartSec: number,
  segmentDurationSec: number,
  fps = VIDEO_FPS
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
  const speechDuration = Math.max(0.8, segmentDurationSec - 0.35);
  let cursorSec = segmentStartSec;

  return words.map((word, idx) => {
    const sliceDuration = (weights[idx] / totalWeight) * speechDuration;
    const startSec = Number(cursorSec.toFixed(3));
    const endSec = Number(
      (idx === words.length - 1
        ? segmentStartSec + speechDuration
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

// ==========================================
// FIXTURE 1: SOLAR PANEL (PANEL SURYA)
// ==========================================
export function buildSolarPanelCompositionProps(): RemotionCompositionProps {
  const topic = "Bagaimana panel surya mengubah cahaya matahari jadi listrik rumah?";
  const fps = VIDEO_FPS;

  const actNarrations = [
    "Tagihan listrik naik terus. Tapi atap rumahmu bisa menghasilkan jutaan watt gratis langsung dari matahari!",
    "Rahasianya ada di lapisan silikon murni. Saat partikel foton menghantam atom silikon, elektron melompat lepas dan menghasilkan arus DC.",
    "Busbar tembaga menangkap jutaan elektron ini lalu dialirkan ke inverter untuk diubah jadi listrik rumah tangga.",
    "Listrik gratis puluhan tahun tanpa polusi. Sebelum pasang solar panel, perhatikan tiga syarat ini ya!",
  ];

  const durations = [7, 10, 9, 8];
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

  const visualScene: IsoSceneGraph = {
    subjectTitle: "SOLAR PANEL PHOTOVOLTAIC CUTAWAY",
    objectFormFactor: "Multi-Layer Monocrystalline Solar Cell",
    anatomyDecomposition: {
      outerHousingShell: "Kaca pelindung tempered & bingkai aluminium berarsir cutaway",
      primaryInternalMechanism: "Penampang melintang belahan lapisan silikon fotovoltaik P-N",
      zoomInSubComponents: "Wafer silikon doping dan busbar grid konduktor tembaga",
      physicalStateChange: "Eksitasi elektron terbebas mengalir menjadi arus searah DC",
    },
    cameraPreset: {
      basePosition: [8, 6.5, 8],
      baseZoom: 170,
    },
    enableSteamWisps: false,
    nodes: [
      {
        nodeId: "node_frame_glass",
        componentId: "comp_1",
        name: "Rangka & Kaca Tempered",
        geometryType: "hollow-box",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#E2E8F0",
        materialType: "glass-translucent",
        opacity: 0.6,
        enableCutawayClip: true,
        showEdgesOutline: true,
        geometryArgs: {
          width: 3.2,
          height: 0.5,
          depth: 2.4,
        },
        animation: {
          type: "none",
          axis: "y",
          speed: 1,
          amplitude: 0,
          activeInPhases: [0, 1, 2, 3],
        },
      },
      {
        nodeId: "node_silicon_wafer",
        componentId: "comp_2",
        name: "Sel Silikon P-N",
        geometryType: "box",
        position: [0, -0.05, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#38BDF8",
        materialType: "toon",
        opacity: 1,
        enableCutawayClip: false,
        showEdgesOutline: true,
        geometryArgs: {
          width: 2.8,
          height: 0.2,
          depth: 2.0,
        },
        animation: {
          type: "pulse-scale",
          axis: "y",
          speed: 1.4,
          amplitude: 0.08,
          activeInPhases: [1, 2],
        },
      },
      {
        nodeId: "node_busbar_grid",
        componentId: "comp_3",
        name: "Busbar Tembaga",
        geometryType: "tube",
        position: [0, 0.1, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#FACC15",
        materialType: "metallic",
        opacity: 1,
        enableCutawayClip: false,
        showEdgesOutline: true,
        geometryArgs: {
          tubeRadius: 0.08,
          tubePath: [
            [-1.2, 0.1, -0.8],
            [0, 0.1, -0.8],
            [1.2, 0.1, -0.8],
            [1.2, 0.1, 0.8],
          ],
        },
        animation: {
          type: "none",
          axis: "y",
          speed: 1,
          amplitude: 0,
          activeInPhases: [0, 1, 2, 3],
        },
      },
      {
        nodeId: "node_junction_box",
        componentId: "comp_4",
        name: "Junction Box & Inverter",
        geometryType: "box",
        position: [1.1, -0.4, 0.6],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#F87171",
        materialType: "toon",
        opacity: 1,
        enableCutawayClip: false,
        showEdgesOutline: true,
        geometryArgs: {
          width: 0.8,
          height: 0.4,
          depth: 0.6,
        },
        animation: {
          type: "none",
          axis: "y",
          speed: 1,
          amplitude: 0,
          activeInPhases: [0, 1, 2, 3],
        },
      },
    ],
  };

  const cameraPresets = [
    { focusTarget3D: [0, 0, 0] as [number, number, number], scale: 1.0 },
    { focusTarget3D: [0, -0.1, 0] as [number, number, number], scale: 1.15 },
    { focusTarget3D: [0, 0.1, 0] as [number, number, number], scale: 1.5 },
    { focusTarget3D: [0, 0, 0] as [number, number, number], scale: 1.02 },
  ];

  const phases: PhaseTimelineBlock[] = [
    {
      segmentIndex: 0,
      phaseType: "EVERYDAY_CONTRAST_HOOK",
      chapterTitle: "MATAHARI JADI <highlight>LISTRIK GRATIS</highlight>",
      narrationText: actNarrations[0],
      audioUrl: "",
      startFrame: timings[0].startFrame,
      endFrame: timings[0].endFrame,
      durationInFrames: timings[0].durationInFrames,
      wordTimings: timings[0].wordTimings,
      camera: {
        startFrame: timings[0].startFrame,
        endFrame: timings[0].endFrame,
        ...cameraPresets[0],
        x: 0,
        y: 0,
      },
      primaryMetric: {
        startValue: 0,
        endValue: 120,
        unit: "W",
        decimals: 0,
        isHighActive: false,
        baselineValue: 0,
        peakValue: 450,
        sparklinePoints: [0, 30, 70, 120],
      },
      statusBadge: { text: "STANDAR", variant: "green" },
      secondaryMetric: "Cahaya Redup",
      activeComponentIds: ["comp_1", "comp_2"],
      showChecklistCard: false,
    },
    {
      segmentIndex: 1,
      phaseType: "CORE_MECHANISM_CUTAWAY",
      chapterTitle: "EKSITASI <highlight>ELEKTRON SILIKON</highlight>",
      narrationText: actNarrations[1],
      audioUrl: "",
      startFrame: timings[1].startFrame,
      endFrame: timings[1].endFrame,
      durationInFrames: timings[1].durationInFrames,
      wordTimings: timings[1].wordTimings,
      camera: {
        startFrame: timings[1].startFrame,
        endFrame: timings[1].endFrame,
        ...cameraPresets[1],
        x: 0,
        y: 0,
      },
      primaryMetric: {
        startValue: 120,
        endValue: 380,
        unit: "W",
        decimals: 0,
        isHighActive: true,
        baselineValue: 0,
        peakValue: 450,
        sparklinePoints: [120, 190, 290, 380],
      },
      statusBadge: { text: "TERIK MAKSIMAL", variant: "amber" },
      secondaryMetric: "Arus DC Mengalir",
      activeComponentIds: ["comp_2", "comp_3"],
      showChecklistCard: false,
    },
    {
      segmentIndex: 2,
      phaseType: "COMPONENT_ZOOM_INS",
      chapterTitle: "BUSBAR TEMBAGA & <highlight>INVERTER</highlight>",
      narrationText: actNarrations[2],
      audioUrl: "",
      startFrame: timings[2].startFrame,
      endFrame: timings[2].endFrame,
      durationInFrames: timings[2].durationInFrames,
      wordTimings: timings[2].wordTimings,
      camera: {
        startFrame: timings[2].startFrame,
        endFrame: timings[2].endFrame,
        ...cameraPresets[2],
        x: 0,
        y: 0,
      },
      primaryMetric: {
        startValue: 380,
        endValue: 450,
        unit: "W",
        decimals: 0,
        isHighActive: true,
        baselineValue: 0,
        peakValue: 450,
        sparklinePoints: [380, 410, 435, 450],
      },
      statusBadge: { text: "PEAK OUTPUT", variant: "red" },
      secondaryMetric: "220V Listrik Rumah",
      activeComponentIds: ["comp_3", "comp_4"],
      showChecklistCard: false,
    },
    {
      segmentIndex: 3,
      phaseType: "PRACTICAL_TAKEAWAY_LOOP",
      chapterTitle: "CEK SEBELUM <highlight>PASANG ROOFTOP</highlight>",
      narrationText: actNarrations[3],
      audioUrl: "",
      startFrame: timings[3].startFrame,
      endFrame: timings[3].endFrame,
      durationInFrames: timings[3].durationInFrames,
      wordTimings: timings[3].wordTimings,
      camera: {
        startFrame: timings[3].startFrame,
        endFrame: timings[3].endFrame,
        ...cameraPresets[3],
        x: 0,
        y: 0,
      },
      primaryMetric: {
        startValue: 450,
        endValue: 450,
        unit: "W",
        decimals: 0,
        isHighActive: false,
        baselineValue: 0,
        peakValue: 450,
        sparklinePoints: [450, 450, 450, 450],
      },
      statusBadge: { text: "SIAP PAKAI", variant: "green" },
      secondaryMetric: "Hemat 25 Tahun",
      activeComponentIds: ["comp_1", "comp_2", "comp_3", "comp_4"],
      showChecklistCard: true,
    },
  ];

  const pillCallouts: FramePillCallout[] = [
    {
      id: "pill_frame",
      componentId: "comp_1",
      startFrame: timings[0].startFrame + 20,
      endFrame: timings[0].endFrame - 15,
      text: "KACA TEMPERED →",
      direction: "RIGHT",
      anchor: project3DTo2D([0, 0, 0], [8, 6.5, 8], [0, 0, 0], 110, 1080, 1920),
    },
    {
      id: "pill_silicon",
      componentId: "comp_2",
      startFrame: timings[1].startFrame + 25,
      endFrame: timings[1].endFrame - 20,
      text: "← LAPISAN P-N",
      direction: "LEFT",
      anchor: project3DTo2D([0, -0.05, 0], [8, 6.5, 8], [0, -0.1, 0], 126, 1080, 1920),
    },
    {
      id: "pill_busbar",
      componentId: "comp_3",
      startFrame: timings[2].startFrame + 15,
      endFrame: timings[2].endFrame - 20,
      text: "BUSBAR TEMBAGA →",
      direction: "RIGHT",
      anchor: project3DTo2D([0, 0.1, 0], [8, 6.5, 8], [0, 0.1, 0], 165, 1080, 1920),
    },
  ];

  return {
    jobId: "fixture_solar_panel",
    topic,
    laymanHookTitle: "Cara Solar Panel <highlight>Ubah Cahaya Jadi Listrik</highlight>",
    everydayCategory: "ENERGI & TEKNOLOGI RUMAH TANGGA",
    coreSimpleTruth: "Foton cahaya matahari melepaskan elektron dari atom silikon murni untuk menghasilkan arus DC.",
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    fps: VIDEO_FPS,
    durationInFrames: cursorFrames,
    aspectRatioMode: "SHORTS_9_16",
    practicalChecklist: {
      title: "CEK SEBELUM BELI / PAKAI:",
      items: [
        "Arah hadap atap",
        "Kekuatan rangka baja",
        "Sertifikasi inverter resmi",
      ],
    },
    visualScene,
    phases,
    pillCallouts,
    sfxOverlays: [
      {
        id: "sfx_1",
        startFrame: timings[1].startFrame + 40,
        endFrame: timings[1].startFrame + 120,
        text: "TERIK MAKSIMAL!",
        variant: "STEAM_YELLOW_BLUE",
        x: 680,
        y: 620,
        rotateDeg: -8,
      },
    ],
    sfxTriggers: [],
  };
}

export function buildTsunamiCompositionProps(): RemotionCompositionProps {
  return buildSolarPanelCompositionProps();
}

export function buildDefaultCompositionProps(): RemotionCompositionProps {
  return buildSolarPanelCompositionProps();
}
