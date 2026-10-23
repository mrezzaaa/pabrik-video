import type {
  RemotionCompositionProps,
  WordTiming,
  SemanticIsoScene,
  FramePillCallout,
  PhaseTimelineBlock,
  Point3D,
} from "@/schemas/video-blueprint";
import { computeStageFit, project3DAnchor, type Point2D } from "@/iso";

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

function computeSceneSamplePoints(scene: SemanticIsoScene): Point3D[] {
  const pts: Point3D[] = [];
  for (const part of scene.parts) {
    const p = part.position;
    const s = part.shape;
    if (s.type === "box" || s.type === "cutawayBox") {
      pts.push({ x: p.x, y: p.y, z: p.z });
      pts.push({ x: p.x + s.dx, y: p.y + s.dy, z: p.z + s.dz });
    } else if (s.type === "sheet") {
      pts.push({ x: p.x, y: p.y, z: p.z });
      pts.push({ x: p.x + s.dx, y: p.y + s.dy, z: p.z + (s.thickness ?? 0.2) });
    } else if (s.type === "wedge") {
      pts.push({ x: p.x, y: p.y, z: p.z });
      pts.push({ x: p.x + s.dx, y: p.y + s.dy, z: p.z + s.dz });
    } else if (s.type === "cylinder" || s.type === "cutawayCylinder") {
      pts.push({ x: p.x - s.radius, y: p.y - s.radius, z: p.z });
      pts.push({ x: p.x + s.radius, y: p.y + s.radius, z: p.z + s.height });
    } else if (s.type === "pipe") {
      for (const pt of s.points) {
        pts.push({ x: p.x + pt.x, y: p.y + pt.y, z: p.z + pt.z });
      }
    } else if (s.type === "waveSurface") {
      pts.push({ x: p.x, y: p.y, z: p.z });
      pts.push({ x: p.x + s.dx, y: p.y + s.dy, z: p.z + (s.amplitude ?? 0.4) * 2 });
    } else {
      pts.push({ x: p.x, y: p.y, z: p.z });
    }
  }
  return pts;
}

