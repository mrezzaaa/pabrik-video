import { z } from "zod";
import { omniroute } from "../lib/omniroute";
import { VideoBlueprint } from "../lib/scene/types";
import { resolveCADArchetype } from "../lib/cad/router";

export const SubjectArchetypeSchema = z
  .string()
  .default("MULTI_AXIS_MECHATRONICS")
  .describe("One of AXISYMMETRIC_MACHINE, STRATIFIED_INFRASTRUCTURE, STRUCTURAL_ARCHITECTURE, MULTI_AXIS_MECHATRONICS, CONTINUUM_PHENOMENON");

export const BlueprintComponentSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  geometryType: z.string().default("box"),
  params: z.record(z.string(), z.any()).default({}),
  style: z.string().default("xray-blue"),
  position3D: z.array(z.number()).default([0, 0, 0]),
  rotation3D: z.array(z.number()).optional(),
  behavior: z.string().default("static"),
  axis: z.enum(["x", "y", "z"]).optional(),
});

export const BlueprintPhaseSchema = z.object({
  phaseId: z.union([z.number(), z.string()]),
  title: z.string().describe("Judul spesifik per topik, BUKAN generic"),
  label: z.string().optional(),
  duration: z.number().default(5),
  activeStationCode: z.string().optional(),
  activeComponentIds: z.array(z.string()).default([]),
  cameraDirection: z
    .object({
      shotType: z
        .enum(["WIDE", "MEDIUM", "CLOSE", "MACRO", "XRAY_SIDE"])
        .default("MEDIUM"),
      focusComponentIds: z.array(z.string()).default([]),
      zoomMultiplier: z.number().default(1.0),
      explodeFactor: z.number().min(0.0).max(1.0).default(0.0),
    })
    .default({
      shotType: "MEDIUM",
      focusComponentIds: [],
      zoomMultiplier: 1.0,
      explodeFactor: 0.0,
    }),
  objectState: z
    .object({
      visibleComponentIds: z.array(z.string()).default([]),
      exploded: z.boolean().default(false),
      cutawayEnabled: z.boolean().default(false),
    })
    .default({
      visibleComponentIds: [],
      exploded: false,
      cutawayEnabled: false,
    }),
  telemetryChannels: z
    .array(
      z.object({
        name: z.string(),
        value: z.union([z.string(), z.number()]),
        unit: z.string().optional(),
      })
    )
    .default([]),
});

export const CustomAssemblySchema = z.object({
  id: z.string(),
  label: z.string(),
  stationCode: z.string(),
  category: z.enum(["shell", "core", "rotor", "structure", "thermal", "electronics"]),
  metrics: z.string().optional(),
  explodeOffset: z.array(z.number()).length(3).optional(),
});

export const ComposableAssemblySchema = z.object({
  id: z.string(),
  stationCode: z.string().default("STA-01"),
  label: z.string(),
  metrics: z.string().optional().default(""),
  category: z.enum(["shell", "core", "rotor", "structure", "thermal", "electronics"]).default("core"),
  primitiveType: z.enum([
    "box_housing",
    "battery_pack_grid",
    "cylinder_motor_stator",
    "wheel_axle_assembly",
    "turbine_rotor_stage",
    "contoured_shell_body",
    "structural_frame_chassis",
    "pcb_stack_module",
    "high_voltage_cables",
    "stratified_layer_slab",
  ]),
  dimensions: z.array(z.number()).length(3).optional(),
  basePosition: z.array(z.number()).length(3).default([0, 0, 0]),
  baseRotation: z.array(z.number()).length(3).optional(),
  explodeOffset: z.array(z.number()).length(3).default([0, 0, 0]),
  rotationAxis: z.enum(["x", "y", "z"]).optional(),
  rotationSpeed: z.number().optional(),
  bladeOrCellCount: z.number().optional(),
  isShell: z.boolean().optional(),
});

export const BlueprintSchema = z.object({
  videoTitle: z.string(),
  subtitle: z.string().optional(),
  subjectArchetype: SubjectArchetypeSchema,
  cadArchetype: z.string().optional(),
  visualStyle: z.string().default("blueprint"),
  params: z.record(z.string(), z.any()).default({}),
  components: z.array(BlueprintComponentSchema).default([]),
  assemblies: z.array(ComposableAssemblySchema).optional(),
  parts: z.array(ComposableAssemblySchema).optional(),
  customAssemblies: z.array(CustomAssemblySchema).optional(),
  phases: z.array(BlueprintPhaseSchema).min(3),
});

