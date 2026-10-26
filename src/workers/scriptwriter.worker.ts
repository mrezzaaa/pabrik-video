import { z } from "zod";
import { omniroute, resolveContentModel } from "../lib/omniroute";
import { VideoBlueprint, VideoBlueprintPhase } from "../lib/scene/types";
import { isForbiddenPhaseTitle } from "../lib/schemas/blueprint.schema";

export const ScriptBeatSchema = z.object({
  phaseIndex: z.number().default(0),
  title: z.string().default(""),
  narration: z.string(),
  hudLabel: z.string().default("CAD_FOCUS"),
  activeComponentIds: z.array(z.string()).default([]),
  durationSec: z.number().default(6),
});

export const VideoScriptSchema = z.object({
  videoTitle: z.string().default("Teknik 3D"),
  hookNarration: z.string().default(""),
  beats: z.array(ScriptBeatSchema),
});

export type VideoScript = z.infer<typeof VideoScriptSchema>;

export const SCRIPTWRITER_SYSTEM_PROMPT = `Kamu scriptwriter & narator video teknik 3D bergaya Kitabedah.
Tugasmu: menulis naskah narasi lisan Bahasa Indonesia yang luwes, mengalir, dan menjelaskan mekanisme rekayasa internal secara langsung.

ATURAN JUDUL PHASE (WAJIB):
1. Judul setiap beat HARUS mengikuti judul fase dari blueprint (nama sistem rekayasa riil topik tersebut).
2. Kalau kamu memperbaiki judul, tetap pakai nama komponen/sistem yang benar-benar ada di topik itu.
3. DILARANG KERAS judul generik atau sisa template: "Solusi Vakum", "Peran Lapisan", "Segel Silikon", "Fase 1", "Potongan Melintang", "Tampilan Meledak", "Sintesis Keseluruhan", "Komponen Utama", "Analisis Sistem".

ATURAN NARASI (BAHASA INDONESIA):
1. DILARANG menyebut istilah kamera atau efek visual:
   "potongan melintang", "tampilan meledak", "sintesis keseluruhan", "mari kita lihat blueprint", "pada animasi ini", "tampilan x-ray", "pada visual ini", "gambar ini menunjukkan".
   Jelaskan mekanismenya langsung, seolah menerangkan ke penonton yang penasaran.
2. Bahasa lisan luwes: "Kenapa", "Gimana", "Tapi", "Makanya", "Terus", "Bisa", "Udah".
3. DILARANG kata kaku: "Mengapa", "Apakah", "Namun", "Oleh karena itu", "Tahukah kamu", "Halo guys".
4. Tiap beat 1-2 kalimat (14-22 kata), pas untuk 5-7 detik.
5. Narasi HARUS menyebut komponen nyata dari fase itu (ambil dari daftar components yang diberikan).

CONTOH GAYA (ikuti ritmenya, jangan tiru topiknya):
- "Tiang beton ini yang nahan seluruh beban dek, biar nggak ambles ke tanah."
- "Udara ditekan dulu sama kompresor, baru disemprot ke ruang bakar."
- "Waktu mesin nyala, inverter langsung ngubah arus baterai jadi arus AC buat motor."

FORMAT OUTPUT (HANYA JSON mentah, tanpa markdown code fence):
{
  "videoTitle": "Judul Pendek",
  "hookNarration": "Kalimat pembuka memikat...",
  "beats": [
    {
      "phaseIndex": 0,
      "title": "Nama Sistem Teknis (sama dengan fase blueprint)",
      "narration": "Saat pedal gas diinjak, baterai di kolong mobil langsung menyalurkan arus tegangan tinggi...",
      "hudLabel": "BATTERY_DISCHARGE",
      "activeComponentIds": ["BATTERY"],
      "durationSec": 6
    }
  ]
}`;

export function sanitizeNarration(text: string): string {
  if (!text) return "";
  return text
    .replace(/potongan melintang/gi, "arsitektur internal")
    .replace(/tampilan meledak/gi, "susunan komponen")
    .replace(/sintesis keseluruhan/gi, "cara kerja sistem")
    .replace(/mari kita lihat blueprint/gi, "kita bedah")
    .replace(/pada animasi ini/gi, "di dalamnya")
    .replace(/pada visual ini/gi, "di dalamnya")
    .replace(/tampilan x-?ray/gi, "lapisan dalamnya")
    .replace(/gambar ini menunjukkan/gi, "di dalamnya terlihat")
    .replace(/\s+/g, " ")
    .trim();
}

function clampDuration(value: number, fallback: number): number {
  const n = Number.isFinite(value) ? value : fallback;
  return Math.min(9, Math.max(4, Math.round(n)));
}

function hudLabelFromTitle(title: string): string {
  return (
    String(title || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 28) || "CAD_FOCUS"
  );
}

function fallbackNarration(topic: string, phase: VideoBlueprintPhase): string {
  const detail = (phase.label || "").replace(/\s+/g, " ").trim();
  const title = String(phase.title || "").trim() || "bagian ini";
  if (detail) {
    return `${detail} Itu bagian dari ${topic} yang bikin sistemnya tetap bekerja.`;
  }
  return `Di bagian ${title}, semua komponen di ${topic} bekerja bareng biar sistemnya tetap jalan.`;
}

