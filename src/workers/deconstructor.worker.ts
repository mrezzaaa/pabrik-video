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

export const BlueprintSchema = z.object({
  videoTitle: z.string(),
  subtitle: z.string().optional(),
  subjectArchetype: SubjectArchetypeSchema,
  cadArchetype: z.string().optional(),
  visualStyle: z.string().default("blueprint"),
  params: z.record(z.string(), z.any()).default({}),
  components: z.array(BlueprintComponentSchema).default([]),
  customAssemblies: z.array(CustomAssemblySchema).optional(),
  phases: z.array(BlueprintPhaseSchema).min(3),
});

export const DECONSTRUCTOR_SYSTEM_PROMPT = `Kamu AI Chief Engineer & CAD Blueprint Director untuk video teknik 3D procedural (CAD Blueprint & Cutaway System).

TUGAS UTAMA:
Menganalisis topik fisik/mesin/infrastruktur dan mengklasifikasikannya ke salah satu dari 5 TOPOLOGICAL ARCHETYPES:
1. "AXISYMMETRIC_MACHINE": Mesin putar silindris (Jet engine, turbofan, roket, turbin gas/air, dinamo, motor bakar, pompa, teropong/lensa optik).
2. "STRATIFIED_INFRASTRUCTURE": Infrastruktur berlapis linear (Jalan tol layang, jembatan bentang panjang, kabel bawah laut, lapisan geologi/tanah, pelat baja komposit).
3. "STRUCTURAL_ARCHITECTURE": Struktur modular grid (Gedung pencakar langit, data center, pabrik, rig lepas pantai, lambung kapal).
4. "MULTI_AXIS_MECHATRONICS": Perangkat mekatronika multi-sumbu (Drone FPV, robotika, prosesor Apple Silicon/CPU, IoT hardware, satelit).
5. "CONTINUUM_PHENOMENON": Fenomena medan/fluida/geofisika (Tsunami, gempa bumi megathrust, aerodinamika wake flow, sonar, awan konveksi).

ATURAN DETAIL REKAYASA (SANGAT KETAT):
- Setiap phase HARUS mewakili salah satu stasiun perakitan teknis spesifik (STATION STA-01 sampai STA-06).
- Sediakan telemetryChannels riil dengan parameter teknik (misal: "TEKANAN KOMPRESI: 42 bar", "TEGANGAN TARIK: 1,860 MPa", "SUHU OPERASIONAL: 1,750°C", "KECEPATAN PUTAR: 3,200 RPM", "MUTU BETON: fc 50 MPa").
- Gunakan bahasa teknis presisi tinggi, BUKAN teks generik atau klise.

Format Output WAJIB HANYA JSON valid:
{
  "videoTitle": "Judul 2-4 kata spesifik",
  "subtitle": "Penjelasan teknis 1 baris",
  "subjectArchetype": "AXISYMMETRIC_MACHINE | STRATIFIED_INFRASTRUCTURE | STRUCTURAL_ARCHITECTURE | MULTI_AXIS_MECHATRONICS | CONTINUUM_PHENOMENON",
  "params": {
    "bladeCount": 24,
    "stageCount": 5
  },
  "customAssemblies": [
    {
      "id": "nacelle_cowl",
      "label": "Aerodynamic Nacelle Cowl",
      "stationCode": "STA-01",
      "category": "shell",
      "metrics": "DIAMETER: 2.85m // CARBON COMPOSITE"
    },
    {
      "id": "fan_rotor",
      "label": "Titanium Wide-Chord Fan Rotor",
      "stationCode": "STA-02",
      "category": "rotor",
      "metrics": "3,200 RPM // TITANIUM Ti-6Al-4V"
    }
  ],
  "phases": [
    {
      "phaseId": 1,
      "title": "Judul Tahap 1",
      "label": "Deskripsi singkat rekayasa",
      "duration": 5,
      "activeStationCode": "STA-01",
      "cameraDirection": { "shotType": "WIDE", "zoomMultiplier": 1.0, "explodeFactor": 0.0 },
      "telemetryChannels": [
        { "name": "EFISIENSI BYPASS", "value": "12.5:1", "unit": "" },
        { "name": "DAYA DORONG", "value": "115,000", "unit": "LBF" }
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
      content: `TOPIC: ${topic}\n\nRESEARCH KNOWLEDGE BASE:\n${knowledgeBase}\n\nLakukan analisis dekonstruksi CAD Blueprint 3D teknik. Klasifikasikan archetype dan hasilkan JSON. Balas HANYA JSON.`,
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
      return {
        videoTitle: topic.slice(0, 32).toUpperCase(),
        subtitle: "DETERMINISTIC 3D CAD BLUEPRINT",
        subjectArchetype: fallbackArchetype,
        cadArchetype: fallbackArchetype,
        visualStyle: "blueprint",
        params: {},
        components: [],
        phases: [
          {
            phaseId: 1,
            title: "Struktur Eksternal",
            label: "Analisis Geometri & Aerodinamika",
            duration: 5,
            activeStationCode: "STA-01",
            cameraDirection: { shotType: "WIDE", zoomMultiplier: 1.0, explodeFactor: 0.0 },
            telemetryChannels: [{ name: "STATUS", value: "ANALYZED", unit: "" }],
          },
          {
            phaseId: 2,
            title: "Potongan Melintang",
            label: "Inspeksi Komponen Internal",
            duration: 6,
            activeStationCode: "STA-02",
            cameraDirection: { shotType: "MEDIUM", zoomMultiplier: 1.0, explodeFactor: 0.0 },
            telemetryChannels: [{ name: "SECTION", value: "ACTIVE", unit: "" }],
          },
          {
            phaseId: 3,
            title: "Tampilan Meledak",
            label: "Dekomposisi Multi-Sumbu",
            duration: 6,
            activeStationCode: "STA-03",
            cameraDirection: { shotType: "CLOSE", zoomMultiplier: 1.0, explodeFactor: 0.5 },
            telemetryChannels: [{ name: "EXPLODE", value: "SEPARATED", unit: "" }],
          },
          {
            phaseId: 4,
            title: "Sintesis Keseluruhan",
            label: "Rekonstruksi & Metrik Performa",
            duration: 5,
            activeStationCode: "STA-04",
            cameraDirection: { shotType: "WIDE", zoomMultiplier: 1.0, explodeFactor: 0.2 },
            telemetryChannels: [{ name: "EFFICIENCY", value: "OPTIMAL", unit: "" }],
          },
        ],
      } as VideoBlueprint;
    }
  }
}