export const DECONSTRUCTOR_SYSTEM_PROMPT = `Kamu AI Chief Engineer & CAD Blueprint Director untuk video teknik 3D procedural (CAD Blueprint & Cutaway System).

TUGAS UTAMA:
Menganalisis topik fisik/mesin/infrastruktur dan menyusun anatomi 3D modular dinamis menggunakan array "assemblies[]" dengan 10 Parametric CAD Primitives:
1. "box_housing": Enclosure parametrik dengan sudut chamfer/cooling fins (Inverter, ECU, Trafo, Power Core).
2. "battery_pack_grid": Skateboard flat pack atau susunan sel baterai silindris/pouch (Baterai Mobil Listrik, LiPo).
3. "cylinder_motor_stator": Casing motor silindris berigi dengan kumparan tembaga & drive shaft (Traction Motor EV, Generator, Pompa).
4. "wheel_axle_assembly": Roda pelek detail, ban, piringan rem cakram, kaliper, dan poros as (Roda Mobil/Truk/Kereta).
5. "turbine_rotor_stage": Hub dengan N bilah sudu twisted airfoil radial (Bilah Fan Jet, Kompresor, Turbin, Propeller).
6. "contoured_shell_body": Bodi luar aerodinamis transparan (isShell: true, diiris bidang GPU cutaway).
7. "structural_frame_chassis": Rangka sasis tangga, spaceframe, truss I-beam (Sasis Skateboard EV, Rangka Baja).
8. "pcb_stack_module": Papan sirkuit elektronik dengan IC surface-mount & header.
9. "high_voltage_cables": Rute kabel busbar tegangan tinggi (Kabel oranye HV dari Baterai -> Inverter -> Motor).
10. "stratified_layer_slab": Pelat perkerasan struktural/geologis berlapis dengan tulangan grid.

CRITICAL 3D ANATOMY RULES (SPATIAL ACCURACY):
1. Anatomi spasial HARUS presisi sesuai objek di dunia nyata!
   - Contoh "Mobil Listrik (Electric Vehicle / EV)":
     * Bodi Mobil: "contoured_shell_body", isShell: true, basePosition: [0, 0.8, 0], explodeOffset: [0, 2.8, 0]
     * Rangka Sasis: "structural_frame_chassis", basePosition: [0, -0.3, 0], explodeOffset: [0, -1.2, 0]
     * Baterai Lantai: "battery_pack_grid", flat & wide, basePosition: [0, -0.1, 0], dimensions: [2.2, 0.35, 3.8], explodeOffset: [0, -2.2, 0]
     * Power Inverter Depan & Belakang: "box_housing", basePosition: [0, 0.3, 1.8], explodeOffset: [0, 1.4, 1.2]
     * Motor Traksi Silinder Depan & Belakang: "cylinder_motor_stator", sumbu X (baseRotation: [0, 0, 1.57]), basePosition: [0, 0, 2.2] dan [0, 0, -2.2]
     * 4 Roda & Rem: "wheel_axle_assembly" di 4 sudut [±1.4, 0, ±2.2], berputar sumbu X, explodeOffset [±2.0, 0, 0]
     * Kabel Busbar HV: "high_voltage_cables" oranye menghubungkan baterai ke inverter & motor
   - DILARANG KERAS menggunakan baling-baling drone horizontal untuk kendaraan darat / mobil!

CRITICAL PHASE NAMING RULES:
- Judul phase HARUS nama sistem rekayasa riil spesifik (misal: "Arsitektur Bodi Aerodinamis", "Penyimpanan Energi Sel Baterai", "Konversi Daya Inverter", "Motor Traksi & Sistem Roda").
- DILARANG KERAS menggunakan judul arah kamera generik seperti "Potongan Melintang", "Tampilan Meledak", "Sintesis Keseluruhan"!

Format Output WAJIB HANYA JSON valid:
{
  "videoTitle": "CARA KERJA MOBIL LISTRIK",
  "subtitle": "ANALISIS ANATOMI SISTEM PROPULSI EV",
  "subjectArchetype": "MULTI_AXIS_MECHATRONICS",
  "assemblies": [
    {
      "id": "car_body",
      "stationCode": "STA-01",
      "label": "Aerodynamic Unibody Shell",
      "metrics": "DRAG COEFF: Cd 0.23 // CARBON COMPOSITE",
      "category": "shell",
      "primitiveType": "contoured_shell_body",
      "dimensions": [2.2, 1.3, 4.4],
      "basePosition": [0, 0.8, 0],
      "explodeOffset": [0, 2.8, 0],
      "isShell": true
    },
    {
      "id": "battery_pack",
      "stationCode": "STA-02",
      "label": "800V LFP Skateboard Battery Pack",
      "metrics": "CAPACITY: 82 kWh // 800V ARCHITECTURE",
      "category": "core",
      "primitiveType": "battery_pack_grid",
      "dimensions": [2.2, 0.35, 3.8],
      "basePosition": [0, -0.1, 0],
      "explodeOffset": [0, -2.2, 0]
    },
    {
      "id": "dual_inverters",
      "stationCode": "STA-03",
      "label": "Dual SiC Power Inverters",
      "metrics": "EFFICIENCY: 99.2% // SILICON CARBIDE MOSFET",
      "category": "electronics",
      "primitiveType": "box_housing",
      "dimensions": [1.1, 0.35, 0.9],
      "basePosition": [0, 0.3, 1.8],
      "explodeOffset": [0, 1.4, 1.2]
    },
    {
      "id": "traction_motor",
      "stationCode": "STA-04",
      "label": "Dual Permanent Magnet Motors",
      "metrics": "OUTPUT: 380 kW // 18,000 RPM MAX",
      "category": "rotor",
      "primitiveType": "cylinder_motor_stator",
      "dimensions": [0.65, 0.75, 0.65],
      "basePosition": [0, 0, 2.2],
      "baseRotation": [0, 0, 1.57],
      "explodeOffset": [0, 0, 2.2],
      "rotationAxis": "x",
      "rotationSpeed": 0.08
    }
  ],
  "phases": [
    {
      "phaseId": 1,
      "title": "Arsitektur Bodi Aerodinamis",
      "label": "Struktur Cangkang Ringan & Hambatan Udara Rendah",
      "duration": 5,
      "activeStationCode": "STA-01",
      "telemetryChannels": [
        { "name": "KOEFISIEN HAMBAT", "value": "0.23", "unit": "Cd" }
      ]
    },
    {
      "phaseId": 2,
      "title": "Penyimpanan Energi Sel Baterai",
      "label": "Paket Baterai Skateboard Bawah Lantai",
      "duration": 6,
      "activeStationCode": "STA-02",
      "telemetryChannels": [
        { "name": "KAPASITAS", "value": "82", "unit": "kWh" },
        { "name": "TEGANGAN", "value": "800", "unit": "V" }
      ]
    },
    {
      "phaseId": 3,
      "title": "Konversi Daya Inverter",
      "label": "Inversi DC ke AC Berkecepatan Tinggi",
      "duration": 6,
      "activeStationCode": "STA-03",
      "telemetryChannels": [
        { "name": "EFISIENSI INVERTER", "value": "99.2", "unit": "%" }
      ]
    },
    {
      "phaseId": 4,
      "title": "Motor Traksi & Sistem Roda",
      "label": "Penyaluran Torsi Instan ke Roda Penggerak",
      "duration": 5,
      "activeStationCode": "STA-04",
      "telemetryChannels": [
        { "name": "TORSI PUNCAK", "value": "650", "unit": "Nm" },
        { "name": "RPM MAKSIMAL", "value": "18,000", "unit": "RPM" }
      ]
    }
  ]
}`;

