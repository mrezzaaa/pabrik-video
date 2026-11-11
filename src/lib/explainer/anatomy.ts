import { chatJSON } from "../omniroute";
import { buildPlaybook } from "../skills/playbook";
import { axisLabel, stripEmoji } from "../text";
import type { ResearchData, ScriptSentence, TopicStyle } from "../types";
import {
  genericModel,
  objectModelSchema,
  sanitizeModel,
  type ObjectModel,
  type ObjectPart,
} from "./model";

/**
 * Agent Anatomy: membangun satu ObjectModel (3D isometrik + aliran + tahap
 * proses) untuk topik project via Omniroute + playbook skill
 * (isometric-explainer, blueprint-figure, motion-figure).
 */

const ANATOMY_SYSTEM_PROMPT = `Kamu adalah CAD & Isometric Explainer Architect untuk video pendek edukasi Indonesia.
Tugasmu: membedah TOPIK dan FAKTA RISET menjadi SATU model 3D isometrik (ObjectModel) yang menjelaskan bagian-bagian dan alur cara kerjanya.

ATURAN GEOMETRI 3D (koordinat -100..100, sumbu z = vertikal ke atas):
1. Buat 4 sampai 8 bagian (parts) yang menyusun sistem dari luar ke dalam atau dari bawah ke atas.
2. Pilihan shape:
   - "hollowBox": wadah/gedung/rumah/ruang luar yang dipotong (set cutaway: true, inner: false).
   - "box": balok/modul/plat/pondasi.
   - "cylinder": tabung/batang/kabel vertikal/pipa lurus/baterai.
   - "cone": ujung runcing/nosel/corong.
   - "sphere": bola/inti/muatan/awan.
   - "lathe": benda putar custom dengan profile: [{r, z}, ...] (dari z=0 ke atas).
   - "tube": jalur kabel/pipa/aliran 3D dengan path: [{x, y, z}, ...] minimal 3 titik.
   - "ring": cincin/kumparan/koil.
3. Susun posisi (x, y, z) agar bagian-bagian membentuk SATU kesatuan rakitan yang utuh dan tidak saling tumpang tindih parah:
   - Bagian bawah/dasar di z sekitar -30..0.
   - Bagian tengah/utama di z sekitar 0..60.
   - Bagian atas/ujung di z sekitar 60..110.
4. Setiap label WAJIB 1-3 kata Bahasa Indonesia, HURUF BESAR, istilah nyata dari fakta riset/naskah (jangan mengarang istilah).
5. Buat 1-2 flows (aliran fisika/proses): sebutkan id bagian yang dilewati secara berurutan di field "through" (minimal 3 bagian), dan pilih medium ("spark" | "water" | "air" | "heat" | "light" | "particle" | "money" | "people").
6. Buat 3-5 steps (tahap proses berurutan, masing-masing 1-3 kata HURUF BESAR).

CONTOH STRUKTUR JSON WAJIB:
{
  "subject": "SISTEM UTAMA",
  "parts": [
    { "id": "shell", "label": "STRUKTUR LUAR", "shape": "hollowBox", "position": { "x": 0, "y": 0, "z": 0 }, "size": { "x": 80, "y": 70, "z": 70 }, "color": "#475569", "cutaway": true, "inner": false },
    { "id": "core", "label": "INTI PROSES", "shape": "cylinder", "position": { "x": 0, "y": 0, "z": 10 }, "size": { "x": 18, "y": 18, "z": 45 }, "color": "#38BDF8", "cutaway": false, "inner": true }
  ],
  "flows": [
    { "id": "main-flow", "label": "ALUR ENERGI", "through": ["shell", "core"], "medium": "spark", "color": "#FACC15" }
  ],
  "steps": ["TAHAP MASUK", "PROSES INTI", "PELEPASAN"]
}

Kembalikan HANYA JSON sesuai schema.`;

