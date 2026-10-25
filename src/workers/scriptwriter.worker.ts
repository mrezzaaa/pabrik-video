import { z } from "zod";
import { omniroute } from "../lib/omniroute";
import { VideoBlueprint } from "../lib/scene/types";

export const ScriptBeatSchema = z.object({
  phaseIndex: z.number().default(0),
  title: z.string().default("Fase Teknis"),
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
Tugasmu: Menulis naskah narasi lisan Bahasa Indonesia yang luwes, mengalir, dan sinkron dengan fase visual 3D X-Ray.

ATURAN NARASI:
1. Bahasa lisan sehari-hari yang luwes: gunakan "Kenapa", "Gimana", "Tapi", "Makanya", "Terus", "Bisa", "Udah".
2. DILARANG kata kaku: "Mengapa", "Apakah", "Namun", "Oleh karena itu", "Tahukah kamu", "Halo guys".
3. Tiap fase 1-2 kalimat (sekitar 14-22 kata) pas untuk durasi 5-7 detik.
4. Narasi HARUS menjelaskan langsung komponen 3D yang sedang aktif pada fase tersebut!
5. Judul fase HARUS SPESIFIK per topik (BUKAN generik).

FORMAT OUTPUT (HANYA JSON mentah, tanpa markdown code fence):
{
  "videoTitle": "Judul Pendek",
  "hookNarration": "Kalimat pembuka memikat...",
  "beats": [
    {
      "phaseIndex": 0,
      "title": "Nama Fase",
      "narration": "Kalimat narasi...",
      "hudLabel": "LABEL HUD",
      "activeComponentIds": ["id_komponen"],
      "durationSec": 6
    }
  ]
}`;

export async function generateScriptForBlueprint(
  topic: string,
  knowledgeBase: string,
  blueprint: VideoBlueprint,
  modelId?: string
): Promise<VideoScript> {
  const phaseList = (blueprint.phases || []).map((p, idx) => ({
    index: idx,
    title: p.title || `Fase ${idx + 1}`,
    activeComponentIds: p.activeComponentIds,
    duration: p.duration || 6,
  }));

  const userPrompt = `TOPIC: ${topic}\n\nRESEARCH FACTS:\n${knowledgeBase}\n\nBLUEPRINT PHASES YANG SUDAH DIRANCANG:\n${JSON.stringify(
    phaseList,
    null,
    2
  )}\n\nTulis naskah narasi untuk tiap fase di atas. Balas HANYA JSON persis format di atas:`;

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: SCRIPTWRITER_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  try {
    const rawText = await omniroute.getChatCompletion(messages, modelId);
    let parsed = omniroute.cleanAndParseJson(rawText);

    if (Array.isArray(parsed)) {
      parsed = {
        videoTitle: blueprint.videoTitle || topic,
        hookNarration: `Bagaimana ${topic} sebenarnya bekerja di dalam?`,
        beats: parsed,
      };
    } else if (parsed && !parsed.videoTitle) {
      parsed.videoTitle = blueprint.videoTitle || topic;
    }

    return VideoScriptSchema.parse(parsed);
  } catch (err: any) {
    console.warn("[SCRIPTWRITER] Parsing retry:", err.message);
    const retryMessages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: SCRIPTWRITER_SYSTEM_PROMPT },
      { role: "user", content: `${userPrompt}\nBalas HANYA JSON:` },
    ];
    const raw = await omniroute.getChatCompletion(retryMessages, modelId);
    let parsed = omniroute.cleanAndParseJson(raw);
    if (Array.isArray(parsed)) {
      parsed = {
        videoTitle: blueprint.videoTitle || topic,
        hookNarration: `Bagaimana ${topic} sebenarnya bekerja?`,
        beats: parsed,
      };
    }
    return VideoScriptSchema.parse(parsed);
  }
}