export async function deconstructTopicToBlueprint(
  topic: string,
  knowledgeBase: string,
  modelId?: string
): Promise<VideoBlueprint> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: DECONSTRUCTOR_SYSTEM_PROMPT },
    {
      role: "user",
      content: `TOPIC: ${topic}\n\nRESEARCH KNOWLEDGE BASE:\n${knowledgeBase}\n\nLakukan analisis dekonstruksi CAD Blueprint 3D teknik. Susun assemblies 3D modular sesuai anatomi riil dan hasilkan JSON. Balas HANYA JSON.`,
    },
  ];

  try {
    const rawText = await omniroute.getChatCompletion(messages, modelId);
    const parsed = omniroute.cleanAndParseJson(rawText);
    const resolved = BlueprintSchema.parse(parsed);

    // Ensure archetype is normalized
    resolved.cadArchetype = resolveCADArchetype(resolved.subjectArchetype || topic);
    return resolved as VideoBlueprint;
  } catch (err: any) {
    console.warn("[DECONSTRUCTOR] Retrying with direct archetype inference:", err.message);
    const fallbackArchetype = resolveCADArchetype(topic);

    const retryMessages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: DECONSTRUCTOR_SYSTEM_PROMPT },
      {
        role: "user",
        content: `TOPIC: ${topic}\nARCHETYPE: ${fallbackArchetype}\n\nKirim JSON Blueprint sekarang tanpa teks tambahan:`,
      },
    ];

    try {
      const retryText = await omniroute.getChatCompletion(retryMessages, modelId);
      const parsed = omniroute.cleanAndParseJson(retryText);
      const resolved = BlueprintSchema.parse(parsed);
      resolved.cadArchetype = resolved.cadArchetype || fallbackArchetype;
      return resolved as VideoBlueprint;
    } catch (fallbackErr: any) {
      console.error("[DECONSTRUCTOR] Using robust archetype default fallback:", fallbackErr.message);
      const isEV = fallbackArchetype === "ELECTRIC_VEHICLE" || resolveCADArchetype(topic) === "ELECTRIC_VEHICLE";

      return {
        videoTitle: topic.toUpperCase(),
        subtitle: isEV ? "SISTEM ANATOMI PROPULSI MOBIL LISTRIK" : "DETERMINISTIC 3D CAD BLUEPRINT",
        subjectArchetype: isEV ? "ELECTRIC_VEHICLE" : fallbackArchetype,
        cadArchetype: isEV ? "ELECTRIC_VEHICLE" : fallbackArchetype,
        visualStyle: "blueprint",
        params: {},
        components: [],
        phases: isEV
          ? [
              {
                phaseId: 1,
                title: "Arsitektur Bodi Aerodinamis",
                label: "Struktur Cangkang Ringan & Hambatan Udara Rendah",
                duration: 5,
                activeStationCode: "STA-01",
                cameraDirection: { shotType: "WIDE", zoomMultiplier: 1.0, explodeFactor: 0.0 },
                telemetryChannels: [{ name: "DRAG", value: "0.23", unit: "Cd" }],
              },
              {
                phaseId: 2,
                title: "Penyimpanan Energi Sel Baterai",
                label: "Paket Baterai Skateboard Bawah Lantai",
                duration: 6,
                activeStationCode: "STA-02",
                cameraDirection: { shotType: "MEDIUM", zoomMultiplier: 1.0, explodeFactor: 0.0 },
                telemetryChannels: [{ name: "TEGANGAN", value: "800", unit: "V" }],
              },
              {
                phaseId: 3,
                title: "Konversi Daya Inverter",
                label: "Inversi DC ke AC Berkecepatan Tinggi",
                duration: 6,
                activeStationCode: "STA-03",
                cameraDirection: { shotType: "CLOSE", zoomMultiplier: 1.0, explodeFactor: 0.5 },
                telemetryChannels: [{ name: "EFISIENSI", value: "99.2", unit: "%" }],
              },
              {
                phaseId: 4,
                title: "Motor Traksi & Sistem Roda",
                label: "Penyaluran Torsi Instan ke Roda Penggerak",
                duration: 5,
                activeStationCode: "STA-04",
                cameraDirection: { shotType: "WIDE", zoomMultiplier: 1.0, explodeFactor: 0.2 },
                telemetryChannels: [{ name: "TORSI", value: "650", unit: "Nm" }],
              },
            ]
          : [
              {
                phaseId: 1,
                title: "Geometri & Struktur Primer",
                label: "Analisis Arsitektur Mekanikal Eksternal",
                duration: 5,
                activeStationCode: "STA-01",
                cameraDirection: { shotType: "WIDE", zoomMultiplier: 1.0, explodeFactor: 0.0 },
                telemetryChannels: [{ name: "STATUS", value: "OPTIMAL", unit: "" }],
              },
              {
                phaseId: 2,
                title: "Arsitektur Komponen Internal",
                label: "Inspeksi Mekanisme Inti & Aliran Daya",
                duration: 6,
                activeStationCode: "STA-02",
                cameraDirection: { shotType: "MEDIUM", zoomMultiplier: 1.0, explodeFactor: 0.0 },
                telemetryChannels: [{ name: "CORE_TEMP", value: "NOMINAL", unit: "" }],
              },
              {
                phaseId: 3,
                title: "Dekomposisi Subsistem Penggerak",
                label: "Pemisahan Multi-Sumbu Komponen Kritis",
                duration: 6,
                activeStationCode: "STA-03",
                cameraDirection: { shotType: "CLOSE", zoomMultiplier: 1.0, explodeFactor: 0.5 },
                telemetryChannels: [{ name: "SEPARATION", value: "CALIBRATED", unit: "" }],
              },
              {
                phaseId: 4,
                title: "Integrasi Daya & Efisiensi Sistem",
                label: "Rekonstruksi & Metrik Performa Operasional",
                duration: 5,
                activeStationCode: "STA-04",
                cameraDirection: { shotType: "WIDE", zoomMultiplier: 1.0, explodeFactor: 0.2 },
                telemetryChannels: [{ name: "OUTPUT", value: "PEAK", unit: "" }],
              },
            ],
      } as VideoBlueprint;
    }
  }
}