export function presetForTopic(topic: string, labels: string[] = []): ObjectModel | null {
  const t = topic.toLowerCase();

  if (/penangkal petir|petir|lightning|grounding/.test(t)) {
    const parts: ObjectPart[] = [
      {
        id: "cloud",
        label: "AWAN BERMUATAN",
        shape: "sphere",
        position: { x: -18, y: -12, z: 108 },
        size: { x: 46, y: 46, z: 26 },
        color: "#64748B",
        cutaway: false,
        inner: false,
        motion: "bob",
        explode: { x: 0, y: 0, z: 28 },
      },
      {
        id: "air-terminal",
        label: "BATANG RUNCING",
        shape: "cone",
        position: { x: 0, y: 0, z: 68 },
        size: { x: 18, y: 18, z: 34 },
        color: "#FFB74D",
        cutaway: false,
        inner: false,
        motion: "pulse",
        explode: { x: 0, y: 0, z: 22 },
      },
      {
        id: "building",
        label: "STRUKTUR GEDUNG",
        shape: "hollowBox",
        position: { x: 0, y: 0, z: 0 },
        size: { x: 78, y: 74, z: 68 },
        color: "#475569",
        cutaway: true,
        inner: false,
        motion: "none",
        explode: { x: 0, y: 0, z: 0 },
      },
      {
        id: "down-conductor",
        label: "KABEL KONDUKTOR",
        shape: "tube",
        position: { x: 0, y: 0, z: 0 },
        size: { x: 10, y: 10, z: 70 },
        path: [
          { x: 0, y: 0, z: 72 },
          { x: 28, y: 24, z: 64 },
          { x: 28, y: 24, z: 2 },
          { x: 18, y: 16, z: -26 },
        ],
        color: "#FF8A65",
        cutaway: false,
        inner: true,
        motion: "none",
        explode: { x: 18, y: 14, z: 0 },
      },
      {
        id: "ground-rod",
        label: "BATANG PEMBUMIAN",
        shape: "cylinder",
        position: { x: 14, y: 12, z: -42 },
        size: { x: 22, y: 22, z: 36 },
        color: "#4FC3F7",
        cutaway: false,
        inner: true,
        motion: "none",
        explode: { x: 0, y: 0, z: -22 },
      },
      {
        id: "earth-pit",
        label: "LAPISAN TANAH",
        shape: "box",
        position: { x: 0, y: 0, z: -46 },
        size: { x: 96, y: 92, z: 14 },
        color: "#81C784",
        cutaway: false,
        inner: false,
        motion: "none",
        explode: { x: 0, y: 0, z: -30 },
      },
    ];
    return {
      subject: topic,
      parts,
      flows: [
        {
          id: "lightning-current",
          label: "ARUS PETIR",
          through: ["cloud", "air-terminal", "down-conductor", "ground-rod", "earth-pit"],
          medium: "spark",
          color: "#FFE14D",
        },
      ],
      steps: ["INDUKSI AWAN", "SAMBAR TERMINAL", "ALIR KONDUKTOR", "BUANG KE TANAH"],
    };
  }

  if (/jet|turbofan|turbin|pesawat/.test(t)) {
    const parts: ObjectPart[] = [
      {
        id: "nacelle",
        label: "SELUBUNG MESIN",
        shape: "lathe",
        position: { x: 0, y: 0, z: -10 },
        size: { x: 84, y: 84, z: 110 },
        profile: [
          { r: 34, z: 0 },
          { r: 44, z: 30 },
          { r: 42, z: 80 },
          { r: 36, z: 110 },
        ],
        color: "#64748B",
        cutaway: true,
        inner: false,
        motion: "none",
      },
      {
        id: "fan",
        label: "KIPAS DEPAN",
        shape: "cylinder",
        position: { x: 0, y: 0, z: 76 },
        size: { x: 64, y: 64, z: 16 },
        color: "#4FC3F7",
        cutaway: false,
        inner: true,
        motion: "spin",
        explode: { x: 0, y: 0, z: 32 },
      },
      {
        id: "compressor",
        label: "KOMPRESOR",
        shape: "cylinder",
        position: { x: 0, y: 0, z: 46 },
        size: { x: 46, y: 46, z: 26 },
        color: "#81C784",
        cutaway: false,
        inner: true,
        motion: "spin",
        explode: { x: 0, y: 0, z: 14 },
      },
      {
        id: "combustor",
        label: "RUANG BAKAR",
        shape: "ring",
        position: { x: 0, y: 0, z: 24 },
        size: { x: 50, y: 50, z: 18 },
        color: "#FF8A65",
        cutaway: false,
        inner: true,
        motion: "pulse",
        explode: { x: 0, y: 0, z: 0 },
      },
      {
        id: "turbine",
        label: "TURBIN",
        shape: "cylinder",
        position: { x: 0, y: 0, z: 2 },
        size: { x: 44, y: 44, z: 18 },
        color: "#FFB74D",
        cutaway: false,
        inner: true,
        motion: "spin",
        explode: { x: 0, y: 0, z: -16 },
      },
      {
        id: "nozzle",
        label: "NOSEL BUANG",
        shape: "cone",
        position: { x: 0, y: 0, z: -26 },
        size: { x: 52, y: 52, z: 26 },
        color: "#E57373",
        cutaway: false,
        inner: false,
        motion: "none",
        explode: { x: 0, y: 0, z: -32 },
      },
    ];
    return {
      subject: topic,
      parts,
      flows: [
        {
          id: "thrust-flow",
          label: "ALIRAN DORONG",
          through: ["fan", "compressor", "combustor", "turbine", "nozzle"],
          medium: "air",
          color: "#4FC3F7",
        },
      ],
      steps: ["HISAP UDARA", "KOMPRESI PADAT", "BAKAR BAHAN", "SEMBUR NOSEL"],
    };
  }

  if (/kolom|begel|beton|gempa|pondasi|bangunan/.test(t)) {
    const parts: ObjectPart[] = [
      {
        id: "concrete",
        label: "SELIMUT BETON",
        shape: "hollowBox",
        position: { x: 0, y: 0, z: -10 },
        size: { x: 76, y: 76, z: 100 },
        color: "#64748B",
        cutaway: true,
        inner: false,
        motion: "none",
      },
      {
        id: "rebar-core",
        label: "TULANGAN UTAMA",
        shape: "cylinder",
        position: { x: 0, y: 0, z: -6 },
        size: { x: 34, y: 34, z: 92 },
        color: "#4FC3F7",
        cutaway: false,
        inner: true,
        motion: "none",
        explode: { x: 0, y: 0, z: 24 },
      },
      {
        id: "stirrup-top",
        label: "BEGEL KAIT 135",
        shape: "ring",
        position: { x: 0, y: 0, z: 56 },
        size: { x: 52, y: 52, z: 16 },
        color: "#81C784",
        cutaway: false,
        inner: true,
        motion: "pulse",
        explode: { x: 22, y: 0, z: 12 },
      },
      {
        id: "stirrup-mid",
        label: " SENGKANG PENGIKAT",
        shape: "ring",
        position: { x: 0, y: 0, z: 24 },
        size: { x: 52, y: 52, z: 16 },
        color: "#FFB74D",
        cutaway: false,
        inner: true,
        motion: "none",
        explode: { x: -22, y: 0, z: 0 },
      },
      {
        id: "footing",
        label: "SIMPUL PONDASI",
        shape: "box",
        position: { x: 0, y: 0, z: -28 },
        size: { x: 96, y: 96, z: 18 },
        color: "#E57373",
        cutaway: false,
        inner: false,
        motion: "none",
        explode: { x: 0, y: 0, z: -24 },
      },
    ];
    return {
      subject: topic,
      parts,
      flows: [
        {
          id: "seismic-load",
          label: "BEBAN GEMPA",
          through: ["stirrup-top", "rebar-core", "stirrup-mid", "footing"],
          medium: "spark",
          color: "#FF7043",
        },
      ],
      steps: ["GUNCANGAN GEMPA", "TEKANAN INTI", "KUNCI BEGEL", "SALUR PONDASI"],
    };
  }

  return labels.length >= 3 ? genericModel(topic, labels) : null;
}

