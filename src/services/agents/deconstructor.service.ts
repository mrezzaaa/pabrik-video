import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  DeconstructionBlueprintSchema,
  type DeconstructionBlueprint,
  type VisualArchetype,
} from "@/schemas/video-blueprint";
import { LAYMAN_DECONSTRUCTOR_SYSTEM_PROMPT } from "./prompts";

export function detectVisualArchetype(topic: string): VisualArchetype {
  const lower = topic.toLowerCase();
  if (/presto|bandeng|panci|rebus|masak|duri|empuk|kukus|mendidih/.test(lower)) {
    return "PRESTO_PRESSURE_COOKER";
  }
  if (/tumbler|termos|botol|air panas|es\b|awet|dingin|vakum|kopi/.test(lower)) {
    return "THERMAL_TUMBLER";
  }
  if (/ac\b|freon|kulkas|pendingin|kompresor/.test(lower)) {
    return "COOLING_AC_SYSTEM";
  }
  if (/baterai|cas\b|charging|charger|listrik|hp\b/.test(lower)) {
    return "BATTERY_FAST_CHARGE";
  }
  return "PRESTO_PRESSURE_COOKER";
}

export function buildFallbackBlueprint(topic: string): DeconstructionBlueprint {
  const archetype = detectVisualArchetype(topic);

  if (archetype === "THERMAL_TUMBLER") {
    return {
      topic,
      laymanHookTitle: "Kenapa air di tumbler <highlight>awet panas?</highlight>",
      everydayCategory: "SAINS BARANG SEHARI-HARI",
      coreSimpleTruth: "Ruang hampa udara bikin panas nggak bisa nyebrang keluar",
      primaryArchetype: "THERMAL_TUMBLER",
      baselineMetricValue: 28.0,
      peakMetricValue: 92.5,
      metricUnit: "°C",
      practicalChecklistTitle: "CEK SEBELUM BELI:",
      practicalChecklistItems: [
        "Baja tahan karat 304",
        "Dinding ganda vakum",
        "Karet silikon rapat",
      ],
      components: [
        {
          id: "comp_pot_body",
          name: "Dinding Luar Baja",
          everydayRole: "Tetap adem saat dipegang tangan",
          simpleCauseEffect: "Terpisah dari tabung dalam oleh ruang hampa",
          fillColor: "#E2E8F0",
          defaultAnchor: { x: 310, y: 1020 },
          zoomTarget: { x: 80, y: -40, scale: 1.45 },
        },
        {
          id: "comp_water_fluid",
          name: "Air Panas / Es",
          everydayRole: "Suhu terkunci awet berjam-jam",
          simpleCauseEffect: "Panas dipantulkan balik ke dalam air",
          fillColor: "#93C5FD",
          defaultAnchor: { x: 540, y: 1080 },
          zoomTarget: { x: 0, y: -60, scale: 1.55 },
        },
        {
          id: "comp_core_item",
          name: "Celah Vakum Hampa",
          everydayRole: "Jembatan udara diputus total",
          simpleCauseEffect: "Panas bingung mau merambat lewat mana",
          fillColor: "#FACC15",
          defaultAnchor: { x: 750, y: 980 },
          zoomTarget: { x: -110, y: -20, scale: 1.85 },
        },
        {
          id: "comp_pressure_valve",
          name: "Karet Silikon Tutup",
          everydayRole: "Mengunci uap panas di leher botol",
          simpleCauseEffect: "Uap nggak bisa nyelonong keluar",
          fillColor: "#F87171",
          defaultAnchor: { x: 540, y: 690 },
          zoomTarget: { x: 0, y: 240, scale: 2.0 },
        },
      ],
      phases: [
        {
          phaseIndex: 0,
          phaseType: "EVERYDAY_CONTRAST_HOOK",
          title: "Gelas Biasa vs Tumbler",
          everydayContrastOrHook: "Di gelas biasa cepat dingin, di tumbler awet seharian",
          simpleExplanation: "Gelas biasa membiarkan panas kabur bebas ke udara luar.",
          visualArchetype: "THERMAL_TUMBLER",
          targetDurationSeconds: 7,
          focusComponentIds: ["comp_pot_body", "comp_water_fluid"],
        },
        {
          phaseIndex: 1,
          phaseType: "CORE_MECHANISM_CUTAWAY",
          title: "Rahasia Ruang Hampa",
          everydayContrastOrHook: "Udara di sela dua dinding disedot habis",
          simpleExplanation: "Tanpa udara, panas dari air nggak punya jembatan buat keluar.",
          visualArchetype: "THERMAL_TUMBLER",
          targetDurationSeconds: 12,
          focusComponentIds: ["comp_core_item", "comp_water_fluid"],
        },
        {
          phaseIndex: 2,
          phaseType: "COMPONENT_ZOOM_INS",
          title: "Karet Pengunci Uap",
          everydayContrastOrHook: "Titik rawan bocor ada di tutup atas",
          simpleExplanation: "Karet silikon menahan uap panas tetap terkunci rapat.",
          visualArchetype: "THERMAL_TUMBLER",
          targetDurationSeconds: 10,
          focusComponentIds: ["comp_pressure_valve", "comp_core_item"],
        },
        {
          phaseIndex: 3,
          phaseType: "PRACTICAL_TAKEAWAY_LOOP",
          title: "Tips Pilih Tumbler Awet",
          everydayContrastOrHook: "Cek 3 bagian penting sebelum beli",
          simpleExplanation: "Pastikan vakum asli dan karet tutupnya rapat.",
          visualArchetype: "THERMAL_TUMBLER",
          targetDurationSeconds: 9,
          focusComponentIds: ["comp_pot_body", "comp_water_fluid", "comp_pressure_valve"],
        },
      ],
    };
  }

  // Default flagship reference: Bandeng Presto / Pressure Cutaway style
  return {
    topic,
    laymanHookTitle:
      topic.toLowerCase().includes("bandeng") || topic.toLowerCase().includes("presto")
        ? "Kenapa duri bandeng presto <highlight>bisa lunak?</highlight>"
        : `${topic} <highlight>kok bisa?</highlight>`,
    everydayCategory: "BEDAH ALAT DAPUR & FISIKA HARIAN",
    coreSimpleTruth: "Uap dikurung rapat bikin titik didih air naik ke 120°C",
    primaryArchetype: "PRESTO_PRESSURE_COOKER",
    baselineMetricValue: 100.0,
    peakMetricValue: 120.5,
    metricUnit: "°C",
    practicalChecklistTitle: "CEK SEBELUM BELI:",
    practicalChecklistItems: [
      "Pemberat uap",
      "Katup pengaman",
      "Pengunci tutup",
    ],
    components: [
      {
        id: "comp_pot_body",
        name: "Bodi Panci Presto",
        everydayRole: "Mengurung uap panas rapat-rapat",
        simpleCauseEffect: "Uap tertahan bikin tekanan dalam panci naik",
        fillColor: "#E2E8F0",
        defaultAnchor: { x: 290, y: 1040 },
        zoomTarget: { x: 0, y: 0, scale: 1.05 },
      },
      {
        id: "comp_water_fluid",
        name: "Air Rebusan 120°C",
        everydayRole: "Mendidih lebih panas dari panci biasa",
        simpleCauseEffect: "Suhu ekstra tinggi melumerkan kolagen duri",
        fillColor: "#93C5FD",
        defaultAnchor: { x: 330, y: 1180 },
        zoomTarget: { x: 40, y: -90, scale: 1.35 },
      },
      {
        id: "comp_core_item",
        name: "Duri Ikan Bandeng",
        everydayRole: "Berubah empuk sampai bisa dikunyah",
        simpleCauseEffect: "Struktur keras duri lumer kena suhu 120 derajat",
        fillColor: "#F87171",
        defaultAnchor: { x: 640, y: 1130 },
        zoomTarget: { x: -60, y: -120, scale: 1.55 },
      },
      {
        id: "comp_pressure_valve",
        name: "Pemberat Penjaga Tekanan",
        everydayRole: "Buang kelebihan uap sambil bunyi PSSST!",
        simpleCauseEffect: "Menjaga tekanan stabil dan anti meledak",
        fillColor: "#FACC15",
        defaultAnchor: { x: 540, y: 670 },
        zoomTarget: { x: 0, y: 260, scale: 1.95 },
      },
      {
        id: "comp_safety_lock",
        name: "Katup & Pengunci Tutup",
        everydayRole: "Mengunci tutup saat masih bertekanan",
        simpleCauseEffect: "Tutup nggak bisa dibuka paksa sebelum aman",
        fillColor: "#86EFAC",
        defaultAnchor: { x: 750, y: 740 },
        zoomTarget: { x: -150, y: 210, scale: 1.9 },
      },
    ],
    phases: [
      {
        phaseIndex: 0,
        phaseType: "EVERYDAY_CONTRAST_HOOK",
        title: "Panci Biasa vs Presto",
        everydayContrastOrHook: "Rebus di panci biasa berjam-jam duri tetap keras",
        simpleExplanation: "Air di panci terbuka mentok mendidih di 100 derajat Celsius.",
        visualArchetype: "PRESTO_PRESSURE_COOKER",
        targetDurationSeconds: 7,
        focusComponentIds: ["comp_pot_body", "comp_core_item"],
      },
      {
        phaseIndex: 1,
        phaseType: "CORE_MECHANISM_CUTAWAY",
        title: "Uap Dikurung, Titik Didih Naik",
        everydayContrastOrHook: "Tutup dikunci rapat, uap nggak bisa kabur",
        simpleExplanation: "Tekanan uap menekan air sehingga baru mendidih di 120,5 derajat.",
        visualArchetype: "PRESTO_PRESSURE_COOKER",
        targetDurationSeconds: 13,
        focusComponentIds: ["comp_water_fluid", "comp_core_item"],
      },
      {
        phaseIndex: 2,
        phaseType: "COMPONENT_ZOOM_INS",
        title: "Pemberat: Penjaga Tekanan",
        everydayContrastOrHook: "Bunyi PSSST buang uap berlebih",
        simpleExplanation: "Pemberat, katup pengaman, dan pengunci tutup menjaga panci tetap aman.",
        visualArchetype: "PRESTO_PRESSURE_COOKER",
        targetDurationSeconds: 11,
        focusComponentIds: ["comp_pressure_valve", "comp_safety_lock"],
      },
      {
        phaseIndex: 3,
        phaseType: "PRACTICAL_TAKEAWAY_LOOP",
        title: "Cek Sebelum Beli Presto",
        everydayContrastOrHook: "Tiga komponen wajib ada biar masak aman",
        simpleExplanation: "Hemat waktu 69 menit dan duri lunak sampai ke dalam.",
        visualArchetype: "PRESTO_PRESSURE_COOKER",
        targetDurationSeconds: 9,
        focusComponentIds: ["comp_pot_body", "comp_pressure_valve", "comp_safety_lock"],
      },
    ],
  };
}

export async function runDeconstructorAgent(topic: string): Promise<{
  blueprint: DeconstructionBlueprint;
  modelUsed: string;
}> {
  const fallback = buildFallbackBlueprint(topic);

  const userPrompt = `Buat storyboard 4 babak bergaya kitabedah.id (Warm Editorial Cutaway untuk orang awam) untuk topik:
TOPIK: "${topic}"

Kembalikan HANYA JSON valid yang mengikuti struktur persis seperti contoh berikut:
${JSON.stringify(fallback, null, 2)}`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt: LAYMAN_DECONSTRUCTOR_SYSTEM_PROMPT,
    userPrompt,
    schema: DeconstructionBlueprintSchema,
    preferredModel: env.OMNIROUTE_FAST_MODEL,
    temperature: 0.3,
    fallbackGenerator: () => fallback,
  });

  return { blueprint: data, modelUsed };
}
