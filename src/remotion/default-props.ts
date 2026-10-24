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

const TUMBLER_ANATOMY_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080" class="iso" data-theme="light">
  <defs>
    <style>
      .iso {
        --anatomy-paper: #FBFBFA;
        --anatomy-face: #FFFFFF;
        --anatomy-top: #FFFFFF;
        --anatomy-shade-0: #DCDCD9;
        --anatomy-shade-1: #E5E5E2;
        --anatomy-shade-2: #EDEDEA;
        --anatomy-shade-3: #F4F4F1;
        --anatomy-edge: #1E293B;
        --anatomy-crease: #64748B;
        --anatomy-text: #1E293B;
        --anatomy-muted: #64748B;
      }
      .iso-fill { stroke: none; }
      .iso-shade[data-shade="0"] { fill: var(--anatomy-shade-0); opacity: 0.35; }
      .iso-shade[data-shade="1"] { fill: var(--anatomy-shade-1); opacity: 0.28; }
      .iso-shade[data-shade="2"] { fill: var(--anatomy-shade-2); opacity: 0.20; }
      .iso-shade[data-shade="3"] { fill: var(--anatomy-shade-3); opacity: 0.12; }
      .iso-top { fill: rgba(255, 255, 255, 0.45); }
      .iso-line { fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .iso-crease { stroke: var(--anatomy-crease); stroke-width: 1.2px; stroke-dasharray: 2 3; }
      .iso-edge { stroke: var(--anatomy-edge); stroke-width: 1.8px; }
      .plate-card { fill: #FFFFFF; stroke: #CBD5E1; stroke-width: 1.5; rx: 16; }
      .plate-text { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 14px; fill: #64748B; }
      .plate-title { font-weight: 700; fill: #0F172A; text-transform: uppercase; letter-spacing: 0.08em; }
    </style>
  </defs>
  <ellipse cx="540" cy="730" rx="280" ry="85" fill="#0F172A" opacity="0.08" filter="blur(20px)" />
  <g transform="translate(0, -30)">
    <g class="iso-solid" id="part_1" data-tone="lo">
      <path class="iso-fill" fill="#2C3E50" d="M257.2 458.4L260.5 426.7L277.8 396.2L308.3 368.3L350.4 344.6L402 326.2L460.5 313.9L523.1 308.5L586.4 310.1L647.4 318.8L703.1 334L750.6 355.1L787.5 380.9L812 410.2L822.8 441.4L822.8 511.5L819.5 543.2L802.2 573.7L771.7 601.5L729.6 625.3L678 643.7L619.5 656L556.9 661.4L493.6 659.8L432.6 651.1L376.9 635.8L329.4 614.8L292.5 589L268 559.7L257.2 528.5Z" />
      <path class="iso-shade" data-shade="0" d="M729.6 625.3L678 643.7L678 573.6L729.6 555.2ZM822.8 511.5L819.5 543.2L819.5 473.1L822.8 441.4ZM819.5 543.2L802.2 573.7L802.2 503.6L819.5 473.1ZM802.2 573.7L771.7 601.5L771.7 531.4L802.2 503.6ZM771.7 601.5L729.6 625.3L729.6 555.2L771.7 531.4Z" /><path class="iso-shade" data-shade="1" d="M678 643.7L619.5 656L619.5 585.9L678 573.6ZM619.5 656L556.9 661.4L556.9 591.3L619.5 585.9Z" /><path class="iso-shade" data-shade="2" d="M556.9 661.4L493.6 659.8L493.6 589.6L556.9 591.3ZM493.6 659.8L432.6 651.1L432.6 581L493.6 589.6ZM432.6 651.1L376.9 635.8L376.9 565.7L432.6 581Z" /><path class="iso-shade" data-shade="3" d="M376.9 635.8L329.4 614.8L329.4 544.7L376.9 565.7ZM329.4 614.8L292.5 589L292.5 518.9L329.4 544.7ZM292.5 589L268 559.7L268 489.6L292.5 518.9ZM268 559.7L257.2 528.5L257.2 458.4L268 489.6Z" />
      <path class="iso-top" d="M729.6 555.2L678 573.6L619.5 585.9L556.9 591.3L493.6 589.6L432.6 581L376.9 565.7L329.4 544.7L292.5 518.9L268 489.6L257.2 458.4L260.5 426.7L277.8 396.2L308.3 368.3L350.4 344.6L402 326.2L460.5 313.9L523.1 308.5L586.4 310.1L647.4 318.8L703.1 334L750.6 355.1L787.5 380.9L812 410.2L822.8 441.4L819.5 473.1L802.2 503.6L771.7 531.4Z" />
      <path class="iso-line iso-crease" stroke="#64748B" d="M822.8 441.4L819.5 473.1L802.2 503.6L771.7 531.4L729.6 555.2L678 573.6L619.5 585.9L556.9 591.3L493.6 589.6L432.6 581L376.9 565.7L329.4 544.7L292.5 518.9L268 489.6L257.2 458.4" />
      <path class="iso-line iso-edge" stroke="#1E293B" stroke-width="1.8" d="M257.2 458.4L260.5 426.7L277.8 396.2L308.3 368.3L350.4 344.6L402 326.2L460.5 313.9L523.1 308.5L586.4 310.1L647.4 318.8L703.1 334L750.6 355.1L787.5 380.9L812 410.2L822.8 441.4M822.8 511.5L819.5 543.2L802.2 573.7L771.7 601.5L729.6 625.3L678 643.7L619.5 656L556.9 661.4L493.6 659.8L432.6 651.1L376.9 635.8L329.4 614.8L292.5 589L268 559.7L257.2 528.5M257.2 458.4L257.2 528.5M822.8 441.4L822.8 511.5" />
    </g>
    <g class="iso-solid" id="part_2" data-tone="mid">
      <path class="iso-fill" fill="#BDC3C7" d="M702.5 -90.8L668.7 -78.1L631 -68.5L590.5 -62.3L548.5 -59.7L506.2 -60.8L465 -65.6L426 -73.9L390.5 -85.4L359.5 -99.8L334 -116.7L314.8 -135.6L302.4 -155.8L297.3 -176.8L299.5 -198L309 -218.6L325.6 -238.1L348.6 -255.8L377.5 -271.3L411.3 -284.1L449 -293.7L489.5 -299.9L531.5 -302.4L573.8 -301.3L615 -296.6L654 -288.3L689.5 -276.8L720.5 -262.3L540 -181.1ZM702.5 540.1L668.7 552.9L631 562.5L590.5 568.7L548.5 571.2L506.2 570.1L465 565.4L426 557.1L390.5 545.6L359.5 531.1L334 514.2L314.8 495.4L302.4 475.1L297.3 454.1L299.5 433L309 412.4L325.6 392.9L348.6 375.1L377.5 359.7L411.3 346.9L449 337.3L489.5 331.1L531.5 328.5L573.8 329.6L615 334.4L654 342.7L689.5 354.2L720.5 368.6L540 449.9ZM702.5 540.1L668.7 552.9L668.7 -78.1L702.5 -90.8ZM668.7 552.9L631 562.5L631 -68.5L668.7 -78.1ZM631 562.5L590.5 568.7L590.5 -62.3L631 -68.5ZM590.5 568.7L548.5 571.2L548.5 -59.7L590.5 -62.3ZM548.5 571.2L506.2 570.1L506.2 -60.8L548.5 -59.7ZM506.2 570.1L465 565.4L465 -65.6L506.2 -60.8ZM465 565.4L426 557.1L426 -73.9L465 -65.6ZM426 557.1L390.5 545.6L390.5 -85.4L426 -73.9ZM390.5 545.6L359.5 531.1L359.5 -99.8L390.5 -85.4ZM359.5 531.1L334 514.2L334 -116.7L359.5 -99.8ZM334 514.2L314.8 495.4L314.8 -135.6L334 -116.7ZM314.8 495.4L302.4 475.1L302.4 -155.8L314.8 -135.6ZM302.4 475.1L297.3 454.1L297.3 -176.8L302.4 -155.8ZM720.5 368.6L540 449.9L540 -181.1L720.5 -262.3Z" />
      <path class="iso-shade" data-shade="0" d="M702.5 540.1L668.7 552.9L668.7 -78.1L702.5 -90.8ZM720.5 368.6L540 449.9L540 -181.1L720.5 -262.3Z" /><path class="iso-shade" data-shade="1" d="M668.7 552.9L631 562.5L631 -68.5L668.7 -78.1ZM631 562.5L590.5 568.7L590.5 -62.3L631 -68.5ZM590.5 568.7L548.5 571.2L548.5 -59.7L590.5 -62.3Z" /><path class="iso-shade" data-shade="2" d="M548.5 571.2L506.2 570.1L506.2 -60.8L548.5 -59.7ZM506.2 570.1L465 565.4L465 -65.6L506.2 -60.8ZM465 565.4L426 557.1L426 -73.9L465 -65.6Z" /><path class="iso-shade" data-shade="3" d="M426 557.1L390.5 545.6L390.5 -85.4L426 -73.9ZM390.5 545.6L359.5 531.1L359.5 -99.8L390.5 -85.4ZM359.5 531.1L334 514.2L334 -116.7L359.5 -99.8ZM334 514.2L314.8 495.4L314.8 -135.6L334 -116.7ZM314.8 495.4L302.4 475.1L302.4 -155.8L314.8 -135.6ZM302.4 475.1L297.3 454.1L297.3 -176.8L302.4 -155.8Z" />
      <path class="iso-top" d="M702.5 -90.8L668.7 -78.1L631 -68.5L590.5 -62.3L548.5 -59.7L506.2 -60.8L465 -65.6L426 -73.9L390.5 -85.4L359.5 -99.8L334 -116.7L314.8 -135.6L302.4 -155.8L297.3 -176.8L299.5 -198L309 -218.6L325.6 -238.1L348.6 -255.8L377.5 -271.3L411.3 -284.1L449 -293.7L489.5 -299.9L531.5 -302.4L573.8 -301.3L615 -296.6L654 -288.3L689.5 -276.8L720.5 -262.3L540 -181.1Z" />
      <path class="iso-line iso-crease" stroke="#64748B" d="M702.5 -90.8L668.7 -78.1L631 -68.5L590.5 -62.3L548.5 -59.7L506.2 -60.8L465 -65.6L426 -73.9L390.5 -85.4L359.5 -99.8L334 -116.7L314.8 -135.6L302.4 -155.8L297.3 -176.8M720.5 -262.3L540 -181.1" />
      <path class="iso-line iso-edge" stroke="#1E293B" stroke-width="1.8" d="M297.3 -176.8L299.5 -198L309 -218.6L325.6 -238.1L348.6 -255.8L377.5 -271.3L411.3 -284.1L449 -293.7L489.5 -299.9L531.5 -302.4L573.8 -301.3L615 -296.6L654 -288.3L689.5 -276.8L720.5 -262.3M540 -181.1L702.5 -90.8M702.5 540.1L668.7 552.9L631 562.5L590.5 568.7L548.5 571.2L506.2 570.1L465 565.4L426 557.1L390.5 545.6L359.5 531.1L334 514.2L314.8 495.4L302.4 475.1L297.3 454.1M720.5 368.6L540 449.9M702.5 -90.8L702.5 540.1M297.3 -176.8L297.3 454.1M720.5 -262.3L720.5 368.6M540 -181.1L540 449.9" />
    </g>
    <g class="iso-solid" id="part_3" data-tone="faint">
      <path class="iso-fill" fill="#ECF0F1" d="M675.4 -70.8L540 -146ZM675.4 525.1L540 449.9ZM540 -146L675.4 -70.8L675.4 525.1L540 449.9Z" />
      <path class="iso-shade" data-shade="3" d="M540 -146L675.4 -70.8L675.4 525.1L540 449.9Z" />
      <path class="iso-top" d="M675.4 -70.8L540 -146Z" />
      <path class="iso-line iso-crease" stroke="#64748B" d="M540 -146L675.4 -70.8" />
      <path class="iso-line iso-edge" stroke="#1E293B" stroke-width="1.8" d="M675.4 -70.8L540 -146M540 449.9L675.4 525.1M675.4 -70.8L675.4 525.1M540 -146L540 449.9" />
    </g>
    <g class="iso-solid" id="part_4" data-tone="mid">
      <path class="iso-fill" fill="#95A5A6" d="M661.9 -78.3L540 -146ZM661.9 517.6L540 449.9ZM540 -146L661.9 -78.3L661.9 517.6L540 449.9Z" />
      <path class="iso-shade" data-shade="3" d="M540 -146L661.9 -78.3L661.9 517.6L540 449.9Z" />
      <path class="iso-top" d="M661.9 -78.3L540 -146Z" />
      <path class="iso-line iso-crease" stroke="#64748B" d="M540 -146L661.9 -78.3" />
      <path class="iso-line iso-edge" stroke="#1E293B" stroke-width="1.8" d="M661.9 -78.3L540 -146M540 449.9L661.9 517.6M661.9 -78.3L661.9 517.6M540 -146L540 449.9" />
    </g>
    <g class="iso-solid" id="part_5" data-tone="hi">
      <path class="iso-fill" fill="#F1C40F" d="M358.2 139.8L360.3 119.5L371.5 99.9L391.1 82L418.1 66.7L451.3 54.9L488.9 47L529.1 43.5L569.8 44.6L609.1 50.1L644.8 59.9L675.4 73.5L699.1 90.1L714.8 108.9L721.8 129L721.8 164L719.7 184.4L708.5 204L688.9 221.9L661.9 237.1L628.7 249L591.1 256.9L550.9 260.4L510.2 259.3L470.9 253.7L435.2 243.9L404.6 230.4L380.9 213.8L365.2 195L358.2 174.9Z" />
      <path class="iso-shade" data-shade="0" d="M661.9 237.1L628.7 249L628.7 213.9L661.9 202.1ZM721.8 164L719.7 184.4L719.7 149.3L721.8 129ZM719.7 184.4L708.5 204L708.5 168.9L719.7 149.3ZM708.5 204L688.9 221.9L688.9 186.8L708.5 168.9ZM688.9 221.9L661.9 237.1L661.9 202.1L688.9 186.8Z" /><path class="iso-shade" data-shade="1" d="M628.7 249L591.1 256.9L591.1 221.8L628.7 213.9ZM591.1 256.9L550.9 260.4L550.9 225.3L591.1 221.8Z" /><path class="iso-shade" data-shade="2" d="M550.9 260.4L510.2 259.3L510.2 224.2L550.9 225.3ZM510.2 259.3L470.9 253.7L470.9 218.7L510.2 224.2ZM470.9 253.7L435.2 243.9L435.2 208.9L470.9 218.7Z" /><path class="iso-shade" data-shade="3" d="M435.2 243.9L404.6 230.4L404.6 195.3L435.2 208.9ZM404.6 230.4L380.9 213.8L380.9 178.8L404.6 195.3ZM380.9 213.8L365.2 195L365.2 159.9L380.9 178.8ZM365.2 195L358.2 174.9L358.2 139.8L365.2 159.9Z" />
      <path class="iso-top" d="M661.9 202.1L628.7 213.9L591.1 221.8L550.9 225.3L510.2 224.2L470.9 218.7L435.2 208.9L404.6 195.3L380.9 178.8L365.2 159.9L358.2 139.8L360.3 119.5L371.5 99.9L391.1 82L418.1 66.7L451.3 54.9L488.9 47L529.1 43.5L569.8 44.6L609.1 50.1L644.8 59.9L675.4 73.5L699.1 90.1L714.8 108.9L721.8 129L719.7 149.3L708.5 168.9L688.9 186.8Z" />
      <path class="iso-line iso-crease" stroke="#64748B" d="M721.8 129L719.7 149.3L708.5 168.9L688.9 186.8L661.9 202.1L628.7 213.9L591.1 221.8L550.9 225.3L510.2 224.2L470.9 218.7L435.2 208.9L404.6 195.3L380.9 178.8L365.2 159.9L358.2 139.8" />
      <path class="iso-line iso-edge" stroke="#1E293B" stroke-width="1.8" d="M358.2 139.8L360.3 119.5L371.5 99.9L391.1 82L418.1 66.7L451.3 54.9L488.9 47L529.1 43.5L569.8 44.6L609.1 50.1L644.8 59.9L675.4 73.5L699.1 90.1L714.8 108.9L721.8 129M721.8 164L719.7 184.4L708.5 204L688.9 221.9L661.9 237.1L628.7 249L591.1 256.9L550.9 260.4L510.2 259.3L470.9 253.7L435.2 243.9L404.6 230.4L380.9 213.8L365.2 195L358.2 174.9M358.2 139.8L358.2 174.9M721.8 129L721.8 164" />
    </g>
  </g>
  <g class="plate-frame" opacity="0.85">
    <text x="60" y="1040" class="plate-text">ANATOMY SKILL · 4-TONE ISO</text>
    <text x="1020" y="1040" class="plate-text" text-anchor="end" font-weight="600" fill="#0F172A">0.05 W/mK · 24h retention · 95% heat loss blocked</text>
  </g>
</svg>`;

export function buildAnatomyTumblerCompositionProps(): RemotionCompositionProps {
  const base = buildSolarPanelCompositionProps();
  return {
    ...base,
    jobId: "fixture_tumbler_anatomy",
    topic: "Kenapa tumbler bisa awet panas?",
    laymanHookTitle: "Kenapa Tumbler <highlight>Bisa Awet Panas?</highlight>",
    everydayCategory: "TERMODINAMIKA & TEKNOLOGI SEHARI-HARI",
    coreSimpleTruth:
      "Ruang hampa udara di antara dua lapis dinding stainless steel menghentikan aliran konduksi dan konveksi panas.",
    visualScene: {
      subjectTitle: "TUMBLER ISOMETRIC CUTAWAY",
      objectFormFactor: "0.05 W/mK · 24h retention · 95% heat loss blocked",
      anatomyDecomposition: {
        outerHousingShell: "Dinding stainless steel luar 270° cutaway",
        primaryInternalMechanism: "Ruang isolasi vakum hampa udara",
        zoomInSubComponents: "Lapisan reflektif pemantul radiasi termal",
        physicalStateChange: "Penghentian konduksi, konveksi, dan radiasi",
      },
      cameraPreset: {
        basePosition: [8, 6.5, 8],
        baseZoom: 170,
      },
      enableSteamWisps: false,
      svgComponentPath: "@/examples/kenapa-tumbler-bisa-awet-panas/figure",
      svgContent: TUMBLER_ANATOMY_SVG,
      nodes: [
        {
          nodeId: "part_1",
          componentId: "part_1",
          name: "Base Pedestal",
          geometryType: "svg-part",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: "#2C3E50",
          materialType: "toon",
          opacity: 1,
          enableCutawayClip: false,
          showEdgesOutline: true,
          geometryArgs: {},
          animation: { type: "none", axis: "y", speed: 1, amplitude: 0, activeInPhases: [0, 1, 2, 3] },
        },
        {
          nodeId: "part_2",
          componentId: "part_2",
          name: "Outer Stainless Steel Wall",
          geometryType: "svg-part",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: "#BDC3C7",
          materialType: "toon",
          opacity: 1,
          enableCutawayClip: true,
          showEdgesOutline: true,
          geometryArgs: {},
          animation: { type: "none", axis: "y", speed: 1, amplitude: 0, activeInPhases: [0, 1, 2, 3] },
        },
        {
          nodeId: "part_3",
          componentId: "part_3",
          name: "Vacuum Cavity",
          geometryType: "svg-part",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: "#ECF0F1",
          materialType: "glass-translucent",
          opacity: 0.8,
          enableCutawayClip: true,
          showEdgesOutline: true,
          geometryArgs: {},
          animation: { type: "none", axis: "y", speed: 1, amplitude: 0, activeInPhases: [0, 1, 2, 3] },
        },
        {
          nodeId: "part_4",
          componentId: "part_4",
          name: "Inner Stainless Steel Wall",
          geometryType: "svg-part",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: "#95A5A6",
          materialType: "toon",
          opacity: 1,
          enableCutawayClip: true,
          showEdgesOutline: true,
          geometryArgs: {},
          animation: { type: "none", axis: "y", speed: 1, amplitude: 0, activeInPhases: [0, 1, 2, 3] },
        },
        {
          nodeId: "part_5",
          componentId: "part_5",
          name: "Reflective Coating",
          geometryType: "svg-part",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: "#F1C40F",
          materialType: "metallic",
          opacity: 1,
          enableCutawayClip: false,
          showEdgesOutline: true,
          geometryArgs: {},
          animation: { type: "none", axis: "y", speed: 1, amplitude: 0, activeInPhases: [0, 1, 2, 3] },
        },
      ],
    },
    pillCallouts: [
      {
        id: "pill_vacuum",
        componentId: "part_3",
        startFrame: 15,
        endFrame: 280,
        text: "DINDING VAKUM →",
        direction: "RIGHT",
        anchor: { x: 720, y: 880 },
      },
      {
        id: "pill_reflective",
        componentId: "part_5",
        startFrame: 290,
        endFrame: 650,
        text: "← LAPISAN REFLEKTIF",
        direction: "LEFT",
        anchor: { x: 380, y: 720 },
      },
    ],
  };
}

export function buildTsunamiCompositionProps(): RemotionCompositionProps {
  return buildSolarPanelCompositionProps();
}

export function buildDefaultCompositionProps(): RemotionCompositionProps {
  return buildAnatomyTumblerCompositionProps();
}
