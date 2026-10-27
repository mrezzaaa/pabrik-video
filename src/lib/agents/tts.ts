import path from "node:path";
import { alignWords } from "../alignment";
import {
  ensureMediaDirs,
  ffprobeDuration,
  publicUrl,
  trimAudio,
  AUDIO_DIR,
} from "../media";
import { asJson, completeStage, startStage } from "../pipeline";
import { prisma } from "../prisma";
import { synthesizeChunkedToFile } from "../tts";
import type { FullScript } from "../types";

/** Facebook Reels hard limit for this pipeline. */
const MAX_REELS_SECONDS = 60;

export async function runTts(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan.`);

  const fullScript = project.fullScript as unknown as FullScript | null;
  if (!fullScript || !Array.isArray(fullScript.sentences)) {
    throw new Error("Naskah belum tersedia untuk proses TTS.");
  }

  await startStage(projectId, "tts");
  await ensureMediaDirs();

  const narration = fullScript.sentences
    .map((sentence) => sentence.text)
    .join(" ")
    .trim();

  if (!narration) throw new Error("Naskah kosong, tidak ada yang bisa di-TTS.");

  const audioPath = path.join(AUDIO_DIR, `${projectId}.mp3`);
  // Sentence-boundary chunking keeps plosives intact and avoids mid-word cuts.
  const synthesis = await synthesizeChunkedToFile(narration, audioPath, 2500, {
    voice: project.voice,
  });
  let duration = await ffprobeDuration(audioPath);
  if (duration < 0.5) {
    throw new Error("Audio TTS terlalu pendek / rusak.");
  }

  // Reels may not exceed 60 seconds. Trim before alignment so captions and
  // scene timings are computed against the audio that actually ships.
  if (duration > MAX_REELS_SECONDS + 0.05) {
    console.info(
      `[tts] audio ${duration.toFixed(2)}s > ${MAX_REELS_SECONDS}s, memangkas...`,
    );
    await trimAudio(audioPath, MAX_REELS_SECONDS);
    duration = await ffprobeDuration(audioPath);
  }

  const { words, captions } = alignWords(fullScript.sentences, duration);
  const updatedScript: FullScript = {
    ...fullScript,
    captions,
    durationEstimate: Math.round(duration * 10) / 10,
  };

  await prisma.project.update({
    where: { id: projectId },
    data: {
      audioUrl: publicUrl(audioPath),
      duration: Math.min(
        MAX_REELS_SECONDS,
        Math.round(duration * 100) / 100,
      ),
      wordTimestamps: asJson(words),
      fullScript: asJson(updatedScript),
    },
  });

  await completeStage(projectId, "tts", {
    provider: synthesis.provider,
    voice: synthesis.voice,
    duration: Math.round(duration * 100) / 100,
    words: words.length,
    bytes: synthesis.bytes,
    chunks: synthesis.chunks,
  });

  return { audioUrl: publicUrl(audioPath), duration, words, captions };
}