function candidateLabelsFrom(research: ResearchData | null, sentences: ScriptSentence[]): string[] {
  const raw: string[] = [];
  for (const s of sentences) {
    for (const w of s.emphasisWords ?? []) {
      const cleaned = axisLabel(stripEmoji(w));
      if (cleaned.length >= 4) raw.push(cleaned);
    }
  }
  for (const term of research?.visualTerms ?? []) {
    const cleaned = axisLabel(stripEmoji(term));
    if (cleaned.length >= 4) raw.push(cleaned);
  }
  return [...new Set(raw)].slice(0, 6);
}

export async function ensureObjectModel(input: {
  topic: string;
  style: TopicStyle;
  researchData: ResearchData | null;
  sentences: ScriptSentence[];
  modelOverride?: string | null;
  forceRebuild?: boolean;
}): Promise<ObjectModel> {
  const existing = input.researchData?.anatomy;
  if (existing && !input.forceRebuild) {
    const clean = sanitizeModel(existing);
    if (clean && clean.parts.length >= 3) return clean;
  }

  const labels = candidateLabelsFrom(input.researchData, input.sentences);
  const preset = presetForTopic(input.topic, labels);

  const playbook = await buildPlaybook(
    "visual",
    input.style,
    input.researchData?.skills?.extra ?? [],
  );

  try {
    const facts = (input.researchData?.facts ?? []).slice(0, 8).join("\n- ");
    const scriptText = input.sentences.map((s, i) => `${i + 1}. ${s.text}`).join("\n");
    const raw = await chatJSON({
      system: `${ANATOMY_SYSTEM_PROMPT}${playbook.text ? `\n\n${playbook.text}` : ""}`,
      user: `TOPIK: ${input.topic}
GAYA: ${input.style}

FAKTA RISET:
- ${facts || input.topic}

NASKAH NARASI:
${scriptText}

Rancang ObjectModel 3D isometrik (4-7 parts, 1-2 flows, 3-5 steps) yang merepresentasikan mekanisme/sistem utama topik di atas.`,
      schema: objectModelSchema,
      tier: "primary",
      modelOverride: input.modelOverride,
      temperature: 0.4,
      maxTokens: 2200,
      retries: 2,
    });
    const sanitized = sanitizeModel(raw);
    if (sanitized && sanitized.parts.length >= 3) {
      // Pastikan selalu ada minimal 1 flow supaya MECHANISM_FLOW hidup
      if (sanitized.flows.length === 0) {
        sanitized.flows = [
          {
            id: "main-flow",
            label: "ALUR PROSES",
            through: sanitized.parts.map((p) => p.id),
            medium: input.style === "engineering" ? "spark" : "particle",
          },
        ];
      }
      if (sanitized.steps.length < 3) {
        sanitized.steps = sanitized.parts.slice(0, 4).map((p) => p.label);
      }
      return sanitized;
    }
  } catch (error) {
    console.warn(
      "[anatomy] LLM gagal membangun ObjectModel, memakai model deterministik:",
      error instanceof Error ? error.message : error,
    );
  }

  return preset ?? genericModel(input.topic, labels);
}