// ==========================================
// FIXTURE 1: SOLAR PANEL (PANEL SURYA)
// ==========================================
export function buildSolarPanelCompositionProps(): RemotionCompositionProps {
  const topic = "Bagaimana panel surya mengubah cahaya matahari jadi listrik rumah?";
  const fps = 60;

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

  const visualScene: SemanticIsoScene = {
    subjectTitle: "SOLAR PANEL PHOTOVOLTAIC CUTAWAY",
    objectFormFactor: "Multi-Layer Monocrystalline Solar Cell",
    anatomyDecomposition: {
      outerStructure: "Kaca pelindung tempered & bingkai aluminium berarsir cutaway",
      cutawayCrossSection: "Penampang melintang belahan lapisan silikon fotovoltaik P-N",
      coreInternalParts: "Wafer silikon doping dan busbar grid konduktor tembaga",
      movingMechanism: "Eksitasi elektron terbebas mengalir menjadi arus searah DC",
    },
    parts: [
      {
        partId: "part_frame_glass",
        componentId: "comp_1",
        name: "Rangka & Kaca Tempered",
        shape: {
          type: "cutawayBox",
          dx: 8,
          dy: 6,
          dz: 2.2,
          cutRatioX: 0.5,
          cutRatioY: 0.5,
          floor: 0.4,
        },
        position: { x: 2, y: 3, z: 1 },
        rotationZ: 0,
        color: "shell",
        material: "glass",
        animation: {
          type: "none",
          axis: "z",
          amplitude: 0,
          speed: 1,
          activeInPhases: [0, 1, 2, 3],
        },
        states: [
          { phase: 0, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 1, visible: true, offset3D: { x: 0, y: 0, z: 1.8 }, emphasis: "normal" },
          { phase: 2, visible: true, offset3D: { x: 0, y: 0, z: 1.8 }, emphasis: "dim" },
          { phase: 3, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
        ],
      },
      {
        partId: "part_silicon_cells",
        componentId: "comp_2",
        name: "Sel Silikon P-N",
        shape: {
          type: "sheet",
          dx: 7.2,
          dy: 5.2,
          thickness: 0.35,
        },
        position: { x: 2.4, y: 3.4, z: 1.4 },
        rotationZ: 0,
        color: "accent",
        material: "solid",
        animation: {
          type: "pulse",
          axis: "z",
          amplitude: 0.08,
          speed: 1.5,
          activeInPhases: [1, 2],
        },
        states: [
          { phase: 0, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 1, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "focus" },
          { phase: 2, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "focus" },
          { phase: 3, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
        ],
      },
      {
        partId: "part_busbar_grid",
        componentId: "comp_3",
        name: "Busbar Pita Tembaga",
        shape: {
          type: "pipe",
          points: [
            { x: 3, y: 4, z: 1.8 },
            { x: 8.5, y: 4, z: 1.8 },
            { x: 8.5, y: 7.5, z: 1.8 },
          ],
          radius: 0.22,
        },
        position: { x: 0, y: 0, z: 0 },
        rotationZ: 0,
        color: "metal",
        material: "solid",
        animation: {
          type: "flow",
          axis: "x",
          amplitude: 1,
          speed: 2,
          activeInPhases: [1, 2, 3],
        },
        states: [
          { phase: 0, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 1, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 2, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "focus" },
          { phase: 3, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
        ],
      },
      {
        partId: "part_junction_box",
        componentId: "comp_4",
        name: "Junction Box & Dioda",
        shape: {
          type: "box",
          dx: 2.2,
          dy: 1.8,
          dz: 1.0,
        },
        position: { x: 7, y: 3.5, z: 0.2 },
        rotationZ: 0,
        color: "hot",
        material: "solid",
        animation: {
          type: "none",
          axis: "z",
          amplitude: 0,
          speed: 1,
          activeInPhases: [0, 1, 2, 3],
        },
        states: [
          { phase: 0, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 1, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 2, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "dim" },
          { phase: 3, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
        ],
      },
    ],
  };

  const samplePoints = computeSceneSamplePoints(visualScene);
  const fitConfig = computeStageFit(samplePoints, {
    stageCenterX: 540,
    stageCenterY: 1000,
    maxStageWidth: 800,
    maxStageHeight: 860,
  });

  const anchorComp1 = project3DAnchor({ x: 6, y: 6, z: 2.5 }, fitConfig);
  const anchorComp2 = project3DAnchor({ x: 6, y: 6, z: 1.6 }, fitConfig);
  const anchorComp3 = project3DAnchor({ x: 5.5, y: 4, z: 1.8 }, fitConfig);
  const anchorComp4 = project3DAnchor({ x: 8.1, y: 4.4, z: 0.7 }, fitConfig);

  // Prevent overlap between comp1 and comp2
  if (Math.abs(anchorComp2.y - anchorComp1.y) < 80) {
    anchorComp2.y = anchorComp1.y + 85;
  }

  const phases: PhaseTimelineBlock[] = [
    {
      segmentIndex: 0,
      phaseType: "EVERYDAY_CONTRAST_HOOK",
      chapterTitle: "MATAHARI JADI LISTRIK",
      narrationText: actNarrations[0],
      audioUrl: "",
      startFrame: timings[0].startFrame,
      endFrame: timings[0].endFrame,
      durationInFrames: timings[0].durationInFrames,
      wordTimings: timings[0].wordTimings,
      camera: { startFrame: timings[0].startFrame, endFrame: timings[0].endFrame, x: 0, y: 0, scale: 1.0 },
      primaryMetric: {
        startValue: 0,
        endValue: 0,
        unit: "W",
        decimals: 0,
        isHighActive: false,
        baselineValue: 0,
        peakValue: 450,
        sparklinePoints: [0, 0, 0, 0],
      },
      statusBadge: { text: "STANDBY", variant: "amber" },
      secondaryMetric: "0 Wp / Standby",
      activeComponentIds: ["comp_1", "comp_2", "comp_3", "comp_4"],
      showChecklistCard: false,
    },
    {
      segmentIndex: 1,
      phaseType: "CORE_MECHANISM_CUTAWAY",
      chapterTitle: "EFEK FOTOVOLTAIK",
      narrationText: actNarrations[1],
      audioUrl: "",
      startFrame: timings[1].startFrame,
      endFrame: timings[1].endFrame,
      durationInFrames: timings[1].durationInFrames,
      wordTimings: timings[1].wordTimings,
      camera: { startFrame: timings[1].startFrame, endFrame: timings[1].endFrame, x: 0, y: -25, scale: 1.18 },
      primaryMetric: {
        startValue: 0,
        endValue: 380,
        unit: "W",
        decimals: 0,
        isHighActive: true,
        baselineValue: 0,
        peakValue: 450,
        sparklinePoints: [20, 120, 260, 380],
      },
      statusBadge: { text: "AKTIF", variant: "green" },
      secondaryMetric: "Arus DC 9.8 Ampere",
      activeComponentIds: ["comp_2", "comp_3"],
      showChecklistCard: false,
    },
    {
      segmentIndex: 2,
      phaseType: "COMPONENT_ZOOM_INS",
      chapterTitle: "JARINGAN BUSBAR",
      narrationText: actNarrations[2],
      audioUrl: "",
      startFrame: timings[2].startFrame,
      endFrame: timings[2].endFrame,
      durationInFrames: timings[2].durationInFrames,
      wordTimings: timings[2].wordTimings,
      camera: { startFrame: timings[2].startFrame, endFrame: timings[2].endFrame, x: 20, y: 60, scale: 1.55 },
      primaryMetric: {
        startValue: 380,
        endValue: 450,
        unit: "Wp",
        decimals: 0,
        isHighActive: true,
        baselineValue: 0,
        peakValue: 450,
        sparklinePoints: [380, 400, 430, 450],
      },
      statusBadge: { text: "OPTIMAL", variant: "green" },
      secondaryMetric: "Efisiensi Sel 21.4%",
      activeComponentIds: ["comp_3"],
      showChecklistCard: false,
    },
    {
      segmentIndex: 3,
      phaseType: "PRACTICAL_TAKEAWAY_LOOP",
      chapterTitle: "CHECKLIST PEMASANGAN",
      narrationText: actNarrations[3],
      audioUrl: "",
      startFrame: timings[3].startFrame,
      endFrame: timings[3].endFrame,
      durationInFrames: timings[3].durationInFrames,
      wordTimings: timings[3].wordTimings,
      camera: { startFrame: timings[3].startFrame, endFrame: timings[3].endFrame, x: 0, y: 10, scale: 1.02 },
      primaryMetric: {
        startValue: 450,
        endValue: 450,
        unit: "W",
        decimals: 0,
        isHighActive: true,
        baselineValue: 0,
        peakValue: 450,
        sparklinePoints: [450, 450, 450, 450],
      },
      statusBadge: { text: "SIAP PASANG", variant: "green" },
      secondaryMetric: "Garansi 25 Tahun",
      activeComponentIds: ["comp_1", "comp_2", "comp_3", "comp_4"],
      showChecklistCard: true,
    },
  ];

  const pillCallouts: FramePillCallout[] = [
    {
      id: "pill_0",
      componentId: "comp_1",
      startFrame: timings[0].startFrame + 30,
      endFrame: timings[0].endFrame - 15,
      text: "KACA TEMPERED →",
      direction: "RIGHT",
      anchor: anchorComp1,
    },
    {
      id: "pill_1",
      componentId: "comp_2",
      startFrame: timings[1].startFrame + 25,
      endFrame: timings[1].endFrame - 20,
      text: "← SEL SILIKON P-N",
      direction: "LEFT",
      anchor: anchorComp2,
    },
    {
      id: "pill_2",
      componentId: "comp_3",
      startFrame: timings[2].startFrame + 20,
      endFrame: timings[2].endFrame - 20,
      text: "BUSBAR TEMBAGA →",
      direction: "RIGHT",
      anchor: anchorComp3,
    },
    {
      id: "pill_3",
      componentId: "comp_4",
      startFrame: timings[3].startFrame + 20,
      endFrame: timings[3].endFrame - 20,
      text: "← JUNCTION BOX DC",
      direction: "LEFT",
      anchor: anchorComp4,
    },
  ];

  return {
    jobId: "fixture-solar-panel",
    topic,
    laymanHookTitle: "Panel surya atap <highlight>bisa bikin listrik gratis?</highlight>",
    everydayCategory: "ENERGI TERBARUKAN & FISIKA ELEKTRON",
    coreSimpleTruth: "Partikel foton matahari melepaskan elektron silikon menjadi arus listrik",
    width: 1080,
    height: 1920,
    fps: 60,
    durationInFrames: cursorFrames,
    aspectRatioMode: "SHORTS_9_16",
    practicalChecklist: {
      title: "SYARAT PASANG SOLAR PANEL:",
      items: [
        "Arah atap menghadap utara/selatan",
        "Tanpa bayangan pohon/gedung",
        "Inverter bersertifikasi SNI",
      ],
    },
    visualScene,
    phases,
    pillCallouts,
    sfxOverlays: [],
    sfxTriggers: [],
  };
}

// ==========================================
// FIXTURE 2: TSUNAMI MEGATHRUST
// ==========================================
export function buildTsunamiCompositionProps(): RemotionCompositionProps {
  const topic = "Bagaimana gempa megathrust bawah laut memicu gelombang tsunami?";
  const fps = 60;

  const actNarrations = [
    "Di tepi pantai airnya tenang. Tapi ribuan meter di dasar laut, bencana dahsyat sedang bersiap menyapu daratan!",
    "Lempeng samudra menunjam ke bawah dan mengunci lempeng benua, sampai energinya tak tertahan dan patahan melenting naik mendadak.",
    "Lentingan jutaan ton batu mendorong kolom air ke atas, membentuk gelombang raksasa dengan kecepatan jet.",
    "Saat mendekati pantai, gelombang melambat tapi tingginya membubung. Segera lari ke tempat tinggi saat gempa terasa!",
  ];

  const durations = [7, 10, 10, 8];
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

  const visualScene: SemanticIsoScene = {
    subjectTitle: "MEKANISME TSUNAMI MEGATHRUST",
    objectFormFactor: "Subduction Fault Thrust Cutaway Block",
    anatomyDecomposition: {
      outerStructure: "Blok kerak benua dan lempeng samudra dengan belahan cutaway 90°",
      cutawayCrossSection: "Penampang melintang bidang geser patahan sesar naik megathrust",
      coreInternalParts: "Baji sesar benua dan kolom air laut terdesak vertikal",
      movingMechanism: "Lentingan elastis kerak bumi memicu penjalaran gelombang tsunami",
    },
    parts: [
      {
        partId: "part_subducting_plate",
        componentId: "comp_1",
        name: "Lempeng Samudra Penunjam",
        shape: {
          type: "cutawayBox",
          dx: 8,
          dy: 7,
          dz: 3,
          cutRatioX: 0.5,
          cutRatioY: 0.5,
          floor: 0.5,
        },
        position: { x: 2, y: 2, z: 0.5 },
        rotationZ: 0,
        color: "shell",
        material: "cut",
        animation: {
          type: "none",
          axis: "z",
          amplitude: 0,
          speed: 1,
          activeInPhases: [0, 1, 2, 3],
        },
        states: [
          { phase: 0, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 1, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 2, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "dim" },
          { phase: 3, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
        ],
      },
      {
        partId: "part_continental_wedge",
        componentId: "comp_2",
        name: "Zona Patahan Lempeng",
        shape: {
          type: "wedge",
          dx: 4,
          dy: 3.5,
          dz: 2.2,
          slopeAxis: "x",
        },
        position: { x: 5.8, y: 5.3, z: 1.0 },
        rotationZ: 0,
        color: "hot",
        material: "solid",
        animation: {
          type: "translate3D",
          axis: "z",
          amplitude: 0.7,
          speed: 2,
          activeInPhases: [1, 2],
        },
        states: [
          { phase: 0, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 1, visible: true, offset3D: { x: 0, y: 0, z: 1.2 }, emphasis: "focus" },
          { phase: 2, visible: true, offset3D: { x: 0, y: 0, z: 1.2 }, emphasis: "focus" },
          { phase: 3, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
        ],
      },
      {
        partId: "part_water_column",
        componentId: "comp_3",
        name: "Kolom Air Terdesak",
        shape: {
          type: "box",
          dx: 3.8,
          dy: 3.4,
          dz: 2.0,
        },
        position: { x: 5.8, y: 5.3, z: 3.3 },
        rotationZ: 0,
        color: "water",
        material: "glass",
        animation: {
          type: "pulse",
          axis: "z",
          amplitude: 0.15,
          speed: 2,
          activeInPhases: [1, 2],
        },
        states: [
          { phase: 0, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 1, visible: true, offset3D: { x: 0, y: 0, z: 1.0 }, emphasis: "focus" },
          { phase: 2, visible: true, offset3D: { x: 0, y: 0, z: 1.0 }, emphasis: "focus" },
          { phase: 3, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
        ],
      },
      {
        partId: "part_ocean_wave_surface",
        componentId: "comp_4",
        name: "Gelombang Permukaan Laut",
        shape: {
          type: "waveSurface",
          dx: 7.6,
          dy: 6.6,
          amplitude: 0.45,
          wavelength: 2.8,
        },
        position: { x: 2.2, y: 2.2, z: 5.4 },
        rotationZ: 0,
        color: "accent",
        material: "solid",
        animation: {
          type: "flow",
          axis: "x",
          amplitude: 1,
          speed: 2.5,
          activeInPhases: [1, 2, 3],
        },
        states: [
          { phase: 0, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 1, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
          { phase: 2, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "focus" },
          { phase: 3, visible: true, offset3D: { x: 0, y: 0, z: 0 }, emphasis: "normal" },
        ],
      },
    ],
  };

  const samplePoints = computeSceneSamplePoints(visualScene);
  const fitConfig = computeStageFit(samplePoints, {
    stageCenterX: 540,
    stageCenterY: 1000,
    maxStageWidth: 800,
    maxStageHeight: 860,
  });

  const anchorComp1 = project3DAnchor({ x: 6, y: 5.5, z: 2 }, fitConfig);
  const anchorComp2 = project3DAnchor({ x: 7.8, y: 7, z: 2.5 }, fitConfig);
  const anchorComp3 = project3DAnchor({ x: 7.8, y: 7, z: 4.5 }, fitConfig);
  const anchorComp4 = project3DAnchor({ x: 6, y: 5.5, z: 5.5 }, fitConfig);

  // Prevent overlap between comp2 and comp3
  if (Math.abs(anchorComp3.y - anchorComp2.y) < 85) {
    anchorComp3.y = anchorComp2.y - 90;
  }

  const phases: PhaseTimelineBlock[] = [
    {
      segmentIndex: 0,
      phaseType: "EVERYDAY_CONTRAST_HOOK",
      chapterTitle: "TENANG TAPI MEMATIKAN",
      narrationText: actNarrations[0],
      audioUrl: "",
      startFrame: timings[0].startFrame,
      endFrame: timings[0].endFrame,
      durationInFrames: timings[0].durationInFrames,
      wordTimings: timings[0].wordTimings,
      camera: { startFrame: timings[0].startFrame, endFrame: timings[0].endFrame, x: 0, y: 0, scale: 1.0 },
      primaryMetric: {
        startValue: 0,
        endValue: 0,
        unit: "Mw",
        decimals: 1,
        isHighActive: false,
        baselineValue: 0,
        peakValue: 9.1,
        sparklinePoints: [0, 0, 0, 0],
      },
      statusBadge: { text: "TERKUNCI", variant: "amber" },
      secondaryMetric: "Akumulasi Tegangan",
      activeComponentIds: ["comp_1", "comp_2", "comp_3", "comp_4"],
      showChecklistCard: false,
    },
    {
      segmentIndex: 1,
      phaseType: "CORE_MECHANISM_CUTAWAY",
      chapterTitle: "LENTINGAN SESAR NAIK",
      narrationText: actNarrations[1],
      audioUrl: "",
      startFrame: timings[1].startFrame,
      endFrame: timings[1].endFrame,
      durationInFrames: timings[1].durationInFrames,
      wordTimings: timings[1].wordTimings,
      camera: { startFrame: timings[1].startFrame, endFrame: timings[1].endFrame, x: 0, y: -25, scale: 1.18 },
      primaryMetric: {
        startValue: 0,
        endValue: 9.1,
        unit: "Mw",
        decimals: 1,
        isHighActive: true,
        baselineValue: 0,
        peakValue: 9.1,
        sparklinePoints: [1.0, 4.5, 7.8, 9.1],
      },
      statusBadge: { text: "PELEPASAN ENERGI", variant: "red" },
      secondaryMetric: "Slip Sesar 15 Meter",
      activeComponentIds: ["comp_2", "comp_3"],
      showChecklistCard: false,
    },
    {
      segmentIndex: 2,
      phaseType: "COMPONENT_ZOOM_INS",
      chapterTitle: "KOLOM AIR TERDESAK",
      narrationText: actNarrations[2],
      audioUrl: "",
      startFrame: timings[2].startFrame,
      endFrame: timings[2].endFrame,
      durationInFrames: timings[2].durationInFrames,
      wordTimings: timings[2].wordTimings,
      camera: { startFrame: timings[2].startFrame, endFrame: timings[2].endFrame, x: 25, y: 40, scale: 1.55 },
      primaryMetric: {
        startValue: 200,
        endValue: 800,
        unit: "km/j",
        decimals: 0,
        isHighActive: true,
        baselineValue: 0,
        peakValue: 800,
        sparklinePoints: [200, 450, 680, 800],
      },
      statusBadge: { text: "MERAMBAT", variant: "red" },
      secondaryMetric: "Kecepatan 800 km/jam",
      activeComponentIds: ["comp_3"],
      showChecklistCard: false,
    },
    {
      segmentIndex: 3,
      phaseType: "PRACTICAL_TAKEAWAY_LOOP",
      chapterTitle: "EVAKUASI TSUNAMI",
      narrationText: actNarrations[3],
      audioUrl: "",
      startFrame: timings[3].startFrame,
      endFrame: timings[3].endFrame,
      durationInFrames: timings[3].durationInFrames,
      wordTimings: timings[3].wordTimings,
      camera: { startFrame: timings[3].startFrame, endFrame: timings[3].endFrame, x: 0, y: 10, scale: 1.02 },
      primaryMetric: {
        startValue: 20,
        endValue: 20,
        unit: "MENIT",
        decimals: 0,
        isHighActive: false,
        baselineValue: 0,
        peakValue: 20,
        sparklinePoints: [20, 20, 20, 20],
      },
      statusBadge: { text: "SIAGA 1", variant: "red" },
      secondaryMetric: "Waktu Evakuasi",
      activeComponentIds: ["comp_1", "comp_2", "comp_3", "comp_4"],
      showChecklistCard: true,
    },
  ];

  const pillCallouts: FramePillCallout[] = [
    {
      id: "pill_0",
      componentId: "comp_1",
      startFrame: timings[0].startFrame + 30,
      endFrame: timings[0].endFrame - 15,
      text: "LEMPENG SAMUDRA →",
      direction: "RIGHT",
      anchor: anchorComp1,
    },
    {
      id: "pill_1",
      componentId: "comp_2",
      startFrame: timings[1].startFrame + 25,
      endFrame: timings[1].endFrame - 20,
      text: "← PATAHAN NAIK",
      direction: "LEFT",
      anchor: anchorComp2,
    },
    {
      id: "pill_2",
      componentId: "comp_3",
      startFrame: timings[2].startFrame + 20,
      endFrame: timings[2].endFrame - 20,
      text: "KOLOM AIR NAIK →",
      direction: "RIGHT",
      anchor: anchorComp3,
    },
    {
      id: "pill_3",
      componentId: "comp_4",
      startFrame: timings[3].startFrame + 20,
      endFrame: timings[3].endFrame - 20,
      text: "← GELOMBANG TSUNAMI",
      direction: "LEFT",
      anchor: anchorComp4,
    },
  ];

  return {
    jobId: "fixture-tsunami",
    topic,
    laymanHookTitle: "Gempa dasar laut <highlight>kok bisa picu tsunami raksasa?</highlight>",
    everydayCategory: "GEOFISIKA & BENCANA ALAM",
    coreSimpleTruth: "Patahan megathrust mendadak melenting naik dan mendesak miliaran ton kolom air laut",
    width: 1080,
    height: 1920,
    fps: 60,
    durationInFrames: cursorFrames,
    aspectRatioMode: "SHORTS_9_16",
    practicalChecklist: {
      title: "ATURAN 20-20-20 TSUNAMI:",
      items: [
        "Gempa terasa lebih dari 20 detik",
        "Waktu evakuasi hanya 20 menit",
        "Lari ke ketinggian minimal 20 meter",
      ],
    },
    visualScene,
    phases,
    pillCallouts,
    sfxOverlays: [],
    sfxTriggers: [],
  };
}

export function buildDefaultCompositionProps(): RemotionCompositionProps {
  return buildSolarPanelCompositionProps();
}
