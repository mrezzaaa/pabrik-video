import { z } from "zod";
import { omniroute } from "../lib/omniroute";
import { VideoBlueprint } from "../lib/scene/types";

export const SubjectArchetypeSchema = z
  .string()
  .default("UNIVERSAL_CUTAWAY")
  .describe("free text archetype like TOLL_ROAD, TURBOCHARGER, LAPTOP_XRAY, JET_ENGINE, ELECTRIC_CAR, etc.");

export const ThreeGeometryTypeSchema = z.enum([
  "cylinder",
  "box",
  "sphere",
  "torus",
  "cone",
  "plane",
  "fan",
  "road",
  "pillar",
]);

export const XRayStyleSchema = z.enum([
  "xray-blue",
  "xray-orange",
  "wireframe-green",
  "xray-blue-dark",
  "xray-blue-light",
]);

export const BlueprintComponentSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  geometryType: ThreeGeometryTypeSchema,
  params: z.record(z.string(), z.any()).default({}),
  style: XRayStyleSchema.default("xray-blue"),
  position3D: z.array(z.number()).length(3).default([0, 0, 0]),
  rotation3D: z.array(z.number()).length(3).optional(),
  behavior: z.enum(["rotate", "static", "explode"]).default("static"),
  axis: z.enum(["x", "y", "z"]).optional(),
});

export const BlueprintPhaseSchema = z.object({
  phaseId: z.union([z.number(), z.string()]),
  title: z.string().describe("Judul spesifik per topik, BUKAN generic"),
  label: z.string().optional(),
  duration: z.number().default(5),
  activeComponentIds: z.array(z.string()).default([]),
  cameraDirection: z
    .object({
      shotType: z
        .enum(["WIDE", "MEDIUM", "CLOSE", "MACRO", "XRAY_SIDE"])
        .default("MEDIUM"),
      focusComponentIds: z.array(z.string()).default([]),
      zoomMultiplier: z.number().min(1.0).max(2.4).default(1.0),
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

export const BlueprintSchema = z.object({
  videoTitle: z.string(),
  subjectArchetype: SubjectArchetypeSchema,
  visualStyle: z
    .enum(["xray", "wireframe-green", "blueprint"])
    .default("xray"),
  components: z.array(BlueprintComponentSchema).min(3),
  phases: z.array(BlueprintPhaseSchema).min(3),
});

export const DECONSTRUCTOR_SYSTEM_PROMPT = `Kamu AI 3D Deconstructor & Technical Director untuk video explainer bergaya X-RAY HOLOGRAM TRANSPARAN (Kitabedah Scene).
Visual kamu harus mirip blueprint 3D teknik tembus pandang bercahaya neon biru (#00D4FF) dengan inti oranye (#FF6B35) dan terrain wireframe hijau neon (#00FF00).

JANGAN PERNAH HARDCODE. Rancang struktur 3D Lego universal dinamis untuk topik APAPUN!

PILIHAN GEOMETRY TYPE (ThreeGeometryType):
- "fan": rotor/turbin/kipas pendingin (blades: 14-18, radius, thickness). Rotates on Z-axis.
- "road": jalan raya/tol layang panjang tembus pandang (length, width, thickness, lanes, hasCars).
- "pillar": pilar/tiang beton penopang jembatan/tol dengan pier cap hammerhead & pondasi (height, radius, capWidth).
- "cylinder": poros/shaft panjang, tabung dinding silinder, pipa, piston.
- "box": sasis laptop, motherboard PCB, blok mesin, pelat baterai, reservoir.
- "sphere": butiran air hujan, aerosol CCN, atom, bantalan peluru (ball bearing).
- "torus": ring segel o-ring, kumparan trafo induksi, selang melingkar.
- "cone": nosel sembur, corong kompresor bertingkat.
- "plane": bidang datar atau grid landasan.

PILIHAN STYLE X-RAY:
- "xray-blue": bodi utama transparan biru cyan (#00D4FF).
- "xray-orange": inti panas aktif, ruang bakar, mesin mobil, drivetrain, prosesor panas (#FF6B35).
- "xray-blue-light": sudu turbin bergerak, pipa pendingin heatpipe, guardrail (#66E0FF).
- "xray-blue-dark": poros baja pekat, motherboard, blok silinder dalam (#0088CC).
- "wireframe-green": grid terrain kontur alam hijau neon (#00FF00).

ATURAN PHASES (SANGAT PENTING):
- Judul phase HARUS SPESIFIK sesuai topik, DILARANG kata generik seperti "Solusi Vakum"!
  Contoh Jalan Tol: "Pondasi Pilar", "Konstruksi Girder", "Gerbang Tol", "Alur Kendaraan"
  Contoh Turbocharger: "Keong Kompresor", "Poros & Bantalan", "Turbin Gas Buang", "Dorongan Tekanan"
  Contoh Laptop: "Chassis & Engsel", "Motherboard & CPU", "Heatpipe & Kipas", "Baterai & Daya"
  Contoh Air Hujan: "Evaporasi Permukaan", "Inti Kondensasi", "Awan Kumulonimbus", "Presipitasi Hujan"

Format Output: HANYA raw JSON valid sesuai skema:
{
  "videoTitle": "Judul 2-4 kata",
  "subjectArchetype": "TOLL_ROAD | TURBOCHARGER | LAPTOP_XRAY | ...",
  "visualStyle": "xray",
  "components": [
    {
      "id": "COMP_ID",
      "name": "Nama Komponen",
      "geometryType": "cylinder | box | fan | road | pillar | sphere | torus | cone | plane",
      "params": { ... },
      "style": "xray-blue | xray-orange | wireframe-green | xray-blue-light | xray-blue-dark",
      "position3D": [0, 0, 0],
      "behavior": "rotate | explode | static",
      "axis": "z"
    }
  ],
  "phases": [
    {
      "phaseId": 1,
      "title": "Judul Spesifik",
      "duration": 6,
      "activeComponentIds": ["COMP_ID"],
      "cameraDirection": { "shotType": "WIDE | MEDIUM | CLOSE | MACRO | XRAY_SIDE", "zoomMultiplier": 1.0, "explodeFactor": 0.0 },
      "objectState": { "exploded": false, "cutawayEnabled": false },
      "telemetryChannels": [{ "name": "RPM", "value": "120,000", "unit": "RPM" }]
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
      content: `TOPIC: ${topic}\n\nRESEARCH KNOWLEDGE BASE:\n${knowledgeBase}\n\nDekonstruksi objek 3D fisik untuk topik ini menjadi komponen procedural dan phases spesifik. Balas HANYA JSON.`,
    },
  ];

  try {
    const rawText = await omniroute.getChatCompletion(messages, modelId);
    const parsed = omniroute.cleanAndParseJson(rawText);
    return BlueprintSchema.parse(parsed) as VideoBlueprint;
  } catch (err: any) {
    console.warn("[DECONSTRUCTOR] Falling back to robust retry:", err.message);
    const retryMessages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: DECONSTRUCTOR_SYSTEM_PROMPT },
      {
        role: "user",
        content: `TOPIC: ${topic}\n\nKirim JSON Blueprint sekarang tanpa teks pembuka/penutup:`,
      },
    ];
    const retryText = await omniroute.getChatCompletion(retryMessages, modelId);
    const parsed = omniroute.cleanAndParseJson(retryText);
    return BlueprintSchema.parse(parsed) as VideoBlueprint;
  }
}