/**
 * Guarantees: one beat per phase, topic-specific titles, real component ids,
 * and no camera jargon leaking into the spoken narration.
 */
function alignBeatsToPhases(
  script: VideoScript,
  topic: string,
  blueprint: VideoBlueprint
): VideoScript {
  const phases = blueprint.phases || [];
  const componentIds = (blueprint.components || []).map((component) => component.id);

  const beats = phases.map((phase, index) => {
    const beat = script.beats[index];
    const phaseTitle =
      String(phase.title || "").trim() || `${topic} · Bagian ${index + 1}`;
    const rawTitle = String(beat?.title || "").trim();
    const title = !rawTitle || isForbiddenPhaseTitle(rawTitle) ? phaseTitle : rawTitle;

    let narration = sanitizeNarration(beat?.narration || "");
    if (narration.length < 25) {
      narration = fallbackNarration(topic, phase);
    }

    const requestedIds = (beat?.activeComponentIds || [])
      .map((id) => String(id).toUpperCase().replace(/[^A-Z0-9]+/g, "_"))
      .filter((id) => componentIds.includes(id));

    return {
      phaseIndex: index,
      title,
      narration,
      hudLabel:
        beat?.hudLabel && beat.hudLabel !== "CAD_FOCUS"
          ? beat.hudLabel
          : hudLabelFromTitle(title),
      activeComponentIds: requestedIds.length
        ? requestedIds
        : (phase.activeComponentIds || []).filter((id) => componentIds.includes(id)),
      durationSec: clampDuration(
        Number(beat?.durationSec ?? phase.duration ?? 6),
        Number(phase.duration ?? 6)
      ),
    };
  });

  const videoTitle =
    script.videoTitle && !/^teknik 3d$/i.test(script.videoTitle.trim())
      ? script.videoTitle
      : blueprint.videoTitle || topic.toUpperCase();

  const hookNarration =
    sanitizeNarration(script.hookNarration || "") ||
    `Kenapa ${topic} bisa bekerja seperti itu? Ini bagian dalamnya.`;

  return { videoTitle, hookNarration, beats };
}

export async function generateScriptForBlueprint(
  topic: string,
  knowledgeBase: string,
  blueprint: VideoBlueprint,
  modelId?: string
): Promise<VideoScript> {
  const phases = blueprint.phases || [];
  const components = (blueprint.components || []).map((component) => ({
    id: component.id,
    name: component.name || component.id,
    geometryType: component.geometryType,
  }));

  const phaseList = phases.map((phase, index) => ({
    index,
    blueprintTitle: phase.title,
    label: phase.label,
    activeComponentIds: phase.activeComponentIds,
    duration: phase.duration || 6,
  }));

  const userPrompt = `TOPIC: ${topic}
VIDEO TITLE: ${blueprint.videoTitle || topic}
SUBJECT: ${blueprint.subjectArchetype || "UNIVERSAL_CUTAWAY"}

COMPONENTS (gunakan id ini):
${JSON.stringify(components, null, 2)}

FASE BLUEPRINT (judul sudah dirancang khusus untuk topik ini):
${JSON.stringify(phaseList, null, 2)}

RESEARCH FACTS (opsional, jangan mengarang angka):
${String(knowledgeBase || "").slice(0, 1800)}

Tulis naskah narasi untuk SETIAP fase di atas, urut, jumlah beat = ${phases.length}. Judul beat = blueprintTitle. Balas HANYA JSON:`;

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: SCRIPTWRITER_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const model = resolveContentModel(modelId);
  const models = [model, "auto/best-free", "auto"];

  for (let attempt = 0; attempt < models.length; attempt++) {
    try {
      const rawText = await omniroute.getChatCompletion(
        attempt === 0
          ? messages
          : [
              messages[0],
              {
                role: "user",
                content: `${userPrompt}\n\nGAGAL VALIDASI. Balas HANYA JSON valid, beats = ${phases.length}, judul = blueprintTitle.`,
              },
            ],
        models[attempt],
        attempt === 0 ? 0.5 : 0.3,
        3000
      );

      let parsed = omniroute.cleanAndParseJson(rawText);

      if (Array.isArray(parsed)) {
        parsed = {
          videoTitle: blueprint.videoTitle || topic,
          hookNarration: `Kenapa ${topic} sebenarnya bekerja seperti itu?`,
          beats: parsed,
        };
      } else if (parsed && typeof parsed === "object" && !parsed.videoTitle) {
        parsed.videoTitle = blueprint.videoTitle || topic;
      }

      const script = VideoScriptSchema.parse(parsed);
      const aligned = alignBeatsToPhases(script, topic, blueprint);
      if (aligned.beats.length === phases.length) {
        return aligned;
      }
    } catch (error: any) {
      console.warn(`[SCRIPTWRITER] Attempt ${attempt + 1} failed: ${error?.message}`);
    }
  }

  // Deterministic, still topic-specific: never emit generic filler titles.
  console.warn("[SCRIPTWRITER] Using deterministic phase-aligned narration.");
  return alignBeatsToPhases(
    {
      videoTitle: blueprint.videoTitle || topic.toUpperCase(),
      hookNarration: `Kenapa ${topic} sebenarnya bekerja seperti itu?`,
      beats: [],
    },
    topic,
    blueprint
  );
}
